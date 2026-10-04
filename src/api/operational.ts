import { apiFetch } from './client';

export type OpsStatusKey = 'operational' | 'degraded' | 'outage';

export interface OpsComponent {
  key: string;
  name: string;
  status: OpsStatusKey;
  uptime_30d: number;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  note?: string | null;
}

export interface OpsStatus {
  overall: OpsStatusKey;
  checked_at: string;
  components: OpsComponent[];
}

export interface LatencyComponent {
  name: string;
  p95_ms: number;
}

export interface OpsLatency {
  components: LatencyComponent[];
}

export interface OpsIncident {
  title: string;
  description: string;
  started_at: string;
  status: 'resolved' | 'completed' | string;
}

export interface OpsIncidents {
  items: OpsIncident[];
}

export interface CriticalProcess {
  name: string;
  chain: string;
  p95_seconds: number;
  success_24h: number;
  status: OpsStatusKey;
}

export interface CriticalProcesses {
  processes: CriticalProcess[];
}

async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error('No fue posible cargar el estado operativo.');
  return response.json() as Promise<T>;
}

export const fetchOpsStatus = () => getJson<OpsStatus>('/ops/status');
export const fetchOpsLatency = () => getJson<OpsLatency>('/ops/latency?window=1h');
export const fetchOpsIncidents = () => getJson<OpsIncidents>('/ops/incidents?days=30');
export const fetchCriticalProcesses = () => getJson<CriticalProcesses>('/ops/critical-processes');