import { useEffect, useState } from 'react';
import { fetchCaregivers, type CaregiversListResponse } from '../../api/caregivers';
import { fmt } from '../../lib/format';
import { CaregiverDetail } from './CaregiverDetail';
import { CaregiversTable } from './CaregiversTable';

export function CaregiversPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<CaregiversListResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    fetchCaregivers({ search, status })
      .then(response => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar los perfiles de cuidadoras.');
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, reloadToken]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  function handleSearch() {
    setSearch(searchInput.trim());
  }

  const selectedCaregiver = data?.items.find(item => item.caregiver_id === selectedId) ?? null;

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Perfiles de cuidadoras</div>
            <div className="card-sub">{data ? `${fmt(data.total)} perfiles · página ${data.page}` : 'Cargando perfiles...'}</div>
          </div>
        </div>

        <div className="content-toolbar">
          <input
            type="search"
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar cuidadoras"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleSearch();
            }}
          />
          <select aria-label="Filtrar cuidadoras" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobada</option>
            <option value="suspended">Suspendida</option>
          </select>
          <button className="action-button" type="button" onClick={handleSearch}>Buscar</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {error && <table className="data"><tbody><tr><td>{error}</td></tr></tbody></table>}
          {!error && !data && <table className="data"><tbody><tr><td>Cargando perfiles...</td></tr></tbody></table>}
          {!error && data && (
            <CaregiversTable items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
      </div>

      {selectedCaregiver ? (
        <CaregiverDetail caregiver={selectedCaregiver} onChanged={refresh} />
      ) : (
        <div className="card content-detail">
          <div className="placeholder-box" style={{ padding: 35 }}>Selecciona una cuidadora para revisarla.</div>
        </div>
      )}
    </>
  );
}