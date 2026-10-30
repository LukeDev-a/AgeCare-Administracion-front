import type { OpsIncident } from '../api/operational';
export const INCIDENT_STATUSES: Record<string, string> = { investigating: 'En investigación', observing: 'En observación', resolved: 'Resuelto', completed: 'Completado' };
export const incidentNext = (incident: OpsIncident) => incident.is_maintenance
  ? (incident.status === 'observing' ? ['completed'] : [])
  : incident.status === 'investigating' ? ['observing'] : incident.status === 'observing' ? ['resolved'] : [];
export const incidentMailLabel = (state: string) => ({ queued: 'Aviso por correo pendiente de envío',
  sent: 'Aviso aceptado por el servidor de correo', failed: 'No se pudieron enviar todos los avisos por correo',
  not_configured: 'Aviso por correo no enviado: destinatarios o servicio sin configurar' }[state] ?? 'Estado del aviso sin verificar');
