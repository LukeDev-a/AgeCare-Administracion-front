import { useAutoFilters } from '../../hooks/useAutoFilters';
import { validateAuditFilters } from '../../lib/filterValidation';
import { useEffect, useState } from 'react';
import { EMPTY_AUDIT_FILTERS, exportAudit, fetchAudit, fetchAuditUsers, type AuditEntry, type AuditFilters } from '../../api/audit';
import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITIES } from '../../lib/auditMeta';
import { AuditDetail } from './AuditDetail';
import { AuditTable } from './AuditTable';
import { auditStyles as s } from './auditStyles';
const uuidPattern = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

export function AuditoriaPage() {
  const { draft, filters, page, setPage, setField, reset, pending: unapplied, error: filterError } = useAutoFilters(
    { ...EMPTY_AUDIT_FILTERS }, { delayedKeys: ['q', 'actor_id', 'entity_id', 'date_from', 'date_to'], validate: validateAuditFilters });
  const [pageSize, setPageSize] = useState(25);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [usersError, setUsersError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchAuditUsers(controller.signal).then(data => { if (!controller.signal.aborted) setUsers(data); }).catch(() => {
      if (!controller.signal.aborted) setUsersError('No se pudo cargar el selector de cuentas. Puedes buscar por nombre o usar el identificador en los filtros avanzados.');
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try { const data = await fetchAudit(filters, page, pageSize, controller.signal); if (!controller.signal.aborted) { setItems(data.items); setTotal(data.total); } }
      catch (exception) { if (!controller.signal.aborted) { setItems([]); setTotal(0); setError(exception instanceof Error ? exception.message : 'Error de conexión.'); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [filters, page, pageSize, reload]);
  async function download() {
    if (exporting || loading || unapplied) return;
    setExporting(true); setExportError(''); setNotice('');
    try {
      const url = URL.createObjectURL(await exportAudit(filters));
      const link = document.createElement('a'); link.href = url; link.download = 'agecare-auditoria.csv';
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('La exportación CSV está lista.');
    } catch (exception) { setExportError(exception instanceof Error ? exception.message : 'No fue posible exportar.'); }
    finally { setExporting(false); }
  }
  function clear() { reset(); setPageSize(25); setExportError(''); setNotice(''); }
  const field = (key: keyof AuditFilters, value: string) => setField(key, value);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <section aria-label="Auditoría" className="tw:space-y-6 tw:text-base tw:leading-relaxed tw:text-ink">
    <header className={s.panel}><h2 className={s.heading}>Historial administrativo</h2><p className={`tw:mt-2 tw:max-w-3xl ${s.muted}`}>Consulta los cambios, accesos y lecturas sensibles registrados en la consola. Los eventos se muestran del más reciente al más antiguo y no se pueden editar ni eliminar.</p></header>
    <section className={s.panel} aria-label="Filtros de auditoría">
      <h3 className="tw:mb-2 tw:text-lg tw:font-bold">Buscar en el historial</h3><p className={`tw:mb-5 ${s.muted}`}>Sin fechas se consultan los últimos 30 días. Cada consulta admite hasta 90 días. Las fechas se muestran en la hora local de tu dispositivo.</p>
      <div className="tw:space-y-5">
        <div className="tw:grid tw:gap-5 tw:lg:grid-cols-3">
          <label className={s.label}>Buscar usuario, acción o módulo<input className={s.field} aria-label="Buscar en auditoría" maxLength={120} value={draft.q} onChange={event => field('q', event.target.value)} placeholder="Nombre, juegos, tickets…" /></label>
          <label className={s.label}>Cuenta responsable<select className={s.field} aria-label="Cuenta responsable" value={draft.actor_id} onChange={event => setField('actor_id', event.target.value, true)}><option value="">Todas las cuentas</option>{draft.actor_id && !users.some(user => user.id === draft.actor_id) && <option value={draft.actor_id}>Cuenta por identificador</option>}{users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}</select></label>
          <label className={s.label}>Acción<select className={s.field} aria-label="Acción" value={draft.action} onChange={event => field('action', event.target.value)}><option value="">Todas las acciones</option>{AUDIT_ACTION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={s.label}>Desde (hora local)<input className={s.field} type="datetime-local" aria-label="Fecha inicial" value={draft.date_from} onChange={event => field('date_from', event.target.value)} /></label>
          <label className={s.label}>Hasta (hora local)<input className={s.field} type="datetime-local" aria-label="Fecha final" value={draft.date_to} onChange={event => field('date_to', event.target.value)} /></label>
        </div>
        {usersError && <p role="status" className={s.notice}>{usersError}</p>}
        <details className={s.section}><summary className="tw:cursor-pointer tw:font-semibold">Filtros avanzados por registro e identificador</summary><div className="tw:grid tw:gap-5 tw:lg:grid-cols-3">
          <label className={s.label}>Tipo de registro<select className={s.field} aria-label="Tipo de registro" value={draft.entity_type} onChange={event => field('entity_type', event.target.value)}><option value="">Todos</option>{AUDIT_ENTITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={s.label}>Identificador del registro<input className={s.field} aria-label="Identificador del registro" value={draft.entity_id} onChange={event => field('entity_id', event.target.value)} placeholder="Identificador del detalle" pattern={uuidPattern} /></label>
          <label className={s.label}>Identificador del usuario<input className={s.field} aria-label="Usuario de auditoría" value={draft.actor_id} onChange={event => field('actor_id', event.target.value)} placeholder="Identificador de cuenta" pattern={uuidPattern} /><span className={s.muted}>Permite consultar cuentas eliminadas mediante el identificador que aparece en el evento.</span></label>
        </div></details>
        {filterError && <p role="alert" className={s.error}>{filterError}</p>}
        <div className={s.actions}><button type="button" className={s.button} onClick={clear}>Restablecer filtros</button>{unapplied && !filterError && <p role="status" className={s.muted}>Actualizando los filtros de consulta…</p>}</div>
      </div>
    </section>
    <section className={s.panel} aria-label="Resultados de auditoría">
      <div className="tw:mb-5 tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div><h3 className="tw:text-lg tw:font-bold">Eventos registrados</h3><p className={`tw:mt-2 ${s.muted}`}>{loading ? 'Consultando historial…' : error ? 'Consulta no disponible' : `${total.toLocaleString('es-CL')} eventos encontrados`}</p><p className={`tw:mt-1 ${s.muted}`}>El CSV utiliza los filtros aplicados y admite hasta 5000 eventos.</p></div><div className={s.actions}><button type="button" className={s.button} disabled={loading} onClick={() => setReload(value => value + 1)}>Actualizar</button><button type="button" className={s.button} disabled={loading || exporting || unapplied || !!error} onClick={() => void download()}>{exporting ? 'Exportando…' : 'Exportar CSV'}</button></div></div>
      {exportError && <p role="alert" className={`tw:mb-5 ${s.error}`}>{exportError}</p>}{notice && <p role="status" className={`tw:mb-5 ${s.notice}`}>{notice}</p>}
      {error ? <p role="alert" className={s.error}>{error}</p> : <AuditTable items={items} loading={loading} onSelect={setSelected} />}
      <nav aria-label="Páginas del historial" className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><label className={`${s.label} tw:flex tw:items-center tw:gap-3`}>Eventos por página<select className={`${s.field} tw:w-auto`} aria-label="Eventos por página" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label><div className={s.actions}><button type="button" className={s.button} disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span className={s.muted}>Página {page}{!loading && !error ? ` de ${pages}` : ''}</span><button type="button" className={s.button} disabled={loading || !!error || page >= pages} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></nav>
    </section>
    {selected && <AuditDetail entry={selected} onClose={() => setSelected(null)} />}
  </section>;
}
