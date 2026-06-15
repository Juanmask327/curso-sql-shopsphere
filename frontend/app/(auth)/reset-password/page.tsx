"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api-client";

// ===================================================================
// ResetPasswordForm — wrapped in Suspense for useSearchParams
// ===================================================================
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Ingresa el código de 6 dígitos recibido por email.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.auth.resetPassword({ email, code, newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login?reset=success"), 2500);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.code === "CODE_EXPIRED") {
        setError("El código expiró. Volvé a 'Olvidé mi contraseña' para solicitar uno nuevo.");
      } else if (apiErr?.code === "TOO_MANY_ATTEMPTS") {
        setError("Demasiados intentos. Volvé a solicitar un nuevo código.");
      } else {
        setError(apiErr?.message ?? "Código incorrecto. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-sm text-neutral-500">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-md p-8">
        {/* Back link */}
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Nueva contraseña
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
            Ingresá el código que enviamos a{" "}
            <span className="font-medium text-neutral-700">{email || "tu email"}</span>{" "}
            y elegí una contraseña nueva.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Code */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
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
                "disabled:opacity-60",
                error ? "border-rose-400 bg-rose-50/40" : "border-neutral-300 hover:border-neutral-400"
              )}
            />
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); if (error) setError(null); }}
                autoComplete="new-password"
                disabled={loading}
                className={cn(
                  "w-full h-10 px-3.5 pr-10 rounded-md text-sm",
                  "border bg-white text-neutral-900",
                  "transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400",
                  "disabled:opacity-60",
                  error ? "border-rose-400 bg-rose-50/40" : "border-neutral-300 hover:border-neutral-400"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <p className={cn("text-xs", newPassword.length >= 8 ? "text-emerald-600" : "text-neutral-400")}>
                {newPassword.length >= 8 ? "✓ Mínimo 8 caracteres" : "Mínimo 8 caracteres"}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(null); }}
              autoComplete="new-password"
              disabled={loading}
              className={cn(
                "w-full h-10 px-3.5 rounded-md text-sm",
                "border bg-white text-neutral-900",
                "transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400",
                "disabled:opacity-60",
                confirmPassword && confirmPassword !== newPassword
                  ? "border-rose-400 bg-rose-50/40"
                  : error
                  ? "border-rose-400 bg-rose-50/40"
                  : "border-neutral-300 hover:border-neutral-400"
              )}
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-rose-600">Las contraseñas no coinciden</p>
            )}
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
            className="w-full mt-2"
            loading={loading}
            disabled={loading}
          >
            Cambiar contraseña
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-neutral-400 mt-5">
        El código expira en 15 minutos.
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm animate-pulse h-96 bg-neutral-100 rounded-xl" />
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
