import { useEffect, useState, type FormEvent } from 'react';
import { fetchIncidents, type IncidentFilters } from '../../api/incidents';
import type { OpsIncident, OpsIncidents } from '../../api/operational';
import { useAuth } from '../../auth/AuthContext';
import { canManageIncidents } from '../../routes/permissions';
import { OPS_COMPONENTS, opsDate } from '../../lib/operationalMeta';
import { INCIDENT_STATUSES, incidentMailLabel } from '../../lib/incidentsMeta';
import { IncidentForm } from './IncidentForm';

const INITIAL: IncidentFilters = { days: 30, status: '', component: '', page: 1, page_size: 10 };
export function IncidentsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
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
    fetchIncidents(filters).then(data => { if (!cancelled) setResult({ key, data, error: '' }); })
      .catch((error: unknown) => { if (!cancelled) setResult({ key, data: null, error: error instanceof Error ? error.message : 'No fue posible consultar incidentes.' }); });
    return () => { cancelled = true; };
  }, [filters, key]);
  const data = result.key === key ? result.data : null;
  const error = result.key === key ? result.error : '';
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setFilters({ ...INITIAL, days: Number(values.get('days')), status: String(values.get('status') ?? ''), component: String(values.get('component') ?? '') });
    setSelected(null); setEditing(false); setCreating(false);
  }
  function saved(value: OpsIncident) {
    setSelected(value); setEditing(false); setCreating(false); setReload(count => count+1);
    setNotice('Registro guardado. ' + incidentMailLabel(value.notification_status));
  }
  const componentName = (value: string | null) => OPS_COMPONENTS.find(([key]) => key === value)?.[1] ?? 'Transversal';
  return <section className="card">
    <div className="card-head"><div className="card-title">Incidentes y mantenimientos</div>
      {allowed && <button className="action-button" type="button" onClick={() => { setCreating(true); setEditing(false); setSelected(null); setNotice(''); }}>Registrar incidente</button>}</div>
    <form className="tickets-toolbar" onSubmit={apply}>
      <label>Últimos días<input name="days" type="number" min={1} max={365} defaultValue={30} required /></label>
      <label>Estado<select name="status"><option value="">Todos</option>{Object.entries(INCIDENT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Componente<select name="component"><option value="">Todos</option>{OPS_COMPONENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="action-button" type="submit">Aplicar filtros</button>
      <button className="action-button secondary" type="button" onClick={() => setReload(count => count+1)}>Actualizar incidentes</button>
    </form>
    <p className="mini-note">Los mantenimientos programados para fechas futuras también se incluyen.</p>
    {notice && <p role="status">{notice}</p>}
    {creating && allowed && <IncidentForm onSaved={saved} onCancel={() => setCreating(false)} />}
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p>Cargando incidentes...</p>}
    {data && <>
      {!data.items.length && <p>No hay registros que coincidan con los filtros.</p>}
      <div style={{ overflowX: 'auto' }}><table className="data"><thead><tr><th>Registro</th><th>Tipo</th><th>Componente</th><th>Severidad</th><th>Estado</th><th>Inicio</th><th>Resolución</th><th>Detalle</th></tr></thead>
        <tbody>{data.items.map(row => <tr key={row.id}><td>{row.title}</td><td>{row.is_maintenance ? 'Mantenimiento' : 'Incidente'}</td><td>{componentName(row.component_key)}</td>
          <td>{row.severity === 'outage' ? 'Fuera de servicio' : 'Servicio degradado'}</td><td>{INCIDENT_STATUSES[row.status]}</td><td>{opsDate(row.started_at)}</td><td>{opsDate(row.resolved_at)}</td>
          <td><button className="action-button secondary" onClick={() => { setSelected(row); setEditing(false); setCreating(false); }}>Ver detalle</button></td></tr>)}</tbody></table></div>
      <div className="filter-row" style={{ marginTop: 12 }}>
        <button type="button" className="action-button secondary" disabled={filters.page <= 1} onClick={() => { setFilters({ ...filters, page: filters.page-1 }); setSelected(null); }}>Anterior</button>
        <span>Página {data.page} · {data.total} registros</span>
        <button type="button" className="action-button secondary" disabled={filters.page*filters.page_size >= data.total} onClick={() => { setFilters({ ...filters, page: filters.page+1 }); setSelected(null); }}>Siguiente</button>
      </div>
    </>}
    {selected && <div style={{ marginTop: 16 }}>
      <h3>{selected.title}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{selected.description}</p>
      <p>Identificador: {selected.id}</p><p>Creado por: {selected.created_by ?? 'Sin registro'} · Última modificación: {opsDate(selected.updated_at)}</p>
      <p>Nota de resolución: {selected.resolution ?? 'Sin resolución registrada'}</p><p>{incidentMailLabel(selected.notification_status)}</p>
      {allowed && !editing && <button className="action-button" onClick={() => setEditing(true)}>Actualizar registro</button>}
      {editing && allowed && <IncidentForm key={selected.id} incident={selected} onSaved={saved} onCancel={() => setEditing(false)} />}
    </div>}
  </section>;
}
