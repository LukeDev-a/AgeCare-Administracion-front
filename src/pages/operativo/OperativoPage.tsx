import { useEffect, useState } from 'react';
import {
  fetchCriticalProcesses,
  fetchOpsIncidents,
  fetchOpsLatency,
  fetchOpsStatus,
  type CriticalProcesses,
  type OpsIncidents,
  type OpsLatency,
  type OpsStatus,
} from '../../api/operational';
import { formatDate, percent } from '../../lib/format';
import { getOpsStatus } from '../../lib/statusMeta';
import { LatencyChart } from './LatencyChart';
import { OpsComponentCard } from './OpsComponentCard';

const INCIDENT_STATUS_META: Record<string, { className: string; icon: string; label: string }> = {
  resolved: { className: 'ok', icon: '✔', label: 'Resuelto' },
  completed: { className: 'neutral', icon: '🛠', label: 'Completado' },
};

export function OperativoPage() {
  const [status, setStatus] = useState<OpsStatus | null>(null);
  const [latency, setLatency] = useState<OpsLatency | null>(null);
  const [incidents, setIncidents] = useState<OpsIncidents | null>(null);
  const [processes, setProcesses] = useState<CriticalProcesses | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchOpsStatus(), fetchOpsLatency(), fetchOpsIncidents(), fetchCriticalProcesses()])
      .then(([statusData, latencyData, incidentsData, processesData]) => {
        if (cancelled) return;
        setStatus(statusData);
        setLatency(latencyData);
        setIncidents(incidentsData);
        setProcesses(processesData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar el estado operativo.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="banner crit">
        <span className="b-ico">✖</span>
        <div className="b-t">{error}</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="banner ok">
        <span className="b-ico">✅</span>
        <div>
          <div className="b-t">Cargando estado operativo...</div>
          <div className="b-s">Consultando componentes...</div>
        </div>
      </div>
    );
  }

  const overall = getOpsStatus(status.overall);
  const degraded = status.components.filter(component => component.status !== 'operational');
  const bannerIcon = overall.className === 'ok' ? '✅' : overall.className === 'warn' ? '⚠️' : '✖';
  const bannerTitle =
    overall.className === 'ok'
      ? `Todos los sistemas operativos${degraded.length ? ` — ${degraded.length} componente${degraded.length === 1 ? '' : 's'} degradado${degraded.length === 1 ? '' : 's'}` : ''}`
      : `Estado general: ${overall.label.replace(/^\S+\s/, '')}`;

  return (
    <>
      <div className={`banner ${overall.className}`}>
        <span className="b-ico">{bannerIcon}</span>
        <div>
          <div className="b-t">{bannerTitle}</div>
          <div className="b-s">Última comprobación: {new Date(status.checked_at).toLocaleString('es-CL')}</div>
        </div>
        <div className="tb-spacer" />
        <span className={`chip ${degraded.length ? 'warn' : 'ok'}`}>
          {degraded.length
            ? `${degraded.length} componente${degraded.length === 1 ? '' : 's'} requiere${degraded.length === 1 ? '' : 'n'} atención`
            : '✔ Sin alertas'}
        </span>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        {status.components.map(component => (
          <OpsComponentCard key={component.key} component={component} />
        ))}
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Tiempo de respuesta p95 por componente</div>
              <div className="card-sub">Servicios síncronos · milisegundos · últimos 60 min</div>
            </div>
          </div>
          <div className="chart-wrap">
            {latency && latency.components.length > 0 && <LatencyChart components={latency.components} />}
            {latency && latency.components.length === 0 && 'No hay datos de latencia.'}
          </div>
          <div className="mini-note">
            Push (entrega extremo a extremo) y Asistente IA (generación) se miden aparte por ser asíncronos — ver tarjetas de componente.
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Incidentes recientes</div>
              <div className="card-sub">Últimos 30 días</div>
            </div>
          </div>
          <ul className="flag-list">
            {incidents && incidents.items.length === 0 && <li>No hay incidentes recientes.</li>}
            {incidents?.items.map((incident, index) => {
              const meta = INCIDENT_STATUS_META[incident.status] ?? { className: 'warn', icon: '▲', label: 'En observación' };
              return (
                <li key={index}>
                  <span className={`chip ${meta.className}`}>{meta.icon} {meta.label}</span>
                  <div>
                    <div className="fl-t">{incident.title}</div>
                    <div className="fl-s">{formatDate(incident.started_at)} · {incident.description}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Procesos críticos de negocio</div>
            <div className="card-sub">Cadenas de extremo a extremo que deben funcionar siempre</div>
          </div>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Proceso</th>
              <th>Cadena</th>
              <th className="num">p95 extremo a extremo</th>
              <th className="num">Éxito 24 h</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {processes?.processes.map((process, index) => {
              const processStatus = getOpsStatus(process.status);
              return (
                <tr key={index}>
                  <td style={{ fontWeight: 600 }}>{process.name}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{process.chain}</td>
                  <td className="num">{process.p95_seconds.toLocaleString('es-CL', { maximumFractionDigits: 1 })} s</td>
                  <td className="num">{percent(process.success_24h)}</td>
                  <td><span className={`chip ${processStatus.className}`}>{processStatus.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}