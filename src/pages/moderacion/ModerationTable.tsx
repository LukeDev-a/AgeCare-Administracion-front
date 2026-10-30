import type { ModerationItem } from '../../api/moderation';
import { ticketDate } from '../../lib/format';
import { MODERATION_STATUS_META, MODERATION_TYPES } from '../../lib/moderationMeta';

interface ModerationTableProps {
  items: ModerationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ModerationTable({ items, selectedId, onSelect }: ModerationTableProps) {
  if (items.length === 0) {
    return (
      <table className="data">
        <tbody>
          <tr><td colSpan={5}>No hay elementos para este filtro.</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="data">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Autor</th>
          <th>Motivo</th>
          <th>Estado</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const status = MODERATION_STATUS_META[item.status] ?? MODERATION_STATUS_META.pending;
          return (
            <tr
              key={item.id}
              className={`moderation-row${selectedId === item.id ? ' selected' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <td><button className="action-button" type="button" onClick={event => { event.stopPropagation(); onSelect(item.id); }}>{MODERATION_TYPES[item.type] ?? item.type}</button>
                {item.is_safety && <span className="chip warn">Seguridad</span>}</td>
              <td>{item.author?.name ?? 'Sin nombre'}</td>
              <td>{item.report_reason ?? 'Sin motivo indicado'}</td>
              <td><span className={`chip ${status.className}`}>{status.label}</span></td>
              <td>{ticketDate(item.created_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
