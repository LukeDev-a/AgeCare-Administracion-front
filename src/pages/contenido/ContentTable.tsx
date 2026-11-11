import type { ContentItem } from '../../api/content';
import { AUDIO_STATES, CONTENT_STATUS_META, CONTENT_TYPES } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';
import { contentStyles as ui } from './contentStyles';

interface ContentTableProps {
  items: ContentItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ContentTable({ items, selectedId, onSelect }: ContentTableProps) {
  if (items.length === 0) {
    return (
      <table className={ui.table}>
        <tbody>
          <tr><td colSpan={6}>No hay contenido para este filtro.</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className={ui.table}>
      <thead>
        <tr>
          <th>Título</th>
          <th>Tipo</th>
          <th>Estado</th>
          <th>Audio</th>
          <th>Programación / actualizado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const status = CONTENT_STATUS_META[item.status] ?? CONTENT_STATUS_META.draft;
          return (
            <tr
              key={item.id}
              className={`tw:cursor-pointer tw:hover:bg-canvas ${selectedId === item.id ? 'tw:bg-brand-soft' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <td className="tw:min-w-60 tw:max-w-sm tw:font-semibold tw:break-words">{item.title}</td>
              <td>{CONTENT_TYPES[item.type] ?? item.type}</td>
              <td><span className={`chip ${status.className} tw:px-3 tw:py-1.5 tw:text-sm`}>{status.label}</span></td>
              <td>{item.audio_available ? 'Disponible' : item.audio_status === 'ready' ? 'Audio no disponible' : AUDIO_STATES[item.audio_status] || 'Pendiente'}{item.approved_version !== item.text_version && <p className="tw:mt-2 tw:text-muted">Texto por aprobar</p>}</td>
              <td>{item.publish_at && <p className="tw:mb-2">Programado: {ticketDate(item.publish_at)}</p>}Actualizado: {ticketDate(item.updated_at)}</td>
              <td>
                <button
                  className={ui.button}
                  aria-expanded={selectedId === item.id}
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
