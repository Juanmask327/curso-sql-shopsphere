'use client';

/**
 * XPBar — Barra de progreso de experiencia animada.
 *
 * Muestra el XP dentro del nivel actual con:
 * - Barra de llenado fluida (CSS transition 600ms ease-out)
 * - Badge de nivel con color por tier:
 *     0-2: bronce (amber)  | 3-5: plata (zinc)
 *     6-8: oro (yellow)    | 9+: diamante (sky/violet)
 * - Modo compact para el sidebar (sin label de XP)
 */

import { Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Tier config
// ─────────────────────────────────────────────────────────────────────────────

type Tier = 'bronze' | 'silver' | 'gold' | 'diamond';

function getTier(level: number): Tier {
  if (level >= 9) return 'diamond';
  if (level >= 6) return 'gold';
  if (level >= 3) return 'silver';
  return 'bronze';
}

const TIER_STYLES: Record<Tier, { badge: string; bar: string; label: string }> = {
  bronze: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    bar: 'from-amber-400 to-amber-500',
    label: 'Bronce',
  },
  silver: {
    badge: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    bar: 'from-zinc-300 to-zinc-400',
    label: 'Plata',
  },
  gold: {
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    bar: 'from-yellow-400 to-amber-500',
    label: 'Oro',
  },
  diamond: {
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    bar: 'from-sky-400 to-violet-500',
    label: 'Diamante',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface XPBarProps {
  /** XP total acumulado del usuario */
  xpTotal: number;
  /** Nivel actual (0-based o 1-based, según el API) */
  currentLevel: number;
  /** XP necesario para el inicio del nivel actual */
  xpRequired: number;
  /** XP necesario para el siguiente nivel */
  nextLevelXp: number;
  /** Modo compacto para el sidebar (oculta label XP numérico) */
  compact?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function XPBar({
  xpTotal,
  currentLevel,
  xpRequired,
  nextLevelXp,
  compact = false,
  className,
}: XPBarProps) {
  const tier = getTier(currentLevel);
  const styles = TIER_STYLES[tier];

  const range = nextLevelXp - xpRequired;
  const earned = xpTotal - xpRequired;
  const pct = range > 0 ? Math.min(100, Math.max(0, Math.round((earned / range) * 100))) : 100;
  const remaining = Math.max(0, nextLevelXp - xpTotal);

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        {/* Level badge */}
        <div
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold',
            styles.badge,
          )}
          title={styles.label}
        >
          <Star className="w-3 h-3 fill-current" />
          Nv. {currentLevel}
        </div>

        {!compact && (
          <span className="flex items-center gap-1 text-xs font-mono text-neutral-500">
            <Zap className="w-3 h-3 text-amber-400" />
            {xpTotal.toLocaleString('es-CO')} / {nextLevelXp.toLocaleString('es-CO')}
          </span>
        )}
      </div>

      {/* Progress track */}
      <div className="relative h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-[width] duration-[600ms] ease-out',
            styles.bar,
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% hacia nivel ${currentLevel + 1}`}
        />
      </div>

      {/* Remaining label */}
      {!compact && remaining > 0 && (
        <p className="text-xs text-neutral-400">
          {remaining.toLocaleString('es-CO')} XP para nivel {currentLevel + 1}
        </p>
      )}
      {!compact && remaining === 0 && (
        <p className="text-xs text-emerald-600 font-medium">Nivel completado</p>
      )}
    </div>
  );
}
