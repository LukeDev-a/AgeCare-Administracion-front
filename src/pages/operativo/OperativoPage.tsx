import { useCallback, useState } from 'react';
import { useAnalyticsRemote as useRemote } from '../../hooks/useAnalyticsRemote';
import type { ActivityRequestInit } from '../../lib/requestActivity';
import { fetchCriticalProcesses, fetchOpsLatency, fetchOpsStatus, type OpsWindow } from '../../api/operational';
import { percent } from '../../lib/format';
import { getOpsStatus } from '../../lib/statusMeta';
import { OPS_COMPONENTS, opsDate, opsExecution, opsMeasurement, opsOrigin } from '../../lib/operationalMeta';
import { LatencyChart } from './LatencyChart';
import { OpsComponentCard } from './OpsComponentCard';
import { IncidentsPanel } from './IncidentsPanel';
import { LoadingIndicator } from './LoadingIndicator';

export function OperativoPage() {
  const [section, setSection] = useState('summary');
  const [window, setWindow] = useState<OpsWindow>('1h');
  const [selected, setSelected] = useState<string[]>(OPS_COMPONENTS.map(([key]) => key).filter(key => key !== 'push' && key !== 'ai_assistant'));
  const [reload, setReload] = useState(0);
  const latencyLoad = useCallback((options?: ActivityRequestInit) => fetchOpsLatency(window, selected, options), [window, selected]);
  const statusState = useRemote(`status:${reload}`, fetchOpsStatus, section !== 'incidents');
  const latencyState = useRemote(`${window}:${selected.join(',')}:${reload}`, latencyLoad, section !== 'incidents');
  const processState = useRemote(`processes:${reload}`, fetchCriticalProcesses, section !== 'incidents');
  const status = statusState.data, latency = latencyState.data, processes = processState.data;
  const measured = status?.components.filter(component => !status.monitoring_enabled || component.freshness !== 'stored') ?? [];
  const overall = status?.overall ? getOpsStatus(status.overall) : null;
  const refreshing = (!status && !statusState.error) || (!latency && !latencyState.error) || (!processes && !processState.error);
  return <div className="tw:space-y-6 tw:text-sm tw:leading-relaxed tw:text-ink">
    <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
      <div><h1 className="tw:text-2xl tw:font-bold tw:tracking-tight tw:sm:text-3xl">Estado operativo</h1>
        <p className="tw:mt-2 tw:text-base tw:text-muted">Revisa la salud de los servicios y los problemas que requieren atención.</p></div>
      <button className="theme-toggle tw:min-h-11 tw:gap-2 tw:px-4 tw:text-sm tw:disabled:cursor-wait tw:disabled:opacity-70" type="button" disabled={refreshing} onClick={() => setReload(value => value+1)}>
        <span aria-hidden="true" className={refreshing ? 'tw:inline-block tw:motion-safe:animate-spin' : ''}>↻</span>
        {refreshing ? 'Actualizando…' : 'Actualizar estado'}
      </button>
    </header>
    <p className="tw:text-muted">La información se consulta al entrar o al actualizar. Las nuevas mediciones pueden tardar hasta un minuto en aparecer. Cada fecha indica cuándo se recibió la medición, en horario de Santiago.</p>
    <div className="tw:flex tw:flex-wrap tw:gap-2" role="group" aria-label="Secciones del estado operativo">
      {[[ 'summary', 'Resumen' ], ['latency', 'Tiempos de respuesta'], ['processes', 'Procesos críticos'], ['incidents', 'Incidentes']].map(([key, label]) =>
        <button key={key} type="button" aria-pressed={section === key} onClick={() => setSection(key)} className={section === key
          ? 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border-0 tw:bg-brand tw:px-5 tw:py-3 tw:text-sm tw:font-semibold tw:text-white tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand'
          : 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-5 tw:py-3 tw:text-sm tw:font-semibold tw:text-muted tw:hover:bg-canvas tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand'}>{label}</button>)}
    </div>
    <section hidden={section !== 'summary'} aria-label="Resumen operativo" aria-busy={!status && !statusState.error}>
    {statusState.error && <div className="card" role="alert">{statusState.error}</div>}
    {!status && !statusState.error && <LoadingIndicator label="Consultando el estado de los servicios…" />}
    {status && <>
      <div className="tw:mb-6 tw:space-y-4 tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-6">
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><h2 className="tw:text-lg tw:font-bold">{status.monitoring_enabled ? 'Estado de los servicios medidos' : 'Estado general de la plataforma'}</h2>
          <span className={`chip ${overall?.className ?? 'neutral'} tw:px-4 tw:py-2 tw:text-base`}>{overall?.label ?? 'Sin datos de componentes'}</span></div>
        <p className="tw:text-muted">{status.overall === 'outage' ? 'Las mediciones recientes registran fallos técnicos. Revisa los componentes afectados.' : status.overall === 'degraded' ? 'Hay servicios con dificultades. Revisa sus observaciones para conocer el detalle.' : status.overall === 'operational' ? 'Los servicios con mediciones recientes responden correctamente.' : 'Aún no hay información suficiente para determinar el estado general.'}</p>
        {status.monitoring_enabled && <p className="tw:text-muted">Se mide la API administrativa, su base de datos y la autenticación de la consola. Los demás servicios conservan sus valores anteriores y no se incluyen en este resumen. Durante una suspensión del servidor no se registran comprobaciones.</p>}
        <div className="tw:flex tw:flex-wrap tw:gap-3">{[['operational', 'Operativos'], ['degraded', 'Con dificultades'], ['outage', 'Fuera de servicio']].map(([key, label]) =>
          <span key={key} className="tw:rounded-xl tw:bg-canvas tw:px-4 tw:py-2"><strong>{measured.filter(component => component.status === key).length}</strong> {label}</span>)}
          <span className="tw:rounded-xl tw:bg-canvas tw:px-4 tw:py-2"><strong>{measured.filter(component => component.status == null).length}</strong> Sin medición vigente</span></div>
        <p className="tw:text-muted">Última comprobación recibida {opsDate(status.checked_at)} · Santiago</p>
      </div>
      <h2 className="tw:mb-2 tw:text-xl tw:font-bold">Servicios de la plataforma</h2>
      <p className="tw:mb-5 tw:text-muted">El estado general refleja el servicio más afectado. Abre el detalle de cada tarjeta para consultar sus mediciones.</p>
      <div className="tw:grid tw:gap-4 tw:lg:grid-cols-2 tw:xl:grid-cols-3">
        {[...status.components].sort((a, b) => (a.status ? { outage: 0, degraded: 1, operational: 2 }[a.status] : 3) - (b.status ? { outage: 0, degraded: 1, operational: 2 }[b.status] : 3)).map(component => <OpsComponentCard key={component.key} component={component} />)}
      </div>
    </>}
    </section>
    <section hidden={section !== 'latency'} aria-label="Tiempos de respuesta" aria-busy={!latency && !latencyState.error} className={panel}>
      <h2 className="tw:text-xl tw:font-bold">Tiempos de respuesta de los servicios</h2>
      <p className="tw:mb-5 tw:mt-2 tw:text-muted">Compara cuánto tarda cada servicio. Un tiempo menor representa una respuesta más rápida para esa medición.</p>
      <button className="theme-toggle tw:min-h-11" type="button" onClick={() => { setWindow('1h'); setSelected(OPS_COMPONENTS.map(([key]) => key).filter(key => key !== 'push' && key !== 'ai_assistant')); }}>Restablecer filtros</button>
      <label className="tw:grid tw:max-w-sm tw:gap-2 tw:font-semibold">Período de comparación <select className={selectStyle} value={window} onChange={event => setWindow(event.target.value as OpsWindow)}>
        <option value="1h">Última hora</option><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 días</option>
      </select></label>
      <fieldset className="tw:my-5 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-4"><legend className="tw:px-2 tw:font-semibold">Servicios que deseas comparar</legend>
        <div className="tw:flex tw:flex-wrap tw:gap-3">
          {OPS_COMPONENTS.map(([key, name]) => <label key={key} className="tw:flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-lg tw:bg-canvas tw:px-3 tw:py-2">
            <input className="tw:h-4 tw:w-4 tw:accent-brand" type="checkbox" checked={selected.includes(key)} disabled={selected.length === 1 && selected.includes(key)}
              onChange={event => setSelected(values => event.target.checked ? [...values, key] : values.filter(value => value !== key))} /> {name}
          </label>)}
        </div>
      </fieldset>
      <div className="tw:mb-5 tw:space-y-2 tw:rounded-xl tw:bg-canvas tw:p-4"><p><strong>Tiempo habitual (p50)</strong> · La mitad de las mediciones tarda este tiempo o menos.</p>
        <p><strong>Tiempo para el 95 % (p95)</strong> · 95 de cada 100 mediciones terminan dentro de este tiempo.</p><p className="tw:text-muted">Los tiempos se expresan en milisegundos (ms). 1.000 ms equivalen a un segundo. El gráfico compara p95.</p></div>
      {latencyState.error && <div role="alert">{latencyState.error}</div>}
      {!latency && !latencyState.error && <LoadingIndicator label="Consultando los tiempos de respuesta para tu selección…" />}
      {latency && <>
        <div className="tw:mb-5 tw:text-muted">Ventana aplicada: {{ '1h': '1 hora', '24h': '24 horas', '7d': '7 días' }[latency.window]} · Última actualización {opsDate(latency.computed_at)} · Santiago</div>
        {latency.components.length ? <LatencyChart components={latency.components} /> : <p>Sin datos de latencia para esta selección.</p>}
        {!!latency.missing_components?.length && <p>Sin datos: {latency.missing_components.map(key => OPS_COMPONENTS.find(([value]) => value === key)?.[1] ?? key).join(', ')}.</p>}
        <div className="tw:mt-5 tw:overflow-x-auto"><table className={tableStyle}>
          <thead><tr><th>Servicio</th><th>Qué se mide</th><th>Habitual (p50)</th><th>95 % (p95)</th><th>Mediciones</th><th>Actualización</th></tr></thead>
          <tbody>{latency.components.map(row => <tr key={row.key}>
            <td>{row.name}<div className="tw:mt-2 tw:text-sm tw:text-muted">{opsOrigin(row.data_origin)}</div></td>
            <td>{opsMeasurement(row.measurement_source ?? row.measurement_kind)}{row.p95_ms == null && <p className="tw:mt-2 tw:text-muted">Se requieren al menos {row.minimum_samples ?? 20} mediciones correctas.</p>}</td><td>{row.p50_ms == null ? 'Sin muestras suficientes' : `${row.p50_ms.toLocaleString('es-CL')} ms`}</td><td>{row.p95_ms == null ? 'Sin muestras suficientes' : `${row.p95_ms.toLocaleString('es-CL')} ms`}</td>
            <td>{row.sample_count.toLocaleString('es-CL')}{row.successful_sample_count != null && <p className="tw:mt-1 tw:text-muted">{row.successful_sample_count.toLocaleString('es-CL')} correctas</p>}</td><td>{opsDate(row.computed_at)}</td>
          </tr>)}</tbody>
        </table></div>
      </>}
    </section>
    <section hidden={section !== 'processes'} aria-label="Procesos críticos" aria-busy={!processes && !processState.error} className={panel}>
      <h2 className="tw:text-xl tw:font-bold">Procesos críticos</h2>
      <p className="tw:mb-4 tw:mt-2 tw:text-muted">Revisa el recorrido completo de acciones importantes, como una alerta SOS o una consulta al asistente.</p>
      <div className="tw:mb-5 tw:space-y-2 tw:rounded-xl tw:bg-canvas tw:p-4"><p><strong>Éxito en 24 horas</strong> · Porcentaje de ejecuciones que terminaron correctamente.</p><p><strong>Tiempo p95</strong> · Tiempo en segundos dentro del que terminan 95 de cada 100 ejecuciones.</p><p>Las comprobaciones sintéticas son ejecuciones de prueba para revisar el proceso.</p></div>
      <div className="tw:mb-4 tw:text-muted">Última actualización {opsDate(processes?.computed_at)} · Santiago</div>
      {processState.error && <p role="alert">{processState.error}</p>}
      {!processes && !processState.error && <LoadingIndicator label="Consultando los procesos críticos…" />}
      {processes && !processes.processes.length && <p>Sin datos de procesos críticos. Estos recorridos todavía no tienen mediciones conectadas. Puedes consultar la API, la base de datos y la autenticación en Resumen.</p>}
      <div className="tw:overflow-x-auto"><table className={tableStyle}>
        <thead><tr><th>Proceso</th><th>Recorrido y tipo de ejecución</th><th>Tiempo p95</th><th>Éxito · 24 h</th><th>Estado</th><th>Actualización</th></tr></thead>
        <tbody>{processes?.processes.map(process => <tr key={process.key}>
          <td>{process.name}<div className="tw:mt-2 tw:text-sm tw:text-muted">{opsOrigin(process.data_origin)}</div></td>
          <td>{process.chain}<div className="tw:mt-2 tw:text-sm tw:text-muted">{opsExecution(process.execution_kind)}</div></td>
          <td>{process.p95_seconds.toLocaleString('es-CL', { maximumFractionDigits: 1 })} s</td><td>{percent(process.success_24h)}</td>
          <td><span className={`chip ${getOpsStatus(process.status).className}`}>{getOpsStatus(process.status).label}</span></td><td>{opsDate(process.computed_at)}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <section hidden={section !== 'incidents'} aria-label="Incidentes operativos"><IncidentsPanel refreshKey={reload} active={section === 'incidents'} /></section>
  </div>;
}

const panel = 'tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:sm:p-7';
const selectStyle = 'tw:min-h-11 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-3 tw:py-2 tw:text-ink';
const tableStyle = 'tw:w-full tw:min-w-[800px] tw:border-collapse tw:text-left tw:text-sm tw:leading-relaxed tw:tabular-nums tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-3 tw:[&_th]:font-semibold tw:[&_th]:text-muted tw:[&_td]:border-0 tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-4';
