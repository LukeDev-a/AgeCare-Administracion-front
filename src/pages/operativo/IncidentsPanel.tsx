import { useEffect, useState, type FormEvent } from 'react';
import { fetchIncidents, type IncidentFilters } from '../../api/incidents';
import type { OpsIncident, OpsIncidents } from '../../api/operational';
import { useAuth } from '../../auth/AuthContext';
import { canManageIncidents } from '../../routes/permissions';
import { OPS_COMPONENTS, opsDate } from '../../lib/operationalMeta';
import { INCIDENT_STATUSES, incidentMailLabel } from '../../lib/incidentsMeta';
import { IncidentForm } from './IncidentForm';
import { LoadingIndicator } from './LoadingIndicator';

const INITIAL: IncidentFilters = { days: 30, status: '', component: '', page: 1, page_size: 10 };
export function IncidentsPanel({ refreshKey = 0, active = true }: { refreshKey?: number; active?: boolean }) {
  const { user } = useAuth();
  const allowed = canManageIncidents(user?.role);
  const [filters, setFilters] = useState(INITIAL);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; data: OpsIncidents | null; error: string }>({ key: '', data: null, error: '' });
  const [selected, setSelected] = useState<OpsIncident | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const key = `${JSON.stringify(filters)}:${refreshKey}:${reload}`;
  useEffect(() => {
    let cancelled = false;
    fetchIncidents(filters).then(data => {
      if (cancelled) return;
      setResult({ key, data, error: '' });
      setSelected(current => {
        const latest = data.items.find(item => item.id === current?.id);
        return current && latest ? { ...current, notification_status: latest.notification_status } : current;
      });
    })
      .catch((error: unknown) => { if (!cancelled) setResult({ key, data: null, error: error instanceof Error ? error.message : 'No fue posible consultar incidentes.' }); });
    return () => { cancelled = true; };
  }, [filters, key]);
  const data = result.key === key ? result.data : null;
  const error = result.key === key ? result.error : '';
  const pendingMail = data?.items.some(item => item.notification_status === 'queued') ?? false;
  useEffect(() => {
    if (!active || !pendingMail || editing || creating) return;
    const timer = window.setInterval(() => setReload(count => count + 1), 5000);
    return () => window.clearInterval(timer);
  }, [active, pendingMail, editing, creating]);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setFilters({ ...INITIAL, days: Number(values.get('days')), status: String(values.get('status') ?? ''), component: String(values.get('component') ?? '') });
    setSelected(null); setEditing(false); setCreating(false);
  }
  function saved(value: OpsIncident) {
    setSelected(value); setEditing(false); setCreating(false); setReload(count => count+1);
    setNotice('Registro guardado.');
  }
  const componentName = (value: string | null) => OPS_COMPONENTS.find(([key]) => key === value)?.[1] ?? 'Transversal';
  return <section className="tw:space-y-5 tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:sm:p-7 tw:[&_button]:min-h-11 tw:[&_button]:text-sm">
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><div><h2 className="tw:text-xl tw:font-bold">Incidentes y mantenimientos</h2><p className="tw:mt-2 tw:text-muted">Consulta los problemas registrados y el seguimiento de su resolución.</p></div>
      {allowed && <button className="action-button" type="button" onClick={() => { setCreating(true); setEditing(false); setSelected(null); setNotice(''); }}>Registrar incidente</button>}</div>
    <form className="tw:flex tw:flex-wrap tw:items-end tw:gap-4 tw:rounded-xl tw:bg-canvas tw:p-4 tw:[&_label]:grid tw:[&_label]:gap-2 tw:[&_label]:font-semibold tw:[&_input]:min-h-11 tw:[&_input]:w-28 tw:[&_input]:rounded-lg tw:[&_input]:border tw:[&_input]:border-solid tw:[&_input]:border-stroke tw:[&_input]:bg-panel tw:[&_input]:px-3 tw:[&_input]:text-ink tw:[&_select]:min-h-11 tw:[&_select]:max-w-full tw:[&_select]:rounded-lg tw:[&_select]:border tw:[&_select]:border-solid tw:[&_select]:border-stroke tw:[&_select]:bg-panel tw:[&_select]:px-3 tw:[&_select]:text-ink" onSubmit={apply}>
      <label>Días hacia atrás<input name="days" type="number" min={1} max={365} defaultValue={30} required /></label>
      <label>Estado<select name="status"><option value="">Todos</option>{Object.entries(INCIDENT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Componente<select name="component"><option value="">Todos</option>{OPS_COMPONENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="action-button" type="submit">Aplicar filtros</button>
      <button className="action-button secondary" type="button" onClick={() => setReload(count => count+1)}>Actualizar incidentes</button>
    </form>
    <p className="tw:text-muted">Consulta de 1 a 365 días. También incluye los mantenimientos programados para fechas futuras.</p>
    {notice && <p className="tw:rounded-xl tw:bg-canvas tw:p-4" role="status">{notice}</p>}
    {creating && allowed && <IncidentForm onSaved={saved} onCancel={() => setCreating(false)} />}
    {error && <p role="alert">{error}</p>}
    {!data && !error && <LoadingIndicator label="Consultando los incidentes y mantenimientos…" />}
    {data && <>
      {!data.items.length && <p>No hay registros que coincidan con los filtros.</p>}
      <div className="tw:overflow-x-auto"><table className="tw:w-full tw:min-w-[1000px] tw:border-collapse tw:text-left tw:text-sm tw:leading-relaxed tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-3 tw:[&_th]:text-muted tw:[&_td]:border-0 tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-4"><thead><tr><th>Registro</th><th>Tipo</th><th>Componente</th><th>Severidad</th><th>Estado</th><th>Inicio</th><th>Resolución</th><th>Detalle</th></tr></thead>
        <tbody>{data.items.map(row => <tr key={row.id}><td>{row.title}</td><td>{row.is_maintenance ? 'Mantenimiento' : 'Incidente'}</td><td>{componentName(row.component_key)}</td>
          <td>{row.severity === 'outage' ? 'Fuera de servicio' : 'Servicio degradado'}</td><td>{INCIDENT_STATUSES[row.status]}</td><td>{opsDate(row.started_at)}</td><td>{opsDate(row.resolved_at)}</td>
          <td><button className="action-button secondary" onClick={() => { setSelected(row); setEditing(false); setCreating(false); }}>Ver detalle</button></td></tr>)}</tbody></table></div>
      <div className="tw:mt-4 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
        <button type="button" className="action-button secondary" disabled={filters.page <= 1} onClick={() => { setFilters({ ...filters, page: filters.page-1 }); setSelected(null); }}>Anterior</button>
        <span>Página {data.page} · {data.total} registros</span>
        <button type="button" className="action-button secondary" disabled={filters.page*filters.page_size >= data.total} onClick={() => { setFilters({ ...filters, page: filters.page+1 }); setSelected(null); }}>Siguiente</button>
      </div>
    </>}
    {selected && <div className="tw:space-y-6 tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:p-5 tw:text-base tw:leading-7 tw:sm:p-7">
      <div className="tw:space-y-3">
        <p className="tw:text-sm tw:font-semibold tw:text-muted">{selected.is_maintenance ? 'Detalle del mantenimiento' : 'Detalle del incidente'}</p>
        <h3 className="tw:break-words tw:text-xl tw:font-bold tw:leading-snug">{selected.title}</h3>
        <div className="tw:flex tw:flex-wrap tw:gap-2 tw:text-sm">
          <span className="tw:rounded-lg tw:bg-panel tw:px-3 tw:py-1 tw:font-semibold">{INCIDENT_STATUSES[selected.status] ?? selected.status}</span>
          <span className="tw:rounded-lg tw:bg-panel tw:px-3 tw:py-1">{componentName(selected.component_key)}</span>
          <span className="tw:rounded-lg tw:bg-panel tw:px-3 tw:py-1">{selected.severity === 'outage' ? 'Fuera de servicio' : 'Servicio degradado'}</span>
        </div>
      </div>
      <section className="tw:space-y-2" aria-label="Descripción del incidente">
        <h4 className="tw:text-base tw:font-bold">Qué ocurrió</h4>
        <p className="tw:max-w-prose tw:whitespace-pre-wrap tw:break-words">{selected.description}</p>
      </section>
      <section className="tw:space-y-2 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5" aria-label="Resolución del incidente">
        <h4 className="tw:text-base tw:font-bold">Resolución</h4>
        <p className="tw:max-w-prose tw:whitespace-pre-wrap tw:break-words">{selected.resolution ?? 'Todavía no se ha registrado una nota de resolución.'}</p>
      </section>
      <dl className="tw:grid tw:gap-5 tw:text-sm tw:sm:grid-cols-3">
        <div><dt className="tw:font-semibold tw:text-muted">Inicio</dt><dd className="tw:mt-1">{opsDate(selected.started_at)}</dd></div>
        <div><dt className="tw:font-semibold tw:text-muted">Resolución</dt><dd className="tw:mt-1">{selected.resolved_at ? opsDate(selected.resolved_at) : 'Pendiente de cierre'}</dd></div>
        <div><dt className="tw:font-semibold tw:text-muted">Última modificación</dt><dd className="tw:mt-1">{opsDate(selected.updated_at)}</dd></div>
      </dl>
      <p className="tw:text-sm tw:text-muted">Fechas en horario de Santiago.</p>
      <div className="tw:space-y-1 tw:border-0 tw:border-l-4 tw:border-solid tw:border-stroke tw:pl-4 tw:text-sm">
        <p className="tw:font-semibold">Aviso al equipo</p>
        <p className="tw:text-muted">{incidentMailLabel(selected.notification_status)}</p>
      </div>
      <details key={selected.id} className="tw:border-0 tw:border-t tw:border-solid tw:border-stroke tw:pt-4 tw:text-sm">
        <summary className="tw:cursor-pointer tw:font-semibold tw:text-brand-ink">Ver identificadores del registro</summary>
        <dl className="tw:mt-4 tw:space-y-3 tw:text-muted">
          <div><dt className="tw:font-semibold">Identificador del incidente</dt><dd className="tw:break-all">{selected.id}</dd></div>
          <div><dt className="tw:font-semibold">Identificador de quien lo creó</dt><dd className="tw:break-all">{selected.created_by ?? 'Sin registro'}</dd></div>
        </dl>
      </details>
      {allowed && !editing && <button className="action-button" onClick={() => setEditing(true)}>Actualizar registro</button>}
      {editing && allowed && <IncidentForm key={selected.id} incident={selected} onSaved={saved} onCancel={() => setEditing(false)} />}
    </div>}
  </section>;
}
