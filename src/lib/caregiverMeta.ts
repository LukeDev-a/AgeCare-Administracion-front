export const CAREGIVER_STATUS_META: Record<string, { className: string; label: string }> = {
  pending: { className: 'warn', label: 'Pendiente' },
  approved: { className: 'ok', label: 'Aprobada' },
  suspended: { className: 'crit', label: 'Suspendida' },
};