'use client';

/**
 * AppLayout — Wrapper de páginas del curso (con sidebar + auth guard).
 *
 * Uso:
 *   export default function DashboardPage() {
 *     return (
 *       <AppLayout>
 *         <DashboardContent />
 *       </AppLayout>
 *     );
 *   }
 *
 * Estructura:
 *   - Desktop: sidebar fijo izquierda + main scrolleable derecha
 *   - Mobile: full width + bottom nav
 *   - Integra AuthGuard: redirige a /login si no hay sesión
 */

import { AuthGuard } from '@/components/auth/AuthGuard';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface AppLayoutProps {
  children: React.ReactNode;
  /** Clases adicionales para el contenedor main */
  className?: string;
  /** Si false, no envuelve con AuthGuard (default: true) */
  requireAuth?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner layout (sin guard)
// ─────────────────────────────────────────────────────────────────────────────

function AppLayoutInner({ children, className }: Omit<AppLayoutProps, 'requireAuth'>) {
  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Sidebar — fixed on desktop, bottom nav on mobile */}
      <Sidebar />

      {/* Main content area */}
      <div className={cn('flex-1 min-w-0 flex flex-col', className)}>
        {/* Mobile top bar — solo cuando hay sidebar abajo */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary-500 flex items-center justify-center shrink-0">
            <span className="text-white font-black text-xs select-none">S</span>
          </div>
          <span className="font-bold text-neutral-900 text-sm leading-none">
            ShopSphere <span className="text-primary-500">SQL</span>
          </span>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-auto pb-20 lg:pb-0"
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported component (con AuthGuard por defecto)
// ─────────────────────────────────────────────────────────────────────────────

export function AppLayout({
  children,
  className,
  requireAuth = true,
}: AppLayoutProps) {
  if (!requireAuth) {
    return <AppLayoutInner className={className}>{children}</AppLayoutInner>;
  }

  return (
    <AuthGuard redirectTo="/login">
      <AppLayoutInner className={className}>{children}</AppLayoutInner>
    </AuthGuard>
  );
}
