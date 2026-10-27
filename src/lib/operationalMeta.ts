export const OPS_COMPONENTS = [
  ['api_core', 'API central'], ['database', 'Base de datos'], ['auth', 'Autenticación'],
  ['push', 'Notificaciones push'], ['alert_engine', 'Motor de alertas'],
  ['wearable_ingest', 'Ingesta de wearables'], ['ai_assistant', 'Asistente de IA'],
  ['storage', 'Almacenamiento'], ['music_sync', 'Sincronización musical'],
] as const;
export const opsDate = (value: string | null | undefined) => value
  ? new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago' }) : 'Sin datos';
export const opsOrigin = (value: string) => ({ demo: 'Datos de demostración', real: 'Mediciones reales' }[value] ?? 'Origen sin verificar');
export const opsMeasurement = (value: string) => ({ delivery: 'Entrega de notificaciones de extremo a extremo',
  generation: 'Generación de respuestas de IA', service: 'Tiempo de respuesta del servicio' }[value] ?? 'Tipo de medición sin verificar');
export const opsExecution = (value: string) => ({ synthetic: 'Comprobación sintética: ejecución de prueba',
  real: 'Ejecuciones reales', demo: 'Ejemplo de demostración' }[value] ?? 'Tipo de ejecución sin verificar');
