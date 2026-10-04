import { useState } from 'react';
import { updateCaregiverStatus, type Caregiver } from '../../api/caregivers';
import { CAREGIVER_STATUS_META } from '../../lib/caregiverMeta';
import { fmt } from '../../lib/format';

interface CaregiverDetailProps {
  caregiver: Caregiver;
  onChanged: () => void;
}

export function CaregiverDetail({ caregiver, onChanged }: CaregiverDetailProps) {
  const [pendingAction, setPendingAction] = useState<'approved' | 'suspended' | null>(null);

  async function handleUpdate(status: 'approved' | 'suspended') {
    setPendingAction(status);
    try {
      await updateCaregiverStatus(caregiver.caregiver_id, status);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible actualizar el perfil.');
    } finally {
      setPendingAction(null);
    }
  }

  const status = CAREGIVER_STATUS_META[caregiver.status] ?? CAREGIVER_STATUS_META.pending;

  return (
    <div className="card content-detail">
      <div className="card-head">
        <div>
          <div className="card-title">{caregiver.name}</div>
          <div className="card-sub">{caregiver.zone} · {caregiver.languages.join(', ')}</div>
        </div>
        <span className={`chip ${status.className}`}>{status.label}</span>
      </div>
      <div className="ticket-detail-grid">
        <div>
          <div className="ticket-detail-label">Especialidades</div>
          <div className="ticket-detail-value">{caregiver.specialties.join(', ')}</div>
        </div>
        <div>
          <div className="ticket-detail-label">Certificaciones</div>
          <div className="ticket-detail-value">{fmt(caregiver.certifications_count)}</div>
        </div>
        <div>
          <div className="ticket-detail-label">Reseñas</div>
          <div className="ticket-detail-value">{fmt(caregiver.reviews_count)}</div>
        </div>
        <div>
          <div className="ticket-detail-label">Calificación</div>
          <div className="ticket-detail-value">
            {caregiver.rating_avg == null ? '—' : caregiver.rating_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })}
          </div>
        </div>
      </div>
      <div className="ticket-form-actions">
        <button
          className="action-button"
          type="button"
          disabled={pendingAction !== null || caregiver.status === 'approved'}
          onClick={() => void handleUpdate('approved')}
        >
          {pendingAction === 'approved' ? 'Aprobando...' : 'Aprobar'}
        </button>
        <button
          className="action-button"
          type="button"
          disabled={pendingAction !== null || caregiver.status === 'suspended'}
          onClick={() => void handleUpdate('suspended')}
        >
          {pendingAction === 'suspended' ? 'Suspendiendo...' : 'Suspender'}
        </button>
      </div>
    </div>
  );
}