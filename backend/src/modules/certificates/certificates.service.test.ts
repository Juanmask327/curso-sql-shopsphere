import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type * as crypto from 'crypto';

vi.mock('../../shared/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof crypto>();
  return {
    ...actual,
    randomInt: vi.fn(() => 0),
  };
});

import { checkAndIssueCertificate, verifyCertificate, getUserCertificates } from './certificates.service.js';
import { db } from '../../shared/db/index.js';

// ── Mock helpers ──────────────────────────────────────────────────────────────

/**
 * Crea una cadena Drizzle que:
 * - es thenable (await chain → value) para queries sin .limit()
 * - tiene .limit() que retorna Promise.resolve(value)
 * - tiene .orderBy() que retorna `this` (para encadenar .limit() después)
 */
function makeChain(value: unknown) {
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(value),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  };
  return chain;
}

function mockSelect(returnValue: unknown) {
  (db.select as Mock).mockReturnValue(makeChain(returnValue));
}

function mockSelectSequence(returnValues: unknown[]) {
  let callIndex = 0;
  (db.select as Mock).mockImplementation(() => {
    const value = returnValues[callIndex] ?? [];
    callIndex++;
    return makeChain(value);
  });
}

// ── Tests: checkAndIssueCertificate ──────────────────────────────────────────

describe('CertificatesService - checkAndIssueCertificate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna newly_issued=false si el nivel no existe o no está publicado', async () => {
    mockSelect([]);

    const result = await checkAndIssueCertificate('user-1', 99);

    expect(result).toEqual({ already_had: false, newly_issued: false });
  });

  it('retorna already_had=true si el usuario ya tiene el certificado', async () => {
    const fakeCert = {
      id: 'cert-1',
      userId: 'user-1',
      levelId: 1,
      certificateUid: 'SS-L1-AAAAAA',
      issuedAt: new Date('2025-01-01'),
      metadata: {},
    };
    mockSelectSequence([
      [{ id: 1, name: 'Nivel 01 — Exploración' }],
      [fakeCert],
    ]);

    const result = await checkAndIssueCertificate('user-1', 1);

    expect(result.already_had).toBe(true);
    expect(result.newly_issued).toBe(false);
    expect(result.certificate?.uid).toBe('SS-L1-AAAAAA');
  });

  it('retorna newly_issued=false si el nivel no tiene ejercicios publicados', async () => {
    mockSelectSequence([
      [{ id: 1, name: 'Nivel 01' }],
      [],
      [{ totalPublished: 0 }],
    ]);

    const result = await checkAndIssueCertificate('user-1', 1);

    expect(result).toEqual({ already_had: false, newly_issued: false });
  });

  it('retorna newly_issued=false si el usuario no completó todos los ejercicios', async () => {
    mockSelectSequence([
      [{ id: 1, name: 'Nivel 01' }],
      [],
      [{ totalPublished: 5 }],
      [{ completedCount: 3 }],
    ]);

    const result = await checkAndIssueCertificate('user-1', 1);

    expect(result).toEqual({ already_had: false, newly_issued: false });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('emite el certificado si el usuario completó todos los ejercicios', async () => {
    const issuedCert = {
      id: 'cert-new',
      userId: 'user-1',
      levelId: 1,
      certificateUid: 'SS-L1-AAAAAA',
      issuedAt: new Date('2025-06-01'),
      metadata: { exercises_completed: 5, issued_by: 'system' },
    };

    mockSelectSequence([
      [{ id: 1, name: 'Nivel 01' }],
      [],
      [{ totalPublished: 5 }],
      [{ completedCount: 5 }],
      [{ xpTotal: 500 }],
    ]);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([issuedCert]),
    };
    (db.insert as Mock).mockReturnValue(insertChain);

    const result = await checkAndIssueCertificate('user-1', 1);

    expect(result.newly_issued).toBe(true);
    expect(result.already_had).toBe(false);
    expect(result.certificate?.uid).toBe('SS-L1-AAAAAA');
    expect(result.certificate?.level_name).toBe('Nivel 01');
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('maneja race condition: ON CONFLICT retorna vacío, lee el existente', async () => {
    const existingCert = {
      id: 'cert-existing',
      userId: 'user-1',
      levelId: 1,
      certificateUid: 'SS-L1-ZZZZZZ',
      issuedAt: new Date('2025-06-01'),
      metadata: {},
    };

    mockSelectSequence([
      [{ id: 1, name: 'Nivel 01' }],
      [],
      [{ totalPublished: 3 }],
      [{ completedCount: 3 }],
      [],                  // XP lookup no crítico
      [existingCert],      // lectura tras ON CONFLICT
    ]);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]), // ON CONFLICT ignoró el insert
    };
    (db.insert as Mock).mockReturnValue(insertChain);

    const result = await checkAndIssueCertificate('user-1', 1);

    expect(result.already_had).toBe(true);
    expect(result.newly_issued).toBe(false);
    expect(result.certificate?.uid).toBe('SS-L1-ZZZZZZ');
  });
});

// ── Tests: verifyCertificate ──────────────────────────────────────────────────

describe('CertificatesService - verifyCertificate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna valid=false si el UID no existe', async () => {
    mockSelect([]);

    const result = await verifyCertificate('SS-L0-INVALID');

    expect(result).toEqual({ valid: false });
  });

  it('retorna valid=true con datos del certificado si el UID existe', async () => {
    mockSelect([{
      uid: 'SS-L1-ABC123',
      issuedAt: new Date('2025-03-15'),
      levelName: 'Nivel 01 — Exploración',
      username: 'juandev',
    }]);

    const result = await verifyCertificate('SS-L1-ABC123');

    expect(result.valid).toBe(true);
    expect(result.certificate?.uid).toBe('SS-L1-ABC123');
    expect(result.certificate?.username).toBe('juandev');
    expect(result.certificate?.level_name).toBe('Nivel 01 — Exploración');
    expect(result.certificate?.issued_at).toMatch(/2025-03-15/);
  });
});

// ── Tests: getUserCertificates ────────────────────────────────────────────────

describe('CertificatesService - getUserCertificates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna lista vacía si el usuario no tiene certificados', async () => {
    mockSelect([]);

    const result = await getUserCertificates('user-no-certs');

    expect(result).toEqual([]);
  });

  it('retorna los certificados del usuario mapeados al shape público', async () => {
    const rows = [
      {
        cert: {
          id: 'c1',
          userId: 'user-1',
          levelId: 0,
          certificateUid: 'SS-L0-FUND01',
          issuedAt: new Date('2025-01-10'),
          metadata: { exercises_completed: 8 },
        },
        levelName: 'Nivel 00 — Fundamentos',
      },
      {
        cert: {
          id: 'c2',
          userId: 'user-1',
          levelId: 1,
          certificateUid: 'SS-L1-EXPL02',
          issuedAt: new Date('2025-02-20'),
          metadata: { exercises_completed: 10 },
        },
        levelName: 'Nivel 01 — Exploración',
      },
    ];

    mockSelect(rows);

    const result = await getUserCertificates('user-1');

    expect(result).toHaveLength(2);
    expect(result[0]!.uid).toBe('SS-L0-FUND01');
    expect(result[0]!.level_name).toBe('Nivel 00 — Fundamentos');
    expect(result[1]!.uid).toBe('SS-L1-EXPL02');
  });
});
