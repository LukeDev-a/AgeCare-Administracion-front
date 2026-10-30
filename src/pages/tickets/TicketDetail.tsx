import { useEffect, useState, type FormEvent } from 'react';
import {
  createReply,
  fetchAgents,
  fetchTicketDetail,
  fetchTicketReplies,
  updateTicket,
  type Agent,
  type TicketDetailData,
  type TicketRepliesPage,
  type TicketPriority,
  type TicketPatch,
  type TicketStatus,
} from '../../api/tickets';
import { fmt, ticketDate } from '../../lib/format';
import { roleLabel } from '../../lib/roleMeta';
import { TICKET_CATEGORY_NAMES, TICKET_PRIORITY_META, TICKET_STATUS_META, TICKET_TRANSITIONS } from '../../lib/ticketMeta';
import { useAuth } from '../../auth/AuthContext';
import { canManageTickets } from '../../routes/permissions';
import { TicketContext } from './TicketContext';

interface TicketDetailProps {
  ticketId: string;
  onTicketUpdated: () => void;
}

export function TicketDetail({ ticketId, onTicketUpdated }: TicketDetailProps) {
  const { user } = useAuth();
  const canManage = canManageTickets(user?.role);
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [replyResult, setReplyResult] = useState<{ key: string; data: TicketRepliesPage | null; error: string } | null>(null);
  const [replyPage, setReplyPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [priorityValue, setPriorityValue] = useState<TicketPriority>('medium');
  const [categoryValue, setCategoryValue] = useState('other');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState('');
  const [statusValue, setStatusValue] = useState<TicketStatus>('open');
  const [assigneeValue, setAssigneeValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const replyKey = `${ticketId}:${replyPage}:${reload}`;
  const replies = replyResult?.key === replyKey ? replyResult.data : null;
  const repliesError = replyResult?.key === replyKey ? replyResult.error : '';

  useEffect(() => {
    let cancelled = false;
    Promise.all([
        fetchTicketDetail(ticketId),
        canManage ? fetchAgents() : Promise.resolve([]),
      ]).then(([ticketData, agentsData]) => {
      if (cancelled) return;
      setError('');
      setTicket(ticketData);
      setAgents(agentsData);
      setStatusValue(ticketData.status);
      setAssigneeValue(ticketData.assigned_to?.admin_id ?? '');
      setPriorityValue(ticketData.priority);
      setCategoryValue(ticketData.category);
    }).catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'No fue posible cargar el detalle.');
    });
    return () => { cancelled = true; };
  }, [ticketId, canManage, reload]);

  useEffect(() => {
    let cancelled = false;
    fetchTicketReplies(ticketId, replyPage).then(data => {
      if (!cancelled) setReplyResult({ key: replyKey, data, error: '' });
    }).catch((err: unknown) => {
      if (!cancelled) setReplyResult({ key: replyKey, data: null, error: err instanceof Error ? err.message : 'No fue posible cargar la conversación.' });
    });
    return () => { cancelled = true; };
  }, [ticketId, replyPage, reload, replyKey]);

  async function handleSaveStatus() {
    if (!canManage) return;
    setIsSaving(true);
    try {
      if (!ticket) return;
      const patch: TicketPatch = {};
      if (statusValue !== ticket.status) patch.status = statusValue;
      if (priorityValue !== ticket.priority) patch.priority = priorityValue;
      if (categoryValue !== ticket.category) patch.category = categoryValue;
      if (assigneeValue !== (ticket.assigned_to?.admin_id ?? '')) patch.assigned_to = assigneeValue || null;
      if (!Object.keys(patch).length) return;
      await updateTicket(ticket.id, patch);
      onTicketUpdated();
      setReload(value => value + 1);
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
      if (!ticket || ticket.status === 'closed') return;
      await createReply(ticket.id, replyBody, replyInternal);
      setReplyBody('');
      setReplyInternal(false);
      onTicketUpdated();
      setReload(value => value + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible enviar la respuesta.');
    } finally {
      setIsSendingReply(false);
    }
  }

  if (error) {
    return (
      <div className="card ticket-detail">
        <div className="placeholder-box" style={{ padding: 35 }}>{error} <button type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button></div>
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
          <div className="ticket-detail-value">{ticket.requester.name} · {ticket.requester.role ? roleLabel(ticket.requester.role) : 'Sin perfil vinculado'}</div>
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

      <p className="mini-note">Última modificación: {ticketDate(ticket.updated_at)} · Primera respuesta pública: {ticket.first_response_at ? ticketDate(ticket.first_response_at) : 'Sin respuesta pública'}</p>
      <div className="ticket-detail-label">Contexto del solicitante</div>
      {!ticket.requester_context || !Object.keys(ticket.requester_context).length ? <p className="mini-note">Sin contexto adicional disponible.</p> :
        <TicketContext value={ticket.requester_context} />}
      <div className="ticket-detail-label">Encuesta de satisfacción</div>
      <p>{ticket.csat ? `${ticket.csat.score}/5${ticket.csat.comment ? ` · ${ticket.csat.comment}` : ''}` : 'Sin encuesta respondida.'}</p>

      {canManage && <div className="tickets-toolbar" style={{ marginTop: 18, marginBottom: 0 }}>
        <label className="ticket-detail-label" htmlFor="ticket-status-update">Cambiar estado</label>
        <select id="ticket-status-update" value={statusValue} onChange={event => setStatusValue(event.target.value as TicketStatus)}>
          {[ticket.status, ...TICKET_TRANSITIONS[ticket.status]].map(value => <option key={value} value={value}>{TICKET_STATUS_META[value].label}</option>)}
        </select>
        <label className="ticket-detail-label" htmlFor="ticket-assignee">Asignar agente</label>
        <select id="ticket-assignee" value={assigneeValue} onChange={event => setAssigneeValue(event.target.value)}>
          <option value="">Sin asignar</option>
          {ticket.assigned_to && !agents.some(agent => agent.id === ticket.assigned_to?.admin_id) && <option value={ticket.assigned_to.admin_id}>{ticket.assigned_to.name} (asignación anterior)</option>}
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>{agent.full_name}</option>
          ))}
        </select>
        <label>Prioridad <select value={priorityValue} onChange={event => setPriorityValue(event.target.value as TicketPriority)}>
          {Object.entries(TICKET_PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select></label>
        <label>Categoría <select value={categoryValue} onChange={event => setCategoryValue(event.target.value)}>
          {Object.entries(TICKET_CATEGORY_NAMES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
        <button className="action-button" type="button" disabled={isSaving} onClick={() => void handleSaveStatus()}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>}

      <div className="ticket-replies">
        <div className="ticket-detail-label">Historial de respuestas</div>
        {repliesError && <p role="alert">{repliesError} <button type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button></p>}
        {!replies && !repliesError && <p role="status">Cargando conversación...</p>}
        {replies?.total === 0 && <div className="mini-note">Aún no hay respuestas.</div>}
        {replies?.items.map(reply => (
          <div key={reply.id} className="ticket-reply">
            <div className="ticket-reply-meta">
              {reply.author_name} · {ticketDate(reply.created_at)} · {reply.internal ? 'Nota interna · solo personal autorizado' : 'Respuesta pública'}
            </div>
            <div className="ticket-reply-body">{reply.body}</div>
          </div>
        ))}
        {replies && <div className="pagination">
          <button type="button" disabled={replyPage <= 1} onClick={() => setReplyPage(value => value - 1)}>Mensajes anteriores</button>
          <span>Página {replies.page} de {Math.max(1, Math.ceil(replies.total / replies.page_size))} · {replies.total} mensajes</span>
          <button type="button" disabled={replyPage * replies.page_size >= replies.total} onClick={() => setReplyPage(value => value + 1)}>Mensajes siguientes</button>
        </div>}
        {ticket.status === 'closed' && <p>Este ticket está cerrado y no admite nuevos mensajes.</p>}
        {canManage && ticket.status !== 'closed' && <form className="ticket-form" style={{ marginTop: 14 }} onSubmit={event => void handleSendReply(event)}>
          <label className="wide">
            {replyInternal ? 'Nueva nota interna' : 'Nueva respuesta pública'}
            <textarea
              name="body"
              maxLength={8000}
              required
              value={replyBody}
              onChange={event => setReplyBody(event.target.value)}
            />
          </label>
          <p className="mini-note wide">{replyInternal ? 'La nota será visible solo para el personal autorizado.' : 'La respuesta quedará registrada como pública en el historial del ticket.'}</p>
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
              {isSendingReply ? 'Guardando...' : replyInternal ? 'Guardar nota interna' : 'Guardar respuesta pública'}
            </button>
          </div>
        </form>}
      </div>
    </div>
  );
}
