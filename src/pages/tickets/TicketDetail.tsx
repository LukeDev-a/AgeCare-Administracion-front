import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from '../../components/Modal';
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
  onClose?: () => void;
}

export function TicketDetail({ ticketId, onTicketUpdated, onClose }: TicketDetailProps) {
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
  const [section, setSection] = useState('request');
  const keepManagementDraft = useRef(false);
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
      if (!keepManagementDraft.current) {
        setStatusValue(ticketData.status);
        setAssigneeValue(ticketData.assigned_to?.admin_id ?? '');
        setPriorityValue(ticketData.priority);
        setCategoryValue(ticketData.category);
      }
      keepManagementDraft.current = false;
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
    if (!canManage || isSaving || isSendingReply) return;
    setIsSendingReply(true);
    setActionKind('reply');
    setActionError(''); setNotice('');
    try {
      if (!ticket || ticket.status === 'closed') return;
      await createReply(ticket.id, replyBody, replyInternal);
      setNotice(replyInternal ? 'Nota interna guardada.' : 'Respuesta pública guardada.');
      setReplyBody('');
      setReplyInternal(false);
      keepManagementDraft.current = managementDirty;
      onTicketUpdated();
      setReload(value => value + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No fue posible enviar la respuesta.');
    } finally {
      setIsSendingReply(false);
    }
  }

  const managementDirty = !!ticket && (statusValue !== ticket.status || priorityValue !== ticket.priority
    || categoryValue !== ticket.category || assigneeValue !== (ticket.assigned_to?.admin_id ?? ''));
  const dirty = managementDirty || replyBody !== '';
  const frame = (children: ReactNode) => onClose
    ? <Modal title={ticket ? `Ticket #${ticket.number}` : 'Detalle del ticket'} onClose={onClose}
        dirty={dirty} busy={isSaving || isSendingReply}>{children}</Modal>
    : children;

  if (error) {
    return frame(
      <div className={ui.panel}>
        <p role="alert" className={ui.error}>{error}</p><button className={ui.button} type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button>
      </div>
    );
  }

  if (!ticket) {
    return frame(
      <div className={ui.panel}>
        <p role="status" className={ui.notice}>Cargando detalle...</p>
      </div>
    );
  }

  const status = TICKET_STATUS_META[ticket.status] ?? TICKET_STATUS_META.open;
  const priority = TICKET_PRIORITY_META[ticket.priority] ?? TICKET_PRIORITY_META.medium;

  return frame(
    <section className="tw:space-y-6" aria-label="Detalle del ticket">
      <div className="tw:rounded-2xl tw:bg-canvas tw:p-5 tw:sm:p-6">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
        <div>
          <p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Solicitud de soporte</p>
          <h2 className="tw:max-w-3xl tw:text-2xl tw:font-bold tw:break-words">{ticket.subject}</h2>
          <p className="tw:mt-3 tw:break-words tw:text-sm tw:text-muted">Recibido el {ticketDate(ticket.created_at)}</p>
        </div>
        <span className={`chip ${status.className} tw:px-3 tw:py-1.5 tw:text-sm tw:leading-relaxed`}>{status.icon} {status.label}</span>
      </div>

      <div className="tw:mt-5 tw:grid tw:gap-4 tw:border-t tw:border-solid tw:border-stroke tw:pt-5 tw:sm:grid-cols-2 tw:xl:grid-cols-4">
        <div>
          <h3 className="tw:text-sm tw:text-muted">Solicitante</h3>
          <p className="tw:mt-2 tw:font-semibold">{ticket.requester.name} · {ticket.requester.roles?.length ? ticket.requester.roles.map(roleLabel).join(' · ') : ticket.requester.role ? roleLabel(ticket.requester.role) : ticket.requester.user_id ? 'Cuenta sin roles de cuidado registrados' : 'Sin cuenta vinculada'}</p>
          <p className="tw:mt-1 tw:break-all tw:text-sm tw:text-muted">{ticket.requester.email}</p>
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
          <h3 className="tw:text-sm tw:text-muted">Responsable</h3>
          <p className="tw:mt-2 tw:font-semibold">{ticket.assigned_to?.name ?? 'Sin asignar'}</p>
        </div>
      </div>
      </div>

      <nav className="tw:flex tw:flex-wrap tw:gap-2 tw:rounded-xl tw:bg-canvas tw:p-2" aria-label="Apartados del ticket">
        {[
          ['request', 'Solicitud'],
          ...(canManage ? [['manage', `Gestionar caso${managementDirty ? ' · Sin guardar' : ''}`]] : []),
          ['conversation', `Conversación · ${fmt(ticket.replies_count)}`],
        ].map(([key, label]) => <button key={key} type="button" aria-pressed={section === key}
          disabled={isSaving || isSendingReply} onClick={() => setSection(key)}
          className={`${ui.button} ${section === key ? 'tw:border-brand tw:bg-brand tw:text-white' : 'tw:border-transparent tw:bg-transparent'}`}>{label}</button>)}
      </nav>

      <div hidden={section !== 'request'} className="tw:space-y-5">
      <div><h3 className={ui.heading}>¿Qué necesita la persona?</h3>
      <p className="tw:mt-3 tw:max-w-4xl tw:rounded-xl tw:bg-canvas tw:p-5 tw:leading-8 tw:whitespace-pre-wrap tw:break-words">{ticket.description}</p></div>

      <details className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5"><summary className="tw:cursor-pointer tw:font-semibold">Fechas de seguimiento</summary>
      <dl className="tw:grid tw:gap-4 tw:text-sm tw:sm:grid-cols-2"><div><dt className="tw:font-semibold">Última modificación</dt><dd className="tw:mt-1 tw:text-muted">{ticketDate(ticket.updated_at)}</dd></div><div><dt className="tw:font-semibold">Primera respuesta pública</dt><dd className="tw:mt-1 tw:text-muted">{ticket.first_response_at ? ticketDate(ticket.first_response_at) : 'Sin respuesta pública'}</dd></div></dl>
      </details>
      <details className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5"><summary className="tw:cursor-pointer tw:font-semibold">Contexto del solicitante</summary><div className="tw:mt-4">
      {!ticket.requester_context || !Object.keys(ticket.requester_context).length ? <p className="tw:text-muted">Sin contexto adicional disponible.</p> :
        <TicketContext value={ticket.requester_context} />}
      </div></details>
      <div className={`${ui.actions} tw:justify-end`}>
        {canManage && <button type="button" className={ui.button} onClick={() => setSection('manage')}>Asignar o cambiar estado</button>}
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setSection('conversation')}>{canManage && ticket.status !== 'closed' ? 'Ver conversación y responder' : 'Ver conversación'}</button>
      </div>
      </div>

      {canManage && <div hidden={section !== 'manage'} className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5">
        <h3 className={ui.heading}>Organizar la atención</h3><p className={ui.description}>Asigna quién atenderá la solicitud y actualiza su avance. Estos cambios se guardan por separado de los mensajes.</p>
        {actionKind === 'ticket' && actionError && <p role="alert" className={ui.error}>{actionError}</p>}
        {actionKind === 'ticket' && notice && <p role="status" className={ui.notice}>{notice}</p>}
        <fieldset disabled={isSaving || isSendingReply} className="tw:m-0 tw:grid tw:gap-4 tw:border-0 tw:p-0 tw:sm:grid-cols-2">
        <label className={ui.label} htmlFor="ticket-status-update">Cambiar estado
        <select className={ui.field} id="ticket-status-update" value={statusValue} onChange={event => setStatusValue(event.target.value as TicketStatus)}>
          {[ticket.status, ...TICKET_TRANSITIONS[ticket.status]].map(value => <option key={value} value={value}>{TICKET_STATUS_META[value].label}</option>)}
        </select><span className="tw:text-sm tw:font-normal tw:text-muted">Solo aparecen los siguientes estados permitidos para este caso.</span></label>
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
        </fieldset><div className={`${ui.actions} tw:mt-5 tw:justify-between tw:border-t tw:border-solid tw:border-stroke tw:pt-4`}><p className="tw:text-sm tw:text-muted" role="status">{managementDirty ? 'Tienes cambios pendientes de guardar.' : 'Sin cambios pendientes en la gestión.'}</p><button className={`${ui.button} ${ui.primary}`} type="button" disabled={isSaving || isSendingReply || !managementDirty} onClick={() => void handleSaveStatus()}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button></div>
      </div>}

      <div hidden={section !== 'conversation'} className="tw:space-y-5">
        <h3 className={ui.heading}>Historial de respuestas</h3>
        <p className={ui.description}>Consulta el seguimiento del caso. Cada mensaje indica quién lo escribió y si es público o una nota interna.</p>
        {repliesError && <p role="alert" className={ui.error}>{repliesError} <button className={ui.button} type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button></p>}
        {!replies && !repliesError && <p role="status">Cargando conversación...</p>}
        {replies?.total === 0 && <p className={ui.notice}>Aún no hay respuestas. La descripción inicial está en Solicitud.</p>}
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
          <h3 className={ui.heading}>Añadir un mensaje</h3>
          <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2" role="group" aria-label="Tipo de mensaje">
            {([{ internal: false, title: 'Respuesta pública', help: 'Respuesta destinada al solicitante.' },
               { internal: true, title: 'Nota interna', help: 'Seguimiento para el equipo autorizado.' }]).map(({ internal, title, help }) => <button
              key={String(internal)} type="button" aria-pressed={replyInternal === internal}
              disabled={isSaving || isSendingReply} onClick={() => setReplyInternal(internal)}
              className={`${ui.button} tw:text-left ${replyInternal === internal ? ui.primary : ''}`}>
              <span className="tw:block tw:font-semibold">{title}</span><span className="tw:mt-1 tw:block tw:text-sm tw:font-normal">{help}</span>
            </button>)}
          </div>
          <label className={ui.label}>
            {replyInternal ? 'Nueva nota interna' : 'Nueva respuesta pública'}
            <textarea
              className={`${ui.field} tw:min-h-40 tw:leading-relaxed`}
              name="body"
              maxLength={8000}
              required
              disabled={isSaving || isSendingReply}
              placeholder={replyInternal ? 'Anota las comprobaciones realizadas o el siguiente paso del equipo…' : 'Escribe una respuesta clara para la persona que pidió ayuda…'}
              value={replyBody}
              onChange={event => setReplyBody(event.target.value)}
            />
          </label>
          <div className="tw:flex tw:flex-wrap tw:justify-between tw:gap-2 tw:text-sm tw:text-muted"><p>{replyInternal ? 'La nota será visible solo para el personal autorizado.' : 'Se guardará como respuesta pública. Esto no confirma un envío por correo o a la app.'}</p><span>{replyBody.length} / 8.000 caracteres</span></div>
          {actionKind === 'reply' && actionError && <p role="alert" className={ui.error}>{actionError}</p>}
          {actionKind === 'reply' && notice && <p role="status" className={ui.notice}>{notice}</p>}
          {managementDirty && <div className={ui.notice} role="status">Tienes cambios de gestión pendientes. Guardar este mensaje no los guarda.<button type="button" className={`${ui.button} tw:mt-3 tw:block`} onClick={() => setSection('manage')}>Revisar cambios de gestión</button></div>}
          <div className={`${ui.actions} tw:justify-end`}>
            <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={isSaving || isSendingReply || !replyBody.trim()}>
              {isSendingReply ? 'Guardando...' : replyInternal ? 'Guardar nota interna' : 'Guardar respuesta pública'}
            </button>
          </div>
        </form>}
      </div>
    </section>
  );
}
