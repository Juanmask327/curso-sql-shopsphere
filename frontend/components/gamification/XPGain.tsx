'use client';

/**
 * XPGain — Toast/overlay que aparece cuando el estudiante completa un ejercicio.
 *
 * Muestra "+X XP" con animación de entrada (slide-up + fade-in) y
 * desvanecimiento automático a los 3.5s. Si hay penalización por pistas,
 * muestra XP base tachado y el XP efectivo debajo.
 *
 * Animaciones: CSS puro, sin dependencias externas.
 */

import { useEffect, useState } from 'react';
import { Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface XPGainProps {
  /** XP efectivo ganado (ya descontadas penalizaciones) */
  xpEarned: number;
  /** XP base máximo posible del ejercicio */
  baseXp: number;
  /** Penalización por pistas usadas (baseXp - xpEarned = penalty) */
  hintPenalty?: number;
  /** Callback al cerrar o después del auto-dismiss */
  onDismiss: () => void;
  /** Auto-dismiss después de N ms (default: 3500) */
  autoDismissMs?: number;
  /** Posición en pantalla */
  position?: 'bottom-right' | 'top-center';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function XPGain({
  xpEarned,
  baseXp,
  hintPenalty = 0,
  onDismiss,
  autoDismissMs = 3500,
  position = 'bottom-right',
}: XPGainProps) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'leaving'>('entering');
  const hasDiscount = hintPenalty > 0 && baseXp > xpEarned;

  // Lifecycle: enter → visible → auto-dismiss
  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('visible'), 50);
    const leaveTimer = setTimeout(() => setPhase('leaving'), autoDismissMs - 300);
    const dismissTimer = setTimeout(onDismiss, autoDismissMs);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(leaveTimer);
      clearTimeout(dismissTimer);
    };
  }, [autoDismissMs, onDismiss]);

  const handleClose = () => {
    setPhase('leaving');
    setTimeout(onDismiss, 300);
  };

  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6 z-[500]',
    'top-center': 'fixed top-20 left-1/2 -translate-x-1/2 z-[500]',
  };

  return (
    <div
      className={cn(
        positionClasses[position],
        // Transition classes based on phase
        'transition-all duration-300',
        phase === 'entering' && 'opacity-0 translate-y-3 scale-95',
        phase === 'visible' && 'opacity-100 translate-y-0 scale-100',
        phase === 'leaving' && 'opacity-0 translate-y-2 scale-95',
      )}
      role="status"
      aria-live="polite"
      aria-label={`Ganaste ${xpEarned} XP`}
    >
      <div className="relative bg-white border border-amber-200 rounded-2xl shadow-xl px-5 py-4 min-w-[200px] max-w-[280px]">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          aria-label="Cerrar notificación"
        >
          <X className="w-3 h-3" />
        </button>

        {/* XP icon */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 animate-bounce-subtle">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>

          <div>
            {/* Effective XP */}
            <div className="text-2xl font-black text-amber-600 leading-none tracking-tight">
              +{xpEarned} XP
            </div>

            {/* Penalty breakdown */}
            {hasDiscount && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-neutral-400 line-through">{baseXp} XP</span>
                <span className="text-xs text-rose-400">−{hintPenalty} pistas</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
          Ejercicio completado correctamente.
        </p>

        {/* Progress bar — auto-dismiss timer */}
        <div className="mt-3 h-0.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-300 rounded-full"
            style={{
              animation: `xpGainTimer ${autoDismissMs}ms linear forwards`,
            }}
          />
        </div>
      </div>

      {/* Inline keyframe for the timer bar */}
      <style>{`
        @keyframes xpGainTimer {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
