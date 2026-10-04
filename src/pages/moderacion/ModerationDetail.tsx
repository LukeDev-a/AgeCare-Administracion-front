import { useState } from 'react';
import { decideModeration, type ModerationItem } from '../../api/moderation';
import { ticketDate } from '../../lib/format';
import { MODERATION_STATUS_META, MODERATION_TYPES } from '../../lib/moderationMeta';

interface ModerationDetailProps {
  item: ModerationItem;
  onResolved: () => void;
}

export function ModerationDetail({ item, onResolved }: ModerationDetailProps) {
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | null>(null);

  async function handleDecision(decision: 'approve' | 'reject') {
    setPendingDecision(decision);
    try {
      await decideModeration(item.id, decision);
      onResolved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible resolver el elemento.');
      setPendingDecision(null);
    }
  }

  const status = MODERATION_STATUS_META[item.status] ?? MODERATION_STATUS_META.pending;
  const content = JSON.stringify(item.content ?? {}, null, 2);

  return (
    <div className="card content-detail">
      <div className="card-head">
        <div>
          <div className="card-title">{MODERATION_TYPES[item.type] ?? item.type}</div>
          <div className="card-sub">{item.author?.name ?? 'Sin nombre'} · {ticketDate(item.created_at)}</div>
        </div>
        <span className={`chip ${status.className}`}>{status.label}</span>
      </div>
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
      <div className="moderation-content" style={{ marginTop: 6 }}>{content}</div>
      {item.status === 'pending' && (
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
      )}
    </div>
  );
}