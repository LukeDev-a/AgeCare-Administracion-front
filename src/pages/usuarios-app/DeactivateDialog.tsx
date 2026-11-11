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
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo desactivar la cuenta.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={ref} className="audit-dialog tw:m-auto tw:w-[calc(100%-2rem)] tw:max-w-2xl tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-0 tw:text-base tw:leading-relaxed tw:text-ink tw:backdrop:bg-black/60" aria-labelledby="deactivate-account-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form className="tw:space-y-5 tw:p-6 tw:sm:p-8" onSubmit={event => void submit(event)}>
      <h2 id="deactivate-account-title" className="tw:text-2xl tw:font-bold">Desactivar cuenta</h2>
      <div className="tw:rounded-xl tw:bg-canvas tw:p-5 tw:break-words"><p className="tw:mb-2 tw:text-sm tw:text-muted">Cuenta seleccionada</p><p className="tw:font-bold">{user.full_name}</p><p className="tw:mt-1 tw:text-muted">{user.email}</p></div>
      <div className="tw:space-y-3 tw:rounded-xl tw:bg-warning-bg tw:p-5"><p>La cuenta quedará inactiva. Se conservarán sus datos y vínculos de cuidado.</p>
      <p className="tw:font-semibold">La reactivación no forma parte de este módulo.</p></div>
      <label className="tw:grid tw:gap-2 tw:font-semibold">Motivo (5–500 caracteres)<textarea className="tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-4 tw:py-3 tw:text-base tw:leading-relaxed tw:text-ink tw:focus-visible:outline-2 tw:focus-visible:outline-brand" aria-label="Motivo de desactivación" aria-describedby="deactivate-reason-help" required minLength={5} maxLength={500}
        rows={4} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      <p id="deactivate-reason-help" className="tw:text-sm tw:text-muted">Describe la solicitud sin incluir contraseñas, códigos ni información de salud.</p>
      <label className="tw:flex tw:cursor-pointer tw:items-start tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-4"><input className="tw:mt-1 tw:h-5 tw:w-5 tw:shrink-0" type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /> Confirmo que quiero desactivar esta cuenta.</label>
      {error && <p role="alert" className="tw:rounded-xl tw:bg-warning-bg tw:p-4">{error}</p>}
      <div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-3 tw:border-t tw:border-solid tw:border-stroke tw:pt-5"><button type="button" autoFocus className={button} disabled={busy} onClick={onClose}>Cancelar</button>
        <button className={`${button} tw:text-negative`} type="submit" disabled={busy || !confirmed || reason.trim().length < 5 || reason.trim().length > 500}>{busy ? 'Desactivando…' : 'Desactivar cuenta'}</button></div>
    </form>
  </dialog>;
}

const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
