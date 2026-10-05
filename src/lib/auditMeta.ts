type Entry = { action: string; action_label?: string; module_label?: string; entity_name?: string; entity_id: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null };
export function formatAuditDate(value: string): string {
  return new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z').toLocaleString('es-CL');
}
export function auditAction(entry: Entry): string { return entry.action_label || 'Cambio de datos'; }
export function auditModule(entry: Entry): string { return entry.module_label || 'Administración'; }
export function auditRecord(entry: Entry): string {
  const values = { ...entry.before, ...entry.after };
  return entry.entity_name || String(values.title || values.name || values.subject || values.slug || entry.entity_id || 'Sin nombre');
}
export const AUDIT_ACTION_OPTIONS = [["games.create", "Creó un juego o aplicación"], ["games.update", "Modificó un juego o aplicación"], ["games.delete", "Eliminó un juego o aplicación"], ["games.activate", "Activó un juego o aplicación"], ["games.deactivate", "Desactivó un juego o aplicación"], ["games.toggle", "Cambió el estado de un juego o aplicación"], ["ticket.create", "Creó un ticket"], ["ticket.update", "Modificó un ticket"], ["ticket.reply", "Respondió un ticket"], ["content.create", "Creó contenido"], ["content.update", "Modificó contenido"], ["content.publish", "Publicó contenido"], ["content.unpublish", "Retiró contenido"], ["content.delete", "Eliminó contenido"], ["marketplace.product_create", "Creó un producto"], ["marketplace.product_update", "Modificó un producto"], ["marketplace.caregiver_update", "Modificó un perfil de cuidador"], ["moderation.approve", "Aprobó contenido reportado"], ["moderation.reject", "Rechazó contenido reportado"], ["ops.incident_create", "Creó un incidente"], ["ops.incident_update", "Modificó un incidente"], ["settings.update", "Modificó la configuración"], ["legal.version_create", "Creó una versión de documento legal"], ["legal.version_publish", "Publicó un documento legal"], ["staff.create", "Creó una cuenta de administración"], ["staff.update", "Modificó una cuenta de administración"]];

AUDIT_ACTION_OPTIONS.push(['staff.delete', 'Eliminó una cuenta de administración']);

AUDIT_ACTION_OPTIONS.push(
  ['staff.invitation_accept', 'Aceptó la invitación a la consola'],
  ['staff.invitation_resend', 'Reenvió una invitación'],
  ['staff.invitation_cancel', 'Canceló una invitación'],
  ['staff.mfa_enable', 'Activó la verificación en dos pasos'],
  ['staff.mfa_disable', 'Desactivó la verificación en dos pasos'],
  ['staff.mfa_recovery', 'Renovó sus códigos de recuperación'],
);
