import { useState } from 'react';
import type { StaffAccount } from '../../api/staff';
import { Modal } from '../../components/Modal';
import { staffStyles as s } from './staffStyles';

export function StaffDeleteDialog({ account, onConfirm, onClose }: {
  account: StaffAccount; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    if (busy) return;
    setBusy(true); setError('');
    try { await onConfirm(); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo eliminar la cuenta.'); }
    finally { setBusy(false); }
  }
  return <Modal title="Eliminar cuenta" onClose={onClose} busy={busy} error={error}>
    <div className="tw:mx-auto tw:max-w-2xl tw:space-y-5">
      <div className={s.notice}><p className="tw:font-semibold tw:text-ink">{account.full_name}</p><p className="tw:break-all">{account.email}</p></div>
      <div className={s.error}><h3 className="tw:font-bold">Esta acción no se puede deshacer</h3><p className="tw:mt-2">La persona perderá el acceso y su cuenta se eliminará. El historial de auditoría se conserva.</p></div>
      <p className={s.muted}>Las tareas que tenga asignadas quedarán sin asignación y podrán asignarse a otra persona. Si solo necesitas impedirle el acceso temporalmente, puedes volver y cambiar su estado a Inactiva.</p>
      <div className={s.actions}><button type="button" className={s.button} disabled={busy} onClick={onClose}>Cancelar</button><button type="button" className={`${s.button} ${s.danger}`} disabled={busy} onClick={() => void remove()}>{busy ? 'Eliminando…' : 'Eliminar cuenta definitivamente'}</button></div>
    </div>
  </Modal>;
}
