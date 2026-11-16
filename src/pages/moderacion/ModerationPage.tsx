import { useEffect, useState } from 'react';
import { fetchModerationQueue, type ModerationItem, type ModerationQueueResponse } from '../../api/moderation';
import { fmt } from '../../lib/format';
import { ModerationDetail } from './ModerationDetail';
import { ModerationTable } from './ModerationTable';
import { moderationStyles as s } from './moderationStyles';

export function ModerationPage() {
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data: ModerationQueueResponse | null; error: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [notice, setNotice] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${status}:${type}:${page}:${reloadToken}`;
  const data = result?.key === key ? result.data : null;
  const error = result?.key === key ? result.error : '';
  const loading = result?.key !== key;
  useEffect(() => {
    let cancelled = false;
    fetchModerationQueue({ status, type, page }).then(response => { if (!cancelled) setResult({ key, data: response, error: '' }); })
      .catch((err: unknown) => { if (!cancelled) setResult({ key, data: null, error: err instanceof Error ? err.message : 'No fue posible cargar la cola de moderación.' }); });
    return () => { cancelled = true; };
  }, [status, type, page, reloadToken, key]);
  function refresh() { setReloadToken(token => token + 1); }
  return <div className="tw:space-y-6 tw:text-base tw:leading-relaxed tw:text-ink">
    <header><p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Revisión y convivencia</p><h1 className="tw:text-2xl tw:font-bold tw:sm:text-3xl">Moderación de contenido</h1><p className="tw:mt-2 tw:max-w-3xl tw:text-muted">Revisa lo reportado y decide si corresponde aprobarlo o rechazarlo.</p>
      <ol className="tw:mt-5 tw:grid tw:list-none tw:gap-3 tw:p-0 tw:sm:grid-cols-3">{['Abre un elemento', 'Lee el contenido y su reporte', 'Confirma tu decisión'].map((label, index) => <li key={label} className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:bg-canvas tw:p-4"><span className="tw:flex tw:size-7 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-brand-soft tw:text-sm tw:font-bold tw:text-brand-ink">{index + 1}</span><span className="tw:text-sm tw:font-semibold">{label}</span></li>)}</ol>
    </header>
    <section className={s.panel} aria-label="Cola de moderación">
      <div className="tw:mb-6 tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div><h3 className="tw:text-lg tw:font-bold">{status === 'pending' ? 'Pendientes de revisión' : status === 'approved' ? 'Historial de aprobaciones' : 'Historial de rechazos'}</h3><p className={`tw:mt-2 ${s.muted}`}>{status === 'pending' ? 'Atiende primero los marcados con prioridad de seguridad.' : 'Consulta quién tomó la decisión, cuándo y por qué.'}</p></div><button className={s.button} type="button" disabled={loading} onClick={refresh}>Actualizar cola</button></div>
      <div className="tw:mb-5 tw:grid tw:items-end tw:gap-4 tw:md:grid-cols-[1fr_1fr_auto]">
        <label className={s.label}>Tipo de contenido<select className={s.field} aria-label="Filtrar moderación" value={type} onChange={event => { setPage(1); setType(event.target.value); }}><option value="">Todos los tipos</option><option value="review">Reseñas</option><option value="caregiver_profile">Perfiles de cuidadoras</option><option value="photo">Fotos</option><option value="chat_message">Mensajes</option></select></label>
        <label className={s.label}>Estado de revisión<select className={s.field} aria-label="Estado de moderación" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}><option value="pending">Pendientes</option><option value="approved">Aprobados</option><option value="rejected">Rechazados</option></select></label>
        <button className={s.button} type="button" disabled={loading} onClick={() => { setStatus('pending'); setType(''); setPage(1); }}>Ver todos los pendientes</button>
      </div>
      <p className={`tw:mb-5 ${s.muted}`}>{data ? `${fmt(data.total)} elementos · página ${data.page} · Los filtros se aplican al seleccionarlos.` : error ? 'Consulta no disponible' : 'Consultando elementos…'}</p>
      {notice && <p role="status" className={`tw:mb-5 ${s.notice}`}>{notice}</p>}
      {error ? <div role="alert" className={s.error}><p>{error}</p><button type="button" className={s.button} onClick={refresh}>Volver a intentar</button></div> : !data ? <p role="status" className={`${s.notice} tw:flex tw:items-center tw:justify-center tw:gap-3 tw:py-10`}><span aria-hidden="true" className="tw:size-5 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand" />Cargando elementos…</p> : <ModerationTable items={data.items} selectedId={selectedItem?.id ?? null} onSelect={id => { setNotice(''); setSelectedItem(data.items.find(item => item.id === id) ?? null); }} />}
      <nav aria-label="Páginas de moderación" className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><button className={s.button} type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span className={s.muted}>Página {page}{data ? ` de ${Math.max(1, Math.ceil(data.total / data.page_size))}` : ''}</span><button className={s.button} type="button" disabled={loading || !data || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button></nav>
    </section>
    {selectedItem && <ModerationDetail key={selectedItem.id} item={selectedItem} onClose={() => setSelectedItem(null)} onResolved={() => { setSelectedItem(null); setNotice('Decisión guardada. Puedes consultarla filtrando por Aprobados o Rechazados.'); refresh(); }} />}
  </div>;
}
