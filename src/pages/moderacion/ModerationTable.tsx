import type { ModerationItem } from '../../api/moderation';
import { ticketDate } from '../../lib/format';
import { MODERATION_STATUS_META, MODERATION_TYPES } from '../../lib/moderationMeta';
import { moderationStyles as s, moderationColor } from './moderationStyles';
interface ModerationTableProps { items: ModerationItem[]; selectedId: string | null; onSelect: (id: string) => void; }
export function ModerationTable({ items, selectedId, onSelect }: ModerationTableProps) {
  if (!items.length) return <div className="tw:py-14 tw:text-center"><p className="tw:text-lg tw:font-semibold">No hay elementos para este filtro.</p><p className={`tw:mt-2 ${s.muted}`}>Puedes revisar otro estado o tipo de contenido.</p></div>;
  return <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke"><table className={s.table}>
    <thead><tr><th>Contenido</th><th>Autor</th><th>Motivo del reporte</th><th>Estado</th><th>Recibido</th><th>Revisión</th></tr></thead>
    <tbody>{items.map(item => <tr key={item.id} className={selectedId === item.id ? 'tw:bg-canvas' : 'tw:hover:bg-canvas/50'}>
      <td><p className="tw:font-semibold">{MODERATION_TYPES[item.type] ?? item.type}</p>{item.is_safety && <span className={`tw:mt-2 ${s.badge} tw:text-warning`}>Prioridad de seguridad</span>}</td>
      <td>{item.author?.name ?? 'Sin nombre'}</td><td className="tw:max-w-72 tw:break-words tw:leading-relaxed">{item.report_reason || 'Sin motivo indicado'}</td>
      <td><span className={`${s.badge} ${moderationColor(item.status)}`}>{MODERATION_STATUS_META[item.status]?.label ?? item.status}</span></td><td>{ticketDate(item.created_at)}</td>
      <td><button className={s.button} type="button" aria-label={`Revisar ${MODERATION_TYPES[item.type] ?? item.type} de ${item.author?.name ?? 'autor no indicado'}`} onClick={() => onSelect(item.id)}>{item.status === 'pending' ? 'Revisar' : 'Ver decisión'}</button></td>
    </tr>)}</tbody>
  </table></div>;
}
