"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Star,
  AlertTriangle,
  BookOpen,
  BarChart3,
  Target,
  Zap,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaygroundContainer } from "@/components/playground/PlaygroundContainer";
import { HintPanel } from "@/components/playground/HintPanel";
import { cn } from "@/lib/utils";
import {
  api,
  type ExerciseDetail,
  type ValidationResult as ApiValidationResult,
  ApiError,
} from "@/lib/api-client";
import type { ValidationResult, Hint } from "@/lib/types";
import { useAuth } from "@/lib/auth-store";

// ===================================================================
// Helpers — mapear respuesta API al formato de los componentes
// ===================================================================

/**
 * El backend retorna hints como string[].
 * Los componentes de UI esperan Hint[].
 * Mapeamos la lista de strings a la estructura tipada.
 */
function mapApiHintsToHintObjects(hints: string[]): Hint[] {
  const labels: Hint["levelLabel"][] = [
    "Conceptual",
    "Sintáctico",
    "Casi la solución",
  ];
  return hints.slice(0, 3).map((content, i) => ({
    level: i as 0 | 1 | 2,
    levelLabel: labels[i] ?? "Conceptual",
    xpCost: 5,
    content,
  }));
}

/**
 * Mapea la ValidationResult del API al tipo local de la UI.
 */
function mapApiValidationResult(
  apiResult: ApiValidationResult
): ValidationResult {
  if (apiResult.valid) {
    return {
      valid: true,
      xpEarned: apiResult.xp_earned ?? 0,
    };
  }
  return {
    valid: false,
    xpEarned: 0,
    errorType: apiResult.error_type === "execution_error"
      ? "execution_error"
      : apiResult.error_type === "timeout"
      ? "timeout"
      : "unknown",
    userMessage: apiResult.hint ?? "El resultado no coincide con el esperado.",
    rowCountGot: apiResult.row_count_got,
    rowCountExpected: apiResult.row_count_expected,
  };
}

