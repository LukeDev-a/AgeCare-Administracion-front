export const OPS_STATUS: Record<string, { className: string; label: string }> = {
  operational: { className: 'ok', label: '✔ Operativo' },
  degraded: { className: 'warn', label: '▲ Degradado' },
  outage: { className: 'crit', label: '✖ Caído' },
  unknown: { className: 'neutral', label: 'Sin medición reciente' },
};

export function getOpsStatus(status: string | null | undefined) {
  return OPS_STATUS[status ?? 'unknown'] ?? OPS_STATUS.unknown;
}
