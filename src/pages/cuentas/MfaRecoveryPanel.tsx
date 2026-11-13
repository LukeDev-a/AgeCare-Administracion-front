import { useEffect, useRef, useState, type FormEvent } from 'react';
import { decideMfaRecovery, fetchMfaRecoveries, type MfaRecoveryRequest } from '../../api/mfaRecovery';
import { Modal } from '../../components/Modal';

const labels: Record<MfaRecoveryRequest['status'], string> = {
  pending: 'Pendiente de revisión', approved: 'Aprobada', rejected: 'Rechazada', expired: 'Vencida o invalidada', cancelled: 'Cancelada',
};
const date = (value: string) => new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago' });

export function MfaRecoveryPanel({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<{ total: number; items: MfaRecoveryRequest[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MfaRecoveryRequest | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject'>('reject');
  const [note, setNote] = useState('');
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [notice, setNotice] = useState('');
  const submitting = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetchMfaRecoveries(page, controller.signal).then(result => {
      if (!controller.signal.aborted) { setData(result); setLoading(false); }
    }).catch(exception => {
      if (!controller.signal.aborted) { setError(exception.message); setLoading(false); }
    });
    return () => controller.abort();
  }, [page, revision]);
  function reload(nextPage = page) { setLoading(true); setError(''); setPage(nextPage); setRevision(value => value + 1); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || submitting.current || (decision === 'approve' && !verified)) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    submitting.current = true; setBusy(true); setModalError('');
    try {
      await decideMfaRecovery(selected.id, { decision, identity_verified: verified, note: note.trim(),
        password: String(fields.get('password') ?? ''), otp_code: String(fields.get('otp') ?? '') || undefined });
      form.reset(); setSelected(null); setNotice(decision === 'approve' ? 'Solicitud aprobada. Se cerraron las sesiones y se exigirá configurar un nuevo MFA.' : 'Solicitud rechazada. El MFA actual se conserva.');
      reload();
    } catch (exception) { setModalError(exception instanceof Error ? exception.message : 'No se pudo guardar la decisión.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className="card tw:mt-6 tw:space-y-4">
    <div className="card-head"><div><h2 className="card-title">Recuperación MFA</h2><p className="card-sub">Solicitudes confirmadas por correo. Solo otro administrador puede aprobarlas o rechazarlas.</p></div>
      <button className="theme-toggle" disabled={loading || busy} onClick={() => reload()}>Actualizar solicitudes</button></div>
    {error && <p role="alert" className="audit-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Cargando solicitudes…</p> : !error && data && <>
      {!data.items.length ? <p>No hay solicitudes confirmadas.</p> : <div className="tw:overflow-x-auto"><table>
        <thead><tr><th>Cuenta</th><th>Confirmación</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>{data.items.map(item => <tr key={item.id}><td>{item.full_name}<br /><span className="tw:text-muted">{item.email}</span></td>
          <td>{date(item.confirmed_at)}</td><td>{labels[item.status]}</td><td><button className="theme-toggle" onClick={() => {
            setSelected(item); setNote(''); setVerified(false); setDecision('reject'); setModalError('');
          }}>Revisar solicitud</button></td></tr>)}</tbody>
      </table></div>}
      <div className="audit-pagination"><button className="theme-toggle" disabled={page <= 1} onClick={() => reload(page - 1)}>Anterior</button><span>Página {page} · {data.total} solicitudes</span><button className="theme-toggle" disabled={page * 25 >= data.total} onClick={() => reload(page + 1)}>Siguiente</button></div>
    </>}
    {selected && <Modal title="Revisar recuperación MFA" onClose={() => setSelected(null)} busy={busy} dirty={!!note || verified} error={modalError}>
      <div className="tw:space-y-5">
        <h3 className="tw:text-xl tw:font-semibold">{selected.full_name}</h3><p>{selected.email} · {labels[selected.status]}</p>
        <p className="tw:whitespace-pre-wrap">Motivo: {selected.reason}</p><p>Vigencia de la solicitud: {date(selected.expires_at)} (Santiago).</p>
        {selected.decision_note && <p className="tw:whitespace-pre-wrap">Decisión de {selected.decided_by_name || 'Administrador'}: {selected.decision_note}{selected.decided_at && ` · ${date(selected.decided_at)}`}</p>}
        {selected.can_decide ? <form className="tw:space-y-4" onSubmit={submit}>
          <p className="tw:rounded-xl tw:bg-warning-bg tw:p-4">Verifica la identidad por un canal conocido. Confirmar el correo no basta. Aprobar invalida el autenticador anterior, los códigos de recuperación y todas las sesiones; la contraseña se conserva.</p>
          <label className="settings-field">Decisión<select value={decision} disabled={busy} onChange={event => setDecision(event.target.value as 'approve' | 'reject')}><option value="reject">Rechazar solicitud</option><option value="approve">Aprobar y restablecer MFA</option></select></label>
          {decision === 'approve' && <label className="tw:flex tw:items-start tw:gap-3"><input type="checkbox" required checked={verified} disabled={busy} onChange={event => setVerified(event.target.checked)} />Verifiqué la identidad del solicitante por un canal conocido.</label>}
          <label className="settings-field">Motivo de la decisión<textarea required minLength={5} maxLength={500} rows={3} value={note} disabled={busy} onChange={event => setNote(event.target.value)} /></label>
          <label className="settings-field">Tu contraseña actual<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" disabled={busy} /></label>
          {mfaEnabled && <label className="settings-field">Tu código MFA<input name="otp" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" disabled={busy} /></label>}
          <button className="action-button" disabled={busy || note.trim().length < 5 || (decision === 'approve' && !verified)}>{busy ? 'Guardando…' : 'Confirmar decisión'}</button>
        </form> : <p>Esta solicitud no admite decisiones. Si corresponde a tu cuenta, debe revisarla otro administrador.</p>}
      </div>
    </Modal>}
  </div>;
}
