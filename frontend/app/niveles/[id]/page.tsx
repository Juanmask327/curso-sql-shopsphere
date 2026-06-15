"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  BookOpen,
  Lock,
  Play,
  Zap,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { api, type LevelDetail, type LevelPublic, type ExerciseInLevel, type Lesson, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import { marked } from "marked";

marked.use({ breaks: true, gfm: true });

// ===================================================================
// Difficulty config
// ===================================================================

type Difficulty = "easy" | "medium" | "hard";
type ExerciseStatus = "not_started" | "in_progress" | "completed";

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; variant: "success" | "primary" | "warning" | "error" }
> = {
  easy: { label: "Fácil", variant: "success" },
  medium: { label: "Intermedio", variant: "warning" },
  hard: { label: "Difícil", variant: "error" },
};

// ===================================================================
// Skeleton loader
// ===================================================================
function LevelDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-neutral-200 rounded" />
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-5">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-neutral-200 rounded" />
          <div className="h-7 w-64 bg-neutral-200 rounded" />
          <div className="h-4 w-full bg-neutral-100 rounded" />
          <div className="h-4 w-3/4 bg-neutral-100 rounded" />
        </div>
        <div className="h-2.5 bg-neutral-100 rounded-full" />
        <div className="flex gap-3">
          <div className="h-7 w-24 bg-neutral-100 rounded-full" />
          <div className="h-7 w-24 bg-neutral-100 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-5 w-24 bg-neutral-200 rounded" />
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100 last:border-0">
              <div className="w-5 h-4 bg-neutral-100 rounded" />
              <div className="w-5 h-5 bg-neutral-100 rounded-full" />
              <div className="flex-1 h-4 bg-neutral-100 rounded" />
              <div className="w-12 h-5 bg-neutral-100 rounded" />
              <div className="w-8 h-4 bg-neutral-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Exercise Row
// ===================================================================
function ExerciseRow({
  exercise,
  isFirstIncomplete,
}: {
  exercise: ExerciseInLevel;
  isFirstIncomplete: boolean;
}) {
  const diffConfig = DIFFICULTY_CONFIG[exercise.difficulty as Difficulty];
  const status = (exercise.progress?.status ?? "not_started") as ExerciseStatus;
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";

  const statusIcon = {
    completed: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    in_progress: <Clock className="w-5 h-5 text-primary-400 shrink-0" />,
    not_started: <BookOpen className="w-5 h-5 text-neutral-300 shrink-0" />,
  }[status];

  const completedAt = exercise.progress?.completed_at
    ? new Date(exercise.progress.completed_at).toLocaleDateString("es-CO")
    : null;

  return (
    <Link
      href={`/ejercicio/${exercise.id}`}
      className={cn(
        "flex items-center gap-4 px-5 py-4 transition-all duration-150 group",
        "border-b border-neutral-100 last:border-0",
        isCompleted ? "hover:bg-emerald-50/50" : "hover:bg-neutral-50"
      )}
    >
      <span className="text-sm font-mono text-neutral-300 w-5 text-right shrink-0">
        {exercise.order_index}
      </span>

      {statusIcon}

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate group-hover:text-primary-700 transition-colors",
            isCompleted
              ? "text-neutral-500 line-through decoration-neutral-300"
              : "text-neutral-800"
          )}
        >
          {exercise.title}
        </p>
        {completedAt && (
          <p className="text-xs text-neutral-400 mt-0.5">
            Completado el {completedAt}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {diffConfig && (
          <Badge variant={diffConfig.variant} size="xs">
            {diffConfig.label}
          </Badge>
        )}
        <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
          <Zap className="w-3 h-3" />
          {exercise.xp_reward}
        </div>
        {isFirstIncomplete && (
          <Button variant="primary" size="xs" asChild>
            <span>
              <Play className="w-3 h-3" />
              {isInProgress ? "Continuar" : "Empezar"}
            </span>
          </Button>
        )}
        <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
      </div>
    </Link>
  );
}

