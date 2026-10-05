import { apiFetch } from './client';

export type StaffRole = 'admin' | 'analyst' | 'support' | 'editor' | 'moderator';
export interface StaffAccount {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
  mfa_enabled: boolean;
  mfa_required: boolean;
  account_status: 'active' | 'inactive' | 'pending' | 'expired' | 'cancelled';
  invitation_expires_at: string | null;
  invitation_delivery_status: string | null;
  created_at: string;
  last_login_at: string | null;
}
export interface StaffFilters { q: string; role: string; is_active: string; account_status?: string }
export interface StaffPage { items: StaffAccount[]; total: number; page: number; page_size: number }
export interface StaffInput { full_name: string; email: string; role: StaffRole; is_active?: boolean }
export interface StaffCreateInput extends StaffInput { require_mfa: boolean }

async function check(response: Response) {
  if (response.ok) return;
  const data = await response.json().catch(() => null);
  throw new Error(data?.error?.message || (typeof data?.detail === 'string' ? data.detail : 'Revisa los datos de la cuenta e intenta nuevamente.'));
}
export async function fetchStaff(filters: StaffFilters, page: number, signal?: AbortSignal): Promise<StaffPage> {
  const params = new URLSearchParams({ page: String(page), page_size: '25' });
  for (const [key, value] of Object.entries(filters)) if (value.trim()) params.set(key, value.trim());
  const response = await apiFetch(`/users?${params}`, { signal });
  await check(response);
  return response.json();
}
export async function createStaff(input: StaffCreateInput) {
  const response = await apiFetch('/users', { method: 'POST', body: JSON.stringify(input) });
  await check(response);
  return response.json();
}
export async function updateStaff(id: string, input: StaffInput): Promise<StaffAccount> {
  const response = await apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  await check(response);
  return response.json();
}
export async function deleteStaff(id: string): Promise<void> {
  const response = await apiFetch(`/users/${id}`, { method: 'DELETE' });
  await check(response);
}
