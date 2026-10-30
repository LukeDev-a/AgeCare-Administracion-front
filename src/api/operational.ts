import { apiFetch } from './client';

export type OpsStatusKey = 'operational' | 'degraded' | 'outage';
export type OpsWindow = '1h' | '24h' | '7d';

export interface OpsComponent {
  key: string;
  name: string;
  status: OpsStatusKey;
  uptime_30d: number;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  note?: string | null;
  checked_at: string;
  data_origin: string;
  measurement_kind: string;
}

export interface OpsStatus {
  overall: OpsStatusKey | null;
  checked_at: string | null;
  components: OpsComponent[];
}

export interface LatencyComponent {
  key: string;
  name: string;
  p50_ms: number;
  p95_ms: number;
  sample_count: number;
  computed_at: string;
  data_origin: string;
  measurement_kind: string;
}

export interface OpsLatency {
  window: OpsWindow;
  components: LatencyComponent[];
  missing_components: string[];
  computed_at: string | null;
}

export interface OpsIncident {
  id: string;
  title: string;
  description: string;
  started_at: string;
  status: 'resolved' | 'completed' | string;
  component_key: string | null;
  severity: string;
  resolution: string | null;
  is_maintenance: boolean;
  resolved_at: string | null;
  created_by: string | null;
  updated_at: string;
  notification_status: string;
}

export interface OpsIncidents {
  items: OpsIncident[];
  total: number;
  page: number;
  page_size: number;
}

export interface CriticalProcess {
  key: string;
  name: string;
  chain: string;
  p95_seconds: number;
  success_24h: number;
  status: OpsStatusKey;
  computed_at: string;
  data_origin: string;
  execution_kind: string;
}

export interface CriticalProcesses {
  processes: CriticalProcess[];
  computed_at: string | null;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'No fue posible cargar el estado operativo.');
  }
  return response.json() as Promise<T>;
}

export const fetchOpsStatus = () => getJson<OpsStatus>('/ops/status');
export const fetchOpsLatency = (window: OpsWindow = '1h', components: string[] = []) => {
  const params = new URLSearchParams({ window });
  components.forEach(key => params.append('components', key));
  return getJson<OpsLatency>(`/ops/latency?${params}`);
};
export const fetchOpsIncidents = () => getJson<OpsIncidents>('/ops/incidents?days=30');
export const fetchCriticalProcesses = () => getJson<CriticalProcesses>('/ops/critical-processes');
