import type { OpsComponent } from '../../api/operational';
import { fmt, formatUptime } from '../../lib/format';
import { getOpsStatus } from '../../lib/statusMeta';

export function OpsComponentCard({ component }: { component: OpsComponent }) {
  const status = getOpsStatus(component.status);
  const latency =
    component.latency_p95_ms == null
      ? 'No disponible'
      : `p50 ${fmt(component.latency_p50_ms ?? 0)} ms · p95 ${fmt(component.latency_p95_ms)} ms`;

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div className="card-title">{component.name}</div>
          <div className="card-sub">{component.key}</div>
        </div>
        <span className={`chip ${status.className}`}>{status.label}</span>
      </div>
      <div style={{ display: 'flex', gap: 22, marginTop: 14 }}>
        <div>
          <div className="kpi-label">Uptime 30 d</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3 }}>{formatUptime(component.uptime_30d)}</div>
        </div>
        <div>
          <div className="kpi-label">Latencia</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: 'var(--ink-soft)' }}>{latency}</div>
        </div>
      </div>
      {component.note && <div className="mini-note">{component.note}</div>}
    </div>
  );
}