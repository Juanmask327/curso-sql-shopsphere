/**
 * seed-exercises.ts
 *
 * Puebla la tabla `exercises` leyendo los archivos de ejercicios SQL de
 * `modulos/` y los JSON de resultados esperados de `dataset/`.
 *
 * Idempotente: borra los ejercicios de los niveles procesados antes de
 * reinsertar. Correr dos veces produce el mismo resultado.
 *
 * Rutas de archivos fuente:
 *   En Docker: /modulos  y  /dataset  (el script detecta automáticamente)
 *   En el host: ../modulos  y  ../dataset  relativos al repo root
 *
 * Se puede sobreescribir con variables de entorno:
 *   MODULOS_PATH=/ruta/a/modulos
 *   DATASET_PATH=/ruta/a/dataset
 *
 * Ejecución desde el contenedor:
 *   docker exec shopsphere-backend npm run seed:exercises
 *
 * Ejecución desde el host (necesita DATABASE_URL apuntando a localhost):
 *   DATABASE_URL=postgresql://shopsphere_user:<pwd>@localhost:5432/shopsphere \
 *     npm run seed:exercises
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { exercises, userExerciseProgress, exerciseAttempts } from '../shared/db/schema.js';
import { inArray } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface ParsedExercise {
  levelId: number;
  orderIndex: number;
  title: string;
  description: string;
  instructions: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  referenceQuery: string;
  expectedResultJson: ExpectedResultJson;
  validationMode: 'exact_ordered' | 'exact_unordered' | 'schema_match';
  hints: string[];
  isPublished: boolean;
}

interface ExpectedResultJson {
  columns: string[];
  rows: unknown[][];
  row_count: number;
}

interface NivelConfig {
  levelId: number;
  sqlFile: string | string[];
  jsonFile: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  isPublished: boolean;
}

// ---------------------------------------------------------------------------
// Resolución de rutas base
//
// En Docker: /modulos y /dataset existen como paths absolutos.
// En el host: se calcula desde REPO_ROOT (4 niveles arriba del script).
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dirname, '../../../../');

function resolveBase(envVar: string, containerPath: string, hostRelative: string): string {
  const fromEnv = process.env[envVar];
  if (fromEnv) return fromEnv;
  if (existsSync(containerPath)) return containerPath;
  return join(REPO_ROOT, hostRelative);
}

const MODULOS_BASE = resolveBase('MODULOS_PATH', '/modulos', 'modulos');
const DATASET_BASE = resolveBase('DATASET_PATH', '/dataset', 'dataset');

// ---------------------------------------------------------------------------
// Configuración de niveles
// ---------------------------------------------------------------------------

function buildNivelConfig(): NivelConfig[] {
  return [
    {
      levelId: 0,
      sqlFile: join(MODULOS_BASE, 'nivel-00-fundamentos/ejercicios-nivel-00.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-00.json'),
      difficulty: 'easy',
      xpReward: 10,
      isPublished: true,
    },
    {
      levelId: 1,
      sqlFile: join(MODULOS_BASE, 'nivel-01-exploracion/ejercicios-nivel-01.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-01.json'),
      difficulty: 'easy',
      xpReward: 10,
      isPublished: true,
    },
    {
      levelId: 2,
      sqlFile: join(MODULOS_BASE, 'nivel-02-metricas/ejercicios-nivel-02.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-02.json'),
      difficulty: 'medium',
      xpReward: 25,
      isPublished: true,
    },
    {
      levelId: 3,
      sqlFile: join(MODULOS_BASE, 'nivel-03-joins/ejercicios-nivel-03.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-03.json'),
      difficulty: 'medium',
      xpReward: 25,
      isPublished: true,
    },
    {
      levelId: 4,
      sqlFile: join(MODULOS_BASE, 'nivel-04-clientes/ejercicios-nivel-04.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-04.json'),
      difficulty: 'hard',
      xpReward: 50,
      isPublished: true,
    },
    {
      levelId: 5,
      sqlFile: join(MODULOS_BASE, 'nivel-05-avanzado/ejercicios-nivel-05.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-05.json'),
      difficulty: 'hard',
      xpReward: 50,
      isPublished: true,
    },
    {
      levelId: 6,
      sqlFile: join(MODULOS_BASE, 'nivel-06-analitica/ejercicios-nivel-06.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-06.json'),
      difficulty: 'hard',
      xpReward: 50,
      isPublished: true,
    },
    {
      levelId: 7,
      sqlFile: join(MODULOS_BASE, 'nivel-07-bi/ejercicios-nivel-07.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-07.json'),
      difficulty: 'hard',
      xpReward: 50,
      isPublished: true,
    },
    {
      levelId: 8,
      sqlFile: join(MODULOS_BASE, 'nivel-08-profesional/ejercicios-nivel-08.sql'),
      jsonFile: join(DATASET_BASE, 'expected-results-nivel-08.json'),
      difficulty: 'hard',
      xpReward: 50,
      isPublished: true,
    },
    {
      levelId: 9,
      sqlFile: [
        join(MODULOS_BASE, 'capstone/parte-01-exploracion.sql'),
        join(MODULOS_BASE, 'capstone/parte-02-clientes.sql'),
        join(MODULOS_BASE, 'capstone/parte-03-marketing.sql'),
        join(MODULOS_BASE, 'capstone/parte-04-operaciones.sql'),
        join(MODULOS_BASE, 'capstone/parte-05-dashboard-ejecutivo.sql'),
      ],
      jsonFile: join(DATASET_BASE, 'expected-results-capstone.json'),
      difficulty: 'hard',
      xpReward: 50,
      isPublished: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Parser de archivos SQL — enunciados
// ---------------------------------------------------------------------------

/**
 * Extrae los enunciados individuales del bloque de ejercicios del archivo SQL.
 *
 * Formato en el archivo:
 *   -- Ejercicio NN
 *   -- CONTEXTO: ...  (líneas opcionales)
 *   -- Enunciado: ...
 *   -- Criterio: ...
 *   -- Tu query aquí:
 */
