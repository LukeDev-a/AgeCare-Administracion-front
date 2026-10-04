import { useEffect, useState } from 'react';
import { fetchTickets, type TicketsListResponse } from '../../api/tickets';
import { fmt } from '../../lib/format';
import { NewTicketForm } from './NewTicketForm';
import { TicketDetail } from './TicketDetail';
import { TicketsTable } from './TicketsTable';

const PAGE_SIZE = 25;

export function TicketsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<TicketsListResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    fetchTickets({ page, pageSize: PAGE_SIZE, search, status })
      .then(response => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar los tickets.');
      });
    return () => {
      cancelled = true;
    };
  }, [page, search, status, reloadToken]);

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
          <button className="action-button" type="button" onClick={() => setShowNewForm(value => !value)}>
            Crear ticket
          </button>
        </div>

        {showNewForm && (
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
          <button className="action-button" type="button" onClick={handleSearch}>Buscar</button>
          <button className="action-button" type="button" onClick={refresh}>Actualizar lista</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {error && <table className="data"><tbody><tr><td>{error}</td></tr></tbody></table>}
          {!error && !data && <table className="data"><tbody><tr><td>Cargando tickets...</td></tr></tbody></table>}
          {!error && data && (
            <TicketsTable items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>

        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
            Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      {selectedId ? (
        <TicketDetail ticketId={selectedId} onTicketUpdated={refresh} />
      ) : (
        <div className="card ticket-detail">
          <div className="placeholder-box" style={{ padding: 35 }}>Selecciona un ticket para ver su detalle.</div>
        </div>
      )}
    </>
  );
}