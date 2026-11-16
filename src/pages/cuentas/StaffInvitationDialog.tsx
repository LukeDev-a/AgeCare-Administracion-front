import { useState } from 'react';
import type { StaffAccount } from '../../api/staff';
import { Modal } from '../../components/Modal';
import { staffStyles as s } from './staffStyles';

export function StaffInvitationDialog({ account, cancel, onConfirm, onClose }: {
  account: StaffAccount; cancel: boolean; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    if (busy) return;
    setBusy(true); setError('');
    try { await onConfirm(); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo gestionar la invitación.'); }
    finally { setBusy(false); }
  }
  return <Modal title={cancel ? 'Cancelar invitación' : 'Reenviar invitación'} onClose={onClose} busy={busy} error={error}>
    <div className="tw:mx-auto tw:max-w-2xl tw:space-y-5">
      <div className={s.notice}><p className="tw:font-semibold tw:text-ink">{account.full_name}</p><p className="tw:break-all">{account.email}</p></div>
      <p>{cancel ? 'El enlace actual dejará de funcionar. La cuenta se conservará y podrás enviarle una nueva invitación más adelante.' : 'Se solicitará un nuevo correo de invitación. El enlace anterior dejará de funcionar; la persona deberá utilizar el nuevo.'}</p>
      {!cancel && <p className={s.muted}>El correo se procesa en cola. Solicitarlo no confirma que ya haya llegado a su destinatario.</p>}
      <div className={s.actions}><button type="button" className={s.button} disabled={busy} onClick={onClose}>Volver</button><button type="button" className={`${s.button} ${cancel ? s.danger : s.primary}`} disabled={busy} onClick={() => void confirm()}>{busy ? 'Procesando…' : cancel ? 'Confirmar cancelación' : 'Confirmar reenvío'}</button></div>
    </div>
  </Modal>;
}
