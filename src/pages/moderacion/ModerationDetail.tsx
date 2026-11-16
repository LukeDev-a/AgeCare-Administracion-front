import { useState } from 'react';
import { decideModeration, type ModerationItem, type RejectReason } from '../../api/moderation';
import { ticketDate } from '../../lib/format';
import { MODERATION_STATUS_META, MODERATION_TYPES, REJECT_REASONS } from '../../lib/moderationMeta';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from '../../components/Modal';
import { moderationStyles as s, moderationColor } from './moderationStyles';

const CONTENT_LABELS = new Map(Object.entries({ text: 'Texto', rating: 'Calificación', name: 'Nombre', description: 'Descripción', specialties: 'Especialidades', zone: 'Zona', languages: 'Idiomas' }));
function ContentValue({ value }: { value: unknown }) {
  if (value == null) return <span className="tw:text-muted">Sin datos</span>;
  if (Array.isArray(value)) return <ul className="tw:list-disc tw:space-y-3 tw:pl-5">{value.map((entry, index) => <li key={index}><ContentValue value={entry} /></li>)}</ul>;
  if (typeof value === 'object') return <dl className="tw:space-y-5">{Object.entries(value).map(([key, entry]) => <div key={key}><dt className="tw:mb-2 tw:text-sm tw:font-semibold tw:text-muted">{CONTENT_LABELS.get(key) ?? key.replaceAll('_', ' ')}</dt><dd className="tw:whitespace-pre-wrap tw:break-words tw:leading-7"><ContentValue value={entry} /></dd></div>)}</dl>;
  return <span>{typeof value === 'boolean' ? value ? 'Sí' : 'No' : String(value)}</span>;
}
interface ModerationDetailProps { item: ModerationItem; onResolved: () => void; onClose?: () => void; }
export function ModerationDetail({ item, onResolved, onClose = () => {} }: ModerationDetailProps) {
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | null>(null);
  const [intent, setIntent] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<RejectReason>('other');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'moderator';
  const protectedContent = item.type === 'photo' || item.type === 'chat_message';
  const available = !protectedContent && item.content_available !== false;
  const dirty = note !== '' || reason !== 'other' || intent !== null;
  const reasonMissing = intent === 'reject' && reason === 'other' && !note.trim();
  async function handleDecision() {
    if (!intent || !canManage || item.status !== 'pending' || !available || pendingDecision) return;
    if (note.length > 1000 || reasonMissing) { setError('Con Otro motivo debes escribir una explicación. La nota admite hasta 1000 caracteres.'); return; }
    setError(''); setPendingDecision(intent);
    try {
      await decideModeration(item.id, intent === 'approve' ? { decision: intent, note: note.trim() || undefined } : { decision: intent, reason_code: reason, note: note.trim() || undefined });
      onResolved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible resolver el elemento.'); }
    finally { setPendingDecision(null); }
  }
  return <Modal title={item.status === 'pending' ? 'Revisar contenido' : 'Detalle de la decisión'} onClose={onClose} dirty={dirty} busy={pendingDecision !== null} error={error}>
    <div className="tw:space-y-6">
      <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div><h3 className={s.heading}>{MODERATION_TYPES[item.type] ?? item.type}</h3><p className={`tw:mt-2 ${s.muted}`}>{item.author?.name ?? 'Sin nombre'} · {ticketDate(item.created_at)}</p></div><div className={s.actions}>{item.is_safety && <span className={`${s.badge} tw:text-warning`}>Prioridad de seguridad</span>}<span className={`${s.badge} ${moderationColor(item.status)}`}>{MODERATION_STATUS_META[item.status]?.label ?? item.status}</span></div></header>
      <div className="tw:grid tw:items-start tw:gap-5 tw:lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="tw:min-w-0 tw:space-y-5">
      <dl className="tw:grid tw:gap-5 tw:rounded-xl tw:bg-canvas tw:p-5 tw:sm:grid-cols-2"><div><dt className={s.muted}>Motivo del reporte</dt><dd className="tw:mt-2 tw:whitespace-pre-wrap tw:break-words tw:font-semibold">{item.report_reason || 'No indicado'}</dd></div><div><dt className={s.muted}>Reportado por</dt><dd className="tw:mt-2 tw:font-semibold">{item.reported_by?.name ?? 'No indicado'}</dd></div></dl>
      <section className={s.section}><h3 className="tw:font-bold">1. Lee el contenido</h3>{available ? <div className="tw:rounded-xl tw:bg-canvas tw:p-5"><ContentValue value={item.content} /></div> : <p className={s.notice}>El acceso temporal a este contenido no está disponible. No se puede aprobar ni rechazar sin revisarlo.</p>}</section>
      </div>
      {item.status !== 'pending' && <section className={s.section}><h3 className="tw:font-bold">Decisión registrada</h3><dl className="tw:grid tw:gap-5 tw:sm:grid-cols-2"><div><dt className={s.muted}>Responsable</dt><dd className="tw:mt-2 tw:font-semibold">{item.decided_by_name ?? 'Responsable no registrado'}</dd></div><div><dt className={s.muted}>Fecha de decisión</dt><dd className="tw:mt-2">{item.decided_at ? ticketDate(item.decided_at) : 'Fecha no registrada'}</dd></div>{item.reject_reason_code && <div><dt className={s.muted}>Motivo del rechazo</dt><dd className="tw:mt-2">{REJECT_REASONS[item.reject_reason_code] ?? item.reject_reason_code}</dd></div>}<div className="tw:sm:col-span-2"><dt className={s.muted}>Nota de revisión</dt><dd className="tw:mt-2 tw:whitespace-pre-wrap tw:break-words">{item.decision_note || 'Sin nota'}</dd></div></dl></section>}
      {canManage && available && item.status === 'pending' && <section className={s.section}>
        <div><h3 className="tw:font-bold">2. Decide qué corresponde</h3><p className={`tw:mt-2 ${s.muted}`}>Revisa el texto y el motivo del reporte antes de elegir una acción.</p></div>
        {intent === 'reject' && <label className={s.label}>Motivo de rechazo<select className={s.field} aria-label="Motivo de rechazo" value={reason} disabled={!!pendingDecision} onChange={event => setReason(event.target.value as RejectReason)}>{Object.entries(REJECT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <label className={s.label}>Nota de la decisión<textarea className={`${s.field} tw:min-h-32 tw:resize-y tw:leading-relaxed`} aria-label="Nota de moderación" value={note} maxLength={1000} placeholder="Explica brevemente lo que revisaste o el motivo de tu decisión." disabled={!!pendingDecision} onChange={event => setNote(event.target.value)} /><span className={s.muted}>{intent === 'reject' && reason === 'other' ? 'Obligatoria con Otro motivo. Escribe una explicación antes de confirmar.' : 'Opcional.'} · {note.length} / 1000 caracteres.</span></label>
        {intent ? <div className="tw:space-y-4 tw:rounded-xl tw:bg-canvas tw:p-5"><p>¿Confirmar {intent === 'approve' ? 'la aprobación' : 'el rechazo'} de este elemento?</p>{reasonMissing && <p className="tw:text-sm tw:text-warning">Para continuar debes escribir una explicación.</p>}<div className={s.actions}><button className={s.button} type="button" disabled={!!pendingDecision} onClick={() => { setIntent(null); setError(''); }}>Volver a revisar</button><button className={`${s.button} ${intent === 'approve' ? s.primary : 'tw:text-negative'}`} type="button" disabled={!!pendingDecision || reasonMissing || note.length > 1000} onClick={() => void handleDecision()}>{intent === 'approve' ? 'Confirmar aprobación' : 'Confirmar rechazo'}</button></div></div>
          : <div className={s.actions}><button className={`${s.button} ${s.primary}`} type="button" disabled={!!pendingDecision} onClick={() => { setIntent('approve'); setError(''); }}>Aprobar</button><button className={`${s.button} tw:text-negative`} type="button" disabled={!!pendingDecision} onClick={() => { setIntent('reject'); setError(''); }}>Rechazar</button></div>}
        <p className={s.muted}>Se registrarán responsable, fecha y motivo. La decisión guardada no se puede modificar desde esta consola.</p>
      </section>}
      </div>
    </div>
  </Modal>;
}
