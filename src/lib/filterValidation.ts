import type { AuditFilters } from '../api/audit';

export function validateAuditFilters(value: AuditFilters) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if ([value.actor_id, value.entity_id].some(id => id.trim() && !uuid.test(id.trim()))) return 'Completa un identificador válido antes de consultar.';
  const from = value.date_from ? new Date(value.date_from).getTime() : null;
  const to = value.date_to ? new Date(value.date_to).getTime() : null;
  if (from !== null && !Number.isFinite(from) || to !== null && !Number.isFinite(to)) return 'Completa una fecha y hora válidas.';
  if (from !== null && to !== null && (to < from || to - from > 90 * 86400000)) return 'Elige fechas en orden y un rango de hasta 90 días.';
  return '';
}
