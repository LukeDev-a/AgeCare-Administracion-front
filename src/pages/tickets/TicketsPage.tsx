import { useEffect, useState } from 'react';
import { fetchAgents, fetchTickets, type Agent, type TicketsListResponse } from '../../api/tickets';
import { fmt } from '../../lib/format';
import { NewTicketForm } from './NewTicketForm';
import { TicketDetail } from './TicketDetail';
import { TicketsTable } from './TicketsTable';
import { useAuth } from '../../auth/AuthContext';
import { canManageTickets } from '../../routes/permissions';
import { TICKET_CATEGORY_NAMES, TICKET_PRIORITY_META } from '../../lib/ticketMeta';
import { ticketStyles as ui } from './ticketStyles';

const PAGE_SIZE = 25;

export function TicketsPage() {
  const { user } = useAuth();
  const canManage = canManageTickets(user?.role);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [role, setRole] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [order, setOrder] = useState('-created_at');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsError, setAgentsError] = useState('');
  const [result, setResult] = useState<{ key: string; data: TicketsListResponse | null; error: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const queryKey = JSON.stringify([page, search, status, priority, category, role, assignedTo, order, reloadToken]);
  const data = result?.key === queryKey ? result.data : null;
  const error = result?.key === queryKey ? result.error : '';
  const loading = result?.key !== queryKey;

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    fetchAgents().then(rows => { if (!cancelled) { setAgents(rows); setAgentsError(''); } })
      .catch(() => { if (!cancelled) setAgentsError('No fue posible cargar los responsables. Se muestran los de esta página.'); });
    return () => { cancelled = true; };
  }, [canManage, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    fetchTickets({ page, pageSize: PAGE_SIZE, search, status, priority, category, role, assignedTo, order })
      .then(response => {
        if (cancelled) return;
        setResult({ key: queryKey, data: response, error: '' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ key: queryKey, data: null, error: err instanceof Error ? err.message : 'No fue posible cargar los tickets.' });
      });
    return () => {
      cancelled = true;
    };
  }, [page, search, status, priority, category, role, assignedTo, order, reloadToken, queryKey]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  function handleSearch() {
    setPage(1);
    setSearch(searchInput.trim());
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="tw:space-y-7 tw:text-base tw:leading-relaxed tw:text-ink">
        <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5">
          <div>
            <p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Atención al usuario</p>
            <h1 className="tw:text-2xl tw:font-bold tw:sm:text-3xl">Tickets de soporte</h1>
            <p className={ui.description}>Consulta las solicitudes, organiza su atención y mantén el seguimiento de cada caso.</p>
          </div>
          {canManage && <button className={`${ui.button} ${ui.primary}`} type="button" aria-expanded={showNewForm} onClick={() => setShowNewForm(value => !value)}>
            Crear ticket
          </button>}
        </header>

        {canManage && showNewForm && (
          <NewTicketForm
            onCancel={() => setShowNewForm(false)}
            onCreated={() => {
              setShowNewForm(false);
              setPage(1);
              refresh();
            }}
          />
        )}

      <section className={ui.panel} aria-label="Buscar y filtrar tickets">
        <h2 className={ui.heading}>Buscar y filtrar</h2>
        <p className={ui.description}>Busca por número, asunto o correo. Los filtros y el orden se aplican al seleccionarlos.</p>
        <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2 tw:xl:grid-cols-3">
          <label className={ui.label}>Buscar ticket
          <input
            className={ui.field}
            type="search"
            placeholder="Buscar por número, asunto o correo"
            aria-label="Buscar tickets"
            maxLength={120}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleSearch();
            }}
          /></label>
          <label className={ui.label}>Estado<select className={ui.field} aria-label="Filtrar por estado" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}>
            <option value="">Todos los estados</option>
            <option value="open">Abierto</option>
            <option value="in_progress">En curso</option>
            <option value="waiting_user">Esperando usuario</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select></label>
          <label className={ui.label}>Prioridad<select className={ui.field} aria-label="Filtrar por prioridad" value={priority} onChange={event => { setPage(1); setPriority(event.target.value); }}>
            <option value="">Todas las prioridades</option>
            {Object.entries(TICKET_PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select></label>
          <label className={ui.label}>Categoría<select className={ui.field} aria-label="Filtrar por categoría" value={category} onChange={event => { setPage(1); setCategory(event.target.value); }}>
            <option value="">Todas las categorías</option>
            {Object.entries(TICKET_CATEGORY_NAMES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select></label>
          <label className={ui.label}>Perfil del solicitante<select className={ui.field} aria-label="Filtrar por perfil" value={role} onChange={event => { setPage(1); setRole(event.target.value); }}>
            <option value="">Todos los perfiles</option><option value="elder">Adulto mayor</option>
            <option value="family">Familiar</option><option value="caregiver">Cuidador</option><option value="doctor">Médico</option>
          </select></label>
          <label className={ui.label}>Responsable<select className={ui.field} aria-label="Filtrar por responsable" value={assignedTo} onChange={event => { setPage(1); setAssignedTo(event.target.value); }}>
            <option value="">Todos los responsables</option>
            {Array.from(new Map([...agents.map(agent => [agent.id, agent.full_name] as const), ...(data?.items ?? []).flatMap(item => item.assigned_to ? [[item.assigned_to.admin_id, item.assigned_to.name] as const] : [])]).entries())
              .map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            {assignedTo && !agents.some(agent => agent.id === assignedTo) && !data?.items.some(item => item.assigned_to?.admin_id === assignedTo) && <option value={assignedTo}>Responsable seleccionado</option>}
          </select></label>
          <label className={ui.label}>Orden de la lista<select className={ui.field} aria-label="Ordenar tickets" value={order} onChange={event => { setPage(1); setOrder(event.target.value); }}>
            <option value="-created_at">Más recientes</option><option value="created_at">Más antiguos</option>
            <option value="-updated_at">Última modificación</option><option value="updated_at">Modificación más antigua</option>
            <option value="-priority">Mayor prioridad</option><option value="priority">Menor prioridad</option>
          </select></label>
          <div className={`${ui.actions} tw:items-end`}><button className={`${ui.button} ${ui.primary}`} type="button" onClick={handleSearch}>Buscar</button>
          <button className={ui.button} type="button" onClick={refresh}>Actualizar lista</button></div>
        </div>
        {(!canManage || agentsError) && <p className="tw:mt-4 tw:text-sm tw:text-muted">{agentsError || 'Responsables disponibles en esta página.'}</p>}
      </section>
      <section className={ui.panel} aria-label="Listado de tickets" aria-busy={loading}>
        <div className="tw:mb-5 tw:flex tw:flex-wrap tw:items-baseline tw:justify-between tw:gap-3"><h2 className={ui.heading}>Solicitudes de soporte</h2>
          {data && <p className="tw:text-sm tw:text-muted">{fmt(data.total)} tickets · página {data.page}</p>}</div>
        <p className={ui.description}>Selecciona el número de un ticket para abrir su detalle debajo de la lista.</p>

        <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke">
          {error && <p role="alert" className={ui.error}>{error}</p>}
          {!error && loading && <p role="status">Cargando tickets...</p>}
          {!error && !loading && data && (
            <TicketsTable items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>

        <div className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4">
          <button className={ui.button} type="button" disabled={loading || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
            Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button className={ui.button} type="button" disabled={loading || page >= totalPages} onClick={() => setPage(value => value + 1)}>
            Siguiente
          </button>
        </div>
      </section>

      {selectedId ? (
        <TicketDetail key={selectedId} ticketId={selectedId} onTicketUpdated={refresh} />
      ) : (
        <div className={ui.panel}>
          <p className="tw:py-5 tw:text-center tw:text-muted">Selecciona un ticket para ver su detalle.</p>
        </div>
      )}
    </div>
  );
}
