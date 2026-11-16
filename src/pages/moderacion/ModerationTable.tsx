import type { ModerationItem } from '../../api/moderation';
import { ticketDate } from '../../lib/format';
import { MODERATION_STATUS_META, MODERATION_TYPES } from '../../lib/moderationMeta';
import { moderationStyles as s, moderationColor } from './moderationStyles';
function preview(item: ModerationItem) {
  if (item.type === 'photo' || item.type === 'chat_message' || item.content_available === false) return 'Acceso al contenido no disponible';
  const content = item.content && typeof item.content === 'object' && !Array.isArray(item.content) ? item.content as Record<string, unknown> : {};
  const text = [content.text, content.description, content.name].find(value => typeof value === 'string');
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').slice(0, 140) : 'Abre el elemento para revisar su información';
}
interface ModerationTableProps { items: ModerationItem[]; selectedId: string | null; onSelect: (id: string) => void; }
export function ModerationTable({ items, selectedId, onSelect }: ModerationTableProps) {
  if (!items.length) return <div className="tw:py-14 tw:text-center"><p className="tw:text-lg tw:font-semibold">No hay elementos para este filtro.</p><p className={`tw:mt-2 ${s.muted}`}>Puedes revisar otro estado o tipo de contenido.</p></div>;
  return <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke"><table className={s.table}>
    <thead><tr><th>Contenido</th><th>Autor</th><th>Motivo del reporte</th><th>Estado</th><th>Recibido</th><th>Revisión</th></tr></thead>
    <tbody>{items.map(item => <tr key={item.id} className={selectedId === item.id ? 'tw:bg-canvas' : 'tw:hover:bg-canvas/50'}>
      <td className="tw:min-w-64 tw:max-w-sm"><p className="tw:font-semibold">{MODERATION_TYPES[item.type] ?? item.type}</p><p className="tw:mt-2 tw:line-clamp-2 tw:text-sm tw:leading-relaxed tw:text-muted">{preview(item)}</p>{item.is_safety && <span className={`tw:mt-2 ${s.badge} tw:text-warning`}>Prioridad de seguridad</span>}</td>
      <td>{item.author?.name ?? 'Sin nombre'}</td><td className="tw:max-w-72 tw:break-words tw:leading-relaxed">{item.report_reason || 'Sin motivo indicado'}</td>
      <td><span className={`${s.badge} ${moderationColor(item.status)}`}>{MODERATION_STATUS_META[item.status]?.label ?? item.status}</span></td><td>{ticketDate(item.created_at)}</td>
      <td><button className={`${s.button} ${item.status === 'pending' && item.type !== 'photo' && item.type !== 'chat_message' && item.content_available !== false ? s.primary : ''}`} type="button" aria-label={`Revisar ${MODERATION_TYPES[item.type] ?? item.type} de ${item.author?.name ?? 'autor no indicado'}`} onClick={() => onSelect(item.id)}>{item.status !== 'pending' ? 'Ver decisión' : item.type === 'photo' || item.type === 'chat_message' || item.content_available === false ? 'Ver detalle' : 'Revisar'}</button></td>
    </tr>)}</tbody>
  </table></div>;
}
