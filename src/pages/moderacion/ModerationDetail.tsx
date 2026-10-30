import { useState } from 'react';
import { decideModeration, type ModerationItem, type RejectReason } from '../../api/moderation';
import { ticketDate } from '../../lib/format';
import { MODERATION_STATUS_META, MODERATION_TYPES, REJECT_REASONS } from '../../lib/moderationMeta';
import { useAuth } from '../../auth/AuthContext';

const CONTENT_LABELS = new Map(Object.entries({ text: 'Texto', rating: 'Calificación', name: 'Nombre', description: 'Descripción' }));

function ContentValue({ value }: { value: unknown }) {
  if (value == null) return <span>Sin datos</span>;
  if (Array.isArray(value)) return <ul>{value.map((entry, index) => <li key={index}><ContentValue value={entry} /></li>)}</ul>;
  if (typeof value === 'object') return <dl>{Object.entries(value).map(([key, entry]) => <div key={key}>
    <dt>{CONTENT_LABELS.get(key) ?? key.replaceAll('_', ' ')}</dt>
    <dd><ContentValue value={entry} /></dd></div>)}</dl>;
  return <span>{typeof value === 'boolean' ? value ? 'Sí' : 'No' : String(value)}</span>;
}

interface ModerationDetailProps {
  item: ModerationItem;
  onResolved: () => void;
}

export function ModerationDetail({ item, onResolved }: ModerationDetailProps) {
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<RejectReason>('other');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'moderator';
  const protectedContent = item.type === 'photo' || item.type === 'chat_message';
  const available = !protectedContent && item.content_available !== false;

  async function handleDecision(decision: 'approve' | 'reject') {
    if (!canManage || item.status !== 'pending' || !available || pendingDecision) return;
    if (note.length > 1000 || decision === 'reject' && reason === 'other' && !note.trim()) {
      setError('Con Otro motivo debes escribir una explicación. La nota admite hasta 1000 caracteres.');
      return;
    }
    setError('');
    setPendingDecision(decision);
    try {
      await decideModeration(item.id, decision === 'approve' ? { decision, note: note.trim() || undefined }
        : { decision, reason_code: reason, note: note.trim() || undefined });
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible resolver el elemento.');
      setPendingDecision(null);
    }
  }

  const status = MODERATION_STATUS_META[item.status] ?? MODERATION_STATUS_META.pending;

  return (
    <div className="card content-detail">
      <div className="card-head">
        <div>
          <div className="card-title">{MODERATION_TYPES[item.type] ?? item.type}</div>
          <div className="card-sub">{item.author?.name ?? 'Sin nombre'} · {ticketDate(item.created_at)}</div>
        </div>
        <span className={`chip ${status.className}`}>{status.label}</span>
      </div>
      {item.is_safety && <p className="chip warn">Prioridad de seguridad</p>}
      <div className="ticket-detail-grid">
        <div>
          <div className="ticket-detail-label">Motivo del reporte</div>
          <div className="ticket-detail-value">{item.report_reason ?? 'No indicado'}</div>
        </div>
        <div>
          <div className="ticket-detail-label">Reportado por</div>
          <div className="ticket-detail-value">{item.reported_by?.name ?? 'No indicado'}</div>
        </div>
      </div>
      <div className="ticket-detail-label">Contenido</div>
      <div className="moderation-content" style={{ marginTop: 6 }}>{available ? <ContentValue value={item.content} /> :
        <p>El acceso temporal a este contenido todavía no está disponible. No se puede tomar una decisión sin revisarlo.</p>}</div>
      {item.status !== 'pending' && <div>
        <p>Decisión de {item.decided_by_name ?? 'Responsable no registrado'} · {item.decided_at ? ticketDate(item.decided_at) : 'Fecha no registrada'}</p>
        {item.reject_reason_code && <p>Motivo: {REJECT_REASONS[item.reject_reason_code]}</p>}
        <p>Nota: {item.decision_note || 'Sin nota'}</p>
      </div>}
      {canManage && available && item.status === 'pending' && <div className="ticket-form">
        <label>Motivo de rechazo<select aria-label="Motivo de rechazo" value={reason} disabled={!!pendingDecision} onChange={event => setReason(event.target.value as RejectReason)}>
          {Object.entries(REJECT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="wide">Nota (opcional al aprobar; obligatoria al rechazar con Otro motivo)
          <textarea aria-label="Nota de moderación" value={note} maxLength={1000} disabled={!!pendingDecision} onChange={event => setNote(event.target.value)} />
        </label>
        {error && <p role="alert" className="wide">{error}</p>}
        <p className="mini-note wide">La decisión se registra en esta consola. La publicación u ocultación en la app todavía no está conectada.</p>
        <div className="ticket-form-actions" style={{ marginTop: 16 }}>
          <button
            className="action-button"
            type="button"
            disabled={pendingDecision !== null}
            onClick={() => void handleDecision('reject')}
          >
            {pendingDecision === 'reject' ? 'Rechazando...' : 'Rechazar'}
          </button>
          <button
            className="action-button"
            type="button"
            disabled={pendingDecision !== null}
            onClick={() => void handleDecision('approve')}
          >
            {pendingDecision === 'approve' ? 'Aprobando...' : 'Aprobar'}
          </button>
        </div>
      </div>}
    </div>
  );
}
