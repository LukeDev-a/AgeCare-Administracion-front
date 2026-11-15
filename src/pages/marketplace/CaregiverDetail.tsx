import { useState } from 'react';
import { updateCaregiverStatus, type Caregiver } from '../../api/caregivers';
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
  async function handleUpdate() {
    if (!canManage || busy || !intent || (intent === 'suspended' && (reason.trim().length < 10 || reason.trim().length > 1000))) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await updateCaregiverStatus(saved.caregiver_id, intent, intent === 'suspended' ? reason.trim() : undefined);
      setSaved({ ...saved, status: intent }); setIntent(null); setReason(''); setNotice('Estado del perfil actualizado correctamente.'); onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible actualizar el perfil.'); }
    finally { setBusy(false); }
  }
  return <Modal title="Revisar perfil de cuidadora" onClose={onClose} busy={busy} dirty={intent !== null} error={error}>
    <div className="tw:space-y-6">
      <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div><h3 className={s.heading}>{saved.name}</h3><p className={`tw:mt-2 ${s.muted}`}>{saved.zone || 'Zona no informada'}</p></div><span className={`${s.badge} ${statusColor(saved.status)}`}>{CAREGIVER_STATUS_META[saved.status]?.label ?? saved.status}</span></header>
      {notice && <p role="status" className={`${s.notice} tw:text-positive`}>{notice}</p>}
      <dl className="tw:grid tw:gap-5 tw:rounded-xl tw:bg-canvas tw:p-5 tw:sm:grid-cols-2">{[
        ['Especialidades', saved.specialties.join(', ') || 'Sin información'], ['Idiomas', saved.languages.join(', ') || 'Sin información'],
        ['Certificaciones registradas', fmt(saved.certifications_count)], ['Reseñas', fmt(saved.reviews_count)],
        ['Calificación', saved.rating_avg == null ? 'Sin calificaciones' : `${saved.rating_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} / 5`],
        ['Solicitud recibida', saved.submitted_at ? new Date(saved.submitted_at).toLocaleString('es-CL') : 'Sin datos'],
      ].map(([label, value]) => <div key={label}><dt className={s.muted}>{label}</dt><dd className="tw:mt-1 tw:break-words tw:font-semibold">{value}</dd></div>)}</dl>
      {canManage && <section className={s.section}><h3 className="tw:font-bold">Revisión del perfil</h3><p className={s.muted}>La aprobación requiere que sus certificaciones estén verificadas. El servicio comprobará esta condición al confirmar.</p>
        {intent ? <div className="tw:space-y-5"><p>¿Confirmar {intent === 'approved' ? 'la aprobación' : 'la suspensión'} de <strong>{saved.name}</strong>?</p>
          {intent === 'suspended' && <label className={s.label}>Motivo de suspensión<textarea className={`${s.field} tw:min-h-28 tw:leading-relaxed`} value={reason} minLength={10} maxLength={1000} disabled={busy} onChange={event => setReason(event.target.value)} /><span className={s.muted}>Obligatorio · Entre 10 y 1000 caracteres. Quedará registrado con la decisión.</span></label>}
          <div className={s.actions}><button className={s.button} type="button" disabled={busy} onClick={() => { setIntent(null); setReason(''); setError(''); }}>Cancelar revisión</button><button className={`${s.button} ${s.primary}`} type="button" disabled={busy || (intent === 'suspended' && (reason.trim().length < 10 || reason.trim().length > 1000))} onClick={() => void handleUpdate()}>Confirmar {intent === 'approved' ? 'aprobación' : 'suspensión'}</button></div>
        </div> : <div className={s.actions}><button className={`${s.button} ${s.primary}`} type="button" disabled={busy || saved.status === 'approved'} onClick={() => { setIntent('approved'); setError(''); setNotice(''); }}>Aprobar</button><button className={`${s.button} tw:text-negative`} type="button" disabled={busy || saved.status === 'suspended'} onClick={() => { setIntent('suspended'); setError(''); setNotice(''); }}>Suspender</button></div>}
      </section>}
    </div>
  </Modal>;
}
