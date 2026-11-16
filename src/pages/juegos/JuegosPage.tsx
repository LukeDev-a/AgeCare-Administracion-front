import { useEffect, useState } from 'react';
import { deleteGameApp, fetchGamesApps, toggleGameAppStatus, type GameAppItem } from '../../api/gamesApps';
import { GameFormModal } from './GameFormModal';
import { GamesPreviewPanel } from './GamesPreviewPanel';
import { GamesTable } from './GamesTable';
import { useAuth } from '../../auth/AuthContext';
import { canManageGames, GAME_TIER_LABELS, GAME_TYPE_LABELS } from '../../lib/gamesMeta';
import { Modal } from '../../components/Modal';
import { gameStyles as s } from './gameStyles';

export function JuegosPage() {
  const { user } = useAuth();
  const canManage = canManageGames(user?.role);
  const [typeFilter, setTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ key: string; items: GameAppItem[]; error: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingItem, setEditingItem] = useState<GameAppItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inspecting, setInspecting] = useState<GameAppItem | null>(null);
  const [deleting, setDeleting] = useState<GameAppItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'positive' | 'negative'>('positive');
  const [reloadToken, setReloadToken] = useState(0);
  const queryKey = `${typeFilter}:${stateFilter}:${reloadToken}`;
  const isLoading = result?.key !== queryKey;
  const error = result?.key === queryKey ? result.error : '';
  const items = result?.key === queryKey ? result.items.filter(item => item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : [];
  const activeCount = items.filter(item => item.is_active).length;

  useEffect(() => {
    let cancelled = false;
    fetchGamesApps(typeFilter, stateFilter)
      .then(data => { if (!cancelled) setResult({ key: queryKey, items: data, error: '' }); })
      .catch((err: unknown) => { if (!cancelled) setResult({ key: queryKey, items: [], error: err instanceof Error ? err.message : 'No fue posible cargar el catálogo.' }); });
    return () => { cancelled = true; };
  }, [typeFilter, stateFilter, reloadToken, queryKey]);

  function refresh() { setReloadToken(token => token + 1); }

  async function handleToggle(item: GameAppItem) {
    if (!canManage || busy) return;
    setBusy(true); setActionError(''); setNotice('');
    try {
      await toggleGameAppStatus(item.id);
      setNoticeTone(item.is_active ? 'negative' : 'positive');
      setNotice(`${item.title}: ${item.is_active ? 'desactivado' : 'activado'} correctamente.`);
      refresh();
    } catch (err) { setActionError(err instanceof Error ? err.message : 'No fue posible cambiar el estado.'); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!canManage || busy || !deleting) return;
    setBusy(true); setActionError(''); setNotice('');
    try {
      await deleteGameApp(deleting.id);
      setNoticeTone('positive');
      setNotice(`${deleting.title} se eliminó del catálogo.`);
      setDeleting(null); refresh();
    } catch (err) { setActionError(err instanceof Error ? err.message : 'No fue posible eliminar el elemento.'); }
    finally { setBusy(false); }
  }

  return <div className="tw:space-y-6 tw:text-base tw:leading-relaxed tw:text-ink">
    <section className={s.panel}>
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5">
        <div><h2 className={s.heading}>Juegos y aplicaciones</h2><p className={`tw:mt-2 tw:max-w-2xl ${s.muted}`}>{canManage ? 'Organiza el catálogo, decide qué juegos están activos y revisa cómo se ven antes de compartirlos.' : 'Consulta el catálogo y prueba los juegos que están activos.'}</p></div>
        {canManage && <button type="button" disabled={busy} className={`${s.button} ${s.primary}`} onClick={() => { setEditingItem(null); setShowModal(true); }}>+ Crear juego o aplicación</button>}
      </div>
      <div className="tw:mt-6 tw:flex tw:flex-wrap tw:gap-2" role="group" aria-label="Vista del catálogo">
        <button type="button" aria-pressed={!showPreview} className={`${s.button} ${!showPreview ? s.primary : ''}`} onClick={() => setShowPreview(false)}>{canManage ? 'Gestionar catálogo' : 'Catálogo'}</button>
        <button type="button" aria-pressed={showPreview} className={`${s.button} ${showPreview ? s.primary : ''}`} onClick={() => setShowPreview(true)}>Vista previa</button>
      </div>
    </section>
    <section className={s.panel} aria-label="Buscar y filtrar catálogo">
      <div className="tw:grid tw:items-end tw:gap-4 tw:md:grid-cols-2 tw:xl:grid-cols-[minmax(220px,1fr)_190px_190px_auto]">
        <label className={s.label}>Buscar por nombre<input className={s.field} placeholder="Por ejemplo, Memorama" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label className={s.label}>Estado<select className={s.field} value={stateFilter} onChange={event => setStateFilter(event.target.value)}><option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>
        <label className={s.label}>Tipo<select className={s.field} value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="all">Todos los tipos</option><option value="game">Juegos</option><option value="app">Aplicaciones</option></select></label>
        <button type="button" className={s.button} disabled={isLoading || busy} onClick={refresh}>Actualizar catálogo</button>
      </div>
      <div className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
        <p className={s.muted}>{isLoading ? 'Consultando catálogo…' : error ? 'Consulta no disponible' : `${items.length} resultados · ${activeCount} activos · ${items.length - activeCount} inactivos`}</p>
        {(search || stateFilter || typeFilter !== 'all') && <button type="button" className={s.button} onClick={() => { setSearch(''); setStateFilter(''); setTypeFilter('all'); }}>Limpiar filtros</button>}
      </div>
    </section>
    {notice && <p role="status" className={`${s.notice} ${noticeTone === 'negative' ? 'tw:text-negative' : 'tw:text-positive'}`}>{notice}</p>}
    {actionError && !deleting && <p role="alert" className={s.error}>{actionError}</p>}
    {error ? <div role="alert" className={s.error}><p>{error}</p><button type="button" className={`tw:mt-3 ${s.button}`} onClick={refresh}>Volver a intentar</button></div>
      : isLoading ? <div role="status" className={`${s.panel} tw:flex tw:items-center tw:justify-center tw:gap-3 tw:py-16`}><span aria-hidden="true" className="tw:size-5 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand" />Cargando catálogo…</div>
      : showPreview ? <GamesPreviewPanel items={items} canManage={canManage} onChanged={refresh} />
      : <section className={s.panel}><div className="tw:mb-5"><h3 className="tw:text-lg tw:font-bold">Catálogo</h3><p className={`tw:mt-1 ${s.muted}`}>{canManage ? 'Ver detalle muestra la ficha completa. Usa las acciones para editar o cambiar la disponibilidad.' : 'Abre el detalle para consultar la información de cada juego.'}</p></div>
        <GamesTable canManage={canManage} items={items} busy={busy} onToggle={item => void handleToggle(item)} onEdit={item => { setEditingItem(item); setShowModal(true); }} onDelete={item => { setActionError(''); setDeleting(item); }} onInspect={setInspecting} />
      </section>}
    {canManage && showModal && <GameFormModal key={editingItem?.id ?? 'new'} editingItem={editingItem} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); setNoticeTone('positive'); setNotice(editingItem ? 'Cambios guardados correctamente.' : 'El nuevo elemento se creó inactivo. Puedes activarlo desde el catálogo.'); refresh(); }} />}
    {inspecting && <Modal title={inspecting.title} onClose={() => setInspecting(null)}>
      <div className="tw:space-y-6"><div className={s.actions}><span className={`${s.badge} ${inspecting.is_active ? 'tw:text-positive' : 'tw:text-muted'}`}>{inspecting.is_active ? 'Activo' : 'Inactivo'}</span><span className={s.badge}>{GAME_TYPE_LABELS[inspecting.item_type]}</span>{inspecting.featured && <span className={s.badge}>★ Destacado</span>}</div>
        <section><h3 className="tw:mb-2 tw:font-bold">Acerca de este juego</h3><p className="tw:whitespace-pre-wrap tw:break-words">{inspecting.description || 'No se ha añadido una descripción.'}</p></section>
        <dl className="tw:grid tw:gap-5 tw:rounded-xl tw:bg-canvas tw:p-5 tw:sm:grid-cols-2">{[['Categoría', inspecting.category], ['Plan mínimo', GAME_TIER_LABELS[inspecting.min_tier]], ['Creado por', inspecting.created_by_name || 'Sin información registrada'], ['Fecha de creación', date(inspecting.created_at)], ['Última modificación', date(inspecting.updated_at)]].map(([label, value]) => <div key={label}><dt className={s.muted}>{label}</dt><dd className="tw:mt-1 tw:font-semibold">{value}</dd></div>)}</dl>
        {inspecting.resource_kind === 'external' && <p className={s.notice}>Este juego está alojado en otra web. Desactivarlo lo retira del catálogo; no bloquea su dirección externa ni detiene las partidas en esa web.</p>}
        <details className={s.section}><summary className="tw:cursor-pointer tw:font-semibold">Información técnica del recurso</summary><p className="tw:break-all">Identificador: {inspecting.slug}</p><p className="tw:break-all">Dirección: {inspecting.target_url || 'Sin recurso configurado'}</p></details>
      </div>
    </Modal>}
    {canManage && deleting && <Modal title="Eliminar del catálogo" busy={busy} error={actionError} onClose={() => { setDeleting(null); setActionError(''); }}>
      <div className="tw:space-y-5"><p>¿Quieres eliminar <strong>{deleting.title}</strong>?</p><p className={s.muted}>Se retirará del catálogo. Su historial de auditoría se conservará y los demás juegos no se modificarán. Esta acción no se puede deshacer desde la consola.</p>{deleting.resource_kind === 'external' && <p className={s.notice}>La web externa seguirá disponible fuera de AgeCare.</p>}<div className={s.actions}><button type="button" className={s.button} disabled={busy} onClick={() => { setDeleting(null); setActionError(''); }}>Cancelar</button><button type="button" className={`${s.button} tw:text-negative`} disabled={busy} onClick={() => void handleDelete()}>Confirmar eliminación</button></div></div>
    </Modal>}
  </div>;
}

function date(value?: string) { return value ? new Date(value).toLocaleString('es-CL') : 'Sin información registrada'; }
