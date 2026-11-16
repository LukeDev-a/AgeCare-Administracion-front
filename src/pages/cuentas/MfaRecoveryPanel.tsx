import { useEffect, useRef, useState, type FormEvent } from 'react';
import { decideMfaRecovery, fetchMfaRecoveries, type MfaRecoveryRequest } from '../../api/mfaRecovery';
import { Modal } from '../../components/Modal';
import { PasswordField } from '../../components/PasswordField';
import { staffStyles as s, staffStateColor } from './staffStyles';

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
  return <section className={s.panel} aria-label="Solicitudes de recuperación MFA">
    <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div className="tw:space-y-2"><h2 className={s.heading}>Recuperación de acceso con MFA</h2><p className={s.muted}>Revisa las solicitudes de personas que perdieron su autenticador y sus códigos de recuperación.</p></div>
      <button className={s.button} disabled={loading || busy} onClick={() => reload()}>Actualizar solicitudes</button></div>
    <p className={s.notice}>Aquí aparecen las solicitudes confirmadas por correo. Otro administrador debe verificar la identidad y decidir; el correo por sí solo no autoriza el restablecimiento.</p>
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status" className={`${s.notice} tw:text-positive`}>{notice}</p>}
    {loading ? <p role="status" className={s.notice}>Cargando solicitudes…</p> : !error && data && <>
      {!data.items.length ? <div className="tw:space-y-2 tw:py-8 tw:text-center"><h3 className="tw:font-semibold">No hay solicitudes confirmadas</h3><p className={s.muted}>Cuando una persona confirme su solicitud por correo, podrás revisarla aquí.</p></div> : <div className={s.scroll}><table className={`${s.table} tw:min-w-[700px]`}>
        <caption className="tw:sr-only">Solicitudes de recuperación de acceso con MFA</caption>
        <thead><tr><th scope="col">Persona solicitante</th><th scope="col">Confirmación por correo</th><th scope="col">Estado de la revisión</th><th scope="col">Acción</th></tr></thead>
        <tbody>{data.items.map(item => <tr key={item.id}><td><strong>{item.full_name}</strong><span className="tw:mt-1 tw:block tw:break-all tw:text-muted">{item.email}</span></td>
          <td>{date(item.confirmed_at)}</td><td><span className={`${s.badge} ${staffStateColor(item.status === 'approved' ? 'active' : item.status === 'rejected' ? 'inactive' : item.status)}`}>{labels[item.status]}</span></td><td><button className={`${s.button} ${s.primary}`} onClick={() => {
            setSelected(item); setNote(''); setVerified(false); setDecision('reject'); setModalError('');
          }}>Revisar solicitud</button></td></tr>)}</tbody>
      </table></div>}
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><span className={s.muted}>Página {page} · {data.total} solicitudes</span><div className={s.actions}><button className={s.button} disabled={page <= 1 || busy} onClick={() => reload(page - 1)}>Anterior</button><button className={s.button} disabled={page * 25 >= data.total || busy} onClick={() => reload(page + 1)}>Siguiente</button></div></div>
    </>}
    {selected && <Modal title="Revisar recuperación MFA" onClose={() => setSelected(null)} busy={busy} dirty={!!note || verified || decision !== 'reject'} error={modalError}>
      <div className="tw:mx-auto tw:max-w-3xl tw:space-y-5">
        <div className={s.notice}><h3 className="tw:text-xl tw:font-semibold tw:text-ink">{selected.full_name}</h3><p className="tw:break-all">{selected.email}</p><span className={`${s.badge} tw:mt-3`}>{labels[selected.status]}</span></div>
        <section className={s.section}><h3 className="tw:font-bold">Solicitud de la persona</h3><p className="tw:whitespace-pre-wrap tw:break-words">{selected.reason}</p><p className={s.muted}>Válida hasta: {date(selected.expires_at)} (Santiago).</p></section>
        {selected.decision_note && <section className={s.section}><h3 className="tw:font-bold">Decisión registrada</h3><p className="tw:whitespace-pre-wrap tw:break-words">{selected.decision_note}</p><p className={s.muted}>{selected.decided_by_name || 'Administrador'}{selected.decided_at && ` · ${date(selected.decided_at)}`}</p></section>}
        {selected.can_decide ? <form className="tw:space-y-4" onSubmit={submit}>
          <h3 className="tw:font-bold">1. Verifica la identidad y elige la decisión</h3>
          <p className={s.error}>Verifica la identidad por un canal conocido. Aprobar invalida el autenticador anterior, los códigos de recuperación y todas las sesiones; la contraseña se conserva.</p>
          <label className={s.label}>Decisión<select className={s.field} aria-label="Decisión" value={decision} disabled={busy} onChange={event => setDecision(event.target.value as 'approve' | 'reject')}><option value="reject">Rechazar solicitud</option><option value="approve">Aprobar y restablecer MFA</option></select></label>
          {decision === 'approve' && <label className="tw:flex tw:items-start tw:gap-3"><input type="checkbox" required checked={verified} disabled={busy} onChange={event => setVerified(event.target.checked)} />Verifiqué la identidad del solicitante por un canal conocido.</label>}
          <label className={s.label}>Motivo de la decisión<textarea className={s.field} aria-label="Motivo de la decisión" required minLength={5} maxLength={500} rows={3} value={note} disabled={busy} onChange={event => setNote(event.target.value)} /><span className={s.muted}>{note.length}/500 caracteres · mínimo 5. Queda registrado en auditoría.</span></label>
          <h3 className="tw:border-x-0 tw:border-b-0 tw:border-t tw:border-solid tw:border-stroke tw:pt-5 tw:font-bold">2. Confirma con tus credenciales</h3>
          <PasswordField className="settings-field" label="Tu contraseña actual" name="password" required minLength={8} maxLength={128} autoComplete="current-password" disabled={busy} />
          {mfaEnabled && <label className={s.label}>Tu código MFA<input className={s.field} name="otp" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" disabled={busy} /></label>}
          <button className={`${s.button} ${decision === 'reject' ? s.danger : s.primary}`} disabled={busy || note.trim().length < 5 || (decision === 'approve' && !verified)}>{busy ? 'Guardando…' : 'Confirmar decisión'}</button>
        </form> : <p className={s.notice}>Esta solicitud no admite decisiones. Si corresponde a tu cuenta, debe revisarla otro administrador.</p>}
      </div>
    </Modal>}
  </section>;
}
