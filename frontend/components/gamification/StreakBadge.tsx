'use client';

/**
 * StreakBadge — Badge de racha de días consecutivos.
 *
 * - 1-2 días: ícono de libro, texto neutro
 * - 3+ días: ícono de fuego con animación de pulso, texto ámbar
 * - 7+ días: intensidad mayor (naranja/rojo)
 * - 30+ días: badge especial rojo (racha épica)
 */

import { Flame, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface StreakBadgeProps {
  streakDays: number;
  /** Muestra el número de días junto al ícono (default: true) */
  showCount?: boolean;
  /** Tamaño del badge */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function StreakBadge({
  streakDays,
  showCount = true,
  size = 'md',
  className,
}: StreakBadgeProps) {
  const isOnFire = streakDays >= 3;
  const isHot = streakDays >= 7;
  const isEpic = streakDays >= 30;

  // Size scales
  const sizeClasses = {
    sm: { wrapper: 'px-2 py-0.5 gap-1', icon: 'w-3 h-3', text: 'text-xs' },
    md: { wrapper: 'px-2.5 py-1 gap-1.5', icon: 'w-3.5 h-3.5', text: 'text-sm' },
    lg: { wrapper: 'px-3 py-1.5 gap-2', icon: 'w-4 h-4', text: 'text-base' },
  }[size];

  // Color scheme
  const colorClasses = isEpic
    ? 'bg-rose-100 text-rose-700 border-rose-200'
    : isHot
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : isOnFire
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-neutral-100 text-neutral-600 border-neutral-200';

  const iconColor = isEpic
    ? 'text-rose-500'
    : isHot
    ? 'text-orange-500'
    : isOnFire
    ? 'text-amber-500'
    : 'text-neutral-400';

  const label = streakDays === 1
    ? '1 día'
    : `${streakDays} días`;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        sizeClasses.wrapper,
        sizeClasses.text,
        colorClasses,
        className,
      )}
      title={`Racha: ${label} consecutivos`}
      aria-label={`Racha de ${label} consecutivos`}
    >
      {isOnFire ? (
        <Flame
          className={cn(
            sizeClasses.icon,
            iconColor,
            isHot && 'animate-pulse-soft',
          )}
          aria-hidden="true"
        />
      ) : (
        <BookOpen
          className={cn(sizeClasses.icon, iconColor)}
          aria-hidden="true"
        />
      )}

      {showCount && (
        <span>{label}</span>
      )}
    </span>
  );
}
