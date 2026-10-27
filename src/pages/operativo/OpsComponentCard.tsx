import type { OpsComponent } from '../../api/operational';
import { fmt, formatUptime } from '../../lib/format';
import { getOpsStatus } from '../../lib/statusMeta';
import { opsDate, opsOrigin, opsMeasurement } from '../../lib/operationalMeta';

export function OpsComponentCard({ component }: { component: OpsComponent }) {
  const status = getOpsStatus(component.status);
  const latencyValue = (value: number | null) => value == null ? 'Sin datos' : `${fmt(value)} ms`;
  const latency = `p50: ${latencyValue(component.latency_p50_ms)} · p95: ${latencyValue(component.latency_p95_ms)}`;

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div className="card-title">{component.name}</div>
          <div className="card-sub">{opsOrigin(component.data_origin)}</div>
        </div>
        <span className={`chip ${status.className}`}>{status.label}</span>
      </div>
      <div style={{ display: 'flex', gap: 22, marginTop: 14 }}>
        <div>
          <div className="kpi-label">Disponibilidad · 30 días</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3 }}>{formatUptime(component.uptime_30d)}</div>
        </div>
        <div>
          <div className="kpi-label">Latencia · última hora</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: 'var(--ink-soft)' }}>{latency}</div>
        </div>
      </div>
      {component.note && <div className="mini-note">{component.note}</div>}
      <div className="mini-note">{opsMeasurement(component.measurement_kind)}<br />Comprobado: {opsDate(component.checked_at)} · Santiago</div>
    </div>
  );
}
