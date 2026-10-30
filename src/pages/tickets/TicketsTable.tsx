import type { TicketListItem } from '../../api/tickets';
import { ticketDate } from '../../lib/format';
import { roleLabel } from '../../lib/roleMeta';
import { TICKET_CATEGORY_NAMES, TICKET_PRIORITY_META, TICKET_STATUS_META } from '../../lib/ticketMeta';

interface TicketsTableProps {
  items: TicketListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TicketsTable({ items, selectedId, onSelect }: TicketsTableProps) {
  if (items.length === 0) {
    return (
      <table className="data">
        <tbody>
          <tr>
            <td colSpan={9}>No hay tickets para este filtro.</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="data">
      <thead>
        <tr>
          <th>Id</th>
          <th>Asunto</th>
          <th>Solicitante</th>
          <th>Perfil</th>
          <th>Categoría</th>
          <th>Prioridad</th>
          <th>Estado</th>
          <th>Creado</th>
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
              className={`ticket-row${selectedId === ticket.id ? ' selected' : ''}`}
              onClick={() => onSelect(ticket.id)}
            >
              <td><button type="button" className="action-button" onClick={event => { event.stopPropagation(); onSelect(ticket.id); }}>#{ticket.number}</button></td>
              <td>{ticket.subject}</td>
              <td>{ticket.requester.name}<div className="mini-note">{ticket.requester.email}</div></td>
              <td>{ticket.requester.role ? roleLabel(ticket.requester.role) : 'Sin perfil vinculado'}</td>
              <td>{TICKET_CATEGORY_NAMES[ticket.category] ?? ticket.category}</td>
              <td><span className={`chip ${priority.className}`}>{priority.label}</span></td>
              <td><span className={`chip ${status.className}`}>{status.icon} {status.label}</span></td>
              <td>{ticketDate(ticket.created_at)}</td>
              <td>{ticket.assigned_to?.name ?? 'Sin asignar'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