function parseExerciseStatements(content: string): Array<{
  orderIndex: number;
  title: string;
  description: string;
  instructions: string;
  hints: string[];
}> {
  // Tomar solo la sección antes del bloque de soluciones (que está en /* ... */)
  // Usar el inicio del bloque de comentario multilínea como delimitador.
  const solutionsBlockIdx = content.indexOf('/*');
  const exerciseSection =
    solutionsBlockIdx !== -1 ? content.slice(0, solutionsBlockIdx) : content;

  // Dividir por cabecera "-- Ejercicio NN"
  const headerRegex = /^-- Ejercicio (\d+)\s*$/m;
  const parts = exerciseSection.split(headerRegex);

  const results: Array<{
    orderIndex: number;
    title: string;
    description: string;
    instructions: string;
    hints: string[];
  }> = [];

  // parts[0] = encabezado del archivo; luego pares [num, bloque]
  for (let i = 1; i < parts.length; i += 2) {
    const orderIndex = parseInt(parts[i] ?? '0', 10);
    const block = parts[i + 1] ?? '';

    // Recorrer líneas de comentario hasta "-- Tu query aquí:"
    const commentLines: string[] = [];
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '-- Tu query aquí:') break;
      if (trimmed.startsWith('--')) {
        const text = trimmed.replace(/^--\s?/, '').trim();
        if (text) commentLines.push(text);
      }
    }

    // Clasificar líneas en secciones
    const contextoLines: string[] = [];
    const enunciadoLines: string[] = [];
    const criterioLines: string[] = [];
    const hints: string[] = [];
    let currentHint = '';
    let currentSection: 'contexto' | 'enunciado' | 'criterio' | 'pistas' | 'other' = 'other';

    for (const line of commentLines) {
      if (/^CONTEXTO:/i.test(line)) {
        currentSection = 'contexto';
        const rest = line.replace(/^CONTEXTO:\s*/i, '').trim();
        if (rest) contextoLines.push(rest);
      } else if (/^Enunciado:/i.test(line)) {
        currentSection = 'enunciado';
        const rest = line.replace(/^Enunciado:\s*/i, '').trim();
        if (rest) enunciadoLines.push(rest);
      } else if (/^Criterio:/i.test(line)) {
        currentSection = 'criterio';
        const rest = line.replace(/^Criterio:\s*/i, '').trim();
        if (rest) criterioLines.push(rest);
      } else if (/^PISTAS?:/i.test(line)) {
        currentSection = 'pistas';
        const rest = line.replace(/^PISTAS?:\s*/i, '').trim();
        if (rest) {
          const match = rest.match(/^\d+\.\s*(.*)$/);
          if (match) {
            currentHint = match[1] ?? '';
          } else {
            currentHint = rest;
          }
        }
      } else {
        switch (currentSection) {
          case 'contexto':
            contextoLines.push(line);
            break;
          case 'enunciado':
            enunciadoLines.push(line);
            break;
          case 'criterio':
            criterioLines.push(line);
            break;
          case 'pistas': {
            const match = line.match(/^\d+\.\s*(.*)$/);
            if (match) {
              if (currentHint) hints.push(currentHint);
              currentHint = match[1] ?? '';
            } else {
              if (currentHint) {
                currentHint += ' ' + line;
              } else {
                currentHint = line;
              }
            }
            break;
          }
          default:
            // Líneas antes del primer marcador: tratar como contexto
            contextoLines.push(line);
        }
      }
    }
    if (currentHint) hints.push(currentHint);

    const description = contextoLines.join(' ').trim() || `Ejercicio ${orderIndex}`;
    const enunciadoText = enunciadoLines.join(' ').trim();
    const criterioText = criterioLines.join(' ').trim();
    const instructions = criterioText
      ? `${enunciadoText}\n\nCriterio: ${criterioText}`
      : enunciadoText || description;

    // Título: primera oración del enunciado (máx 100 chars)
    let title = (enunciadoText || description).split('.')[0]?.trim() ?? '';
    if (title.length > 100) title = title.slice(0, 97) + '...';
    if (!title) title = `Ejercicio ${orderIndex}`;

    results.push({ orderIndex, title, description, instructions, hints });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Parser de archivos SQL — soluciones
// ---------------------------------------------------------------------------

/**
 * Extrae las soluciones SQL del bloque /* ... *\/.
 * Retorna Map<orderIndex, queryString>.
 */