// ===================================================================
// Level Detail Content
// ===================================================================
function LevelDetailContent({ levelId }: { levelId: number }) {
  const [level, setLevel] = useState<LevelDetail | null>(null);
  const [allLevels, setAllLevels] = useState<LevelPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"theory" | "exercises" | "project">("theory");
  const [selectedLessonIdx, setSelectedLessonIdx] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { user } = useAuth();
  const isPrivileged = user?.role === 'admin' || user?.role === 'instructor';

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

  const currentLevelIndex = useMemo(() => {
    if (!level) return -1;
    return allLevels.findIndex((l) => l.id === level.id);
  }, [allLevels, level]);

  const prevLevel = currentLevelIndex > 0 ? allLevels[currentLevelIndex - 1] : null;
  const nextLevel = currentLevelIndex >= 0 && currentLevelIndex < allLevels.length - 1 ? allLevels[currentLevelIndex + 1] : null;

  const nextLevelLocked = useMemo(() => {
    if (!nextLevel) return false;
    return isPrivileged
      ? false
      : user
        ? (user.xpTotal ?? 0) < nextLevel.xp_required
        : nextLevel.xp_required > 0;
  }, [nextLevel, isPrivileged, user]);

  const sortedLessons = useMemo(
    () => [...(level?.lessons ?? [])].sort((a, b) => a.order_index - b.order_index),
    [level]
  );
  const selectedLesson = sortedLessons[selectedLessonIdx] ?? null;

  // Scroll al top del contenedor correcto DESPUÉS del re-render con la nueva lección
  useEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedLessonIdx]);

  useEffect(() => {
    if (activeTab !== "theory") {
      setScrollProgress(0);
      return;
    }

    // El contenedor que scrollea es main-content, no window
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const handleScroll = () => {
      const totalHeight = mainContent.scrollHeight - mainContent.clientHeight;
      if (totalHeight > 0) {
        const progress = (mainContent.scrollTop / totalHeight) * 100;
        setScrollProgress(progress);
      }
    };

    mainContent.addEventListener("scroll", handleScroll);
    return () => mainContent.removeEventListener("scroll", handleScroll);
  }, [activeTab, selectedLesson]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLevel() {
      setIsLoading(true);
      setError(null);
      try {
        const [data, levelsList] = await Promise.all([
          api.levels.getDetail(levelId),
          api.levels.list(),
        ]);
        if (!cancelled) {
          setLevel(data);
          setAllLevels(
            [...levelsList].sort((a, b) => a.order_index - b.order_index)
          );
          if (data.lessons && data.lessons.length > 0) {
            setSelectedLessonIdx(0);
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            if (err.status === 404) {
              setError("not_found");
            } else if (err.status === 401) {
              setError("unauthorized");
            } else {
              setError(err.message);
            }
          } else {
            setError("Error al cargar el nivel. Por favor intenta de nuevo.");
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchLevel();
    return () => { cancelled = true; };
  }, [levelId]);

  if (isLoading) return <LevelDetailSkeleton />;

  if (error === "not_found" || error === "unauthorized" || !level) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          {error === "unauthorized" ? (
            <Lock className="w-10 h-10 text-neutral-300 mx-auto" />
          ) : (
            <AlertCircle className="w-10 h-10 text-neutral-300 mx-auto" />
          )}
          <h1 className="text-xl font-bold text-neutral-700">
            {error === "not_found"
              ? "Nivel no encontrado"
              : error === "unauthorized"
              ? "Acceso restringido"
              : "No se pudo cargar el nivel"}
          </h1>
          <p className="text-neutral-500 text-sm max-w-xs mx-auto">
            {error === "not_found"
              ? "Este nivel no existe o no está disponible."
              : error === "unauthorized"
              ? "Necesitas iniciar sesión para ver este nivel."
              : error}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/niveles">Ver todos los niveles</Link>
            </Button>
            {error === "unauthorized" && (
              <Button variant="primary" size="sm" asChild>
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const total = level.exercises.length;
  const completed = level.exercises.filter(
    (e) => e.progress?.status === "completed"
  ).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const xpTotal = level.exercises.reduce((s, e) => s + e.xp_reward, 0);
  const firstIncomplete = level.exercises.find(
    (e) => e.progress?.status !== "completed"
  );



  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Barra de progreso de lectura (fija arriba) */}
      {activeTab === "theory" && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-neutral-100 z-50">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-r-full transition-all duration-75"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {/* Back link */}
      <Link
        href="/niveles"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Todos los niveles
      </Link>

      {/* Level header card */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Nivel {level.id}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              {level.name}
            </h1>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-3xl">
              {level.description}
            </p>
          </div>
          {firstIncomplete && (
            <Button
              variant="primary"
              size="md"
              asChild
              className="shrink-0 shadow-primary"
            >
              <Link href={`/ejercicio/${firstIncomplete.id}`}>
                <Play className="w-4 h-4" />
                {firstIncomplete.progress?.status === "in_progress"
                  ? "Continuar"
                  : "Comenzar"}
              </Link>
            </Button>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">
              <span className="font-semibold text-neutral-800">{completed}</span>{" "}
              de{" "}
              <span className="font-semibold text-neutral-800">{total}</span>{" "}
              ejercicios completados
            </span>
            <span className="font-bold text-primary-600">{pct}%</span>
          </div>
          <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
            <div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-full px-3 py-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            {total} ejercicios
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5">
            <Zap className="w-3.5 h-3.5" />
            Hasta {xpTotal} XP
          </div>
          {completed === total && total > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Nivel completado
            </div>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-neutral-200 gap-2">
        <button
          onClick={() => setActiveTab("theory")}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors duration-155 flex items-center gap-2",
            activeTab === "theory"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          )}
        >
          <FileText className="w-4 h-4" />
          Teoría ({level.lessons?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("exercises")}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors duration-155 flex items-center gap-2",
            activeTab === "exercises"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          )}
        >
          <BookOpen className="w-4 h-4" />
          Ejercicios ({total})
        </button>
        {level.project_content && (
          <button
            onClick={() => setActiveTab("project")}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors duration-155 flex items-center gap-2",
              activeTab === "project"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            Proyecto
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "theory" ? (
        <div className="space-y-6 animate-fade-in">
        {level.level_intro && (
          <div className="bg-gradient-to-br from-primary-50 to-violet-50 border border-primary-100 rounded-xl p-5 sm:p-6">
            <div
              className="prose prose-sm max-w-none prose-p:text-neutral-700 prose-p:leading-7 prose-p:my-2 prose-strong:text-neutral-800"
              dangerouslySetInnerHTML={{
                __html: (marked.parse(
                  replaceStudentPlaceholder(level.level_intro.replace(/^#\s+[^\n]+\n?/, '').trimStart())
                ) as string),
              }}
            />
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Columna Izquierda: Lista de Lecciones (Sticky en desktop) */}
          <aside className="w-full md:w-64 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden p-3 space-y-1 shrink-0 md:sticky md:top-6 self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-3 py-2">
              Lecciones
            </h3>
            {sortedLessons.length > 0 ? (
              sortedLessons.map((lesson) => (
                <button
                  key={lesson.order_index}
                  onClick={() => {
                    const idx = sortedLessons.findIndex(l => l.order_index === lesson.order_index);
                    if (idx >= 0) setSelectedLessonIdx(idx);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2.5 group",
                    sortedLessons[selectedLessonIdx]?.order_index === lesson.order_index
                      ? "bg-primary-50 text-primary-700 font-semibold"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-150",
                      sortedLessons[selectedLessonIdx]?.order_index === lesson.order_index
                        ? "bg-primary-100 text-primary-700"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                    )}
                  >
                    {lesson.order_index}
                  </div>
                  <span className="truncate flex-1">{lesson.title.replace(/^(##\s*)?Lección\s*\d+:\s*/i, "")}</span>
                </button>
              ))
            ) : (
              <p className="text-xs text-neutral-400 italic px-3 py-2">No hay lecciones disponibles.</p>
            )}
          </aside>

          {/* Columna Derecha: Contenido de la Lección (Ancho completo de lectura) */}
          <div className="flex-1 w-full bg-white rounded-xl border border-neutral-200 shadow-sm p-6 sm:p-8 min-w-0">
            {selectedLesson ? (
              <div className="space-y-6">
                <div className="pb-4 border-b border-neutral-100 mb-6">
                  <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest mb-1">
                    <span className="text-primary-500">
                      Lección {selectedLesson.order_index} de {level.lessons?.length ?? 0}
                    </span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-neutral-400 flex items-center gap-1 normal-case font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {Math.max(1, Math.ceil(selectedLesson.content.split(/\s+/).length / 200))} min de lectura
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-snug mt-1">
                    {selectedLesson.title.replace(/^(##\s*)?Lección\s*\d+:\s*/i, "")}
                  </h2>
                </div>
                
                {/* Contenido Renderizado */}
                <div
                  className="prose prose-neutral max-w-none prose-sm sm:prose-base prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-neutral-900 prose-h1:text-xl prose-h1:font-bold prose-h2:text-lg prose-h2:font-semibold prose-h2:text-neutral-800 prose-h3:text-base prose-h3:font-semibold prose-h3:text-neutral-700 prose-p:text-neutral-600 prose-p:leading-7 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:bg-primary-50 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-neutral-600 prose-code:bg-neutral-100 prose-code:text-violet-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-pre:rounded-xl prose-pre:shadow-sm prose-strong:text-neutral-800 prose-strong:font-semibold prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-hr:border-neutral-100 prose-hr:my-8 prose-table:w-full prose-th:bg-neutral-50 prose-th:text-neutral-800 prose-th:font-semibold prose-th:px-4 prose-th:py-2.5 prose-th:text-sm prose-th:text-left prose-td:px-4 prose-td:py-2.5 prose-td:text-sm prose-td:text-neutral-600 text-neutral-700"
                  dangerouslySetInnerHTML={{
                    __html: (marked.parse(
                      replaceStudentPlaceholder(selectedLesson.content
                        .replace(/^#\s+[^\n]+\n?/, '')
                        .trimStart())
                    ) as string)
                      .replace(/<table/g, '<div class="overflow-x-auto my-6 rounded-lg border border-neutral-200 shadow-xs"><table')
                      .replace(/<\/table>/g, '</table></div>'),
                  }}
                />

                {/* Navegación entre lecciones y niveles */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-neutral-100 mt-8">
                  {/* Botón Anterior */}
                  {selectedLessonIdx > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLessonIdx(selectedLessonIdx - 1)}
                      className="flex items-center gap-1.5 w-full sm:w-auto"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Lección anterior
                    </Button>
                  ) : prevLevel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex items-center gap-1.5 w-full sm:w-auto text-neutral-600 hover:text-neutral-900"
                    >
                      <Link href={`/niveles/${prevLevel.id}`}>
                        <ChevronLeft className="w-4 h-4" />
                        Nivel anterior ({prevLevel.name})
                      </Link>
                    </Button>
                  ) : (
                    <div className="hidden sm:block w-36" />
                  )}

                  {/* Botón Siguiente */}
                  {selectedLessonIdx < sortedLessons.length - 1 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedLessonIdx(selectedLessonIdx + 1)}
                      className="flex items-center gap-1.5 w-full sm:w-auto"
                    >
                      Siguiente lección
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : nextLevel ? (
                    nextLevelLocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="flex items-center gap-1.5 w-full sm:w-auto opacity-50 cursor-not-allowed"
                      >
                        Nivel siguiente bloqueado
                        <Lock className="w-3.5 h-3.5 text-neutral-400" />
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        asChild
                        className="flex items-center gap-1.5 w-full sm:w-auto"
                      >
                        <Link href={`/niveles/${nextLevel.id}`}>
                          Siguiente nivel ({nextLevel.name})
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    )
                  ) : (
                    <div className="hidden sm:block w-36" />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-500 italic">Selecciona una lección para comenzar.</p>
              </div>
            )}
          </div>
        </div>
        </div>
      ) : activeTab === "project" && level.project_content ? (
        /* Project content */
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 sm:p-8 animate-fade-in max-w-4xl mx-auto">
          <div className="pb-4 border-b border-neutral-100 mb-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Proyecto del nivel</p>
              <h2 className="text-lg font-bold text-neutral-900 leading-tight">Pon en práctica lo aprendido</h2>
            </div>
          </div>
          <div
            className="prose prose-neutral max-w-none prose-sm sm:prose-base prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-neutral-900 prose-h1:text-xl prose-h1:font-bold prose-h2:text-lg prose-h2:font-semibold prose-h2:text-neutral-800 prose-h3:text-base prose-h3:font-semibold prose-h3:text-neutral-700 prose-p:text-neutral-600 prose-p:leading-7 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:bg-primary-50 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-neutral-600 prose-code:bg-neutral-100 prose-code:text-violet-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-pre:rounded-xl prose-pre:shadow-sm prose-strong:text-neutral-800 prose-strong:font-semibold prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-hr:border-neutral-100 prose-hr:my-8 prose-table:w-full prose-th:bg-neutral-50 prose-th:text-neutral-800 prose-th:font-semibold prose-th:px-4 prose-th:py-2.5 prose-th:text-sm prose-th:text-left prose-td:px-4 prose-td:py-2.5 prose-td:text-sm prose-td:text-neutral-600 text-neutral-700"
            dangerouslySetInnerHTML={{
              __html: (marked.parse(
                replaceStudentPlaceholder(level.project_content
                  .replace(/^#\s+[^\n]+\n?/, '')
                  .trimStart())
              ) as string)
                .replace(/<table/g, '<div class="overflow-x-auto my-6 rounded-lg border border-neutral-200 shadow-xs"><table')
                .replace(/<\/table>/g, '</table></div>'),
            }}
          />
        </div>
      ) : (
        /* Exercises list */
        total === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-8 text-center">
            <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">
              Este nivel aún no tiene ejercicios publicados.
            </p>
          </div>
        ) : (
          <section className="space-y-2 animate-fade-in max-w-4xl mx-auto">
            <h2 className="text-base font-semibold text-neutral-800 px-1">
              Ejercicios
            </h2>
            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
              {level.exercises.map((exercise) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  isFirstIncomplete={firstIncomplete?.id === exercise.id}
                />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}

// ===================================================================
// Page
// ===================================================================
export default function LevelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const levelId = parseInt(id, 10);

  if (isNaN(levelId)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-neutral-300 mx-auto" />
            <h1 className="text-xl font-bold text-neutral-700">URL inválida</h1>
            <Button variant="outline" size="sm" asChild>
              <Link href="/niveles">Ver todos los niveles</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <LevelDetailContent levelId={levelId} />
    </AppLayout>
  );
}
