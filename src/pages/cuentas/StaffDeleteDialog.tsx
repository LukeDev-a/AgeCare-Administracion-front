import { useEffect, useRef, useState } from 'react';
import type { StaffAccount } from '../../api/staff';

export function StaffDeleteDialog({ account, onConfirm, onClose }: {
  account: StaffAccount; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  async function remove() {
    if (busy) return;
    setBusy(true); setError('');
    try { await onConfirm(); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo eliminar la cuenta.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={ref} className="audit-dialog" aria-labelledby="staff-delete-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="audit-detail"><h2 id="staff-delete-title" className="card-title">Eliminar cuenta</h2>
      <p>Se eliminará la cuenta de <strong>{account.full_name}</strong> ({account.email}) y dejará de tener acceso a la consola. Esta acción no se puede deshacer. Su historial de auditoría se conserva.</p>
      <p>Si eliminas a este usuario, las tareas que tenga asignadas quedarán sin asignación y podrán asignarse a otra persona.</p>
      {error && <p role="alert" className="audit-error">{error}</p>}
      <div className="ticket-form-actions"><button autoFocus type="button" className="theme-toggle" disabled={busy} onClick={onClose}>Cancelar</button><button type="button" className="staff-delete-button" disabled={busy} onClick={() => void remove()}>{busy ? 'Eliminando…' : 'Eliminar cuenta'}</button></div>
    </div>
  </dialog>;
}
