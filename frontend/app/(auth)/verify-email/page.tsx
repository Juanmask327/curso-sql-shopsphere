"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api-client";

// ===================================================================
// VerifyEmailForm — wrapped in Suspense for useSearchParams
// ===================================================================
function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Ingresa el código de 6 dígitos");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.auth.verifyEmail({ email, code });
      setSuccess(true);
      setTimeout(() => router.push("/diagnostic"), 2000);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.code === "CODE_EXPIRED") {
        setError("El código expiró. Usa el botón de reenvío para recibir uno nuevo.");
      } else if (apiErr?.code === "TOO_MANY_ATTEMPTS") {
        setError("Demasiados intentos. Solicita un nuevo código con el botón de abajo.");
      } else {
        setError(apiErr?.message ?? "Código incorrecto. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await api.auth.resendVerification({ email });
      setResendCooldown(60);
      setCode("");
    } catch {
      // Silencioso — el backend siempre responde 204
    } finally {
      setResending(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">¡Email verificado!</h2>
          <p className="text-sm text-neutral-500">Redirigiendo al diagnóstico inicial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-md p-8">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
            <Mail className="w-7 h-7 text-primary-500" />
          </div>
        </div>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="text-xl font-bold text-neutral-900">Verifica tu email</h1>
          <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
            Enviamos un código de 6 dígitos a
          </p>
          <p className="text-sm font-semibold text-neutral-800 mt-0.5">
            {email || "tu correo"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 text-center">
              Código de verificación
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (error) setError(null);
              }}
              placeholder="000000"
              disabled={loading}
              autoFocus
              className={cn(
                "w-full h-14 px-4 rounded-md text-center text-3xl font-mono tracking-[0.35em]",
                "border bg-white text-neutral-900 placeholder:text-neutral-300",
                "transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                error ? "border-rose-400 bg-rose-50/40" : "border-neutral-300 hover:border-neutral-400"
              )}
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 px-3.5 py-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading || code.length !== 6}
          >
            Verificar email
          </Button>
        </form>

        {/* Resend */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500 mb-2">¿No llegó el email?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", resending && "animate-spin")} />
            {resendCooldown > 0
              ? `Reenviar en ${resendCooldown}s`
              : resending
              ? "Enviando..."
              : "Reenviar código"}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-neutral-400 mt-5">
        El código expira en 15 minutos. Revisá también tu carpeta de spam.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm animate-pulse h-80 bg-neutral-100 rounded-xl" />
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
