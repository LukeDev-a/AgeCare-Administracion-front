import { apiFetch } from './client';

export type MobileProfile = 'family' | 'caregiver' | 'doctor' | 'elder';
export interface DemoSource { data_origin: 'demo'; deactivation_effect: 'demo_only' }
export interface EndUserSummary extends DemoSource {
  user_id: string; full_name: string; email: string; is_active: boolean; memberships_count: number;
}
export interface Membership { patient_id: string; patient_name: string; role: MobileProfile; is_owner: boolean }
export interface EndUserDetail extends EndUserSummary {
  memberships: Membership[]; deactivated_at: string | null; deactivation_reason: string | null;
}
export interface PatientSummary extends DemoSource { patient_id: string; full_name: string; members_count: number }
export interface PatientMember { user_id: string; full_name: string; email: string; role: MobileProfile; is_owner: boolean; is_active: boolean }
export interface PatientDetail extends PatientSummary { members: PatientMember[] }
export interface DirectoryPage<T> extends DemoSource { items: T[]; total: number; page: number; page_size: number }
export interface DeactivationResult extends DemoSource { user: EndUserDetail; mobile_sessions_revoked: false }

async function read<T extends DemoSource>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || 'No fue posible consultar usuarios y pacientes.');
  }
  const result = await response.json();
  if (result.data_origin !== 'demo' || result.deactivation_effect !== 'demo_only') {
    throw new Error('La procedencia de estos datos no es compatible con esta versión del módulo.');
  }
  return result as T;
}

export async function fetchEndUsers(q: string, state: string, page: number, signal?: AbortSignal): Promise<DirectoryPage<EndUserSummary>> {
  const params = new URLSearchParams({ page: String(page), page_size: '25' });
  if (q.trim()) params.set('q', q.trim());
  if (state) params.set('is_active', state);
  return read(await apiFetch(`/end-users?${params}`, { signal }));
}
export async function fetchPatients(q: string, page: number, signal?: AbortSignal): Promise<DirectoryPage<PatientSummary>> {
  const params = new URLSearchParams({ page: String(page), page_size: '25' });
  if (q.trim()) params.set('q', q.trim());
  return read(await apiFetch(`/patients?${params}`, { signal }));
}
export async function fetchEndUser(id: string, signal?: AbortSignal): Promise<EndUserDetail> {
  return read(await apiFetch(`/end-users/${encodeURIComponent(id)}`, { signal }));
}
export async function fetchPatient(id: string, signal?: AbortSignal): Promise<PatientDetail> {
  return read(await apiFetch(`/patients/${encodeURIComponent(id)}`, { signal }));
}
export async function deactivateEndUser(id: string, reason: string): Promise<DeactivationResult> {
  const result = await read<DeactivationResult>(await apiFetch(`/end-users/${encodeURIComponent(id)}/deactivate`, {
    method: 'POST', body: JSON.stringify({ confirmation_user_id: id, reason: reason.trim() }),
  }));
  if (result.mobile_sessions_revoked !== false) throw new Error('No fue posible validar la respuesta de desactivación.');
  return result;
}
