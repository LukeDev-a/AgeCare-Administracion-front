import { useEffect, useState } from 'react';
import { fetchContent, type ContentItem, type ContentListResponse } from '../../api/content';
import { fmt } from '../../lib/format';
import { ContentDetail } from './ContentDetail';
import { ContentTable } from './ContentTable';
import { NewContentForm } from './NewContentForm';
import { NewsCandidates } from './NewsCandidates';
import { contentStyles as ui } from './contentStyles';

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
  const [editing, setEditing] = useState(false);

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

  // Consultar el avance, no volver a solicitar audio. Esperar la respuesta antes del siguiente ciclo.
  useEffect(() => {
    if (section !== 'manage' || editing || showNewForm || error || !data?.items.some(item => item.audio_status === 'queued')) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') setReloadToken(token => token + 1);
    };
    const timer = window.setTimeout(refreshIfVisible, 5000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [data, editing, section, showNewForm, error]);

  function refresh(saved?: ContentItem) {
    if (saved) setData(current => current ? { ...current, items: current.items.map(item => item.id === saved.id ? saved : item) } : current);
    setReloadToken(token => token + 1);
  }

  function handleSearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  const selectedItem = data?.items.find(item => item.id === selectedId) ?? null;

  return (
    <div className="tw:space-y-7 tw:text-base tw:leading-relaxed tw:text-ink">
      <header><p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Contenido para la aplicación</p><h1 className="tw:text-2xl tw:font-bold tw:sm:text-3xl">Curación de contenido</h1>
        <p className={ui.description}>Revisa, adapta y publica chistes y noticias para los usuarios de la app móvil.</p></header>
        <div className="tw:flex tw:flex-wrap tw:gap-2 tw:rounded-2xl tw:bg-canvas tw:p-2" role="group" aria-label="Secciones de curación de contenido">
          <button type="button" className={`${ui.button} ${section === 'manage' ? ui.primary : ''}`} aria-controls="content-manage" aria-pressed={section === 'manage'} onClick={() => setSection('manage')}>Gestionar contenido</button>
          <button type="button" className={`${ui.button} ${section === 'prepare' ? ui.primary : ''}`} aria-controls="content-prepare" aria-pressed={section === 'prepare'} onClick={() => setSection('prepare')}>Preparar noticias</button>
        </div>
      <section id="content-manage" hidden={section !== 'manage'} aria-label="Gestionar contenido" className="tw:space-y-7">
      <div className={ui.panel}>
        <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
          <div>
            <h2 className={ui.heading}>Catálogo de chistes y noticias</h2>
            <p className={ui.description}>Pulsa «Revisar» para abrir la edición, aprobación, audio y publicación en una ventana.</p>
          </div>
          <button className={`${ui.button} ${ui.primary}`} type="button" aria-expanded={showNewForm} onClick={() => setShowNewForm(value => !value)}>
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

        <div className="tw:my-5 tw:grid tw:items-end tw:gap-4 tw:sm:grid-cols-2 tw:xl:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
          <label className={ui.label}>Buscar por texto
          <input
            className={ui.field}
            type="search"
            placeholder="Buscar contenido"
            aria-label="Buscar contenido"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleSearch();
            }}
          /></label>
          <label className={ui.label}>Tipo de contenido<select className={ui.field} aria-label="Filtrar por tipo" value={type} onChange={event => { setType(event.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            <option value="news">Noticias</option>
            <option value="joke">Chistes</option>
          </select></label>
          <label className={ui.label}>Estado<select className={ui.field} aria-label="Filtrar por estado" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select></label>
          <button className={ui.button} type="button" onClick={handleSearch}>Buscar</button>
        </div>
        <div className="tw:my-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><span className="tw:text-muted">{data ? `${fmt(data.total)} contenidos · ` : ''}Página {page}</span><div className={ui.actions}>
          <button className={ui.button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
          <button className={ui.button} disabled={!data || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button>
          <button className={ui.button} onClick={() => refresh()}>Actualizar contenido</button></div></div>

        <div className={ui.scroll}>
          {error && <p role="alert" className={ui.error}>{error}</p>}
          {!error && !data && <p role="status" className={ui.notice}>Cargando contenido...</p>}
          {!error && data && (
            <ContentTable items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
      </div>

      {selectedItem && (
        <ContentDetail
          key={`${selectedItem.id}-${selectedItem.text_version}`}
          item={selectedItem}
          onEditingChange={setEditing}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
          onDeleted={() => {
            setSelectedId(null);
            refresh();
          }}
        />
      )}
      </section>
      <section id="content-prepare" hidden={section !== 'prepare'} aria-label="Preparar noticias">
        <NewsCandidates onDraft={(id, title) => {
          setSearchInput(title); setSearch(title); setType(''); setStatus(''); setPage(1);
          setSelectedId(id); setShowNewForm(false); refresh(); setSection('manage');
        }} />
      </section>
    </div>
  );
}
