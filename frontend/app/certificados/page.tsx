"use client";

import {
  Award,
  Share2,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

// ===================================================================
// Mock Data
// ===================================================================

interface MockCertificate {
  uid: string;
  level_id: number;
  level_name: string;
  issued_at: string;
  student_name: string;
  share_url: string;
}

const MOCK_CERTIFICATES: MockCertificate[] = [
  {
    uid: "cert-abc123",
    level_id: 1,
    level_name: "Fundamentos SQL",
    issued_at: "2026-05-22T14:30:00Z",
    student_name: "carlos_dev",
    share_url: `${typeof window !== "undefined" ? window.location.origin : ""}/certificados/verify/cert-abc123`,
  },
];

// ===================================================================
// Share Popover
// ===================================================================
function SharePopover({
  cert,
  onClose,
}: {
  cert: MockCertificate;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const verifyUrl = `/certificados/verify/${cert.uid}`;
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${verifyUrl}`
      : verifyUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silent
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xl w-full max-w-md p-6 space-y-5 animate-scale-in">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Compartir certificado</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {cert.level_name} · Emitido el{" "}
            {new Date(cert.issued_at).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            Enlace de verificación pública
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="flex-1 h-9 px-3 rounded-md border border-neutral-200 bg-neutral-50 text-sm font-mono text-neutral-600 focus:outline-none"
            />
            <Button
              variant={copied ? "success" : "outline"}
              size="icon"
              onClick={handleCopy}
              title="Copiar enlace"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          {copied && (
            <p className="text-xs text-emerald-600 animate-fade-in">
              Enlace copiado al portapapeles.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.open(fullUrl, "_blank")}
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4" />
            Ver certificado
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Certificate Card
// ===================================================================
function CertificateCard({ cert }: { cert: MockCertificate }) {
  const [showShare, setShowShare] = useState(false);

  const issuedDate = new Date(cert.issued_at).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="bg-white rounded-xl border border-emerald-200 shadow-xs overflow-hidden hover:shadow-sm transition-shadow">
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <Badge variant="success" size="sm">Verificado</Badge>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Certificado de completación
            </p>
            <h2 className="text-lg font-bold text-neutral-900 leading-tight">
              {cert.level_name}
            </h2>
            <p className="text-sm text-neutral-500">
              Emitido a <strong className="text-neutral-700">{cert.student_name}</strong>
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2 border border-neutral-100">
            <span>{issuedDate}</span>
            <span className="font-mono">{cert.uid}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="success" size="sm" onClick={() => setShowShare(true)} className="flex-1">
              <Share2 className="w-3.5 h-3.5" />
              Compartir
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={`/certificados/verify/${cert.uid}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                Verificar
              </a>
            </Button>
          </div>
        </div>
      </div>

      {showShare && <SharePopover cert={cert} onClose={() => setShowShare(false)} />}
    </>
  );
}

// ===================================================================
// Empty State
// ===================================================================
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center">
        <Award className="w-8 h-8 text-neutral-300" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-neutral-700">Aún no tienes certificados</h2>
        <p className="text-sm text-neutral-400 max-w-xs">
          Completa todos los ejercicios de un nivel para obtener tu primer certificado de completación.
        </p>
      </div>
      <Button variant="primary" size="md" asChild>
        <Link href="/niveles">
          Ver niveles disponibles
          <ChevronRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

// ===================================================================
// Page Content
// ===================================================================
function CertificadosContent() {
  const certificates = MOCK_CERTIFICATES;

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
          Mis certificados
        </h1>
        <p className="text-neutral-500 mt-1.5 max-w-lg">
          Cada certificado tiene una URL pública de verificación que puedes
          compartir con empleadores o en tu perfil de LinkedIn.
        </p>
      </div>

      {/* Content */}
      {certificates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {certificates.map((cert) => (
            <CertificateCard key={cert.uid} cert={cert} />
          ))}
        </div>
      )}

      {/* Info banner */}
      {certificates.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200">
          <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <p className="text-sm text-sky-700">
            Tus certificados son verificables públicamente a través del enlace único de
            cada uno. No requieren que el verificador tenga cuenta en ShopSphere SQL.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CertificadosPage() {
  return (
    <AppLayout>
      <CertificadosContent />
    </AppLayout>
  );
}
