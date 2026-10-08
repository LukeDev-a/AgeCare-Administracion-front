import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccessRoute, firstAllowedRoute } from '../routes/permissions';

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const { pathname } = useLocation();
  if (isRestoring) return <div className="content">Cargando…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (pathname === '/' || (adminOnly && user?.role !== 'admin') || !canAccessRoute(pathname, user?.permissions)) {
    return <Navigate to={firstAllowedRoute(user?.permissions)} replace />;
  }
  return <>{children}</>;
}
