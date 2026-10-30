import { useCallback, useEffect, useState } from 'react';
import { fetchCriticalProcesses, fetchOpsLatency, fetchOpsStatus, type OpsWindow } from '../../api/operational';
import { percent } from '../../lib/format';
import { getOpsStatus } from '../../lib/statusMeta';
import { OPS_COMPONENTS, opsDate, opsExecution, opsMeasurement, opsOrigin } from '../../lib/operationalMeta';
import { LatencyChart } from './LatencyChart';
import { OpsComponentCard } from './OpsComponentCard';
import { IncidentsPanel } from './IncidentsPanel';

function useRemote<T>(key: string, load: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    let cancelled = false;
    load().then(data => { if (!cancelled) setState({ key, data, error: '' }); })
      .catch((error: unknown) => { if (!cancelled) setState({ key, data: null,
        error: error instanceof Error ? error.message : 'No fue posible consultar los datos.' }); });
    return () => { cancelled = true; };
  }, [key, load]);
  return state.key === key ? state : { key, data: null, error: '' };
}

export function OperativoPage() {
  const [window, setWindow] = useState<OpsWindow>('1h');
  const [selected, setSelected] = useState<string[]>(OPS_COMPONENTS.map(([key]) => key).filter(key => key !== 'push' && key !== 'ai_assistant'));
  const [reload, setReload] = useState(0);
  const latencyLoad = useCallback(() => fetchOpsLatency(window, selected), [window, selected]);
  const statusState = useRemote(`status:${reload}`, fetchOpsStatus);
  const latencyState = useRemote(`${window}:${selected.join(',')}:${reload}`, latencyLoad);
  const processState = useRemote(`processes:${reload}`, fetchCriticalProcesses);
  const status = statusState.data, latency = latencyState.data, processes = processState.data;
  const overall = status?.overall ? getOpsStatus(status.overall) : null;
  return <>
    <div className="filter-row">
      <button className="action-button" type="button" onClick={() => setReload(value => value+1)}>Actualizar vista</button>
      <span className="mini-note">Se actualiza al entrar o al pulsar este botón. Las fechas corresponden a las mediciones recibidas.</span>
    </div>
    {statusState.error && <div className="card" role="alert">{statusState.error}</div>}
    {!status && !statusState.error && <div className="card">Cargando estado operativo...</div>}
    {status && <>
      <div className={`banner ${overall?.className ?? 'neutral'}`}>
        <div><div className="b-t">Estado general: {overall?.label ?? 'Sin datos de componentes'}</div>
          <div className="b-s">Última comprobación recibida: {opsDate(status.checked_at)} · Santiago</div></div>
      </div>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        {status.components.map(component => <OpsComponentCard key={component.key} component={component} />)}
      </div>
    </>}
    <div className="card">
      <div className="card-title">Latencias por componente</div>
      <label>Ventana de consulta <select value={window} onChange={event => setWindow(event.target.value as OpsWindow)}>
        <option value="1h">Última hora</option><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 días</option>
      </select></label>
      <fieldset style={{ marginTop: 12 }}><legend>Componentes que deseas comparar</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {OPS_COMPONENTS.map(([key, name]) => <label key={key}>
            <input type="checkbox" checked={selected.includes(key)} disabled={selected.length === 1 && selected.includes(key)}
              onChange={event => setSelected(values => event.target.checked ? [...values, key] : values.filter(value => value !== key))} /> {name}
          </label>)}
        </div>
      </fieldset>
      <p className="mini-note">p50: tiempo dentro del que termina el 50 % de las mediciones. p95: el 95 %. Tiempos en milisegundos.</p>
      {latencyState.error && <div role="alert">{latencyState.error}</div>}
      {!latency && !latencyState.error && <p>Cargando latencias...</p>}
      {latency && <>
        <div className="card-sub">Ventana aplicada: {{ '1h': '1 hora', '24h': '24 horas', '7d': '7 días' }[latency.window]} · Calculado: {opsDate(latency.computed_at)} · Santiago</div>
        {latency.components.length ? <LatencyChart components={latency.components} /> : <p>Sin datos de latencia para esta selección.</p>}
        {!!latency.missing_components?.length && <p>Sin datos: {latency.missing_components.map(key => OPS_COMPONENTS.find(([value]) => value === key)?.[1] ?? key).join(', ')}.</p>}
        <div style={{ overflowX: 'auto' }}><table className="data">
          <thead><tr><th>Componente</th><th>Medición</th><th>p50</th><th>p95</th><th>Muestras</th><th>Calculado</th></tr></thead>
          <tbody>{latency.components.map(row => <tr key={row.key}>
            <td>{row.name}<div className="mini-note">{opsOrigin(row.data_origin)}</div></td>
            <td>{opsMeasurement(row.measurement_kind)}</td><td>{row.p50_ms.toLocaleString('es-CL')} ms</td><td>{row.p95_ms.toLocaleString('es-CL')} ms</td>
            <td>{row.sample_count.toLocaleString('es-CL')}</td><td>{opsDate(row.computed_at)}</td>
          </tr>)}</tbody>
        </table></div>
      </>}
    </div>
    <div className="card">
      <div className="card-title">Procesos críticos</div>
      <div className="card-sub">Éxito de las últimas 24 horas · Calculado: {opsDate(processes?.computed_at)} · Santiago</div>
      {processState.error && <p role="alert">{processState.error}</p>}
      {!processes && !processState.error && <p>Cargando procesos...</p>}
      {processes && !processes.processes.length && <p>Sin datos de procesos críticos.</p>}
      <div style={{ overflowX: 'auto' }}><table className="data">
        <thead><tr><th>Proceso</th><th>Cadena y tipo de ejecución</th><th>p95</th><th>Éxito · 24 h</th><th>Estado</th><th>Calculado</th></tr></thead>
        <tbody>{processes?.processes.map(process => <tr key={process.key}>
          <td>{process.name}<div className="mini-note">{opsOrigin(process.data_origin)}</div></td>
          <td>{process.chain}<div className="mini-note">{opsExecution(process.execution_kind)}</div></td>
          <td>{process.p95_seconds.toLocaleString('es-CL', { maximumFractionDigits: 1 })} s</td><td>{percent(process.success_24h)}</td>
          <td><span className={`chip ${getOpsStatus(process.status).className}`}>{getOpsStatus(process.status).label}</span></td><td>{opsDate(process.computed_at)}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
    <IncidentsPanel refreshKey={reload} />
  </>;
}
