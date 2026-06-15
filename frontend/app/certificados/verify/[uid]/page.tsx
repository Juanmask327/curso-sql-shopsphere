// ===================================================================
// Certificate Verification — PUBLIC page (no auth required)
//
// Accessible at /certificados/verify/:uid
// Anyone with the link can verify a certificate without logging in.
// ===================================================================

import { CheckCircle2, XCircle, Award, Calendar, User, Hash } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

// ===================================================================
// Mock lookup — replace with verifyCertificate(uid) API call
// ===================================================================

interface CertificateData {
  valid: boolean;
  uid: string;
  level_name: string;
  student_name: string;
  issued_at: string;
}

async function fetchCertificate(uid: string): Promise<CertificateData> {
  // TODO: replace with real API call:
  // const { data } = await verifyCertificate(uid);

  // Mock: simulate network latency
  await new Promise((r) => setTimeout(r, 0));

  // Return valid for known mock UID
  if (uid === "cert-abc123") {
    return {
      valid: true,
      uid,
      level_name: "Fundamentos SQL",
      student_name: "carlos_dev",
      issued_at: "2026-05-22T14:30:00Z",
    };
  }

  return {
    valid: false,
    uid,
    level_name: "",
    student_name: "",
    issued_at: "",
  };
}

// ===================================================================
// Metadata
// ===================================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uid: string }>;
}): Promise<Metadata> {
  const { uid } = await params;
  const cert = await fetchCertificate(uid);

  if (cert.valid) {
    return {
      title: `Certificado de ${cert.student_name} — ${cert.level_name} | ShopSphere SQL`,
      description: `Verifica el certificado de completación de ${cert.level_name} emitido a ${cert.student_name} en ShopSphere SQL Course.`,
    };
  }

  return {
    title: "Certificado no válido | ShopSphere SQL",
  };
}

// ===================================================================
// Valid Certificate Card
// ===================================================================
function ValidCertificate({ cert }: { cert: CertificateData }) {
  const issuedDate = new Date(cert.issued_at).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Status badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Certificado verificado
        </div>
      </div>

      {/* Certificate card — styled like a physical certificate */}
      <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-2 bg-gradient-to-r from-primary-400 via-primary-500 to-emerald-500" />

        <div className="px-8 py-10 space-y-6 text-center">
          {/* Award icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mx-auto">
            <Award className="w-8 h-8 text-emerald-600" />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
              ShopSphere SQL Course
            </p>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Certificado de Completación
            </h1>
          </div>

          {/* Main content */}
          <div className="space-y-2 py-4 border-y border-neutral-100">
            <p className="text-sm text-neutral-500">Este certificado acredita que</p>
            <p className="text-2xl font-bold text-neutral-900">{cert.student_name}</p>
            <p className="text-sm text-neutral-500">ha completado satisfactoriamente el nivel</p>
            <p className="text-xl font-bold text-primary-600">{cert.level_name}</p>
          </div>

          {/* Meta */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
              <Calendar className="w-4 h-4 text-neutral-300" />
              Emitido el {issuedDate}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 font-mono">
              <Hash className="w-3.5 h-3.5" />
              {cert.uid}
            </div>
          </div>
        </div>

        {/* Bottom gradient bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
      </div>

      {/* Verification note */}
      <p className="text-center text-xs text-neutral-400">
        Verificado por{" "}
        <Link
          href="/"
          className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
        >
          ShopSphere SQL Course
        </Link>{" "}
        · Esta página es de acceso público.
      </p>
    </div>
  );
}

// ===================================================================
// Invalid Certificate
// ===================================================================
function InvalidCertificate({ uid }: { uid: string }) {
  return (
    <div className="w-full max-w-md mx-auto space-y-6 text-center">
      {/* Status badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-sm">
          <XCircle className="w-4 h-4" />
          Certificado no válido
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 mx-auto">
          <XCircle className="w-7 h-7 text-rose-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-neutral-900">
            No pudimos verificar este certificado
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            El identificador{" "}
            <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
              {uid}
            </code>{" "}
            no corresponde a ningún certificado emitido por ShopSphere SQL
            Course.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-700 text-left">
          <strong>Posibles causas:</strong>
          <ul className="mt-1.5 space-y-1 list-disc list-inside text-amber-600">
            <li>El enlace está incompleto o fue modificado</li>
            <li>El certificado fue revocado</li>
            <li>El ID no existe en nuestra base de datos</li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Si crees que esto es un error, contacta a{" "}
        <a
          href="mailto:soporte@shopsphere.edu"
          className="text-primary-500 hover:underline"
        >
          soporte@shopsphere.edu
        </a>
      </p>
    </div>
  );
}

// ===================================================================
// Page — Server Component (public, no auth)
// ===================================================================
export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const cert = await fetchCertificate(uid);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "rgb(253, 252, 250)" }}>
      {/* Minimal header — no auth links */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-neutral-900">
              ShopSphere <span className="text-primary-500">SQL</span>
            </span>
          </Link>
          <span className="ml-3 text-xs text-neutral-400 bg-neutral-100 border border-neutral-200 rounded-full px-2.5 py-1">
            Verificación pública
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        {cert.valid ? (
          <ValidCertificate cert={cert} />
        ) : (
          <InvalidCertificate uid={uid} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 text-xs text-neutral-400">
          ShopSphere SQL Course · Verificación de certificados · Acceso público
        </div>
      </footer>
    </div>
  );
}
