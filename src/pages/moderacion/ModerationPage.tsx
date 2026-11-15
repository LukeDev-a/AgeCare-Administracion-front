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
    <header className={s.panel}><h2 className={s.heading}>Moderación de contenido</h2><p className={`tw:mt-2 tw:max-w-3xl ${s.muted}`}>Revisa los elementos pendientes antes de aprobarlos o rechazarlos. Puedes consultar las decisiones anteriores cambiando el estado.</p></header>
    <section className={s.panel} aria-label="Cola de moderación">
      <div className="tw:mb-6 tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div><h3 className="tw:text-lg tw:font-bold">Cola de revisión</h3><p className={`tw:mt-2 ${s.muted}`}>Primero los reportes de seguridad; dentro de cada grupo, los más antiguos.</p></div><button className={s.button} type="button" disabled={loading} onClick={refresh}>Actualizar cola</button></div>
      <div className="tw:mb-5 tw:grid tw:items-end tw:gap-4 tw:md:grid-cols-[1fr_1fr_auto]">
        <label className={s.label}>Tipo de contenido<select className={s.field} aria-label="Filtrar moderación" value={type} onChange={event => { setPage(1); setType(event.target.value); }}><option value="">Todos los tipos</option><option value="review">Reseñas</option><option value="caregiver_profile">Perfiles de cuidadoras</option><option value="photo">Fotos</option><option value="chat_message">Mensajes</option></select></label>
        <label className={s.label}>Estado de revisión<select className={s.field} aria-label="Estado de moderación" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}><option value="pending">Pendientes</option><option value="approved">Aprobados</option><option value="rejected">Rechazados</option></select></label>
        <button className={s.button} type="button" disabled={loading} onClick={refresh}>Buscar</button>
      </div>
      <p className={`tw:mb-5 ${s.muted}`}>{data ? `${fmt(data.total)} elementos · página ${data.page}` : error ? 'Consulta no disponible' : 'Consultando elementos…'}</p>
      {notice && <p role="status" className={`tw:mb-5 ${s.notice}`}>{notice}</p>}
      {error ? <p role="alert" className={s.error}>{error}</p> : !data ? <p role="status" className={`${s.notice} tw:py-10 tw:text-center`}>Cargando elementos…</p> : <ModerationTable items={data.items} selectedId={selectedItem?.id ?? null} onSelect={id => { setNotice(''); setSelectedItem(data.items.find(item => item.id === id) ?? null); }} />}
      <nav aria-label="Páginas de moderación" className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><button className={s.button} type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span className={s.muted}>Página {page}{data ? ` de ${Math.max(1, Math.ceil(data.total / data.page_size))}` : ''}</span><button className={s.button} type="button" disabled={loading || !data || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button></nav>
    </section>
    {selectedItem && <ModerationDetail key={selectedItem.id} item={selectedItem} onClose={() => setSelectedItem(null)} onResolved={() => { setSelectedItem(null); setNotice('Decisión guardada. Puedes consultarla filtrando por Aprobados o Rechazados.'); refresh(); }} />}
  </div>;
}
