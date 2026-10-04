import type { Caregiver } from '../../api/caregivers';
import { CAREGIVER_STATUS_META } from '../../lib/caregiverMeta';
import { ticketDate } from '../../lib/format';

interface CaregiversTableProps {
  items: Caregiver[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CaregiversTable({ items, selectedId, onSelect }: CaregiversTableProps) {
  if (items.length === 0) {
    return (
      <table className="data">
        <tbody>
          <tr><td colSpan={6}>No hay perfiles para este filtro.</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="data">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Zona</th>
          <th>Especialidades</th>
          <th>Calificación</th>
          <th>Estado</th>
          <th>Enviada</th>
        </tr>
      </thead>
      <tbody>
        {items.map(caregiver => {
          const status = CAREGIVER_STATUS_META[caregiver.status] ?? CAREGIVER_STATUS_META.pending;
          return (
            <tr
              key={caregiver.caregiver_id}
              className={`marketplace-row${selectedId === caregiver.caregiver_id ? ' selected' : ''}`}
              onClick={() => onSelect(caregiver.caregiver_id)}
            >
              <td>{caregiver.name}</td>
              <td>{caregiver.zone}</td>
              <td>{caregiver.specialties.join(', ')}</td>
              <td>{caregiver.rating_avg == null ? '—' : caregiver.rating_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</td>
              <td><span className={`chip ${status.className}`}>{status.label}</span></td>
              <td>{ticketDate(caregiver.submitted_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
