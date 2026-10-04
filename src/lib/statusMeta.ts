export const OPS_STATUS: Record<string, { className: string; label: string }> = {
  operational: { className: 'ok', label: '✔ Operativo' },
  degraded: { className: 'warn', label: '▲ Degradado' },
  outage: { className: 'crit', label: '✖ Caído' },
};

export function getOpsStatus(status: string) {
  return OPS_STATUS[status] ?? OPS_STATUS.operational;
}