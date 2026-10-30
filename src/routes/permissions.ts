export function canManageTickets(role?: string): boolean {
  return role === 'admin' || role === 'support';
}

export function canManageIncidents(role?: string): boolean {
  return role === 'admin' || role === 'support';
}

export function canManageMarketplace(role?: string): boolean {
  return role === 'admin' || role === 'editor';
}

export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/comercial': 'metrics', '/operativo': 'ops', '/usuarios': 'metrics',
  '/funcional': 'metrics', '/usuarios-app': 'end_users', '/juegos': 'games', '/tickets': 'support',
  '/contenido': 'content', '/catalogos': 'marketplace', '/moderacion': 'moderation',
  '/auditoria': 'audit', '/cuentas': 'staff', '/config': 'settings', '/legales': 'legal',
};

export function canAccessRoute(path: string, permissions: readonly string[] = []): boolean {
  if (path === '/seguridad' || path === '/perfil') return true;
  const module = ROUTE_PERMISSIONS[path];
  return !!module && permissions.includes(module);
}

export function firstAllowedRoute(permissions: readonly string[] = []): string {
  return Object.keys(ROUTE_PERMISSIONS).find(path => canAccessRoute(path, permissions)) ?? '/seguridad';
}
