import { apiFetch } from './client';

export interface AuditEntry {
  id: string;
  actor: { admin_id: string | null; name: string | null; role: string | null };
  action: string;
  action_label: string;
  module_label: string;
  entity_name: string;
  entity_type: string | null;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: { source?: string; outcome?: string; path?: string; method?: string;
    status_code?: number; duration_ms?: number; request_id?: string; view?: string;
    control?: string; occurred_at?: string };
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditFilters {
  q: string;
  actor_id: string;
  action: string;
  date_from: string;
  date_to: string;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  page_size: number;
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  q: '', actor_id: '', action: '', date_from: '', date_to: '',
};

function queryFor(filters: AuditFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) params.set(key, key.startsWith('date_') ? new Date(value).toISOString() : value.trim());
  }
  return params;
}

async function checkResponse(response: Response) {
  if (response.ok) return;
  const body = await response.json().catch(() => null);
  throw new Error(body?.error?.message || body?.detail || 'No fue posible consultar la auditoría.');
}

export async function fetchAudit(filters: AuditFilters, page: number, pageSize: number, signal?: AbortSignal): Promise<AuditPage> {
  const params = queryFor(filters);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  const response = await apiFetch(`/audit-log?${params}`, { signal });
  await checkResponse(response);
  const data: AuditPage = await response.json();
  return { ...data, items: data.items.map(entry => ({ ...entry, metadata: entry.metadata || {} })) };
}

export async function fetchAuditUsers(signal?: AbortSignal): Promise<{ id: string; full_name: string }[]> {
  const response = await apiFetch('/users?page_size=100', { signal });
  await checkResponse(response);
  return (await response.json()).items;
}

export async function exportAudit(filters: AuditFilters): Promise<Blob> {
  const response = await apiFetch(`/audit-log/export?${queryFor(filters)}`);
  await checkResponse(response);
  return response.blob();
}
