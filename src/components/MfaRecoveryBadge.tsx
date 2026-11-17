import { useContext } from 'react';
import { MfaRecoveryCountContext } from '../context/MfaRecoveryCountContext';

export function MfaRecoveryBadge() {
  const count = useContext(MfaRecoveryCountContext);
  if (count === null || count <= 0) return null;
  const label = `${count} ${count === 1 ? 'solicitud MFA pendiente' : 'solicitudes MFA pendientes'} de tu revisión`;
  return <span title={label} aria-label={label} className="tw:ml-auto tw:inline-flex tw:min-h-6 tw:min-w-6 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-warning-bg tw:px-2 tw:py-0.5 tw:text-xs tw:font-bold tw:tabular-nums tw:text-warning">{count > 99 ? '99+' : count}</span>;
}
