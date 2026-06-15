"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Star,
  Flame,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  BookOpen,
  AlertCircle,
  Loader2,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { XPBar } from "@/components/gamification/XPBar";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import {
  api,
  type DashboardResponse,
  type LevelCompletion,
  type RecentActivity,
  ApiError,
} from "@/lib/api-client";

// ===================================================================
// Skeleton
// ===================================================================
function DashboardSkeleton() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-pulse">
      {/* Mobile XP */}
      <div className="lg:hidden bg-white rounded-xl border border-neutral-200 shadow-xs p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-neutral-200 rounded-full" />
          <div className="space-y-1">
            <div className="h-4 w-28 bg-neutral-200 rounded" />
            <div className="h-3 w-20 bg-neutral-100 rounded" />
          </div>
        </div>
        <div className="h-3 bg-neutral-100 rounded-full" />
      </div>

      {/* Greeting */}
      <div className="space-y-1">
        <div className="h-7 w-48 bg-neutral-200 rounded" />
        <div className="h-4 w-72 bg-neutral-100 rounded" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-neutral-200 shadow-xs p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-neutral-100 rounded-lg" />
            <div className="space-y-1">
              <div className="h-6 w-12 bg-neutral-200 rounded" />
              <div className="h-3 w-28 bg-neutral-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Lower */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <div className="h-5 w-36 bg-neutral-200 rounded" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-white rounded-lg border border-neutral-200"
              />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-3">
          <div className="h-5 w-36 bg-neutral-200 rounded" />
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs px-4 py-2 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 bg-neutral-100 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-4/5 bg-neutral-100 rounded" />
                  <div className="h-3 w-24 bg-neutral-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Error state
// ===================================================================
function DashboardError({ message }: { message: string }) {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-rose-500" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-neutral-800">
          No se pudo cargar el dashboard
        </p>
        <p className="text-sm text-neutral-500 mt-1">{message}</p>
      </div>
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

// ===================================================================
// Stat Card
// ===================================================================
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-4 flex items-center gap-4">
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          color
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-neutral-900 leading-none">
          {value}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ===================================================================
// Level Progress Row
// ===================================================================
function LevelProgressRow({ level }: { level: LevelCompletion }) {
  const pct = level.completion_pct;

  const status =
    pct === 100
      ? "completed"
      : pct > 0
      ? "in_progress"
      : "not_started";

  const statusConfig = {
    completed: { badge: "success" as const, label: "Completado" },
    in_progress: { badge: "primary" as const, label: "En progreso" },
    not_started: { badge: "neutral" as const, label: "No iniciado" },
  }[status];

  return (
    <Link
      href={`/niveles/${level.level_id}`}
      className="block group rounded-lg border border-neutral-200 bg-white px-4 py-3.5 shadow-xs hover:border-primary-200 hover:shadow-sm transition-all duration-150"
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0",
              status === "completed"
                ? "bg-emerald-100 text-emerald-700"
                : status === "in_progress"
                ? "bg-primary-100 text-primary-700"
                : "bg-neutral-100 text-neutral-500"
            )}
          >
            {level.level_id}
          </div>
          <span className="text-sm font-semibold text-neutral-800 truncate group-hover:text-primary-700 transition-colors">
            {level.level_name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusConfig.badge} size="xs">
            {statusConfig.label}
          </Badge>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-primary-400 transition-colors" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              status === "completed" ? "bg-emerald-400" : "bg-primary-400"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-mono text-neutral-400 shrink-0">
          {level.exercises_completed}/{level.exercises_total}
        </span>
      </div>
    </Link>
  );
}

