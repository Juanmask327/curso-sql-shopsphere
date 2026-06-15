---
name: project-shopsphere-fase3
description: ShopSphere SQL Course — Fase 3 completada. Gamificación, layout con sidebar y landing page.
metadata:
  type: project
---

## Estado Fase 3 — Completada

**Proyecto:** ShopSphere SQL Course  
**Path:** `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\frontend`  
**Stack:** Next.js 15.3.2, React 19, Tailwind CSS 3, TypeScript 5, Plus Jakarta Sans + JetBrains Mono

---

## Componentes nuevos creados (Fase 3)

### Gamificación
- `components/gamification/XPBar.tsx` — Barra de XP animada con tiers (bronce/plata/oro/diamante por nivel). Props: `xpTotal, currentLevel, xpRequired, nextLevelXp, compact`
- `components/gamification/XPGain.tsx` — Toast de XP ganado con auto-dismiss y countdown bar. Props: `xpEarned, baseXp, hintPenalty, onDismiss, autoDismissMs`
- `components/gamification/StreakBadge.tsx` — Badge de racha. Fuego en >= 3 días. Props: `streakDays, size, showCount`

### Ejercicios
- `components/exercises/ExerciseStatus.tsx` — Badge de estado: not_started/in_progress/completed. Props: `status, xpEarned, size`
- `components/exercises/ExerciseFeedback.tsx` — Panel de feedback con confetti CSS puro, desglose de penalización XP, mensajes por tipo de error, sugerencia de pista tras 3 intentos. Props: `result, attemptsCount, baseXp, hintsUsed, onNext, onRetry`

### Layout
- `components/layout/Sidebar.tsx` — Sidebar fijo desktop (240px) + bottom nav mobile. Integra XPBar compacta y StreakBadge. Usa `usePathname` para active states.
- `components/layout/AppLayout.tsx` — Wrapper de páginas del curso. Integra Sidebar + AuthGuard. Props: `children, className, requireAuth`

### Contexto
- `lib/xp-context.tsx` — XPNotificationProvider + useXPNotification(). Sistema de toasts de XP centralizado.

---

## Archivos actualizados

- `app/layout.tsx` — Ahora envuelve con `<AuthProvider>` y `<XPNotificationProvider>`
- `lib/auth-store.ts` → renombrado a `lib/auth-store.tsx` (tenía JSX, .ts no acepta JSX)
- `lib/api-client.ts` — Añadidas `removeToken()` e `isAuthenticated()` que faltaban
- `app/page.tsx` — Landing page completa (Hero, Stats, Features, Code sample, CTA)
- `app/dashboard/page.tsx` — Migrado a AppLayout con sidebar
- `app/niveles/page.tsx` — Migrado a AppLayout con sidebar
- `app/niveles/[id]/page.tsx` — Migrado a AppLayout con sidebar
- `app/certificados/page.tsx` — Migrado a AppLayout con sidebar
- `app/(auth)/login/page.tsx` — Añadido Suspense boundary para useSearchParams (fix de build)
- `app/(auth)/registro/page.tsx` — Corregido uso de api.auth.register + storeTokens

---

## Flujo completo navegable

`/` → `/registro` → `/diagnostic` → `/dashboard` → `/niveles/1` → `/ejercicio/ex-001` → feedback → siguiente

---

## Decisiones de diseño

- **Sidebar sticky con height 100vh** — evita reflow al scrollear páginas largas
- **Bottom nav mobile** — 4 tabs, safe-area-inset-bottom para iOS
- **XPBar tiers:** 0-2 = amber (bronce), 3-5 = zinc (plata), 6-8 = yellow (oro), 9+ = sky/violet (diamante)
- **Confetti CSS puro** — 7 partículas con keyframes `confettiFall` ya definido en globals.css, sin librerías
- **XPGain toast** — countdown bar inline con `@keyframes xpGainTimer` — auto-dismiss en 3.5s
- **AuthGuard** en AppLayout, no duplicado en cada página
- **Landing page** — Server Component para SEO máximo, sin 'use client'

**Why:** Consistencia total con el design system naranja (#F97316), tipografía Plus Jakarta Sans, sistema de sombras warmish definido en Fase 1.
