"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresa un email válido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.auth.forgotPassword({ email: email.trim().toLowerCase() });
      // Siempre redirigir — no revelar si el email existe
      router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setError("No pudimos procesar tu solicitud. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-md p-8">
        {/* Back link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al login
        </Link>

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
            Ingresa tu email y te enviaremos un código para crear una nueva contraseña.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              autoComplete="email"
              autoFocus
              disabled={loading}
              className={cn(
                "w-full h-10 px-3.5 rounded-md text-sm",
                "border bg-white text-neutral-900 placeholder:text-neutral-400",
                "transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                error
                  ? "border-rose-400 bg-rose-50/40"
                  : "border-neutral-300 hover:border-neutral-400"
              )}
            />
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 px-3.5 py-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
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
            <Send className="w-4 h-4" />
            Enviar código
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-neutral-400 mt-5">
        Si el email está registrado, recibirás el código en tu casilla.
      </p>
    </div>
  );
}
