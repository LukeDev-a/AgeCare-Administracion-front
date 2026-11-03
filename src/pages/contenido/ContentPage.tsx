import { useEffect, useState } from 'react';
import { fetchContent, type ContentListResponse } from '../../api/content';
import { fmt } from '../../lib/format';
import { ContentDetail } from './ContentDetail';
import { ContentTable } from './ContentTable';
import { NewContentForm } from './NewContentForm';
import { NewsCandidates } from './NewsCandidates';

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
  const [page, setPage] = useState(1);
  const [section, setSection] = useState<'manage' | 'prepare'>('manage');

  useEffect(() => {
    let cancelled = false;
    fetchContent({ search, type, status, page })
      .then(response => {
        if (cancelled) return;
        setError('');
        setData(response);
        if (page > 1 && !response.items.length) setPage(value => Math.max(1, value - 1));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar el contenido.');
      });
    return () => {
      cancelled = true;
    };
  }, [search, type, status, page, reloadToken]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  function handleSearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  const selectedItem = data?.items.find(item => item.id === selectedId) ?? null;

  return (
    <>
      <div className="card"><h2 className="card-title">Curación de contenido</h2>
        <p className="card-sub">Gestiona lo que ya está en el catálogo o prepara nuevas noticias antes de incorporarlas.</p>
        <div className="marketplace-tabs" role="group" aria-label="Secciones de curación de contenido">
          <button className={section === 'manage' ? 'active' : ''} aria-pressed={section === 'manage'} onClick={() => setSection('manage')}>Gestionar contenido</button>
          <button className={section === 'prepare' ? 'active' : ''} aria-pressed={section === 'prepare'} onClick={() => setSection('prepare')}>Preparar noticias</button>
        </div>
      </div>
      <section hidden={section !== 'manage'} aria-label="Gestionar contenido">
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Catálogo de chistes y noticias</div>
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
          <select aria-label="Filtrar por tipo" value={type} onChange={event => { setType(event.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            <option value="news">Noticias</option>
            <option value="joke">Chistes</option>
          </select>
          <select aria-label="Filtrar por estado" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
          <button className="action-button" type="button" onClick={handleSearch}>Buscar</button>
        </div>
        <div className="audit-pagination"><span>Página {page}</span><div className="audit-actions">
          <button className="theme-toggle" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
          <button className="theme-toggle" disabled={!data || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button>
          <button className="theme-toggle" onClick={refresh}>Actualizar contenido</button></div></div>

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
          key={`${selectedItem.id}-${selectedItem.text_version}-${selectedItem.updated_at}`}
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
      </section>
      <section hidden={section !== 'prepare'} aria-label="Preparar noticias">
        <NewsCandidates onDraft={(id, title) => {
          setSearchInput(title); setSearch(title); setType(''); setStatus(''); setPage(1);
          setSelectedId(id); setShowNewForm(false); refresh(); setSection('manage');
        }} />
      </section>
    </>
  );
}
