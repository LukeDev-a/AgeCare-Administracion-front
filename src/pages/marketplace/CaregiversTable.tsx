import type { Caregiver } from '../../api/caregivers';
import { CAREGIVER_STATUS_META } from '../../lib/caregiverMeta';
import { ticketDate } from '../../lib/format';
import { marketStyles as s, statusColor } from './marketStyles';
interface CaregiversTableProps { items: Caregiver[]; selectedId: string | null; onSelect: (id: string) => void; }
export function CaregiversTable({ items, selectedId, onSelect }: CaregiversTableProps) {
  if (!items.length) return <div className="tw:py-12 tw:text-center"><p className="tw:font-semibold">No hay perfiles para este filtro.</p><p className={`tw:mt-2 ${s.muted}`}>Prueba otro nombre o cambia el estado.</p></div>;
  return <div className={s.scroll}><table className={s.table}>
    <thead><tr><th>Cuidadora</th><th>Especialidades</th><th>Calificación</th><th>Estado</th><th>Solicitud recibida</th><th>Detalle</th></tr></thead>
    <tbody>{items.map(caregiver => <tr key={caregiver.caregiver_id} className={selectedId === caregiver.caregiver_id ? 'tw:bg-canvas' : 'tw:hover:bg-canvas/50'}>
      <td><p className="tw:font-semibold">{caregiver.name}</p><p className={`tw:mt-1 ${s.muted}`}>{caregiver.zone || 'Zona no informada'}</p></td>
      <td className="tw:max-w-64">{caregiver.specialties.join(', ') || 'Sin información'}</td>
      <td>{caregiver.rating_avg == null ? 'Sin calificaciones' : `${caregiver.rating_avg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} / 5`}</td>
      <td><span className={`${s.badge} ${statusColor(caregiver.status)}`}>{CAREGIVER_STATUS_META[caregiver.status]?.label ?? caregiver.status}</span></td>
      <td>{ticketDate(caregiver.submitted_at)}</td>
      <td><button type="button" className={s.button} aria-label={`Ver perfil de ${caregiver.name}`} onClick={() => onSelect(caregiver.caregiver_id)}>Ver perfil</button></td>
    </tr>)}</tbody>
  </table></div>;
}