// ===================================================================
// Skeleton loader
// ===================================================================
function ExerciseSkeleton() {
  return (
    <div
      className="min-h-screen flex flex-col animate-pulse"
      style={{ backgroundColor: "rgb(250, 249, 247)" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-neutral-200 shadow-xs">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="w-8 h-8 bg-neutral-200 rounded-lg shrink-0" />
          <div className="hidden sm:block h-5 w-32 bg-neutral-200 rounded" />
          <div className="flex-1 hidden md:block h-4 w-48 bg-neutral-100 rounded mx-auto" />
          <div className="hidden lg:block h-4 w-64 bg-neutral-100 rounded" />
        </div>
      </header>
      {/* Content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="mb-5 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-neutral-200 rounded" />
            <div className="h-5 w-16 bg-neutral-200 rounded" />
          </div>
          <div className="h-8 w-80 bg-neutral-200 rounded" />
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-[38%] space-y-4">
            <div className="h-48 bg-white rounded-xl border border-neutral-200" />
            <div className="h-40 bg-white rounded-xl border border-neutral-200" />
            <div className="h-20 bg-white rounded-xl border border-neutral-200" />
          </aside>
          <div className="w-full md:w-[62%]">
            <div className="h-[540px] bg-white rounded-xl border border-neutral-200" />
          </div>
        </div>
      </main>
    </div>
  );
}

// ===================================================================
// Error state
// ===================================================================
function ExerciseError({
  message,
  levelId,
}: {
  message: string;
  levelId?: number;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "rgb(250, 249, 247)" }}
    >
      <div className="text-center space-y-4 max-w-sm mx-auto px-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-rose-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-800">
            No se pudo cargar el ejercicio
          </h1>
          <p className="text-sm text-neutral-500 mt-1">{message}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          {levelId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/niveles/${levelId}`}>
                <ArrowLeft className="w-4 h-4" />
                Volver al nivel
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/niveles">Ver niveles</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Character Avatar
// ===================================================================
function CharacterAvatar({
  name,
  initials,
  colorClass,
  size = "md",
}: {
  name: string;
  initials: string;
  colorClass: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0",
        sizeClasses[size],
        colorClass
      )}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

// ===================================================================
// Difficulty Badge
// ===================================================================
const DIFFICULTY_CONFIG = {
  easy: { label: "Fácil", variant: "success" as const },
  medium: { label: "Intermedio", variant: "warning" as const },
  hard: { label: "Difícil", variant: "error" as const },
};

// ===================================================================
// XP Progress Bar
// ===================================================================
function XPProgressBar({
  currentXp,
  maxXp,
  level,
}: {
  currentXp: number;
  maxXp: number;
  level: number;
}) {
  const percentage = Math.min(100, (currentXp / maxXp) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        <span className="text-sm font-bold text-neutral-800">
          Nivel {level}
        </span>
      </div>
      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-neutral-500 font-mono whitespace-nowrap">
        {currentXp} / {maxXp} XP
      </span>
    </div>
  );
}

// ===================================================================
// Success Feedback
// ===================================================================
function SuccessFeedback({
  xpEarned,
  onNext,
}: {
  xpEarned: number;
  onNext: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 animate-scale-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-emerald-800">
              Respuesta correcta
            </h3>
            {xpEarned > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 rounded-full">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-sm font-bold text-amber-700">
                  +{xpEarned} XP
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-emerald-700 mt-1">
            Excelente trabajo. Tu query retornó exactamente el resultado
            esperado.
          </p>
          <Button
            variant="success"
            size="sm"
            onClick={onNext}
            className="mt-3"
          >
            Siguiente ejercicio
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Error Feedback
// ===================================================================
function ErrorFeedback({
  result,
  attemptsCount,
}: {
  result: ValidationResult;
  attemptsCount: number;
}) {
  return (
    <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-5 animate-scale-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
          <XCircle className="w-5 h-5 text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-rose-800">
              Resultado incorrecto
            </h3>
            <Badge variant="neutral" size="sm">
              Intento {attemptsCount}
            </Badge>
          </div>
          <p className="text-sm text-rose-700 mt-1">
            {result.userMessage ?? "El resultado no coincide con el esperado."}
          </p>
          {result.rowCountGot !== undefined &&
            result.rowCountExpected !== undefined && (
              <div className="mt-2 flex items-center gap-3 text-xs font-mono">
                <span className="text-rose-600">
                  Tus filas: <strong>{result.rowCountGot}</strong>
                </span>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-600">
                  Esperadas: <strong>{result.rowCountExpected}</strong>
                </span>
              </div>
            )}
          {attemptsCount >= 3 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Se ha activado la primera pista automáticamente.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Breadcrumb
// ===================================================================
function Breadcrumb({
  exercise,
}: {
  exercise: ExerciseDetail;
}) {
  return (
    <nav
      className="flex items-center gap-1.5 text-sm text-neutral-500"
      aria-label="Breadcrumb"
    >
      {exercise.level_id != null ? (
        <Link
          href={`/niveles/${exercise.level_id}`}
          className="hover:text-neutral-800 transition-colors"
        >
          Nivel {exercise.level_id}
        </Link>
      ) : (
        <Link href="/niveles" className="hover:text-neutral-800 transition-colors">
          Niveles
        </Link>
      )}
      <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
      <span className="text-neutral-800 font-medium truncate max-w-[200px]">
        {exercise.title}
      </span>
    </nav>
  );
}

// ===================================================================
// Briefing Card (left panel)
// ===================================================================

/** Avatares visuales para los personajes del equipo ShopSphere */
const CHARACTER_AVATARS: Record<
  string,
  { initials: string; colorClass: string; role: string }
> = {
  valentina: {
    initials: "VT",
    colorClass: "bg-violet-100 text-violet-700",
    role: "Head of Analytics",
  },
  sofia: {
    initials: "SR",
    colorClass: "bg-pink-100 text-pink-700",
    role: "Head of Marketing",
  },
  diego: {
    initials: "DM",
    colorClass: "bg-blue-100 text-blue-700",
    role: "Head of Operations",
  },
  marco: {
    initials: "MJ",
    colorClass: "bg-amber-100 text-amber-700",
    role: "CEO y cofundador",
  },
  ana: {
    initials: "AC",
    colorClass: "bg-emerald-100 text-emerald-700",
    role: "Head of Finance",
  },
};

const DEFAULT_AVATAR = {
  initials: "SS",
  colorClass: "bg-primary-100 text-primary-700",
  role: "ShopSphere Team",
};

function BriefingCard({ exercise }: { exercise: ExerciseDetail }) {
  const { user } = useAuth();
  const diffConfig = DIFFICULTY_CONFIG[exercise.difficulty] ?? DIFFICULTY_CONFIG.easy;

  const replaceStudentPlaceholder = (text: string) => {
    if (!text) return "";
    const name = user?.username 
      ? user.username.charAt(0).toUpperCase() + user.username.slice(1) 
      : "Estudiante";
    return text
      .replace(/\[[Ee]studiante\]/g, name)
      .replace(/\[usuario de Slack del estudiante\]/g, name)
      .replace(/al estudiante/gi, `a ${name}`)
      .replace(/del estudiante/gi, `de ${name}`);
  };

  // El campo description actúa como briefing narrativo
  const briefingText = replaceStudentPlaceholder(exercise.description ?? "");
  const briefingLines = briefingText.split("\n").filter(Boolean);

  // Inferir personaje desde la descripción (si menciona "Vale", "Diego", etc.)
  const descLower = briefingText.toLowerCase();
  const characterKey = Object.keys(CHARACTER_AVATARS).find((k) =>
    descLower.includes(k)
  );
  const avatarData = characterKey
    ? CHARACTER_AVATARS[characterKey]
    : DEFAULT_AVATAR;
  const avatarName = characterKey
    ? characterKey.charAt(0).toUpperCase() + characterKey.slice(1)
    : "ShopSphere";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* Email-style briefing header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-neutral-50 border-b border-neutral-200">
        <CharacterAvatar
          name={avatarName}
          initials={avatarData.initials}
          colorClass={avatarData.colorClass}
          size="md"
        />
        <div>
          <p className="text-sm font-semibold text-neutral-800">{avatarName}</p>
          <p className="text-xs text-neutral-500">{avatarData.role}</p>
        </div>
        <Badge variant={diffConfig.variant} size="sm" className="ml-auto">
          {diffConfig.label}
        </Badge>
      </div>

      {/* Briefing body */}
      <div className="px-5 py-4">
        {briefingLines.length > 0 ? (
          briefingLines.map((line, i) => {
            const isSender = line.startsWith("—") || line.startsWith("-");
            return (
              <p
                key={i}
                className={cn(
                  "text-sm leading-relaxed",
                  isSender
                    ? "text-neutral-500 italic mt-3"
                    : "text-neutral-700 mt-2 first:mt-0"
                )}
              >
                {line}
              </p>
            );
          })
        ) : (
          <p className="text-sm text-neutral-400 italic">
            Sin descripción disponible.
          </p>
        )}
      </div>
    </div>
  );
}

// ===================================================================
// Instructions Card (left panel)
// ===================================================================
function InstructionsCard({ exercise }: { exercise: ExerciseDetail }) {
  const { user } = useAuth();

  const replaceStudentPlaceholder = (text: string) => {
    if (!text) return "";
    const name = user?.username 
      ? user.username.charAt(0).toUpperCase() + user.username.slice(1) 
      : "Estudiante";
    return text
      .replace(/\[[Ee]studiante\]/g, name)
      .replace(/\[usuario de Slack del estudiante\]/g, name)
      .replace(/al estudiante/gi, `a ${name}`)
      .replace(/del estudiante/gi, `de ${name}`);
  };

  const renderInstructions = (text: string) => {
    if (!text) return null;
    const replacedText = replaceStudentPlaceholder(text);
    const lines = replacedText.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p
            key={i}
            className="font-semibold text-neutral-800 text-sm mt-3 first:mt-0"
          >
            {line.slice(2, -2)}
          </p>
        );
      }
      if (line.startsWith("- ")) {
        const content = line.slice(2);
        const parts = content.split(/`([^`]+)`/);
        return (
          <li
            key={i}
            className="text-sm text-neutral-700 leading-relaxed ml-4"
          >
            {parts.map((part, j) =>
              j % 2 === 0 ? (
                <span key={j}>{part}</span>
              ) : (
                <code
                  key={j}
                  className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-violet-700 border border-neutral-200"
                >
                  {part}
                </code>
              )
            )}
          </li>
        );
      }
      if (line.includes("`")) {
        const parts = line.split(/`([^`]+)`/);
        return (
          <p key={i} className="text-sm text-neutral-700 leading-relaxed mt-2">
            {parts.map((part, j) =>
              j % 2 === 0 ? (
                <span key={j}>{part}</span>
              ) : (
                <code
                  key={j}
                  className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-violet-700 border border-neutral-200"
                >
                  {part}
                </code>
              )
            )}
          </p>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-1" />;
      return (
        <p
          key={i}
          className="text-sm text-neutral-700 leading-relaxed mt-2 first:mt-0"
        >
          {line}
        </p>
      );
    });
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-neutral-50 border-b border-neutral-200">
        <BookOpen className="w-4 h-4 text-neutral-500" />
        <span className="text-sm font-semibold text-neutral-700">
          Instrucciones
        </span>
      </div>
      <div className="px-5 py-4">
        <ul className="space-y-1">
          {renderInstructions(exercise.instructions)}
        </ul>
      </div>
    </div>
  );
}

// ===================================================================
// Attempts & XP Indicator
// ===================================================================
function ProgressIndicator({
  attemptsCount,
  xpReward,
  hintsUsed,
  totalHints,
}: {
  attemptsCount: number;
  xpReward: number;
  hintsUsed: number;
  totalHints: number;
}) {
  const currentXp = Math.max(
    Math.floor(xpReward * 0.25),
    xpReward - hintsUsed * 5 - Math.max(0, attemptsCount - 1) * 2
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-neutral-100">
        <div className="flex flex-col items-center py-3 px-2">
          <div className="flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Intentos</span>
          </div>
          <span className="text-xl font-bold text-neutral-800 mt-1">
            {attemptsCount}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 px-2">
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-neutral-500">XP ganable</span>
          </div>
          <span className="text-xl font-bold text-amber-600 mt-1">
            {currentXp}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 px-2">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-500">Pistas</span>
          </div>
          <span className="text-xl font-bold text-neutral-800 mt-1">
            {hintsUsed}/{totalHints}
          </span>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Main Page Component
// ===================================================================
function EjercicioContent({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [nextExerciseId, setNextExerciseId] = useState<string | null>(null);

  // Runtime state
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");

  const feedbackRef = useRef<HTMLDivElement>(null);
  const hintPanelRef = useRef<HTMLDivElement>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCorrect = validationResult?.valid === true;
  const isIncorrect = validationResult !== null && !validationResult.valid;

  // Auto-activate hint 1 after 3 failed attempts
  const autoHintLevel = attemptsCount >= 3 && hintsUsed === 0 ? 1 : hintsUsed;
  const effectiveHintsUsed = Math.max(hintsUsed, autoHintLevel);

  // ── Cargar ejercicio desde API ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    // Reset local states for the new exercise
    setExercise(null);
    setHints([]);
    setAttemptsCount(0);
    setHintsUsed(0);
    setValidationResult(null);
    setIsVerifying(false);
    setCurrentQuery("");
    setNextExerciseId(null);

    async function fetchExercise() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await api.exercises.getDetail(exerciseId);
        if (cancelled) return;

        setExercise(data);
        setHints(mapApiHintsToHintObjects(data.hints));

        // Restaurar progreso previo
        if (data.progress) {
          setAttemptsCount(data.progress.attempts_count);
          setHintsUsed(data.progress.hints_used);
          if (data.progress.last_query) {
            setCurrentQuery(data.progress.last_query);
          }
        }

        // Buscar el siguiente ejercicio del nivel
        if (data.level_id != null) {
          try {
            const levelData = await api.levels.getDetail(data.level_id);
            if (!cancelled) {
              const sortedExercises = [...levelData.exercises].sort(
                (a, b) => a.order_index - b.order_index
              );
              const currentIndex = sortedExercises.findIndex(
                (ex) => ex.id === data.id
              );
              if (currentIndex !== -1 && currentIndex + 1 < sortedExercises.length) {
                setNextExerciseId(sortedExercises[currentIndex + 1].id);
              }
            }
          } catch (err) {
            console.error("Error al calcular el siguiente ejercicio:", err);
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setLoadError("Este ejercicio no existe o no está publicado.");
          } else if (err.status === 401) {
            setLoadError(
              "Necesitas iniciar sesión para acceder a este ejercicio."
            );
          } else {
            setLoadError(err.message);
          }
        } else {
          setLoadError(
            "Error al cargar el ejercicio. Por favor intenta de nuevo."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchExercise();
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  // ── Auto-save del borrador (debounce 2s) ──────────────────────────────────
  const scheduleDraftSave = useCallback(
    (query: string) => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        // Guardamos en background; silenciamos errores para no interrumpir al usuario
        api.exercises.saveDraft(exerciseId, query).catch(() => {});
      }, 2000);
    },
    [exerciseId]
  );

  // ── Scroll a feedback ────────────────────────────────────────────────────
  useEffect(() => {
    if (validationResult && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [validationResult]);

  // ── Submit — validar contra el API real ───────────────────────────────────
  const handleSubmit = async (query: string) => {
    if (!query.trim() || !exercise) return;
    setIsVerifying(true);
    setCurrentQuery(query);

    // Cancelar el timer de draft pendiente para no solapar con el submit
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

    try {
      const apiResult = await api.playground.validate(exerciseId, query);
      const newAttempts = attemptsCount + 1;
      setAttemptsCount(newAttempts);

      const mapped = mapApiValidationResult(apiResult);
      setValidationResult(mapped);

      // Auto-hint después de 3 intentos fallidos
      if (!mapped.valid && newAttempts >= 3 && hintsUsed === 0) {
        setHintsUsed(1);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al verificar. Intenta de nuevo.";

      setValidationResult({
        valid: false,
        xpEarned: 0,
        errorType: "unknown",
        userMessage: message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Solicitar pista ───────────────────────────────────────────────────────
  const handleRequestHint = () => {
    if (!exercise) return;
    const nextHint = Math.min(hintsUsed + 1, hints.length);
    setHintsUsed(nextHint);

    // Notificar al backend (en background)
    api.exercises.requestHint(exerciseId).catch(() => {});

    setTimeout(() => {
      hintPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 100);
  };

  // ── Manejar cambios del editor (para auto-save) ───────────────────────────
  const handleQueryChange = useCallback(
    (query: string) => {
      setCurrentQuery(query);
      scheduleDraftSave(query);
    },
    [scheduleDraftSave]
  );

  // ── Estados de carga / error ──────────────────────────────────────────────
  if (isLoading) return <ExerciseSkeleton />;

  if (loadError || !exercise) {
    return <ExerciseError message={loadError ?? "Ejercicio no disponible."} />;
  }

  const diffConfig =
    DIFFICULTY_CONFIG[exercise.difficulty] ?? DIFFICULTY_CONFIG.easy;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "rgb(250, 249, 247)" }}
    >
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 bg-white border-b border-neutral-200 shadow-xs">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-neutral-900 hidden sm:inline">
              ShopSphere{" "}
              <span className="text-primary-500">SQL</span>
            </span>
          </Link>

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0 hidden md:block">
            <Breadcrumb exercise={exercise} />
          </div>

          {/* XP Progress — usa datos del progreso del ejercicio si están disponibles */}
          <div className="hidden lg:block w-64">
            <XPProgressBar
              currentXp={exercise.progress?.xp_earned ?? 0}
              maxXp={exercise.xp_reward}
              level={exercise.level_id ?? 1}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Exercise Title */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            {exercise.order_index != null && (
              <Badge variant="neutral" size="sm">
                Ejercicio {exercise.order_index}
              </Badge>
            )}
            <Badge variant={diffConfig.variant} size="sm">
              {diffConfig.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {exercise.title}
          </h1>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* ── Left Panel: Briefing + Context (38%) ── */}
          <aside className="w-full md:w-[38%] space-y-4 md:sticky md:top-[73px]">
            {/* Briefing */}
            <BriefingCard exercise={exercise} />

            {/* Technical instructions */}
            <InstructionsCard exercise={exercise} />

            {/* Progress stats */}
            <ProgressIndicator
              attemptsCount={attemptsCount}
              xpReward={exercise.xp_reward}
              hintsUsed={effectiveHintsUsed}
              totalHints={hints.length}
            />

            {/* Hints — desktop */}
            <div ref={hintPanelRef} className="hidden md:block">
              <HintPanel
                hints={hints}
                hintsUsed={effectiveHintsUsed}
                maxHints={hints.length}
                onRequestHint={handleRequestHint}
              />
            </div>
          </aside>

          {/* ── Right Panel: Playground (62%) ── */}
          <div className="w-full md:w-[62%] space-y-4">
            {/* Playground */}
            <div className="min-h-[540px]">
              <PlaygroundContainer
                exerciseId={exercise.id}
                onSubmit={handleSubmit}
                onQueryChange={handleQueryChange}
                onHint={handleRequestHint}
                initialQuery={
                  exercise.progress?.last_query ?? undefined
                }
              />
            </div>

            {/* Verify Button */}
            {!isCorrect && (
              <Button
                variant="primary"
                size="lg"
                className="w-full text-base font-semibold shadow-primary"
                onClick={() =>
                  handleSubmit(currentQuery)
                }
                loading={isVerifying}
                disabled={isVerifying || !currentQuery.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Verificar respuesta
                  </>
                )}
              </Button>
            )}

            {/* Feedback Area */}
            <div ref={feedbackRef}>
              {isCorrect && validationResult && (
                <SuccessFeedback
                  xpEarned={validationResult.xpEarned}
                  onNext={() => {
                    if (nextExerciseId) {
                      router.push(`/ejercicio/${nextExerciseId}`);
                    } else {
                      router.push(
                        exercise.level_id
                          ? `/niveles/${exercise.level_id}`
                          : "/niveles"
                      );
                    }
                  }}
                />
              )}
              {isIncorrect && validationResult && (
                <ErrorFeedback
                  result={validationResult}
                  attemptsCount={attemptsCount}
                />
              )}
            </div>

            {/* Hints — mobile (below playground) */}
            <div className="md:hidden" ref={hintPanelRef}>
              <HintPanel
                hints={hints}
                hintsUsed={effectiveHintsUsed}
                maxHints={hints.length}
                onRequestHint={handleRequestHint}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white mt-12">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-neutral-400">
          <span>ShopSphere SQL Course</span>
          <Link
            href={exercise.level_id ? `/niveles/${exercise.level_id}` : "/niveles"}
            className="flex items-center gap-1 hover:text-neutral-600 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            {exercise.level_id
              ? `Volver al nivel ${exercise.level_id}`
              : "Ver niveles"}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function EjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <EjercicioContent exerciseId={id} />;
}
