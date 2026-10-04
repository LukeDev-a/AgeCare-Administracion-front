import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { API_BASE_URL, apiFetch, clearSession, ensureFreshSession, getAccessToken, getRefreshToken, logoutSession, setSession } from '../api/client';

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  permissions?: string[];
}

interface LoginPayload {
  email: string;
  password: string;
  otp_code?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isRestoring: boolean;
  user: AdminUser | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const isAuthenticated = user !== null;

  useEffect(() => {
    const controller = new AbortController();
    const expired = () => setUser(null);
    window.addEventListener('agecare-session-expired', expired);
    async function restore() {
      try {
        if (!getAccessToken() && !getRefreshToken()) return;
        const response = await apiFetch('/auth/me', { signal: controller.signal });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) clearSession();
          return;
        }
        const restored = await response.json();
        if (!controller.signal.aborted && getAccessToken()) setUser(restored);
      } catch {
        // Un fallo de red no revoca el refresh token guardado.
      } finally {
        if (!controller.signal.aborted) setIsRestoring(false);
      }
    }
    void restore();
    return () => {
      controller.abort();
      window.removeEventListener('agecare-session-expired', expired);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const renew = () => {
      if (document.visibilityState === 'visible') void ensureFreshSession().catch(console.error);
    };
    const interval = window.setInterval(renew, 30_000);
    window.addEventListener('focus', renew);
    document.addEventListener('visibilitychange', renew);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', renew);
      document.removeEventListener('visibilitychange', renew);
    };
  }, [isAuthenticated]);

  async function login(payload: LoginPayload) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? 'No fue posible iniciar sesión.');
    setSession(data);
    setUser(data.admin);
  }

  async function logout() {
    try {
      await logoutSession();
    } catch (error) {
      console.error('No se pudo notificar el cierre de sesión al servidor.', error);
    } finally {
      clearSession();
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ isAuthenticated, isRestoring, user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
