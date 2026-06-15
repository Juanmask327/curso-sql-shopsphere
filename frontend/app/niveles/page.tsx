"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Lock,
  ChevronRight,
  Zap,
  BookOpen,
  Star,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { api, type LevelPublic, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";

// ===================================================================
// Types
// ===================================================================

type LevelDifficulty = "beginner" | "intermediate" | "advanced" | "expert";

/**
 * LevelPublic no incluye `status` — el progreso viene del contexto del usuario.
 * Derivamos el status desde exercises_count y completed_count si la API los expone.
 * Por ahora, el status se infiere desde el orden y los niveles completados.
 */

const DIFFICULTY_CONFIG: Record<
  LevelDifficulty,
  { label: string; variant: "success" | "primary" | "warning" | "error" }
> = {
  beginner: { label: "Principiante", variant: "success" },
  intermediate: { label: "Intermedio", variant: "primary" },
  advanced: { label: "Avanzado", variant: "warning" },
  expert: { label: "Experto", variant: "error" },
};

/**
 * Infiere la dificultad de un nivel según su order_index.
 * El backend no expone difficulty en LevelPublic — mapeamos por posición.
 */
function inferDifficulty(orderIndex: number): LevelDifficulty {
  if (orderIndex <= 2) return "beginner";
  if (orderIndex <= 4) return "intermediate";
  if (orderIndex <= 6) return "advanced";
  return "expert";
}

// ===================================================================
// Skeleton
// ===================================================================
function LevelsSkeleton() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-neutral-200 rounded" />
        <div className="h-4 w-96 bg-neutral-100 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden"
          >
            <div className="h-1 bg-neutral-100" />
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg" />
                <div className="w-20 h-5 bg-neutral-100 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-neutral-200 rounded" />
                <div className="h-4 w-full bg-neutral-100 rounded" />
                <div className="h-4 w-5/6 bg-neutral-100 rounded" />
              </div>
              <div className="h-8 bg-neutral-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================================================================
// Level Card
// ===================================================================
function LevelCard({
  level,
  isLocked,
}: {
  level: LevelPublic;
  isLocked: boolean;
}) {
  const difficulty = inferDifficulty(level.order_index);
  const diffConfig = DIFFICULTY_CONFIG[difficulty];

  return (
    <div
      className={cn(
        "relative bg-white rounded-xl border shadow-xs overflow-hidden",
        "transition-all duration-200",
        isLocked
          ? "border-neutral-200 opacity-70"
          : "border-neutral-200 hover:border-primary-200 hover:shadow-sm"
      )}
    >
      {/* Top color bar */}
      <div
        className={cn(
          "h-1",
          isLocked
            ? "bg-neutral-200"
            : "bg-gradient-to-r from-primary-400 to-primary-500"
        )}
      />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shrink-0",
              isLocked
                ? "bg-neutral-100 text-neutral-400"
                : "bg-primary-50 text-primary-700"
            )}
          >
            {isLocked ? (
              <Lock className="w-4 h-4 text-neutral-400" />
            ) : (
              level.order_index
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 shrink-0">
            <Badge variant={diffConfig.variant} size="xs">
              {diffConfig.label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-neutral-900 leading-tight">
            Nivel {level.order_index} — {level.name}
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            {level.description}
          </p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {level.exercises_count} ejercicios
          </span>
          {level.xp_required > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              Requiere {level.xp_required} XP
            </span>
          )}
        </div>

        {/* CTA */}
        {!isLocked ? (
          <Button
            variant="primary"
            size="sm"
            asChild
            className="w-full"
          >
            <Link href={`/niveles/${level.id}`}>
              Ir al nivel
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
            <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <p className="text-xs text-neutral-500">
              Necesitas {level.xp_required} XP para desbloquear
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================================================
// Page Content
// ===================================================================
function NivelesContent() {
  const [levels, setLevels] = useState<LevelPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Admin e instructor ven todo desbloqueado
  const isPrivileged = user?.role === 'admin' || user?.role === 'instructor';

  useEffect(() => {
    let cancelled = false;

    async function fetchLevels() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.levels.list();
        if (!cancelled) {
          // Ordenar por order_index
          const sorted = [...data].sort(
            (a, b) => a.order_index - b.order_index
          );
          setLevels(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            // No autenticado — mostrar igualmente con todos desbloqueados
            // (el backend puede devolver la lista pública sin auth)
            setError(null);
          } else {
            setError("No se pudieron cargar los niveles. Intenta de nuevo.");
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchLevels();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <LevelsSkeleton />;

  if (error) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-rose-500" />
        </div>
        <p className="text-neutral-700 font-medium">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
          Niveles del curso
        </h1>
        <p className="text-neutral-500 mt-2 max-w-lg">
          Cada nivel desbloquea habilidades SQL más avanzadas. Completa los
          ejercicios para ganar XP y subir de nivel.
        </p>
      </div>

      {/* Grid of level cards */}
      {levels.length === 0 ? (
        <div className="py-16 text-center">
          <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">
            No hay niveles publicados todavía.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {levels.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              isLocked={
                isPrivileged
                  ? false
                  : user
                    ? (user.xpTotal ?? 0) < level.xp_required
                    : level.xp_required > 0
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NivelesPage() {
  return (
    <AppLayout>
      <NivelesContent />
    </AppLayout>
  );
}
