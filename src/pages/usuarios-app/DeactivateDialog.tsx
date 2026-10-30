import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { EndUserDetail } from '../../api/endUsers';

export function DeactivateDialog({ user, onConfirm, onClose }: {
  user: EndUserDetail; onConfirm: (reason: string) => Promise<void>; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !confirmed || reason.trim().length < 5 || reason.trim().length > 500) return;
    setBusy(true); setError('');
    try { await onConfirm(reason.trim()); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo desactivar la cuenta de prueba.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={ref} className="audit-dialog" aria-labelledby="deactivate-demo-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form className="audit-detail" onSubmit={event => void submit(event)}>
      <h2 id="deactivate-demo-title" className="card-title">Desactivar cuenta de prueba</h2>
      <p>Cuenta seleccionada: <strong>{user.full_name}</strong> ({user.email}).</p>
      <p>Esta operación solo cambia los datos de demostración. No bloquea ninguna cuenta ni sesión móvil real. Se conservarán sus datos y vínculos de cuidado.</p>
      <p>La reactivación no forma parte de este módulo.</p>
      <label className="settings-field">Motivo (5–500 caracteres)<textarea aria-label="Motivo de desactivación" required minLength={5} maxLength={500}
        rows={4} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      <p className="card-sub">Describe la solicitud sin incluir contraseñas, códigos ni información de salud.</p>
      <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /> Confirmo que quiero desactivar esta cuenta de prueba.</label>
      {error && <p role="alert" className="audit-error">{error}</p>}
      <div className="ticket-form-actions"><button type="button" autoFocus className="theme-toggle" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="staff-delete-button" type="submit" disabled={busy || !confirmed || reason.trim().length < 5 || reason.trim().length > 500}>{busy ? 'Desactivando…' : 'Desactivar cuenta de prueba'}</button></div>
    </form>
  </dialog>;
}
