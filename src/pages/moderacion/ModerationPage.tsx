import { useEffect, useState } from 'react';
import { fetchModerationQueue, type ModerationQueueResponse } from '../../api/moderation';
import { fmt } from '../../lib/format';
import { ModerationDetail } from './ModerationDetail';
import { ModerationTable } from './ModerationTable';

export function ModerationPage() {
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('');
  const [data, setData] = useState<ModerationQueueResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    fetchModerationQueue({ status, type })
      .then(response => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar la cola de moderación.');
      });
    return () => {
      cancelled = true;
    };
  }, [status, type, reloadToken]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  const selectedItem = data?.items.find(item => item.id === selectedId) ?? null;

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Cola de moderación</div>
            <div className="card-sub">{data ? `${fmt(data.total)} elementos · página ${data.page}` : 'Cargando elementos...'}</div>
          </div>
          <button className="action-button" type="button" onClick={refresh}>Actualizar cola</button>
        </div>

        <div className="content-toolbar">
          <select aria-label="Filtrar moderación" value={type} onChange={event => setType(event.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="review">Reseñas</option>
            <option value="caregiver_profile">Perfil de cuidadora</option>
            <option value="photo">Fotos</option>
            <option value="chat_message">Mensajes</option>
          </select>
          <select aria-label="Estado de moderación" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
          </select>
          <button className="action-button" type="button" onClick={refresh}>Buscar</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {error && <table className="data"><tbody><tr><td>{error}</td></tr></tbody></table>}
          {!error && !data && <table className="data"><tbody><tr><td>Cargando elementos...</td></tr></tbody></table>}
          {!error && data && (
            <ModerationTable items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
      </div>

      {selectedItem ? (
        <ModerationDetail
          item={selectedItem}
          onResolved={() => {
            setSelectedId(null);
            refresh();
          }}
        />
      ) : (
        <div className="card content-detail">
          <div className="placeholder-box" style={{ padding: 35 }}>Selecciona un elemento para revisarlo.</div>
        </div>
      )}
    </>
  );
}