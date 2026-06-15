'use client';

/**
 * XPNotificationContext — Sistema de notificaciones de XP.
 *
 * Permite a cualquier componente triggerear un toast de XPGain
 * sin tener que manejar el estado localmente.
 *
 * Uso:
 *   const { showXPGain } = useXPNotification();
 *   showXPGain({ xpEarned: 45, baseXp: 50, hintPenalty: 5 });
 *
 * El XPNotificationProvider debe estar en app/layout.tsx.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { XPGain } from '@/components/gamification/XPGain';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface XPNotification {
  id: string;
  xpEarned: number;
  baseXp: number;
  hintPenalty: number;
}

interface XPNotificationContextValue {
  /**
   * Muestra un toast de XP ganado.
   * @param params.xpEarned XP efectivo ganado
   * @param params.baseXp XP máximo posible
   * @param params.hintPenalty XP descontado por pistas
   */
  showXPGain(params: { xpEarned: number; baseXp: number; hintPenalty?: number }): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const XPNotificationContext = createContext<XPNotificationContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function XPNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<XPNotification[]>([]);

  const showXPGain = useCallback(
    ({ xpEarned, baseXp, hintPenalty = 0 }: { xpEarned: number; baseXp: number; hintPenalty?: number }) => {
      const id = `xp-${Date.now()}-${Math.random()}`;
      setNotifications((prev) => [...prev, { id, xpEarned, baseXp, hintPenalty }]);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <XPNotificationContext.Provider value={{ showXPGain }}>
      {children}

      {/* Toast container — renderiza máximo 3 simultáneos */}
      <div
        className="fixed bottom-6 right-6 z-[500] flex flex-col gap-3 pointer-events-none"
        aria-label="Notificaciones de XP"
      >
        {notifications.slice(-3).map((notif, index) => (
          <div
            key={notif.id}
            className="pointer-events-auto"
            style={{ transform: `translateY(${-index * 4}px)` }}
          >
            <XPGain
              xpEarned={notif.xpEarned}
              baseXp={notif.baseXp}
              hintPenalty={notif.hintPenalty}
              onDismiss={() => dismiss(notif.id)}
              position="bottom-right"
            />
          </div>
        ))}
      </div>
    </XPNotificationContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useXPNotification(): XPNotificationContextValue {
  const ctx = useContext(XPNotificationContext);
  if (!ctx) {
    throw new Error('useXPNotification() must be used inside <XPNotificationProvider>.');
  }
  return ctx;
}
