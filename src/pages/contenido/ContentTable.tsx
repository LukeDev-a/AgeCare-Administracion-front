import type { ContentItem } from '../../api/content';
import { CONTENT_STATUS_META, CONTENT_TYPES } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';

interface ContentTableProps {
  items: ContentItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ContentTable({ items, selectedId, onSelect }: ContentTableProps) {
  if (items.length === 0) {
    return (
      <table className="data">
        <tbody>
          <tr><td colSpan={6}>No hay contenido para este filtro.</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="data">
      <thead>
        <tr>
          <th>Título</th>
          <th>Tipo</th>
          <th>Estado</th>
          <th>Audio</th>
          <th>Actualizado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const status = CONTENT_STATUS_META[item.status] ?? CONTENT_STATUS_META.draft;
          return (
            <tr
              key={item.id}
              className={`content-row${selectedId === item.id ? ' selected' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <td>{item.title}</td>
              <td>{CONTENT_TYPES[item.type] ?? item.type}</td>
              <td><span className={`chip ${status.className}`}>{status.label}</span></td>
              <td>{item.audio_available ? 'Disponible' : 'Pendiente'}</td>
              <td>{ticketDate(item.updated_at)}</td>
              <td>
                <button
                  className="action-button"
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    onSelect(item.id);
                  }}
                >
                  Revisar
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
