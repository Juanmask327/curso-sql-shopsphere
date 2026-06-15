'use client';

/**
 * ShopSphere Auth Store
 *
 * Estado de autenticación global sin dependencias externas (solo React).
 * Patrón: Context + useState + Provider.
 *
 * Expone:
 * - AuthProvider — envuelve la app en layout.tsx (o _app.tsx)
 * - useAuth()    — hook para acceder al estado y las acciones de auth
 *
 * Responsabilidades:
 * - Hidratar el estado al cargar la app (llama GET /auth/me si hay token)
 * - Persiste los tokens en localStorage via api-client helpers
 * - Limpia tokens en logout o cuando el auto-refresh falla (SESSION_EXPIRED)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  api,
  ApiError,
  clearTokens,
  storeTokens,
  type AuthResponse,
  type LoginBody,
  type RegisterBody,
  type User,
} from './api-client';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos del contexto
// ─────────────────────────────────────────────────────────────────────────────

interface AuthState {
  /** Usuario autenticado. null = no autenticado. undefined = cargando. */
  user: User | null | undefined;
  /** true mientras se carga el estado inicial desde /auth/me */
  isLoading: boolean;
}

interface AuthActions {
  /**
   * Autentica al usuario con email y password.
   * Persiste los tokens y actualiza el estado.
   * Lanza ApiError si las credenciales son inválidas.
   */
  login(body: LoginBody): Promise<void>;

  /**
   * Crea una cuenta nueva, persiste los tokens y actualiza el estado.
   * Lanza ApiError si el email o username ya están registrados.
   */
  register(body: RegisterBody): Promise<void>;

  /**
   * Cierra sesión: revoca la sesión en el servidor y limpia el estado local.
   * No lanza error si la revocación falla (el token igual se elimina localmente).
   */
  logout(): Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

// ─────────────────────────────────────────────────────────────────────────────
// Contexto
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  // undefined = todavía no sabemos si hay sesión (carga inicial)
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // ── Hidratación al montar ──────────────────────────────────────────────────
  //
  // Si hay un access token en localStorage, intentamos obtener el usuario
  // actual. Si falla (token expirado, red caída), el auto-refresh del cliente
  // intentará renovarlo. Si el refresh también falla, limpiamos el estado.

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // SSR-safe: localStorage no existe en el servidor
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const hasToken = Boolean(localStorage.getItem('ss_access_token'));
      if (!hasToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const me = await api.auth.me();
        if (!cancelled) setUser(me);
      } catch (err) {
        if (!cancelled) {
          // SESSION_EXPIRED significa que el refresh también falló — tokens ya limpios
          if (err instanceof ApiError && err.code === 'SESSION_EXPIRED') {
            setUser(null);
          } else {
            // Error de red u otro error transitorio: dejamos user null pero no
            // limpiamos tokens — el usuario puede intentar de nuevo más tarde
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Acciones ──────────────────────────────────────────────────────────────

  const login = useCallback(async (body: LoginBody): Promise<void> => {
    const response: AuthResponse = await api.auth.login(body);
    storeTokens(response.tokens);
    setUser(response.user);
  }, []);

  const register = useCallback(async (body: RegisterBody): Promise<void> => {
    const response: AuthResponse = await api.auth.register(body);
    storeTokens(response.tokens);
    setUser(response.user);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    // Intentamos revocar en el servidor pero no bloqueamos si falla
    try {
      await api.auth.logout();
    } catch {
      // Si el token ya era inválido o hay error de red, igual limpiamos localmente
    }
    clearTokens();
    setUser(null);
  }, []);

  // ── Valor del contexto ────────────────────────────────────────────────────

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook de autenticación. Debe usarse dentro de un árbol envuelto por AuthProvider.
 *
 * @example
 * ```tsx
 * const { user, isLoading, login, logout } = useAuth();
 *
 * if (isLoading) return <Spinner />;
 * if (!user) return <LoginForm />;
 * return <Dashboard user={user} />;
 * ```
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>.');
  }
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — guard de autenticación para uso en componentes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Versión estricta de useAuth que garantiza que el usuario está autenticado.
 * Lanza un error si se llama fuera de sesión — úsala dentro de rutas protegidas
 * donde el middleware de Next.js ya validó que hay sesión.
 */
export function useAuthUser(): User {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // En rutas protegidas esto no debería ocurrir si el middleware funciona
    throw new Error('Auth is still loading — useAuthUser() called too early.');
  }

  if (!user) {
    throw new Error(
      'useAuthUser() called in an unauthenticated context. ' +
        'Use useAuth() and check user !== null first.',
    );
  }

  return user;
}
