import { useState } from 'react';
import { updateCaregiverNote, updateCaregiverStatus, type Caregiver } from '../../api/caregivers';
import { CAREGIVER_STATUS_META } from '../../lib/caregiverMeta';
import { fmt } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';
import { canManageMarketplace } from '../../routes/permissions';
import { Modal } from '../../components/Modal';
import { marketStyles as s, statusColor } from './marketStyles';
interface CaregiverDetailProps { caregiver: Caregiver; onChanged: () => void; onClose?: () => void; }
export function CaregiverDetail({ caregiver, onChanged, onClose = () => {} }: CaregiverDetailProps) {
  const { user } = useAuth();
  const canManage = canManageMarketplace(user?.role);
  const [saved, setSaved] = useState(caregiver);
  const [intent, setIntent] = useState<'approved' | 'suspended' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [internalNote, setInternalNote] = useState(caregiver.internal_note ?? '');
  const [savingNote, setSavingNote] = useState(false);
  const noteDirty = internalNote !== (saved.internal_note ?? '');
  const verified = saved.certifications_verified === true;
  const verificationKnown = typeof saved.certifications_verified === 'boolean';
  async function handleSaveNote() {
    if (!canManage || busy || !noteDirty || internalNote.length > 2000) return;
    setBusy(true); setSavingNote(true); setError(''); setNotice('');
    try {
      const updated = await updateCaregiverNote(saved.caregiver_id, internalNote);
      setSaved(updated); setInternalNote(updated.internal_note ?? '');
      setNotice(internalNote ? 'Nota interna guardada.' : 'Nota interna vaciada.'); onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible guardar la nota interna.'); }
    finally { setBusy(false); setSavingNote(false); }
  }
  async function handleUpdate() {
    if (!canManage || busy || !intent || (intent === 'approved' && !verified) || (intent === 'suspended' && (reason.trim().length < 10 || reason.trim().length > 1000))) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await updateCaregiverStatus(saved.caregiver_id, intent, intent === 'suspended' ? reason.trim() : undefined);
      setSaved({ ...saved, status: intent }); setIntent(null); setReason(''); setNotice('Estado del perfil actualizado correctamente.'); onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible actualizar el perfil.'); }
    finally { setBusy(false); }
  }
  return <Modal title="Revisar perfil de cuidadora" onClose={onClose} busy={busy} dirty={intent !== null || (canManage && noteDirty)} error={error}>
    <div className="tw:space-y-6">
      <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div><h3 className={s.heading}>{saved.name}</h3><p className={`tw:mt-2 ${s.muted}`}>{saved.zone || 'Zona no informada'}</p></div><span className={`${s.badge} ${statusColor(saved.status)}`}>{CAREGIVER_STATUS_META[saved.status]?.label ?? saved.status}</span></header>
      {notice && <p role="status" className={`${s.notice} tw:text-positive`}>{notice}</p>}
      <dl className="tw:grid tw:gap-5 tw:rounded-xl tw:bg-canvas tw:p-5 tw:sm:grid-cols-2">{[
        ['Especialidades', saved.specialties.join(', ') || 'Sin información'], ['Idiomas', saved.languages.join(', ') || 'Sin información'],
        ['Certificaciones registradas', fmt(saved.certifications_count)],
        ['Verificación de certificaciones', verified ? 'Verificadas' : verificationKnown ? 'Pendiente de verificación' : 'Sin información de verificación'],
        ['Reseñas', fmt(saved.reviews_count)],
        ['Calificación', saved.rating_avg == null ? 'Sin calificaciones' : `${saved.rating_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} / 5`],
        ['Solicitud recibida', saved.submitted_at ? new Date(saved.submitted_at).toLocaleString('es-CL') : 'Sin datos'],
      ].map(([label, value]) => <div key={label}><dt className={s.muted}>{label}</dt><dd className="tw:mt-1 tw:break-words tw:font-semibold">{value}</dd></div>)}</dl>
      <div role="status" className={s.notice}>
        <strong className={`tw:block ${verified ? 'tw:text-positive' : 'tw:text-negative'}`}>{verified ? 'Certificaciones verificadas' : verificationKnown ? 'Falta verificar las certificaciones' : 'No se recibió el estado de verificación'}</strong>
        <p className="tw:mt-2 tw:mb-0">{verified ? 'El sistema informa que las certificaciones están verificadas. El perfil puede pasar a revisión para su aprobación.' : verificationKnown ? 'Tener certificaciones registradas no confirma su validez. No se puede aprobar este perfil hasta que el sistema de origen informe su verificación.' : 'No podemos confirmar si las certificaciones están verificadas. Actualiza el listado antes de aprobar el perfil.'}</p>
        {!verified && <p className="tw:mt-2 tw:mb-0">La verificación no se realiza desde esta consola.</p>}
      </div>
      {canManage && <section className={s.section}><h3 className="tw:font-bold">Revisión del perfil</h3><p className={s.muted}>Solo puedes aprobar perfiles con certificaciones verificadas.</p>
        {intent ? <div className="tw:space-y-5"><p>¿Confirmar {intent === 'approved' ? 'la aprobación' : 'la suspensión'} de <strong>{saved.name}</strong>?</p>
          {intent === 'suspended' && <label className={s.label}>Motivo de suspensión<textarea className={`${s.field} tw:min-h-28 tw:leading-relaxed`} value={reason} minLength={10} maxLength={1000} disabled={busy} placeholder="Ej.: Documentación pendiente de validación; se suspende el perfil hasta completar la revisión." onChange={event => setReason(event.target.value)} /><span className={s.muted}>Obligatorio · De 10 a 1000 caracteres. Explica por qué suspendes el perfil. Se guarda con la decisión y queda en auditoría; no sustituye la nota interna ni envía un correo.</span></label>}
          <div className={s.actions}><button className={s.button} type="button" disabled={busy} onClick={() => { setIntent(null); setReason(''); setError(''); }}>Cancelar revisión</button><button className={`${s.button} ${s.primary}`} type="button" disabled={busy || (intent === 'approved' && !verified) || (intent === 'suspended' && (reason.trim().length < 10 || reason.trim().length > 1000))} onClick={() => void handleUpdate()}>Confirmar {intent === 'approved' ? 'aprobación' : 'suspensión'}</button></div>
        </div> : <div className={s.actions}><button className={`${s.button} ${s.primary}`} type="button" disabled={busy || saved.status === 'approved' || !verified} onClick={() => { if (!verified) return; setIntent('approved'); setError(''); setNotice(''); }}>Aprobar</button><button className={`${s.button} tw:text-negative`} type="button" disabled={busy || saved.status === 'suspended'} onClick={() => { setIntent('suspended'); setError(''); setNotice(''); }}>Suspender</button></div>}
      </section>}
      {canManage && <section className={s.section} aria-label="Notas internas del perfil">
        <h3 className="tw:font-bold">Nota interna de seguimiento</h3>
        <p className={s.muted}>Observaciones para administradores y editores. Guardarla no aprueba ni suspende el perfil y no se envía al cuidador.</p>
        <label className={s.label}>Nota interna
          <textarea className={`${s.field} tw:min-h-32 tw:font-sans tw:font-normal tw:leading-relaxed`} value={internalNote} maxLength={2000} rows={4} disabled={busy}
            placeholder="Ej.: Se revisaron los antecedentes. Falta confirmar la vigencia de una certificación." aria-describedby="caregiver-note-help"
            onChange={event => setInternalNote(event.target.value)} />
          <span id="caregiver-note-help" className={s.muted}>{internalNote.length} / 2000 caracteres. No incluyas contraseñas ni datos personales innecesarios.</span>
        </label>
        <div className={s.actions}>
          <button type="button" className={`${s.button} ${s.primary}`} disabled={busy || !noteDirty || internalNote.length > 2000} onClick={() => void handleSaveNote()}>{savingNote ? 'Guardando nota…' : 'Guardar nota interna'}</button>
          {noteDirty && <span className={s.muted}>Tienes cambios sin guardar en la nota.</span>}
        </div>
        <p className={s.muted}>Se conserva una nota editable por perfil; sus cambios quedan registrados en auditoría. Para vaciarla, borra el texto y guarda.</p>
      </section>}
    </div>
  </Modal>;
}
