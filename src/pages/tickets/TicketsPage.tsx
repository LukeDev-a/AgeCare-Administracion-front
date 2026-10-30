import { useEffect, useState } from 'react';
import { fetchAgents, fetchTickets, type Agent, type TicketsListResponse } from '../../api/tickets';
import { fmt } from '../../lib/format';
import { NewTicketForm } from './NewTicketForm';
import { TicketDetail } from './TicketDetail';
import { TicketsTable } from './TicketsTable';
import { useAuth } from '../../auth/AuthContext';
import { canManageTickets } from '../../routes/permissions';
import { TICKET_CATEGORY_NAMES, TICKET_PRIORITY_META } from '../../lib/ticketMeta';

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
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Tickets de soporte</div>
            <div className="card-sub">{data ? `${fmt(data.total)} tickets · página ${data.page}` : 'Cargando tickets...'}</div>
          </div>
          {canManage && <button className="action-button" type="button" onClick={() => setShowNewForm(value => !value)}>
            Crear ticket
          </button>}
        </div>

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

        <div className="tickets-toolbar">
          <input
            type="search"
            placeholder="Buscar por número, asunto o correo"
            aria-label="Buscar tickets"
            maxLength={120}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleSearch();
            }}
          />
          <select aria-label="Filtrar por estado" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}>
            <option value="">Todos los estados</option>
            <option value="open">Abierto</option>
            <option value="in_progress">En curso</option>
            <option value="waiting_user">Esperando usuario</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select>
          <select aria-label="Filtrar por prioridad" value={priority} onChange={event => { setPage(1); setPriority(event.target.value); }}>
            <option value="">Todas las prioridades</option>
            {Object.entries(TICKET_PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
          <select aria-label="Filtrar por categoría" value={category} onChange={event => { setPage(1); setCategory(event.target.value); }}>
            <option value="">Todas las categorías</option>
            {Object.entries(TICKET_CATEGORY_NAMES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <select aria-label="Filtrar por perfil" value={role} onChange={event => { setPage(1); setRole(event.target.value); }}>
            <option value="">Todos los perfiles</option><option value="elder">Adulto mayor</option>
            <option value="family">Familiar</option><option value="caregiver">Cuidador</option><option value="doctor">Médico</option>
          </select>
          <select aria-label="Filtrar por responsable" value={assignedTo} onChange={event => { setPage(1); setAssignedTo(event.target.value); }}>
            <option value="">Todos los responsables</option>
            {Array.from(new Map([...agents.map(agent => [agent.id, agent.full_name] as const), ...(data?.items ?? []).flatMap(item => item.assigned_to ? [[item.assigned_to.admin_id, item.assigned_to.name] as const] : [])]).entries())
              .map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            {assignedTo && !agents.some(agent => agent.id === assignedTo) && !data?.items.some(item => item.assigned_to?.admin_id === assignedTo) && <option value={assignedTo}>Responsable seleccionado</option>}
          </select>
          {(!canManage || agentsError) && <span className="mini-note">{agentsError || 'Responsables disponibles en esta página.'}</span>}
          <select aria-label="Ordenar tickets" value={order} onChange={event => { setPage(1); setOrder(event.target.value); }}>
            <option value="-created_at">Más recientes</option><option value="created_at">Más antiguos</option>
            <option value="-updated_at">Última modificación</option><option value="updated_at">Modificación más antigua</option>
            <option value="-priority">Mayor prioridad</option><option value="priority">Menor prioridad</option>
          </select>
          <button className="action-button" type="button" onClick={handleSearch}>Buscar</button>
          <button className="action-button" type="button" onClick={refresh}>Actualizar lista</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {error && <table className="data"><tbody><tr><td>{error}</td></tr></tbody></table>}
          {!error && loading && <p role="status">Cargando tickets...</p>}
          {!error && !loading && data && (
            <TicketsTable items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>

        <div className="pagination">
          <button type="button" disabled={loading || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
            Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button type="button" disabled={loading || page >= totalPages} onClick={() => setPage(value => value + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      {selectedId ? (
        <TicketDetail key={selectedId} ticketId={selectedId} onTicketUpdated={refresh} />
      ) : (
        <div className="card ticket-detail">
          <div className="placeholder-box" style={{ padding: 35 }}>Selecciona un ticket para ver su detalle.</div>
        </div>
      )}
    </>
  );
}