function parseSolutions(content: string): Map<number, string> {
  const map = new Map<number, string>();

  const blockMatch = content.match(/\/\*([\s\S]*?)\*\//);
  if (!blockMatch?.[1]) return map;

  const block = blockMatch[1];
  const headerRegex = /--- Solución (\d+) ---/g;

  // Recolectar posiciones de inicio de cada solución
  const positions: Array<{ afterHeader: number; num: number; headerStart: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(block)) !== null) {
    positions.push({
      headerStart: m.index,
      afterHeader: m.index + m[0].length,
      num: parseInt(m[1] ?? '0', 10),
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    if (!current) continue;

    // El cuerpo de la solución termina donde empieza el header de la siguiente
    const nextHeaderStart = positions[i + 1]?.headerStart ?? block.length;
    const rawQuery = block.slice(current.afterHeader, nextHeaderStart).trim();
    const cleanQuery = rawQuery.replace(/\n{3,}/g, '\n\n').trim();
    if (cleanQuery) {
      map.set(current.num, cleanQuery);
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Parsers de expected-results JSON
// ---------------------------------------------------------------------------

const EMPTY_RESULT: ExpectedResultJson = { columns: [], rows: [], row_count: 0 };

function normalizeValidationMode(
  raw: unknown,
): 'exact_ordered' | 'exact_unordered' | 'schema_match' {
  if (raw === 'exact_ordered') return 'exact_ordered';
  if (raw === 'schema_match') return 'schema_match';
  return 'exact_unordered';
}

type ExpectedEntry = {
  result: ExpectedResultJson;
  validationMode: 'exact_ordered' | 'exact_unordered' | 'schema_match';
  /** Título descriptivo corto del JSON (preferido sobre el del SQL) */
  title?: string;
};

/**
 * Nivel 01/02/03: array de objetos con exercise_number, expected_columns,
 * sample_rows, expected_row_count_approx, validation_mode.
 */
function parseArrayFormat(raw: unknown[]): Map<number, ExpectedEntry> {
  const map = new Map<number, ExpectedEntry>();

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const num = typeof e['exercise_number'] === 'number' ? e['exercise_number'] : 0;
    if (!num) continue;

    const columns = Array.isArray(e['expected_columns'])
      ? (e['expected_columns'] as string[])
      : [];
    const rows = Array.isArray(e['sample_rows']) ? (e['sample_rows'] as unknown[][]) : [];
    const rowCount =
      typeof e['expected_row_count_approx'] === 'number'
        ? e['expected_row_count_approx']
        : rows.length;

    map.set(num, {
      result: { columns, rows, row_count: rowCount },
      validationMode: normalizeValidationMode(e['validation_mode']),
      title: typeof e['title'] === 'string' ? e['title'] : undefined,
    });
  }

  return map;
}

/**
 * Nivel 04: { meta: {...}, exercises: { ej01: {...}, ej02: {...} } }
 * Los samples son objetos nominales (sample_first_3).
 */
function parseNivel04Format(raw: Record<string, unknown>): Map<number, ExpectedEntry> {
  const map = new Map<number, ExpectedEntry>();
  const exercisesObj = raw['exercises'];
  if (typeof exercisesObj !== 'object' || exercisesObj === null || Array.isArray(exercisesObj)) {
    return map;
  }

  for (const [key, value] of Object.entries(exercisesObj)) {
    const numMatch = key.match(/\d+/);
    if (!numMatch) continue;
    const num = parseInt(numMatch[0]!, 10);

    if (typeof value !== 'object' || value === null) continue;
    const e = value as Record<string, unknown>;

    const rowCount = typeof e['row_count'] === 'number' ? e['row_count'] : 0;
    const sampleFirst3 = Array.isArray(e['sample_first_3']) ? e['sample_first_3'] : [];

    let columns: string[] = [];
    const rows: unknown[][] = [];

    if (sampleFirst3.length > 0 && typeof sampleFirst3[0] === 'object' && sampleFirst3[0] !== null) {
      columns = Object.keys(sampleFirst3[0] as object);
      for (const sample of sampleFirst3) {
        if (typeof sample === 'object' && sample !== null) {
          rows.push(Object.values(sample as object));
        }
      }
    }

    map.set(num, {
      result: { columns, rows, row_count: rowCount },
      validationMode: normalizeValidationMode(e['validation_mode']),
    });
  }

  return map;
}

/**
 * Nivel 05: { metadata: {...}, exercises: [ { id: "01", expected_columns: [],
 *   expected_rows: [{col: val}, ...], expected_row_count: N } ] }
 */
function parseNivel05Format(exercisesArr: unknown[]): Map<number, ExpectedEntry> {
  const map = new Map<number, ExpectedEntry>();

  for (const entry of exercisesArr) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;

    const idStr = typeof e['id'] === 'string' ? e['id'] : '';
    const num = parseInt(idStr, 10);
    if (isNaN(num)) continue;

    const columns = Array.isArray(e['expected_columns'])
      ? (e['expected_columns'] as string[])
      : [];
    const rowCount =
      typeof e['expected_row_count'] === 'number' ? e['expected_row_count'] : 0;

    const expectedRowsRaw = Array.isArray(e['expected_rows']) ? e['expected_rows'] : [];
    const rows: unknown[][] = [];

    for (const rowObj of expectedRowsRaw) {
      if (typeof rowObj === 'object' && rowObj !== null) {
        rows.push(
          columns.length > 0
            ? columns.map((col) => (rowObj as Record<string, unknown>)[col])
            : Object.values(rowObj as object),
        );
      }
    }

    map.set(num, {
      result: { columns, rows, row_count: rowCount },
      validationMode: normalizeValidationMode(e['validation_mode']),
    });
  }

  return map;
}

/**
 * Carga y normaliza el JSON de expected-results, detectando su formato.
 */
function loadExpectedResults(jsonPath: string): Map<number, ExpectedEntry> {
  if (!existsSync(jsonPath)) {
    console.warn(`  [WARN] JSON no encontrado: ${jsonPath}`);
    return new Map();
  }

  const raw: unknown = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  // Formato 1: array (nivel 01, 02, 03)
  if (Array.isArray(raw)) {
    return parseArrayFormat(raw);
  }

  if (typeof raw === 'object' && raw !== null) {
    const typed = raw as Record<string, unknown>;

    // Formato 2: objeto con "meta" + "exercises" como objeto (nivel 04)
    if ('meta' in typed && !Array.isArray(typed['exercises'])) {
      return parseNivel04Format(typed);
    }

    // Formato 3: objeto con "metadata" + "exercises" como array (nivel 05)
    if ('metadata' in typed && Array.isArray(typed['exercises'])) {
      return parseNivel05Format(typed['exercises'] as unknown[]);
    }
  }

  console.warn(`  [WARN] Formato de JSON no reconocido: ${jsonPath}`);
  return new Map();
}

// ---------------------------------------------------------------------------
// Parser unificado para formato nivel-00
//
// Formato del archivo:
//   -- ============================================================
//   -- EJERCICIO N: título
//   -- Dificultad: ...
//   -- Conceptos: ...
//   -- Tablas: ...
//   -- ============================================================
//   --
//   -- [líneas de contexto]
//   --
//   -- PREGUNTA:
//   -- [enunciado]
//   --
//   -- PISTAS:
//   -- ...
//   --
//   -- Tu query aquí:
//
//
//   -- SOLUCIÓN:
//   <SQL>
//
//
//   -- ============================================================
//   -- EJERCICIO N+1: ...
//
// La estrategia es localizar los headers por regex y operar sobre chunks
// delimitados, evitando la fragilidad del split por separadores.
// ---------------------------------------------------------------------------

interface ParsedNivel00Exercise {
  orderIndex: number;
  title: string;
  description: string;
  instructions: string;
  solution: string;
  hints: string[];
}

function parseNivel00File(content: string): ParsedNivel00Exercise[] {
  const results: ParsedNivel00Exercise[] = [];

  // Localizar todas las posiciones de headers de ejercicio
  const headerRegex = /^-- EJERCICIO (\d+):\s*(.+)$/gm;
  const positions: Array<{ index: number; num: number; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(content)) !== null) {
    positions.push({
      index: m.index,
      num: parseInt(m[1]!, 10),
      title: m[2]!.trim(),
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    const nextPos = positions[i + 1];
    // Chunk: desde el header actual hasta el inicio del siguiente (o EOF)
    const chunk = nextPos
      ? content.slice(pos.index, nextPos.index)
      : content.slice(pos.index);

    // ── Instrucciones: contenido de las líneas bajo -- PREGUNTA: ──────────
    const preguntaMatch = chunk.match(/^-- PREGUNTA:\s*\n((?:--[^\n]*\n?)*)/m);
    let instructions = pos.title;
    if (preguntaMatch?.[1]) {
      const lines: string[] = [];
      for (const line of preguntaMatch[1].split('\n')) {
        const trimmed = line.trim();
        if (/^--\s*PISTAS?:/i.test(trimmed) || /^--\s*Tu query aquí:/i.test(trimmed)) {
          break;
        }
        if (trimmed.startsWith('--')) {
          const text = trimmed.replace(/^--\s?/, '').trim();
          if (text) lines.push(text);
        }
      }
      if (lines.length > 0) instructions = lines.join(' ');
    }

    // ── Solución: SQL después de -- SOLUCIÓN: hasta el fin del chunk ──────
    // Se usa índice explícito en lugar de regex non-greedy para evitar que
    // el lookahead \s*$ corte prematuramente en la primera línea de comentario
    // SQL válida (ej. ejercicio 20 empieza con "-- Reporte: ...").
    // El separador final (-- ====...) que puede aparecer al cierre del chunk
    // se elimina con un segundo trim sobre el resultado.
    let solution = '';
    const solutionHeaderMatch = chunk.match(/^-- SOLUCI[ÓO]N:\s*$/m);
    if (solutionHeaderMatch?.index !== undefined) {
      const afterHeader = chunk.slice(
        solutionHeaderMatch.index + solutionHeaderMatch[0].length,
      );
      // Eliminar el separador de cierre (-- ====...) si lo hay al final del chunk
      solution = afterHeader.replace(/\n*-- ={10,}\s*$/, '').trim();
    }

    // ── Descripción: líneas de contexto entre el header y -- PREGUNTA: ────
    const contextLines: string[] = [];
    const lines = chunk.split('\n');
    let inContext = false;
    for (const line of lines) {
      if (/^-- EJERCICIO \d+:/i.test(line)) {
        inContext = true;
        continue;
      }
      // Las líneas de metadata del header y los marcadores detienen el contexto
      if (/^-- (PREGUNTA|PISTAS|Dificultad|Conceptos|Tablas|Tu query|SOLUCI)/.test(line)) {
        inContext = false;
      }
      if (/^-- ={10,}$/.test(line)) {
        inContext = false;
        continue;
      }
      if (inContext && line.trim().startsWith('--')) {
        const text = line.replace(/^--\s?/, '').trim();
        if (text) contextLines.push(text);
      }
    }

    // ── Pistas: líneas de comentarios bajo -- PISTAS: ──
    const hints: string[] = [];
    let inPistas = false;
    let currentHint = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^--\s*PISTAS?:/i.test(trimmed)) {
        inPistas = true;
        const rest = trimmed.replace(/^--\s*PISTAS?:\s*/i, '').trim();
        if (rest) {
          const match = rest.match(/^\d+\.\s*(.*)$/);
          if (match) {
            currentHint = match[1] ?? '';
          } else {
            currentHint = rest;
          }
        }
        continue;
      }
      if (/^-- (PREGUNTA|Dificultad|Conceptos|Tablas|Tu query|SOLUCI)/i.test(trimmed)) {
        inPistas = false;
      }
      if (inPistas && trimmed.startsWith('--')) {
        const text = trimmed.replace(/^--\s?/, '').trim();
        if (text) {
          const match = text.match(/^\d+\.\s*(.*)$/);
          if (match) {
            if (currentHint) hints.push(currentHint);
            currentHint = match[1] ?? '';
          } else {
            if (currentHint) {
              currentHint += ' ' + text;
            } else {
              currentHint = text;
            }
          }
        }
      }
    }
    if (currentHint) hints.push(currentHint);

    results.push({
      orderIndex: pos.num,
      title: pos.title.length > 100 ? pos.title.slice(0, 97) + '...' : pos.title,
      description: contextLines.join(' ').trim() || pos.title,
      instructions,
      solution,
      hints,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Parser unificado para formato Capstone (Nivel 09)
// ---------------------------------------------------------------------------

interface ParsedCapstoneExercise {
  orderIndex: number;
  title: string;
  description: string;
  instructions: string;
  solution: string;
  hints: string[];
}

function parseCapstoneFile(content: string): ParsedCapstoneExercise[] {
  const results: ParsedCapstoneExercise[] = [];

  // Localizar todas las posiciones de headers de ejercicio (-- EJXX — ...)
  // Ejemplo: -- EJ01 — Resumen ejecutivo H1 2026
  const headerRegex = /^-- EJ(\d+) —\s*(.+)$/gm;
  const positions: Array<{ index: number; num: number; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(content)) !== null) {
    positions.push({
      index: m.index,
      num: parseInt(m[1]!, 10),
      title: m[2]!.trim(),
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    const nextPos = positions[i + 1];
    const chunk = nextPos
      ? content.slice(pos.index, nextPos.index)
      : content.slice(pos.index);

    // Extraer solución: SQL después de -- Solución EJXX: hasta el fin del comentario multilínea
    let solution = '';
    // Usar regex dinámico para capturar la solución del ejercicio correspondiente
    const solHeaderRegex = new RegExp(`-- Soluci[oó]n EJ0?${pos.num}:\\s*\\n/\\*([\\s\\S]*?)\\*/`, 'i');
    const solMatch = chunk.match(solHeaderRegex);
    if (solMatch?.[1]) {
      solution = solMatch[1].trim();
    }

    // Extraer contexto (descripción) e instrucciones (enunciado + criterios)
    const lines = chunk.split('\n');
    const contextoLines: string[] = [];
    const enunciadoLines: string[] = [];
    const criterioLines: string[] = [];
    const hints: string[] = [];
    let currentHint = '';
    let currentSection: 'contexto' | 'enunciado' | 'criterio' | 'pistas' | 'other' = 'other';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-- Tu query aquí:')) break;
      if (trimmed.startsWith('-- Solución')) break;
      if (trimmed.startsWith('--')) {
        const text = trimmed.replace(/^--\s?/, '').trim();
        if (/^Contexto:/i.test(text)) {
          currentSection = 'contexto';
          const rest = text.replace(/^Contexto:\s*/i, '').trim();
          if (rest) contextoLines.push(rest);
        } else if (/^Enunciado:/i.test(text)) {
          currentSection = 'enunciado';
          const rest = text.replace(/^Enunciado:\s*/i, '').trim();
          if (rest) enunciadoLines.push(rest);
        } else if (/^Criterio/i.test(text)) {
          currentSection = 'criterio';
          const rest = text.replace(/^Criterio( de [eé]xito)?:\s*/i, '').trim();
          if (rest) {
            criterioLines.push(rest);
          }
        } else if (/^PISTAS?:/i.test(text)) {
          currentSection = 'pistas';
          const rest = text.replace(/^PISTAS?:\s*/i, '').trim();
          if (rest) {
            const match = rest.match(/^\d+\.\s*(.*)$/);
            if (match) {
              currentHint = match[1] ?? '';
            } else {
              currentHint = rest;
            }
          }
        } else {
          switch (currentSection) {
            case 'contexto':
              contextoLines.push(text);
              break;
            case 'enunciado':
              enunciadoLines.push(text);
              break;
            case 'criterio':
              criterioLines.push(text);
              break;
            case 'pistas': {
              const match = text.match(/^\d+\.\s*(.*)$/);
              if (match) {
                if (currentHint) hints.push(currentHint);
                currentHint = match[1] ?? '';
              } else {
                if (currentHint) {
                  currentHint += ' ' + text;
                } else {
                  currentHint = text;
                }
              }
              break;
            }
          }
        }
      }
    }
    if (currentHint) hints.push(currentHint);

    const description = contextoLines.join(' ').trim() || pos.title;
    const enunciadoText = enunciadoLines.join(' ').trim();
    const criterioText = criterioLines.join(' ').trim();
    const instructions = criterioText
      ? `${enunciadoText}\n\nCriterio: ${criterioText}`
      : enunciadoText || description;

    results.push({
      orderIndex: pos.num,
      title: pos.title,
      description,
      instructions,
      solution,
      hints,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Procesamiento por nivel
// ---------------------------------------------------------------------------

function generateDefaultHints(referenceQuery: string): string[] {
  const hints: string[] = [];
  const cleanQuery = referenceQuery.replace(/\s+/g, ' ');

  // Extract tables from FROM and JOIN
  const tableMatches = [...cleanQuery.matchAll(/(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)/gi)];
  const tables = [...new Set(tableMatches.map(m => m[1]?.toLowerCase()))].filter(t => t && t !== 'select');

  if (tables.length > 0) {
    if (tables.length === 1) {
      hints.push(`La consulta se realiza sobre la tabla \`${tables[0]}\`.`);
    } else {
      hints.push(`Este ejercicio requiere combinar o consultar las tablas: ${tables.map(t => `\`${t}\``).join(', ')}.`);
    }
  }

  // Check key SQL clauses/operators
  if (/WHERE/i.test(cleanQuery)) {
    if (/LIKE/i.test(cleanQuery)) {
      hints.push("Usa la cláusula `WHERE` combinada con el operador `LIKE` y comodines `%` para buscar patrones de texto.");
    } else if (/BETWEEN/i.test(cleanQuery)) {
      hints.push("Usa `BETWEEN` en el `WHERE` para filtrar registros dentro de un rango inclusivo.");
    } else if (/IN\s*\(/i.test(cleanQuery)) {
      hints.push("Usa el operador `IN` en tu condición `WHERE` para filtrar por múltiples valores específicos.");
    } else {
      hints.push("Asegúrate de aplicar condiciones de filtrado en el `WHERE` para obtener solo los registros indicados.");
    }
  }

  if (/GROUP\s+BY/i.test(cleanQuery)) {
    hints.push("Agrupa las filas usando `GROUP BY` y calcula métricas usando funciones agregadas (como `COUNT`, `SUM` o `AVG`).");
  }

  if (/HAVING/i.test(cleanQuery)) {
    hints.push("Usa la cláusula `HAVING` para filtrar los grupos agregados (por ejemplo, después de aplicar un `GROUP BY`).");
  }

  if (/ORDER\s+BY/i.test(cleanQuery)) {
    hints.push("Ordena los resultados con la cláusula `ORDER BY` en la dirección indicada (`ASC` para ascendente o `DESC` para descendente).");
  }

  if (/LIMIT/i.test(cleanQuery)) {
    hints.push("Utiliza la cláusula `LIMIT` al final de la consulta para restringir el número de resultados devueltos.");
  }

  if (/JOIN/i.test(cleanQuery)) {
    hints.push("Realiza la unión de tablas usando `JOIN` (o `INNER JOIN`/`LEFT JOIN`) relacionando las llaves correspondientes.");
  }

  if (/WITH/i.test(cleanQuery)) {
    hints.push("Organiza tu consulta usando expresiones de tabla comunes (`WITH ... AS`) para estructurar la query en pasos legibles.");
  }

  if (/OVER\s*\(/i.test(cleanQuery)) {
    hints.push("Utiliza funciones de ventana (`Window Functions`) con la cláusula `OVER` (y opcionalmente `PARTITION BY` u `ORDER BY`) para cálculos analíticos.");
  }

  if (hints.length === 0) {
    hints.push("Explora la estructura de las tablas disponibles y escribe una consulta SELECT básica para extraer los campos solicitados.");
  }

  return hints;
}

function generateAlmostSolutionHint(referenceQuery: string): string {
  // Normalizar y separar por líneas
  const lines = referenceQuery
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const maskedLines = lines.map(line => {
    // Si la línea es un comentario, mantenerla
    if (line.startsWith('--') || line.startsWith('/*')) {
      return line;
    }

    const upper = line.toUpperCase();

    if (upper.startsWith('SELECT ')) {
      // Si contiene AS, enmascarar manteniendo la idea de aliases
      if (upper.includes(' AS ')) {
        return 'SELECT [columna1] AS [alias1], [columna2] AS [alias2]...';
      }
      return 'SELECT [campos_a_mostrar]';
    }

    if (upper.startsWith('FROM ')) {
      // Dejar el FROM con la tabla original, ya que ayuda al estudiante a ubicarse
      return line;
    }

    if (upper.startsWith('WHERE ')) {
      return 'WHERE [condición_de_filtrado]';
    }

    if (upper.startsWith('GROUP BY ')) {
      return 'GROUP BY [columnas_de_agrupación]';
    }

    if (upper.startsWith('HAVING ')) {
      return 'HAVING [condición_de_grupo]';
    }

    if (upper.startsWith('ORDER BY ')) {
      return 'ORDER BY [columna] ASC/DESC';
    }

    if (upper.startsWith('LIMIT ')) {
      return 'LIMIT [cantidad]';
    }

    if (upper.includes(' JOIN ')) {
      // Enmascarar JOINs, ej. LEFT JOIN products ON ...
      return line.replace(/JOIN\s+[a-zA-Z0-9_]+/i, 'JOIN [tabla_a_unir]');
    }

    if (upper.startsWith('ON ')) {
      return 'ON [tabla1].[llave] = [tabla2].[llave]';
    }

    return line;
  });

  return `Estructura de la query:\n\`\`\`sql\n${maskedLines.join('\n')}\n\`\`\``;
}

/**
 * Extrae las tablas de la query de referencia y las antepone a las instrucciones
 * del ejercicio como "Tabla: `X`" o "Tablas: `X`, `Y`", para que el estudiante
 * siempre sepa sobre qué tabla(s) debe trabajar sin necesidad de pedir pistas.
 */
function injectTableInfo(instructions: string, referenceQuery: string): string {
  const tableMatches = [...referenceQuery.matchAll(/(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)];
  const tables = [
    ...new Set(
      tableMatches
        .map((m) => m[1]?.toLowerCase())
        .filter((t): t is string => !!t && !['select', 'with', 'dual'].includes(t)),
    ),
  ];

  if (tables.length === 0) return instructions;

  const tableInfo =
    tables.length === 1
      ? `Tabla: \`${tables[0]}\``
      : `Tablas: ${tables.map((t) => `\`${t}\``).join(', ')}`;

  return `${tableInfo}\n\n${instructions}`;
}

function ensureThreeHints(parsedHints: string[], referenceQuery: string): string[] {
  const hints = [...parsedHints];

  // Si no hay pistas iniciales, usar las generadas por defecto
  if (hints.length === 0) {
    hints.push(...generateDefaultHints(referenceQuery));
  }

  // Si aún tiene menos de 2, agregar una pista sintáctica por defecto
  if (hints.length === 1) {
    hints.push("Revisa bien la sintaxis de las cláusulas SELECT y FROM en la teoría de la lección.");
  }

  // Si tiene exactamente 2 pistas, generar y agregar la tercera "Casi la solución"
  if (hints.length === 2) {
    hints.push(generateAlmostSolutionHint(referenceQuery));
  }

  return hints.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Procesamiento por nivel
// ---------------------------------------------------------------------------

function processLevel(config: NivelConfig): ParsedExercise[] {
  console.log(`\n[Nivel ${config.levelId}]`);
  console.log(`  SQL:  ${Array.isArray(config.sqlFile) ? config.sqlFile.join(', ') : config.sqlFile}`);
  console.log(`  JSON: ${config.jsonFile ?? 'N/A'}`);

  let sqlContent = '';
  if (Array.isArray(config.sqlFile)) {
    for (const file of config.sqlFile) {
      if (!existsSync(file)) {
        console.warn(`  [WARN] Archivo SQL no encontrado: ${file} — omitido`);
        continue;
      }
      sqlContent += readFileSync(file, 'utf-8') + '\n';
    }
  } else {
    if (!existsSync(config.sqlFile)) {
      console.warn(`  [WARN] Archivo SQL no encontrado — omitido`);
      return [];
    }
    sqlContent = readFileSync(config.sqlFile, 'utf-8');
  }

  // Detectar formato: Capstone (Nivel 9) usa formato EJXX, Nivel 00 usa "-- EJERCICIO N:"
  const isCapstone = config.levelId === 9;
  const isNivel00Format = !isCapstone && /^-- EJERCICIO \d+:/m.test(sqlContent);

  let statements: Array<{ orderIndex: number; title: string; description: string; instructions: string; hints?: string[] }>;
  let solutions: Map<number, string>;

  if (isCapstone) {
    const capstone = parseCapstoneFile(sqlContent);
    statements = capstone.map((e) => ({
      orderIndex: e.orderIndex,
      title: e.title,
      description: e.description,
      instructions: e.instructions,
      hints: e.hints,
    }));
    solutions = new Map(
      capstone.filter((e) => e.solution.length > 0).map((e) => [e.orderIndex, e.solution]),
    );
  } else if (isNivel00Format) {
    // Parser unificado: extrae enunciados y soluciones en un solo paso
    const nivel00 = parseNivel00File(sqlContent);
    statements = nivel00.map((e) => ({
      orderIndex: e.orderIndex,
      title: e.title,
      description: e.description,
      instructions: e.instructions,
      hints: e.hints,
    }));
    solutions = new Map(
      nivel00.filter((e) => e.solution.length > 0).map((e) => [e.orderIndex, e.solution]),
    );
  } else {
    statements = parseExerciseStatements(sqlContent);
    solutions = parseSolutions(sqlContent);
  }
  const expectedResults = config.jsonFile
    ? loadExpectedResults(config.jsonFile)
    : new Map<number, ExpectedEntry>();

  console.log(
    `  Enunciados: ${statements.length} | Soluciones: ${solutions.size} | Expected results: ${expectedResults.size}`,
  );

  const result: ParsedExercise[] = [];

  for (const stmt of statements) {
    const solution = solutions.get(stmt.orderIndex);
    if (!solution) {
      console.warn(`  [WARN] Sin solución para ejercicio ${stmt.orderIndex} — omitido`);
      continue;
    }

    const expectedEntry = expectedResults.get(stmt.orderIndex);
    const expectedResultJson: ExpectedResultJson = expectedEntry?.result ?? EMPTY_RESULT;
    const validationMode = expectedEntry?.validationMode ?? 'exact_unordered';

    // Preferir el título del JSON (más descriptivo y conciso) sobre el del SQL
    const title = expectedEntry?.title ?? stmt.title;

    result.push({
      levelId: config.levelId,
      orderIndex: stmt.orderIndex,
      title,
      description: stmt.description,
      instructions: injectTableInfo(stmt.instructions, solution),
      difficulty: config.difficulty,
      xpReward: config.xpReward,
      referenceQuery: solution,
      expectedResultJson,
      validationMode,
      hints: ensureThreeHints(stmt.hints || [], solution),
      isPublished: config.isPublished,
    });
  }

  console.log(`  Resultado: ${result.length} ejercicios procesados`);
  return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL no está definida. ' +
        'Exportala antes de correr el script:\n' +
        '  export DATABASE_URL=postgresql://user:pass@host:5432/db',
    );
  }

  console.log('=== ShopSphere — Seed de Ejercicios ===');
  console.log(`DATABASE_URL: ${databaseUrl.replace(/:\/\/[^@]+@/, '://***@')}`);
  console.log(`MODULOS_BASE: ${MODULOS_BASE}`);
  console.log(`DATASET_BASE: ${DATASET_BASE}`);

  const nivelConfig = buildNivelConfig();

  // Parsear todos los niveles
  const allExercises: ParsedExercise[] = [];
  for (const config of nivelConfig) {
    const parsed = processLevel(config);
    allExercises.push(...parsed);
  }

  console.log(`\nTotal de ejercicios a insertar: ${allExercises.length}`);

  if (allExercises.length === 0) {
    console.warn('Nada que insertar. Verificar rutas de archivos.');
    process.exit(0);
  }

  // Conectar a PostgreSQL
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const levelIds = [...new Set(allExercises.map((e) => e.levelId))];
    console.log(`\nBorrando ejercicios existentes de niveles [${levelIds.join(', ')}]...`);

    // Primero borrar registros dependientes para evitar violación de FK
    const existingExerciseIds = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(inArray(exercises.levelId, levelIds));

    if (existingExerciseIds.length > 0) {
      const ids = existingExerciseIds.map((r) => r.id);
      await db.delete(exerciseAttempts).where(inArray(exerciseAttempts.exerciseId, ids));
      await db.delete(userExerciseProgress).where(inArray(userExerciseProgress.exerciseId, ids));
    }

    await db.delete(exercises).where(inArray(exercises.levelId, levelIds));

    console.log('Insertando...');

    // Insertar en lotes para no saturar el payload
    const BATCH_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < allExercises.length; i += BATCH_SIZE) {
      const batch = allExercises.slice(i, i + BATCH_SIZE);

      await db.insert(exercises).values(
        batch.map((ex) => ({
          levelId: ex.levelId,
          orderIndex: ex.orderIndex,
          title: ex.title,
          description: ex.description,
          instructions: ex.instructions,
          difficulty: ex.difficulty,
          xpReward: ex.xpReward,
          referenceQuery: ex.referenceQuery,
          expectedResultJson: ex.expectedResultJson,
          validationMode: ex.validationMode,
          hints: ex.hints,
          isPublished: ex.isPublished,
        })),
      );

      inserted += batch.length;
      process.stdout.write(`  Insertados: ${inserted}/${allExercises.length}\r`);
    }

    process.stdout.write('\n');
    console.log(`Completado: ${inserted} ejercicios insertados.`);

    // Verificación final
    console.log('\n=== Verificación ===');
    const rows = await db
      .select({
        levelId: exercises.levelId,
        isPublished: exercises.isPublished,
      })
      .from(exercises);

    const stats = new Map<number, { total: number; published: number }>();
    for (const row of rows) {
      const s = stats.get(row.levelId) ?? { total: 0, published: 0 };
      s.total += 1;
      if (row.isPublished) s.published += 1;
      stats.set(row.levelId, s);
    }

    console.log('level_id | total | published');
    console.log('---------+-------+----------');
    for (const [lvl, s] of [...stats.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(
        `    ${String(lvl).padStart(2)}   |  ${String(s.total).padStart(3)}  |    ${String(s.published).padStart(3)}`,
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('[ERROR FATAL]', err);
  process.exit(1);
});
