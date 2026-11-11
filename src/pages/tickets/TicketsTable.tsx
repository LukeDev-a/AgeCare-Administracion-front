import type { TicketListItem } from '../../api/tickets';
import { ticketDate } from '../../lib/format';
import { roleLabel } from '../../lib/roleMeta';
import { TICKET_CATEGORY_NAMES, TICKET_PRIORITY_META, TICKET_STATUS_META } from '../../lib/ticketMeta';
import { ticketStyles as ui } from './ticketStyles';

interface TicketsTableProps {
  items: TicketListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TicketsTable({ items, selectedId, onSelect }: TicketsTableProps) {
  if (items.length === 0) {
    return (
      <table className={ui.table}>
        <tbody>
          <tr>
            <td colSpan={7}>No hay tickets para este filtro.</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className={ui.table}>
      <thead>
        <tr>
          <th>N.º y creación</th>
          <th>Asunto</th>
          <th>Solicitante</th>
          <th>Categoría</th>
          <th>Prioridad</th>
          <th>Estado</th>
          <th>Responsable</th>
        </tr>
      </thead>
      <tbody>
        {items.map(ticket => {
          const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
          const priority = TICKET_PRIORITY_META[ticket.priority] ?? TICKET_PRIORITY_META.medium;
          return (
            <tr
              key={ticket.id}
              className={`tw:cursor-pointer tw:hover:bg-canvas ${selectedId === ticket.id ? 'tw:bg-brand-soft' : ''}`}
              onClick={() => onSelect(ticket.id)}
            >
              <td><button type="button" aria-label={`Abrir ticket ${ticket.number}`} aria-expanded={selectedId === ticket.id} className={`${ui.button} ${selectedId === ticket.id ? ui.primary : ''}`} onClick={event => { event.stopPropagation(); onSelect(ticket.id); }}>#{ticket.number}</button><p className="tw:mt-2 tw:text-xs tw:text-muted">{ticketDate(ticket.created_at)}</p></td>
              <td className="tw:min-w-56 tw:max-w-sm tw:font-semibold tw:break-words">{ticket.subject}</td>
              <td>{ticket.requester.name}<p className="tw:mt-1 tw:break-words tw:text-muted">{ticket.requester.email}</p><p className="tw:mt-2 tw:text-muted">{ticket.requester.role ? roleLabel(ticket.requester.role) : 'Sin perfil vinculado'}</p></td>
              <td>{TICKET_CATEGORY_NAMES[ticket.category] ?? ticket.category}</td>
              <td><span className={`chip ${priority.className} tw:px-3 tw:py-1.5 tw:text-sm tw:leading-relaxed tw:whitespace-nowrap`}>{priority.label}</span></td>
              <td><span className={`chip ${status.className} tw:px-3 tw:py-1.5 tw:text-sm tw:leading-relaxed tw:whitespace-nowrap`}>{status.icon} {status.label}</span></td>
              <td>{ticket.assigned_to?.name ?? 'Sin asignar'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
