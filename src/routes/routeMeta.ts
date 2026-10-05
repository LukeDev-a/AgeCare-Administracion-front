export interface RouteMeta {
  title: string;
  crumb: string;
}

export const VIEW_META: Record<string, RouteMeta> = {
  seguridad: { title: 'Seguridad de mi cuenta', crumb: 'Sistema · Autenticador y códigos de recuperación' },
  cuentas: { title: 'Cuentas de la consola', crumb: 'Sistema · Administración de accesos y roles' },
  auditoria: { title: 'Auditoría', crumb: 'Sistema · Historial de actividad de la consola' },
  comercial: { title: 'Uso comercial', crumb: 'Analítica · Uso comercial de la plataforma' },
  operativo: { title: 'Estado operativo', crumb: 'Analítica · Salud de la plataforma y procesos críticos' },
  usuarios: { title: 'Usuarios y soporte', crumb: 'Analítica · Estadísticas por perfil y tickets de soporte' },
  funcional: { title: 'Uso por funcionalidad', crumb: 'Analítica · Adopción de funciones por rol' },
  juegos: { title: 'Administración de juegos', crumb: 'Operación · Catálogo de juegos y estimulación cognitiva' },
  tickets: { title: 'Tickets de soporte', crumb: 'Operación · Gestión de tickets' },
  contenido: { title: 'Curación de contenido', crumb: 'Operación · Revisión y publicación de contenido' },
  catalogos: { title: 'Catálogos marketplace', crumb: 'Operación · Productos y cuidadoras' },
  moderacion: { title: 'Moderación', crumb: 'Operación · Revisión de contenido reportado' },
  config: { title: 'Configuración', crumb: 'Sistema · Configuración de la plataforma' },
  legales: { title: 'Legales y privacidad', crumb: 'Sistema · Legales y privacidad' },
};
