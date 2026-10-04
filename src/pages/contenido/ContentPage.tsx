import { useEffect, useState } from 'react';
import { fetchContent, type ContentListResponse } from '../../api/content';
import { fmt } from '../../lib/format';
import { ContentDetail } from './ContentDetail';
import { ContentTable } from './ContentTable';
import { NewContentForm } from './NewContentForm';

export function ContentPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<ContentListResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    fetchContent({ search, type, status })
      .then(response => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar el contenido.');
      });
    return () => {
      cancelled = true;
    };
  }, [search, type, status, reloadToken]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  function handleSearch() {
    setSearch(searchInput.trim());
  }

  const selectedItem = data?.items.find(item => item.id === selectedId) ?? null;

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Curación de contenido</div>
            <div className="card-sub">{data ? `${fmt(data.total)} contenidos · página ${data.page}` : 'Cargando contenido...'}</div>
          </div>
          <button className="action-button" type="button" onClick={() => setShowNewForm(value => !value)}>
            Crear contenido
          </button>
        </div>

        {showNewForm && (
          <NewContentForm
            onCancel={() => setShowNewForm(false)}
            onCreated={() => {
              setShowNewForm(false);
              refresh();
            }}
          />
        )}

        <div className="content-toolbar">
          <input
            type="search"
            placeholder="Buscar contenido"
            aria-label="Buscar contenido"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleSearch();
            }}
          />
          <select aria-label="Filtrar por tipo" value={type} onChange={event => setType(event.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="news">Noticias</option>
            <option value="joke">Consejos y humor</option>
          </select>
          <select aria-label="Filtrar por estado" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
          <button className="action-button" type="button" onClick={handleSearch}>Buscar</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {error && <table className="data"><tbody><tr><td>{error}</td></tr></tbody></table>}
          {!error && !data && <table className="data"><tbody><tr><td>Cargando contenido...</td></tr></tbody></table>}
          {!error && data && (
            <ContentTable items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
      </div>

      {selectedItem ? (
        <ContentDetail
          item={selectedItem}
          onChanged={refresh}
          onDeleted={() => {
            setSelectedId(null);
            refresh();
          }}
        />
      ) : (
        <div className="card content-detail">
          <div className="placeholder-box" style={{ padding: 35 }}>Selecciona un contenido para editarlo.</div>
        </div>
      )}
    </>
  );
}