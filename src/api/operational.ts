import { apiFetch } from './client';
import type { ActivityRequestInit } from '../lib/requestActivity';

export type OpsStatusKey = 'operational' | 'degraded' | 'outage';
export type OpsWindow = '1h' | '24h' | '7d';

export interface OpsObservations {
  sample_count?: number;
  successful_sample_count?: number;
  first_observed_at?: string | null;
  last_observed_at?: string | null;
  observed_success_rate?: number | null;
  coverage_seconds?: number | null;
  coverage_ratio?: number | null;
  sample_window?: OpsWindow;
  freshness?: 'no_data' | 'fresh' | 'stale' | 'not_integrated' | 'stored';
  measurement_source?: 'http_requests' | 'database_probe' | null;
  minimum_samples?: number;
}

export interface OpsComponent extends OpsObservations {
  key: string;
  name: string;
  status: OpsStatusKey | null;
  uptime_30d: number | null;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  note?: string | null;
  checked_at: string | null;
  data_origin: string;
  measurement_kind: string;
}

export interface OpsStatus {
  monitoring_enabled?: boolean;
  sample_window?: OpsWindow;
  overall: OpsStatusKey | null;
  checked_at: string | null;
  components: OpsComponent[];
}

export interface LatencyComponent extends OpsObservations {
  key: string;
  name: string;
  p50_ms: number | null;
  p95_ms: number | null;
  sample_count: number;
  computed_at: string | null;
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

async function getJson<T>(path: string, options?: ActivityRequestInit): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'No fue posible cargar el estado operativo.');
  }
  return response.json() as Promise<T>;
}

export const fetchOpsStatus = (options?: ActivityRequestInit) => getJson<OpsStatus>('/ops/status', options);
export const fetchOpsLatency = (window: OpsWindow = '1h', components: string[] = [], options?: ActivityRequestInit) => {
  const params = new URLSearchParams({ window });
  components.forEach(key => params.append('components', key));
  return getJson<OpsLatency>(`/ops/latency?${params}`, options);
};
export const fetchOpsIncidents = () => getJson<OpsIncidents>('/ops/incidents?days=30');
export const fetchCriticalProcesses = (options?: ActivityRequestInit) => getJson<CriticalProcesses>('/ops/critical-processes', options);