// ===================================================================
// Recent Activity Item
// ===================================================================
function RecentItem({ item }: { item: RecentActivity }) {
  const statusIcon = {
    completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    in_progress: <Clock className="w-4 h-4 text-primary-400" />,
    not_started: <BookOpen className="w-4 h-4 text-neutral-300" />,
  }[item.status];

  const timeLabel = item.completed_at
    ? new Date(item.completed_at).toLocaleDateString("es-CO", {
        month: "short",
        day: "numeric",
      })
    : item.last_attempt_at
    ? new Date(item.last_attempt_at).toLocaleDateString("es-CO", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <Link
      href={`/ejercicio/${item.exercise_id}`}
      className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 -mx-4 px-4 transition-colors rounded-lg group"
    >
      <div className="shrink-0">{statusIcon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate group-hover:text-primary-700 transition-colors">
          {item.exercise_title}
        </p>
        <p className="text-xs text-neutral-400">{item.level_name}</p>
      </div>
      <div className="shrink-0 text-right">
        {item.xp_earned > 0 && (
          <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Zap className="w-3 h-3" />
            +{item.xp_earned}
          </div>
        )}
        {timeLabel && (
          <p className="text-xs text-neutral-400">{timeLabel}</p>
        )}
      </div>
    </Link>
  );
}

// ===================================================================
// Dashboard Content — conectado al API real
// ===================================================================
function DashboardContent() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const dashboard = await api.users.getDashboard();
        if (!cancelled) setData(dashboard);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 401) {
            // Sin sesión — redirigir al login
            router.push("/login");
            return;
          }
          setError(err.message);
        } else {
          setError("Error al cargar el dashboard. Intenta de nuevo.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchDashboard();
    return () => { cancelled = true; };
  }, [router]);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError message={error ?? "Error desconocido."} />;

  const { user, level_progress, stats, recent_activity, level_completion } = data;

  // Nivel en progreso = el primero con completion_pct > 0 y < 100, o el primero no iniciado
  const currentLevelInProgress = level_completion.find(
    (l) => l.completion_pct > 0 && l.completion_pct < 100
  );
  const nextLevel = currentLevelInProgress ?? level_completion.find((l) => l.completion_pct === 0);

  const xpForCurrentLevel = level_progress.xp_in_current_level;
  const xpToNextLevel = level_progress.xp_to_next_level ?? 0;
  const xpTotal = xpForCurrentLevel + (level_progress.xp_to_next_level !== null ? xpToNextLevel : 0);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* XP section — mobile only (desktop está en sidebar) */}
      <div className="lg:hidden bg-white rounded-xl border border-neutral-200 shadow-xs p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                {user.username}
              </p>
              <p className="text-xs text-neutral-400">{user.xp_total} XP total</p>
            </div>
          </div>
          {/* StreakBadge usa datos del usuario — si no hay streak, omitimos */}
          <StreakBadge streakDays={0} size="sm" />
        </div>
        <XPBar
          xpTotal={user.xp_total}
          currentLevel={user.current_level}
          xpRequired={xpForCurrentLevel}
          nextLevelXp={xpToNextLevel > 0 ? xpToNextLevel : user.xp_total + 100}
        />
      </div>

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Hola, {user.username}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Continúa donde lo dejaste — estás haciendo un gran progreso.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/diagnostic")}
          className="self-start sm:self-center gap-1.5 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 transition-all shrink-0"
        >
          <Brain className="w-4 h-4 text-primary-500" />
          Volver a evaluar
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={CheckCircle2}
          label="Ejercicios completados"
          value={stats.exercises_completed}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Flame}
          label="Tasa de completitud"
          value={`${stats.completion_rate_pct}%`}
          color="bg-orange-50 text-orange-500"
        />
        <StatCard
          icon={TrendingUp}
          label="XP total ganado"
          value={`+${user.xp_total}`}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Two-column lower */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Level progress */}
        <section className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-400" />
              Progreso por nivel
            </h2>
            <Link
              href="/niveles"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
            >
              Ver todos
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {level_completion.length > 0 ? (
              level_completion.map((level) => (
                <LevelProgressRow key={level.level_id} level={level} />
              ))
            ) : (
              <div className="py-8 text-center">
                <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">
                  Aún no has empezado ningún nivel.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Recent activity */}
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Actividad reciente
          </h2>
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs px-4 py-2">
            {recent_activity.length > 0 ? (
              recent_activity.map((item) => (
                <RecentItem key={item.exercise_id} item={item} />
              ))
            ) : (
              <div className="py-6 text-center">
                <Clock className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">
                  Sin actividad reciente todavía.
                </p>
              </div>
            )}
          </div>

          {nextLevel && (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() =>
                router.push(`/niveles/${nextLevel.level_id}`)
              }
            >
              {currentLevelInProgress
                ? `Continuar Nivel ${nextLevel.level_id}`
                : `Comenzar Nivel ${nextLevel.level_id}`}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}

// ===================================================================
// Export — usa AppLayout con sidebar
// ===================================================================
export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardContent />
    </AppLayout>
  );
}
