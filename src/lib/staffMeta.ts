import type { StaffRole } from '../api/staff';

export const STAFF_ROLES: Record<StaffRole, string> = {
  admin: 'Administrador', analyst: 'Analista', support: 'Soporte',
  editor: 'Editor', moderator: 'Moderador',
};
export const STAFF_STATES: Record<string, string> = { active: 'Activa', inactive: 'Inactiva', pending: 'Pendiente de activación', expired: 'Invitación vencida', cancelled: 'Invitación cancelada' };
export const MAIL_STATES: Record<string, string> = { queued: 'Correo en cola', sent: 'Correo enviado', failed: 'Envío fallido; puedes reenviar', cancelled: 'Envío cancelado' };
export function staffDate(value: string | null): string {
  if (!value) return 'Nunca';
  return new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z').toLocaleString('es-CL');
}
