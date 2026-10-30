import { apiFetch } from './client';
import type { OpsIncident, OpsIncidents } from './operational';

export interface IncidentFilters { days: number; status: string; component: string; page: number; page_size: number }
export interface IncidentCreate {
  title: string; description: string; severity: string; started_at: string;
  component_key: string | null; is_maintenance: boolean;
}
export interface IncidentUpdate { description?: string; resolution?: string; status?: string }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'No fue posible consultar o guardar el incidente.');
  }
  return response.json() as Promise<T>;
}
export function fetchIncidents(filters: IncidentFilters) {
  const params = new URLSearchParams({ days: String(filters.days), page: String(filters.page), page_size: String(filters.page_size) });
  if (filters.status) params.set('status', filters.status);
  if (filters.component) params.set('component', filters.component);
  return request<OpsIncidents>(`/ops/incidents?${params}`);
}
export const createIncident = (body: IncidentCreate) => request<OpsIncident>('/ops/incidents', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
export const updateIncident = (id: string, body: IncidentUpdate) => request<OpsIncident>(`/ops/incidents/${encodeURIComponent(id)}`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
