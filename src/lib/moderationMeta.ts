export const MODERATION_TYPES: Record<string, string> = {
  review: 'Reseña',
  caregiver_profile: 'Perfil de cuidadora',
  photo: 'Foto',
  chat_message: 'Mensaje',
};

export const REJECT_REASONS = {
  offensive: 'Contenido ofensivo', spam: 'Publicidad no deseada', privacy: 'Privacidad',
  off_topic: 'Fuera de tema', other: 'Otro motivo',
};

export const MODERATION_STATUS_META: Record<string, { className: string; label: string }> = {
  pending: { className: 'warn', label: 'Pendiente' },
  approved: { className: 'ok', label: 'Aprobado' },
  rejected: { className: 'crit', label: 'Rechazado' },
};
