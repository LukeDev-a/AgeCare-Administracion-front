import { useEffect, useState } from 'react';
import { fetchCaregivers, type Caregiver, type CaregiversListResponse } from '../../api/caregivers';
import { fmt } from '../../lib/format';
import { CaregiverDetail } from './CaregiverDetail';
import { CaregiversTable } from './CaregiversTable';
import { marketStyles as s } from './marketStyles';

export function CaregiversPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data: CaregiversListResponse | null; error: string } | null>(null);
  const [selected, setSelected] = useState<Caregiver | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const key = JSON.stringify([search, status, page, reloadToken]);
  const data = result?.key === key ? result.data : null;
  const error = result?.key === key ? result.error : '';
  const loading = result?.key !== key;
  useEffect(() => {
    let cancelled = false;
    fetchCaregivers({ search, status, page }).then(response => { if (!cancelled) setResult({ key, data: response, error: '' }); })
      .catch((err: unknown) => { if (!cancelled) setResult({ key, data: null, error: err instanceof Error ? err.message : 'No fue posible cargar los perfiles de cuidadoras.' }); });
    return () => { cancelled = true; };
  }, [search, status, page, reloadToken, key]);
  function refresh() { setReloadToken(token => token + 1); }
  function handleSearch() { setSearch(searchInput.trim()); setPage(1); }
  return <section className={s.panel} aria-label="Perfiles de cuidadoras">
    <h3 className={s.heading}>Perfiles de cuidadoras</h3><p className={`tw:mt-2 tw:mb-6 ${s.muted}`}>Revisa la información de cada perfil y consulta su estado de aprobación.</p>
    <div className="tw:mb-5 tw:grid tw:items-end tw:gap-4 tw:md:grid-cols-[minmax(180px,1fr)_200px_auto]">
      <label className={s.label}>Buscar por nombre o correo<input className={s.field} type="search" aria-label="Buscar cuidadoras" value={searchInput} maxLength={120} placeholder="Nombre o correo" onChange={event => setSearchInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') handleSearch(); }} /></label>
      <label className={s.label}>Estado<select className={s.field} aria-label="Filtrar cuidadoras" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="approved">Aprobada</option><option value="suspended">Suspendida</option></select></label>
      <button className={s.button} type="button" onClick={handleSearch}>Buscar</button>
    </div>
    <div className="tw:mb-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><p className={s.muted}>{data ? `${fmt(data.total)} perfiles · página ${data.page}` : error ? 'Consulta no disponible' : 'Consultando perfiles…'}</p><div className={s.actions}>
      {(searchInput || status) && <button className={s.button} type="button" onClick={() => { setSearchInput(''); setSearch(''); setStatus(''); setPage(1); }}>Limpiar filtros</button>}
      <button className={s.button} type="button" disabled={loading} onClick={refresh}>Actualizar lista</button>
    </div></div>
    {error ? <p role="alert" className={s.error}>{error}</p> : !data ? <p role="status" className={`${s.notice} tw:py-10 tw:text-center`}>Cargando perfiles…</p> : <CaregiversTable items={data.items} selectedId={selected?.caregiver_id ?? null} onSelect={id => setSelected(data.items.find(item => item.caregiver_id === id) ?? null)} />}
    <nav aria-label="Páginas de cuidadoras" className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><button className={s.button} type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span className={s.muted}>Página {page}{data ? ` de ${Math.max(1, Math.ceil(data.total / (data.page_size ?? 25)))}` : ''}</span><button className={s.button} type="button" disabled={loading || !data || page * (data.page_size ?? 25) >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button></nav>
    {selected && <CaregiverDetail key={selected.caregiver_id} caregiver={selected} onClose={() => setSelected(null)} onChanged={refresh} />}
  </section>;
}
