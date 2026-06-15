'use client';

/**
 * ExerciseFeedback — Panel de feedback post-validación.
 *
 * Correcto:
 *   - Confetti CSS puro (5 partículas animadas con keyframes)
 *   - XP ganado con desglose de penalización si hay hints usados
 *   - Botón "Siguiente ejercicio"
 *
 * Incorrecto:
 *   - Mensaje específico por tipo de error
 *   - Conteo de filas (si aplica)
 *   - Sugerencia de pista tras el 3er intento
 *
 * Error de SQL:
 *   - Mensaje técnico con formato monospaced y color rose
 *   - Tipo de error identificado visualmente
 *
 * Animaciones: CSS keyframes puros, sin librerías externas.
 */

import { useEffect, useId, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  Zap,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ValidationResult } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Error type messages
// ─────────────────────────────────────────────────────────────────────────────

function getErrorMessage(result: ValidationResult): string {
  if (result.userMessage) return result.userMessage;

  switch (result.errorType) {
    case 'extra_rows':
      return `Tu query retornó ${result.rowCountGot ?? '?'} filas, pero se esperaban ${result.rowCountExpected ?? '?'}. Revisa tus JOINs — puede que estés generando duplicados.`;
    case 'missing_rows':
      return `Tu query retornó ${result.rowCountGot ?? '?'} filas, pero se esperaban ${result.rowCountExpected ?? '?'}. Puede que tu WHERE esté filtrando datos válidos.`;
    case 'wrong_columns':
      return 'Las columnas del resultado no coinciden. Verifica los nombres y el ORDER en tu SELECT.';
    case 'wrong_order':
      return 'Las filas son correctas pero el orden no. Asegúrate de usar el ORDER BY indicado.';
    case 'wrong_types':
      return 'Los tipos de dato no coinciden con los esperados. Revisa si necesitas castear alguna columna.';
    case 'syntax_error':
      return 'Error de sintaxis. Revisa paréntesis, comas y que todas las palabras clave estén bien escritas.';
    case 'execution_error':
      return 'Tu query generó un error al ejecutarse. Revisa el detalle técnico abajo.';
    case 'timeout':
      return 'La query tardó más de 5 segundos. Intenta agregar condiciones más específicas.';
    default:
      return 'El resultado no coincide con el esperado. Revisa tu query e intenta de nuevo.';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Confetti — CSS puro, 7 partículas con animaciones desfasadas
// ─────────────────────────────────────────────────────────────────────────────

const CONFETTI_PIECES = [
  { color: '#f97316', delay: '0ms', left: '10%', shape: 'rounded-sm' },
  { color: '#7c3aed', delay: '80ms', left: '25%', shape: 'rounded-full' },
  { color: '#059669', delay: '160ms', left: '42%', shape: 'rounded-sm rotate-45' },
  { color: '#f59e0b', delay: '240ms', left: '58%', shape: 'rounded-sm' },
  { color: '#0ea5e9', delay: '100ms', left: '72%', shape: 'rounded-full' },
  { color: '#ec4899', delay: '200ms', left: '85%', shape: 'rounded-sm rotate-12' },
  { color: '#f97316', delay: '300ms', left: '18%', shape: 'rounded-full' },
];

function Confetti() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 -top-4 h-20 overflow-hidden"
      aria-hidden="true"
    >
      {CONFETTI_PIECES.map((piece, i) => (
        <div
          key={i}
          className={cn('absolute w-2.5 h-2.5', piece.shape)}
          style={{
            backgroundColor: piece.color,
            left: piece.left,
            top: '-8px',
            animation: `confettiFall 0.9s ${piece.delay} cubic-bezier(0.23, 1, 0.32, 1) forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ExerciseFeedbackProps {
  result: ValidationResult;
  /** Número de intentos realizados (para saber si mostrar sugerencia de hint) */
  attemptsCount?: number;
  /** XP base del ejercicio (para mostrar desglose de penalización) */
  baseXp?: number;
  /** Número de pistas usadas */
  hintsUsed?: number;
  /** Llamado al navegar al siguiente ejercicio (solo en correcto) */
  onNext?: () => void;
  /** Llamado al intentar de nuevo (solo en incorrecto) */
  onRetry: () => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExerciseFeedback({
  result,
  attemptsCount = 0,
  baseXp,
  hintsUsed = 0,
  onNext,
  onRetry,
  className,
}: ExerciseFeedbackProps) {
  const [visible, setVisible] = useState(false);
  const feedbackId = useId();

  // Mount animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const isSqlError =
    result.errorType === 'syntax_error' || result.errorType === 'execution_error';

  const hintPenalty = baseXp !== undefined ? Math.max(0, baseXp - (result.xpEarned ?? 0)) : 0;
  const showPenalty = hintPenalty > 0 && hintsUsed > 0;

  // ── Correct ──────────────────────────────────────────────────────────────
  if (result.valid) {
    return (
      <div
        id={feedbackId}
        role="status"
        aria-live="polite"
        className={cn(
          'relative rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 overflow-hidden',
          'transition-all duration-300',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]',
          className,
        )}
      >
        {/* Confetti */}
        <Confetti />

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Heading + XP */}
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-base font-bold text-emerald-800">
                Respuesta correcta
              </h3>

              {result.xpEarned !== undefined && result.xpEarned > 0 && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 border border-amber-200 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-700">
                    +{result.xpEarned} XP
                  </span>
                </div>
              )}
            </div>

            {/* Penalty breakdown */}
            {showPenalty && (
              <p className="text-xs text-neutral-500 mt-0.5">
                XP base: {baseXp} — penalización por pistas: −{hintPenalty}
              </p>
            )}

            <p className="text-sm text-emerald-700 mt-1 leading-relaxed">
              Tu query retornó exactamente el resultado esperado.
            </p>

            {/* CTA */}
            {onNext ? (
              <Button
                variant="success"
                size="sm"
                onClick={onNext}
                className="mt-3"
              >
                Siguiente ejercicio
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                Has completado todos los ejercicios de este nivel.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Incorrect / Error ─────────────────────────────────────────────────────
  const errorMessage = getErrorMessage(result);
  const showHintSuggestion = attemptsCount >= 3 && hintsUsed === 0;

  return (
    <div
      id={feedbackId}
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-xl border-2 border-rose-200 bg-rose-50 p-5',
        'transition-all duration-300',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
          {isSqlError ? (
            <Terminal className="w-5 h-5 text-rose-600" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Heading */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-rose-800">
              {isSqlError ? 'Error de SQL' : 'Resultado incorrecto'}
            </h3>
            {attemptsCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 border border-rose-200 text-xs text-rose-600 font-medium">
                Intento {attemptsCount}
              </span>
            )}
          </div>

          {/* Main error message */}
          <p className="text-sm text-rose-700 leading-relaxed">{errorMessage}</p>

          {/* Row count diff */}
          {result.rowCountGot !== undefined && result.rowCountExpected !== undefined && !isSqlError && (
            <div className="flex items-center gap-3 text-xs font-mono bg-rose-100 rounded-lg px-3 py-2">
              <span className="text-rose-600">
                Tus filas: <strong>{result.rowCountGot}</strong>
              </span>
              <span className="text-rose-300">·</span>
              <span className="text-neutral-600">
                Esperadas: <strong>{result.rowCountExpected}</strong>
              </span>
            </div>
          )}

          {/* Technical SQL error */}
          {isSqlError && result.technicalMessage && (
            <pre className="text-xs font-mono bg-neutral-900 text-rose-300 rounded-lg px-3 py-2.5 overflow-x-auto whitespace-pre-wrap break-all">
              {result.technicalMessage}
            </pre>
          )}

          {/* Hint suggestion after 3 attempts */}
          {showHintSuggestion && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Llevas {attemptsCount} intentos. Considera usar una pista — la primera es conceptual y solo cuesta 5 XP.
              </p>
            </div>
          )}

          {/* After 3 attempts warning (if hints already used) */}
          {attemptsCount >= 3 && hintsUsed > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Revisa las pistas que ya desbloqueaste — pueden darte la clave.</span>
            </div>
          )}

          {/* Retry button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Intentar de nuevo
          </Button>
        </div>
      </div>
    </div>
  );
}
