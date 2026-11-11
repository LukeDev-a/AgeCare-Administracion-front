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
import { ticketStyles as ui } from './ticketStyles';

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
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionKind, setActionKind] = useState<'ticket' | 'reply'>('ticket');
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
    setActionKind('ticket');
    setActionError(''); setNotice('');
    try {
      if (!ticket) return;
      const patch: TicketPatch = {};
      if (statusValue !== ticket.status) patch.status = statusValue;
      if (priorityValue !== ticket.priority) patch.priority = priorityValue;
      if (categoryValue !== ticket.category) patch.category = categoryValue;
      if (assigneeValue !== (ticket.assigned_to?.admin_id ?? '')) patch.assigned_to = assigneeValue || null;
      if (!Object.keys(patch).length) return;
      await updateTicket(ticket.id, patch);
      setNotice('Cambios guardados.');
      onTicketUpdated();
      setReload(value => value + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No fue posible actualizar el ticket.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setIsSendingReply(true);
    setActionKind('reply');
    setActionError(''); setNotice('');
    try {
      if (!ticket || ticket.status === 'closed') return;
      await createReply(ticket.id, replyBody, replyInternal);
      setNotice(replyInternal ? 'Nota interna guardada.' : 'Respuesta pública guardada.');
      setReplyBody('');
      setReplyInternal(false);
      onTicketUpdated();
      setReload(value => value + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No fue posible enviar la respuesta.');
    } finally {
      setIsSendingReply(false);
    }
  }

  if (error) {
    return (
      <div className={ui.panel}>
        <p role="alert" className={ui.error}>{error}</p><button className={ui.button} type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className={ui.panel}>
        <p role="status" className={ui.notice}>Cargando detalle...</p>
      </div>
    );
  }

  const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
  const priority = TICKET_PRIORITY_META[ticket.priority] ?? TICKET_PRIORITY_META.medium;

  return (
    <section className={`${ui.panel} tw:space-y-6`} aria-label="Detalle del ticket">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
        <div>
          <p className="tw:mb-2 tw:text-sm tw:font-semibold tw:text-brand-ink">Ticket #{ticket.number}</p>
          <h2 className="tw:max-w-3xl tw:text-2xl tw:font-bold tw:break-words">{ticket.subject}</h2>
          <p className="tw:mt-3 tw:break-words tw:text-muted">{ticket.requester.email} · creado {ticketDate(ticket.created_at)}</p>
        </div>
        <span className={`chip ${status.className} tw:px-3 tw:py-1.5 tw:text-sm tw:leading-relaxed`}>{status.icon} {status.label}</span>
      </div>

      <div className="tw:grid tw:gap-4 tw:rounded-xl tw:bg-canvas tw:p-5 tw:sm:grid-cols-2 tw:xl:grid-cols-4">
        <div>
          <h3 className="tw:text-sm tw:text-muted">Solicitante</h3>
          <p className="tw:mt-2 tw:font-semibold">{ticket.requester.name} · {ticket.requester.role ? roleLabel(ticket.requester.role) : 'Sin perfil vinculado'}</p>
        </div>
        <div>
          <h3 className="tw:text-sm tw:text-muted">Categoría</h3>
          <p className="tw:mt-2 tw:font-semibold">{TICKET_CATEGORY_NAMES[ticket.category] ?? ticket.category}</p>
        </div>
        <div>
          <h3 className="tw:text-sm tw:text-muted">Prioridad</h3>
          <p className="tw:mt-2 tw:font-semibold">{priority.label}</p>
        </div>
        <div>
          <h3 className="tw:text-sm tw:text-muted">Respuestas</h3>
          <p className="tw:mt-2 tw:font-semibold">{fmt(ticket.replies_count)}</p>
        </div>
      </div>

      <div><h3 className={ui.heading}>Descripción de la solicitud</h3>
      <p className="tw:mt-3 tw:max-w-4xl tw:rounded-xl tw:bg-canvas tw:p-5 tw:leading-8 tw:whitespace-pre-wrap tw:break-words">{ticket.description}</p></div>

      <div><h3 className="tw:font-semibold">Responsable del caso</h3>
      <p className="tw:mt-2 tw:text-muted">{ticket.assigned_to?.name ?? 'Sin asignar'}</p></div>

      <dl className="tw:grid tw:gap-4 tw:text-sm tw:sm:grid-cols-2"><div><dt className="tw:font-semibold">Última modificación</dt><dd className="tw:mt-1 tw:text-muted">{ticketDate(ticket.updated_at)}</dd></div><div><dt className="tw:font-semibold">Primera respuesta pública</dt><dd className="tw:mt-1 tw:text-muted">{ticket.first_response_at ? ticketDate(ticket.first_response_at) : 'Sin respuesta pública'}</dd></div></dl>
      <details className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5"><summary className="tw:cursor-pointer tw:font-semibold">Contexto del solicitante</summary><div className="tw:mt-4">
      {!ticket.requester_context || !Object.keys(ticket.requester_context).length ? <p className="tw:text-muted">Sin contexto adicional disponible.</p> :
        <TicketContext value={ticket.requester_context} />}
      </div></details>

      {canManage && <div className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5">
        <h3 className={ui.heading}>Gestionar el caso</h3><p className={ui.description}>Actualiza el estado, el responsable, la prioridad o la categoría y guarda los cambios.</p>
        {actionKind === 'ticket' && actionError && <p role="alert" className={ui.error}>{actionError}</p>}
        {actionKind === 'ticket' && notice && <p role="status" className={ui.notice}>{notice}</p>}
        <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
        <label className={ui.label} htmlFor="ticket-status-update">Cambiar estado
        <select className={ui.field} id="ticket-status-update" value={statusValue} onChange={event => setStatusValue(event.target.value as TicketStatus)}>
          {[ticket.status, ...TICKET_TRANSITIONS[ticket.status]].map(value => <option key={value} value={value}>{TICKET_STATUS_META[value].label}</option>)}
        </select></label>
        <label className={ui.label} htmlFor="ticket-assignee">Asignar agente
        <select className={ui.field} id="ticket-assignee" value={assigneeValue} onChange={event => setAssigneeValue(event.target.value)}>
          <option value="">Sin asignar</option>
          {ticket.assigned_to && !agents.some(agent => agent.id === ticket.assigned_to?.admin_id) && <option value={ticket.assigned_to.admin_id}>{ticket.assigned_to.name} (asignación anterior)</option>}
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>{agent.full_name}</option>
          ))}
        </select></label>
        <label className={ui.label}>Prioridad <select className={ui.field} value={priorityValue} onChange={event => setPriorityValue(event.target.value as TicketPriority)}>
          {Object.entries(TICKET_PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select></label>
        <label className={ui.label}>Categoría <select className={ui.field} value={categoryValue} onChange={event => setCategoryValue(event.target.value)}>
          {Object.entries(TICKET_CATEGORY_NAMES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
        </div><div className={`${ui.actions} tw:mt-5 tw:justify-end`}><button className={`${ui.button} ${ui.primary}`} type="button" disabled={isSaving} onClick={() => void handleSaveStatus()}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button></div>
      </div>}

      <div className="tw:space-y-5 tw:border-t tw:border-solid tw:border-stroke tw:pt-6">
        <h3 className={ui.heading}>Historial de respuestas</h3>
        <p className={ui.description}>Las respuestas públicas y las notas internas se identifican en cada mensaje.</p>
        {repliesError && <p role="alert" className={ui.error}>{repliesError} <button className={ui.button} type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button></p>}
        {!replies && !repliesError && <p role="status">Cargando conversación...</p>}
        {replies?.total === 0 && <p className={ui.notice}>Aún no hay respuestas.</p>}
        {replies?.items.map(reply => (
          <article key={reply.id} className={`tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5 ${reply.internal ? 'tw:bg-warning-bg' : 'tw:bg-canvas'}`}>
            <p className="tw:mb-3 tw:text-sm tw:font-semibold">
              {reply.author_name} · {ticketDate(reply.created_at)} · {reply.internal ? 'Nota interna · solo personal autorizado' : 'Respuesta pública'}
            </p>
            <p className="tw:max-w-4xl tw:leading-8 tw:whitespace-pre-wrap tw:break-words">{reply.body}</p>
          </article>
        ))}
        {replies && <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4">
          <button className={ui.button} type="button" disabled={replyPage <= 1} onClick={() => setReplyPage(value => value - 1)}>Mensajes anteriores</button>
          <span>Página {replies.page} de {Math.max(1, Math.ceil(replies.total / replies.page_size))} · {replies.total} mensajes</span>
          <button className={ui.button} type="button" disabled={replyPage * replies.page_size >= replies.total} onClick={() => setReplyPage(value => value + 1)}>Mensajes siguientes</button>
        </div>}
        {ticket.status === 'closed' && <p>Este ticket está cerrado y no admite nuevos mensajes.</p>}
        {canManage && ticket.status !== 'closed' && <form className="tw:space-y-4 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5" onSubmit={event => void handleSendReply(event)}>
          <label className={ui.label}>
            {replyInternal ? 'Nueva nota interna' : 'Nueva respuesta pública'}
            <textarea
              className={`${ui.field} tw:min-h-40 tw:leading-relaxed`}
              name="body"
              maxLength={8000}
              required
              value={replyBody}
              onChange={event => setReplyBody(event.target.value)}
            />
          </label>
          <p className="tw:text-sm tw:text-muted">{replyInternal ? 'La nota será visible solo para el personal autorizado.' : 'La respuesta quedará registrada como pública en el historial del ticket.'}</p>
          {actionKind === 'reply' && actionError && <p role="alert" className={ui.error}>{actionError}</p>}
          {actionKind === 'reply' && notice && <p role="status" className={ui.notice}>{notice}</p>}
          <label className="tw:flex tw:items-center tw:gap-3 tw:font-semibold">
            <input
              className="tw:h-5 tw:w-5"
              name="internal"
              type="checkbox"
              checked={replyInternal}
              onChange={event => setReplyInternal(event.target.checked)}
            />
            Nota interna
          </label>
          <div className={`${ui.actions} tw:justify-end`}>
            <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={isSendingReply}>
              {isSendingReply ? 'Guardando...' : replyInternal ? 'Guardar nota interna' : 'Guardar respuesta pública'}
            </button>
          </div>
        </form>}
      </div>
    </section>
  );
}
