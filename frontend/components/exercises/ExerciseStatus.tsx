'use client';

/**
 * ExerciseStatus — Badge de estado de ejercicio.
 *
 * - not_started: gris neutro — "No iniciado"
 * - in_progress: ámbar — "En progreso"
 * - completed: verde esmeralda — "Completado" + XP ganado opcional
 *
 * Usa los mismos tokens de color del design system.
 */

import { CheckCircle2, Clock, BookOpen, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExerciseStatus as ExerciseStatusType } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ExerciseStatusType,
  {
    label: string;
    icon: React.ElementType;
    classes: string;
  }
> = {
  not_started: {
    label: 'No iniciado',
    icon: BookOpen,
    classes: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  },
  in_progress: {
    label: 'En progreso',
    icon: Clock,
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  completed: {
    label: 'Completado',
    icon: CheckCircle2,
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ExerciseStatusProps {
  status: ExerciseStatusType;
  /** XP ganado (solo se muestra si status === 'completed') */
  xpEarned?: number;
  size?: 'sm' | 'md';
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExerciseStatus({
  status,
  xpEarned,
  size = 'sm',
  className,
}: ExerciseStatusProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: { wrapper: 'px-2 py-0.5 gap-1 text-xs', icon: 'w-3 h-3' },
    md: { wrapper: 'px-2.5 py-1 gap-1.5 text-sm', icon: 'w-3.5 h-3.5' },
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses.wrapper,
        config.classes,
        className,
      )}
      aria-label={`Estado: ${config.label}`}
    >
      <Icon className={cn(sizeClasses.icon, 'shrink-0')} aria-hidden="true" />
      <span>{config.label}</span>

      {/* XP ganado — solo cuando completado */}
      {status === 'completed' && xpEarned !== undefined && xpEarned > 0 && (
        <span className="inline-flex items-center gap-0.5 ml-1 font-mono text-amber-600">
          <Zap className={sizeClasses.icon} aria-hidden="true" />
          {xpEarned}
        </span>
      )}
    </span>
  );
}
