export const CONTENT_TYPES: Record<string, string> = {
  news: 'Noticias',
  joke: 'Chistes',
};

export const AUDIO_STATES: Record<string, string> = {
  pending: 'Pendiente de revisión', queued: 'Preparando audio', waiting_quota: 'Esperando cuota gratuita',
  ready: 'Disponible', failed: 'Generación fallida',
};
export const CONTENT_ERRORS: Record<string, string> = {
  GEMINI_NOT_CONFIGURED: 'Falta habilitar Gemini en la configuración del servidor',
  PROVIDER_CONFIG_ERROR: 'Revisa el modelo, las credenciales o el acceso del proveedor',
  PROVIDER_UNAVAILABLE: 'El servicio externo no está disponible; se conserva el trabajo',
  QUOTA_REACHED: 'Cuota agotada; el trabajo espera al siguiente periodo',
  INVALID_AI_OUTPUT: 'La respuesta de la IA no cumple el formato; permite un nuevo intento',
  INVALID_AUDIO_OUTPUT: 'El proveedor no devolvió audio válido',
  AUDIO_STORAGE_ERROR: 'No se pudo guardar el audio en el servidor',
  PUBLICATION_WAITING_AUDIO: 'La fecha programada llegó; la publicación espera audio vigente',
  INVALID_SOURCE_RESPONSE: 'La fuente devolvió una respuesta no válida',
  RESPONSE_TOO_LARGE: 'La respuesta externa excede el tamaño permitido',
};
export const EDITORIAL_STATES: Record<string, string> = {
  pending: 'Pendiente', queued: 'En cola', waiting_quota: 'Esperando cuota gratuita', adapted: 'Adaptada',
  needs_review: 'Requiere revisión editorial', failed: 'Falló; permite reintento', discarded: 'Descartada',
  drafted: 'Borrador creado', done: 'Completado', cancelled: 'Cancelado', waiting_review: 'Pendiente de aprobación',
};

export const CONTENT_STATUS_META: Record<string, { className: string; label: string }> = {
  draft: { className: 'neutral', label: 'Borrador' },
  published: { className: 'ok', label: 'Publicado' },
  archived: { className: 'serious', label: 'Archivado' },
};
