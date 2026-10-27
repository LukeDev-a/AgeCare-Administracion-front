import { useEffect, useState, type FormEvent } from 'react';
import {
  createReply,
  fetchAgents,
  fetchTicketDetail,
  fetchTicketReplies,
  updateTicket,
  type Agent,
  type TicketDetailData,
  type TicketReply,
  type TicketStatus,
} from '../../api/tickets';
import { fmt, ticketDate } from '../../lib/format';
import { roleLabel } from '../../lib/roleMeta';
import { TICKET_CATEGORY_NAMES, TICKET_PRIORITY_META, TICKET_STATUS_META } from '../../lib/ticketMeta';
import { useAuth } from '../../auth/AuthContext';
import { canManageTickets } from '../../routes/permissions';

interface TicketDetailProps {
  ticketId: string;
  onTicketUpdated: () => void;
}

export function TicketDetail({ ticketId, onTicketUpdated }: TicketDetailProps) {
  const { user } = useAuth();
  const canManage = canManageTickets(user?.role);
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState('');
  const [statusValue, setStatusValue] = useState<TicketStatus>('open');
  const [assigneeValue, setAssigneeValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  async function loadDetail() {
    setError('');
    try {
      const [ticketData, agentsData, repliesData] = await Promise.all([
        fetchTicketDetail(ticketId),
        canManage ? fetchAgents() : Promise.resolve([]),
        fetchTicketReplies(ticketId),
      ]);
      setTicket(ticketData);
      setAgents(agentsData);
      setReplies(repliesData);
      setStatusValue(ticketData.status);
      setAssigneeValue(ticketData.assigned_to?.admin_id ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar el detalle.');
    }
  }

  useEffect(() => {
    setTicket(null);
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, canManage]);

  async function handleSaveStatus() {
    if (!canManage) return;
    setIsSaving(true);
    try {
      await updateTicket(ticketId, statusValue, assigneeValue || null);
      onTicketUpdated();
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible actualizar el ticket.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setIsSendingReply(true);
    try {
      await createReply(ticketId, replyBody, replyInternal);
      setReplyBody('');
      setReplyInternal(false);
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible enviar la respuesta.');
    } finally {
      setIsSendingReply(false);
    }
  }

  if (error) {
    return (
      <div className="card ticket-detail">
        <div className="placeholder-box" style={{ padding: 35 }}>{error}</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="card ticket-detail">
        <div className="placeholder-box" style={{ padding: 35 }}>Cargando detalle...</div>
      </div>
    );
  }

  const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
  const priority = TICKET_PRIORITY_META[ticket.priority] ?? TICKET_PRIORITY_META.medium;

  return (
    <div className="card ticket-detail">
      <div className="card-head">
        <div>
          <div className="card-title">#{ticket.number} · {ticket.subject}</div>
          <div className="card-sub">{ticket.requester.email} · creado {ticketDate(ticket.created_at)}</div>
        </div>
        <span className={`chip ${status.className}`}>{status.icon} {status.label}</span>
      </div>

      <div className="ticket-detail-grid">
        <div>
          <div className="ticket-detail-label">Solicitante</div>
          <div className="ticket-detail-value">{ticket.requester.name} · {roleLabel(ticket.requester.role)}</div>
        </div>
        <div>
          <div className="ticket-detail-label">Categoría</div>
          <div className="ticket-detail-value">{TICKET_CATEGORY_NAMES[ticket.category] ?? ticket.category}</div>
        </div>
        <div>
          <div className="ticket-detail-label">Prioridad</div>
          <div className="ticket-detail-value">{priority.label}</div>
        </div>
        <div>
          <div className="ticket-detail-label">Respuestas</div>
          <div className="ticket-detail-value">{fmt(ticket.replies_count)}</div>
        </div>
      </div>

      <div className="ticket-detail-label">Descripción</div>
      <div className="ticket-description" style={{ marginTop: 6 }}>{ticket.description}</div>

      <div className="ticket-detail-label" style={{ marginTop: 14 }}>Responsable</div>
      <div className="ticket-detail-value">{ticket.assigned_to?.name ?? 'Sin asignar'}</div>

      {canManage && <div className="tickets-toolbar" style={{ marginTop: 18, marginBottom: 0 }}>
        <label className="ticket-detail-label" htmlFor="ticket-status-update">Cambiar estado</label>
        <select id="ticket-status-update" value={statusValue} onChange={event => setStatusValue(event.target.value as TicketStatus)}>
          <option value="open">Abierto</option>
          <option value="in_progress">En curso</option>
          <option value="waiting_user">Esperando usuario</option>
          <option value="resolved">Resuelto</option>
          <option value="closed">Cerrado</option>
        </select>
        <label className="ticket-detail-label" htmlFor="ticket-assignee">Asignar agente</label>
        <select id="ticket-assignee" value={assigneeValue} onChange={event => setAssigneeValue(event.target.value)}>
          <option value="">Sin asignar</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>{agent.full_name}</option>
          ))}
        </select>
        <button className="action-button" type="button" disabled={isSaving} onClick={() => void handleSaveStatus()}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>}

      <div className="ticket-replies">
        <div className="ticket-detail-label">Historial de respuestas</div>
        {replies.length === 0 && <div className="mini-note">Aún no hay respuestas.</div>}
        {replies.map((reply, index) => (
          <div key={index} className="ticket-reply">
            <div className="ticket-reply-meta">
              {reply.author_name} · {ticketDate(reply.created_at)}{reply.internal ? ' · Nota interna' : ''}
            </div>
            <div className="ticket-reply-body">{reply.body}</div>
          </div>
        ))}
        {canManage && <form className="ticket-form" style={{ marginTop: 14 }} onSubmit={event => void handleSendReply(event)}>
          <label className="wide">
            Nueva respuesta
            <textarea
              name="body"
              maxLength={8000}
              required
              value={replyBody}
              onChange={event => setReplyBody(event.target.value)}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
            <input
              name="internal"
              type="checkbox"
              checked={replyInternal}
              onChange={event => setReplyInternal(event.target.checked)}
            />
            Nota interna
          </label>
          <div className="ticket-form-actions">
            <button className="action-button" type="submit" disabled={isSendingReply}>
              {isSendingReply ? 'Enviando...' : 'Enviar respuesta'}
            </button>
          </div>
        </form>}
      </div>
    </div>
  );
}
