import { useEffect, useState } from 'react';
import { fetchModerationQueue, type ModerationQueueResponse } from '../../api/moderation';
import { fmt } from '../../lib/format';
import { ModerationDetail } from './ModerationDetail';
import { ModerationTable } from './ModerationTable';

export function ModerationPage() {
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data: ModerationQueueResponse | null; error: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${status}:${type}:${page}:${reloadToken}`;
  const data = result?.key === key ? result.data : null;
  const error = result?.key === key ? result.error : '';
  const loading = result?.key !== key;

  useEffect(() => {
    let cancelled = false;
    fetchModerationQueue({ status, type, page })
      .then(response => {
        if (cancelled) return;
        setResult({ key, data: response, error: '' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ key, data: null, error: err instanceof Error ? err.message : 'No fue posible cargar la cola de moderación.' });
      });
    return () => {
      cancelled = true;
    };
  }, [status, type, page, reloadToken, key]);

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
          <select aria-label="Filtrar moderación" value={type} onChange={event => { setPage(1); setType(event.target.value); }}>
            <option value="">Todos los tipos</option>
            <option value="review">Reseñas</option>
            <option value="caregiver_profile">Perfil de cuidadora</option>
            <option value="photo">Fotos</option>
            <option value="chat_message">Mensajes</option>
          </select>
          <select aria-label="Estado de moderación" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
          </select>
          <button className="action-button" type="button" onClick={refresh}>Buscar</button>
        </div>
        <p className="mini-note">Primero los reportes de seguridad; dentro de cada grupo, los más antiguos.</p>
        <div className="pagination">
          <button type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
          <span>Página {page}{data ? ` de ${Math.max(1, Math.ceil(data.total / data.page_size))}` : ''}</span>
          <button type="button" disabled={loading || !data || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button>
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
          key={selectedItem.id}
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
