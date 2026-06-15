"use client";

import { useState } from "react";
import { Lightbulb, Lock, ChevronDown, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HintPanelProps, Hint } from "@/lib/types";

// ===================================================================
// Level Labels & Colors
// ===================================================================
const LEVEL_CONFIG = {
  0: {
    label: "Conceptual",
    color: "bg-sky-50 border-sky-200 text-sky-700",
    badgeVariant: "ghost" as const,
    icon: "💡",
    description: "Te orienta hacia el concepto sin darte la solución",
  },
  1: {
    label: "Sintáctico",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    badgeVariant: "warning" as const,
    icon: "🔧",
    description: "Te muestra qué cláusulas usar y cómo estructurarlas",
  },
  2: {
    label: "Casi la solución",
    color: "bg-rose-50 border-rose-200 text-rose-700",
    badgeVariant: "error" as const,
    icon: "🎯",
    description: "Muy similar a la respuesta — úsala solo si estás atascado",
  },
};

// ===================================================================
// Single Hint Card (revealed)
// ===================================================================
function RevealedHint({ hint, index }: { hint: Hint; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const config = LEVEL_CONFIG[hint.level];
  const hasCode = hint.content.includes("```");

  // Parse content: split on code blocks
  const renderContent = (content: string) => {
    if (!hasCode) {
      return <p className="text-sm text-neutral-700 leading-relaxed">{content}</p>;
    }

    // Split content by code blocks
    const parts = content.split(/```(?:sql)?\n?/);
    return (
      <div className="space-y-2">
        {parts.map((part, i) => {
          if (i % 2 === 0) {
            // Text part
            return part.trim() ? (
              <p key={i} className="text-sm text-neutral-700 leading-relaxed">
                {part.trim()}
              </p>
            ) : null;
          } else {
            // Code part
            return (
              <pre
                key={i}
                className="bg-neutral-900 text-neutral-100 rounded-lg p-4 text-sm font-mono overflow-x-auto leading-relaxed"
              >
                <code>{part.trim()}</code>
              </pre>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden animate-fade-up",
        config.color
      )}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{config.icon}</span>
          <div>
            <span className="text-sm font-semibold">
              Pista {index + 1} — {config.label}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            expanded ? "rotate-180" : "rotate-0"
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 bg-white/60 border-t border-current/10">
          <div className="pt-3">{renderContent(hint.content)}</div>
        </div>
      )}
    </div>
  );
}

// ===================================================================
// Locked Hint Preview
// ===================================================================
function LockedHint({
  hint,
  index,
  onReveal,
  disabled,
}: {
  hint: Hint;
  index: number;
  onReveal: () => void;
  disabled: boolean;
}) {
  const config = LEVEL_CONFIG[hint.level];

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-500">
            Pista {index + 1} — {config.label}
          </span>
          <span className="text-xs text-neutral-400 hidden sm:inline">
            {config.description}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <Zap className="w-3 h-3" />
            -{hint.xpCost} XP
          </span>
          <Button
            variant="secondary"
            size="xs"
            onClick={onReveal}
            disabled={disabled}
          >
            Ver pista
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Main Component
// ===================================================================
export function HintPanel({
  hints,
  hintsUsed,
  maxHints,
  onRequestHint,
  expanded = true,
}: HintPanelProps) {
  const [panelExpanded, setPanelExpanded] = useState(expanded);
  const totalXpLost = hints
    .slice(0, hintsUsed)
    .reduce((sum, h) => sum + h.xpCost, 0);
  const nextHintIndex = hintsUsed;
  const canRequestMore = hintsUsed < Math.min(maxHints, hints.length);
  const allHintsUsed = hintsUsed >= hints.length;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-neutral-50 transition-colors"
        onClick={() => setPanelExpanded(!panelExpanded)}
        aria-expanded={panelExpanded}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-sm font-semibold text-neutral-800">Pistas</span>
            {hintsUsed > 0 && (
              <p className="text-xs text-neutral-500">
                {hintsUsed} de {hints.length} usadas
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hintsUsed > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
              <Zap className="w-3 h-3" />
              -{totalXpLost} XP
            </span>
          )}
          {hintsUsed === 0 && (
            <Badge variant="neutral" size="sm">
              {hints.length} disponibles
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-neutral-400 transition-transform duration-200",
              panelExpanded ? "rotate-180" : "rotate-0"
            )}
          />
        </div>
      </button>

      {/* Content */}
      {panelExpanded && (
        <div className="border-t border-neutral-100 p-4 space-y-3">
          {/* XP warning */}
          {hintsUsed === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Cada pista que uses reduce el XP que puedes ganar en este
                ejercicio. Las pistas son progresivas — empieza por la más
                conceptual antes de ver el código.
              </p>
            </div>
          )}

          {/* Revealed hints */}
          {hints.slice(0, hintsUsed).map((hint, index) => (
            <RevealedHint key={hint.level} hint={hint} index={index} />
          ))}

          {/* Next hint (locked) */}
          {!allHintsUsed && nextHintIndex < hints.length && (
            <LockedHint
              hint={hints[nextHintIndex]}
              index={nextHintIndex}
              onReveal={onRequestHint}
              disabled={!canRequestMore}
            />
          )}

          {/* Remaining locked hints (blurred) */}
          {hints.slice(nextHintIndex + 1).map((hint, i) => (
            <div
              key={hint.level}
              className="rounded-lg border border-dashed border-neutral-200 px-4 py-3 opacity-50"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-neutral-300" />
                <span className="text-xs text-neutral-400">
                  Pista {nextHintIndex + 2 + i} — {LEVEL_CONFIG[hint.level].label}
                </span>
              </div>
            </div>
          ))}

          {/* All hints used */}
          {allHintsUsed && (
            <div className="text-center py-3">
              <p className="text-sm text-neutral-500">
                Has usado todas las pistas disponibles.
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Si aún tienes dudas, revisa la pista de &quot;Casi la solución&quot; arriba.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
