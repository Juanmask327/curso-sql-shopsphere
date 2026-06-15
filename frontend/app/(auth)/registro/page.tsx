"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, storeTokens, TOKEN_KEY } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

// ===================================================================
// Password strength indicator
// ===================================================================
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: "8 caracteres mínimo", met: password.length >= 8 },
    { label: "Una letra mayúscula", met: /[A-Z]/.test(password) },
    { label: "Un número", met: /[0-9]/.test(password) },
  ];

  const metCount = checks.filter((c) => c.met).length;
  const strengthColors = [
    "bg-rose-400",
    "bg-amber-400",
    "bg-emerald-400",
    "bg-emerald-500",
  ];

  return (
    <div className="space-y-2 animate-fade-in">
      {/* Bar */}
      <div className="flex gap-1 h-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-all duration-300",
              i < metCount ? strengthColors[metCount] : "bg-neutral-200"
            )}
          />
        ))}
      </div>
      {/* Checks */}
      <ul className="space-y-0.5">
        {checks.map((check) => (
          <li
            key={check.label}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              check.met ? "text-emerald-600" : "text-neutral-400"
            )}
          >
            <CheckCircle2
              className={cn(
                "w-3 h-3 shrink-0 transition-all",
                check.met ? "opacity-100" : "opacity-30"
              )}
            />
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ===================================================================
// Field — labeled input with error state
// ===================================================================
interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  rightSlot?: React.ReactNode;
  below?: React.ReactNode;
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  error,
  hint,
  disabled,
  rightSlot,
  below,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className={cn(
            "w-full h-10 px-3.5 rounded-md text-sm",
            "border bg-white text-neutral-900 placeholder:text-neutral-400",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-primary-400",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-neutral-50",
            rightSlot ? "pr-10" : "",
            error
              ? "border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/40"
              : "border-neutral-300 hover:border-neutral-400"
          )}
          aria-describedby={
            [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={Boolean(error)}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightSlot}
          </div>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-neutral-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
      {below}
    </div>
  );
}

// ===================================================================
// Registro Page
// ===================================================================
export default function RegistroPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Redirect already-authenticated users
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [router]);

  function clearError(field: keyof typeof fieldErrors) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (formError) setFormError(null);
  }

  // Client-side validation
  function validate(): boolean {
    const errors: typeof fieldErrors = {};

    if (!username.trim()) {
      errors.username = "El nombre de usuario es requerido";
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      errors.username =
        "Solo letras, números y guión bajo. Entre 3 y 20 caracteres.";
    }

    if (!email.trim()) {
      errors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Ingresa un email válido";
    }

    if (!password) {
      errors.password = "La contraseña es requerida";
    } else if (password.length < 8) {
      errors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirma tu contraseña";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setFormError(null);

    try {
      const response = await api.auth.register({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      storeTokens(response.tokens);
      // Redirect to email verification before the diagnostic
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pudimos crear tu cuenta. Intenta de nuevo.";
      setFormError(
        message.toLowerCase().includes("email")
          ? "Ya existe una cuenta con ese email."
          : message.toLowerCase().includes("username")
          ? "Ese nombre de usuario ya está en uso."
          : "No pudimos crear tu cuenta. Intenta de nuevo."
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      {/* Card */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-md p-8">
        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Crea tu cuenta
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            Empieza a aprender SQL con datos reales
          </p>
        </div>

        {/* Google button */}
        <a
          href={`${API_URL}/auth/oauth/google`}
          className={cn(
            "flex items-center justify-center gap-2.5 w-full h-10 px-4 rounded-md text-sm font-medium",
            "border border-neutral-300 bg-white text-neutral-700",
            "hover:bg-neutral-50 hover:border-neutral-400 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0"
          )}
        >
          <GoogleIcon />
          Registrarse con Google
        </a>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-neutral-200" />
          <span className="text-xs text-neutral-400">o con email</span>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field
            id="username"
            label="Nombre de usuario"
            type="text"
            value={username}
            onChange={(v) => { setUsername(v); clearError("username"); }}
            autoComplete="username"
            error={fieldErrors.username}
            hint="Solo letras, números y guión bajo. 3–20 caracteres."
            disabled={loading}
          />

          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(v) => { setEmail(v); clearError("email"); }}
            autoComplete="email"
            error={fieldErrors.email}
            disabled={loading}
          />

          <Field
            id="password"
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(v) => { setPassword(v); clearError("password"); }}
            autoComplete="new-password"
            error={fieldErrors.password}
            disabled={loading}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            below={<PasswordStrength password={password} />}
          />

          <Field
            id="confirmPassword"
            label="Confirmar contraseña"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(v) => { setConfirmPassword(v); clearError("confirmPassword"); }}
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
            disabled={loading}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none"
                tabIndex={-1}
                aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          {/* Form-level error */}
          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 animate-scale-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              {formError}
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
            <UserPlus className="w-4 h-4" />
            Crear cuenta
          </Button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-neutral-600">
          ¿Ya tienes cuenta?{" "}
          <a
            href="/login"
            className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            Inicia sesión
          </a>
        </p>
      </div>

      {/* Trust signal */}
      <p className="text-center text-xs text-neutral-400 mt-5">
        Al registrarte aceptas los{" "}
        <a href="#" className="underline underline-offset-2 hover:text-neutral-600">
          Términos de uso
        </a>{" "}
        y la{" "}
        <a href="#" className="underline underline-offset-2 hover:text-neutral-600">
          Política de privacidad
        </a>
        .
      </p>
    </div>
  );
}
