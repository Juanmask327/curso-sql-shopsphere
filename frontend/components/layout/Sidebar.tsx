'use client';

/**
 * Sidebar — Navegación principal del curso (usuarios autenticados).
 *
 * Desktop (lg+): sidebar fijo a la izquierda, 240px de ancho.
 * Mobile: bottom nav con 4 tabs.
 *
 * Secciones:
 * 1. Logo ShopSphere SQL
 * 2. User card (avatar + username + XP)
 * 3. Navigation links (Dashboard, Niveles, Certificados)
 * 4. XP bar compacta en la parte inferior
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Award,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { XPBar } from '@/components/gamification/XPBar';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Navigation items
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/niveles', label: 'Niveles', icon: Layers },
  { href: '/certificados', label: 'Certificados', icon: Award },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// NavItem
// ─────────────────────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        active
          ? 'bg-primary-50 text-primary-700 shadow-xs'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        className={cn('w-4 h-4 shrink-0', active ? 'text-primary-500' : '')}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function UserAvatar({ username }: { username: string }) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0 select-none"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Sidebar
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  // XP progress values — fallback safe
  const xpTotal = user.xpTotal ?? 0;
  const currentLevel = user.currentLevel ?? 1;

  // Derive thresholds from level (matches utils.ts xpToNextLevel)
  const XP_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500];
  const xpRequired = XP_THRESHOLDS[Math.max(0, currentLevel - 1)] ?? 0;
  const nextLevelXp = XP_THRESHOLDS[currentLevel] ?? 6500;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-[240px] shrink-0',
          'sticky top-0 h-screen',
          'bg-white border-r border-neutral-200',
          'overflow-y-auto',
        )}
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-neutral-100">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0 shadow-primary">
            <span className="text-white font-black text-sm select-none">S</span>
          </div>
          <div className="min-w-0">
            <span className="font-bold text-neutral-900 text-sm leading-none tracking-tight">
              ShopSphere{' '}
              <span className="text-primary-500">SQL</span>
            </span>
          </div>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5 mb-3">
            <UserAvatar username={user.username} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800 truncate">
                {user.username}
              </p>
              <p className="text-xs text-neutral-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Streak */}
          <StreakBadge streakDays={3} size="sm" className="mb-2" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5" aria-label="Secciones del curso">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}
        </nav>

        {/* XP bar footer */}
        <div className="px-4 py-4 border-t border-neutral-100 space-y-3">
          <XPBar
            xpTotal={xpTotal}
            currentLevel={currentLevel}
            xpRequired={xpRequired}
            nextLevelXp={nextLevelXp}
            compact
          />

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
              'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            )}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav
        className={cn(
          'lg:hidden fixed bottom-0 inset-x-0 z-40',
          'bg-white border-t border-neutral-200',
          'flex items-center justify-around',
          'pb-safe', // iOS safe area
        )}
        aria-label="Navegación móvil"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-3 text-xs font-medium',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
                isActive ? 'text-primary-600' : 'text-neutral-500 hover:text-neutral-800',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn('w-5 h-5', isActive ? 'text-primary-500' : '')}
                aria-hidden="true"
              />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
