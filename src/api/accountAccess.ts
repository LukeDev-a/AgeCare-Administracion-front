import { API_BASE_URL, apiFetch, publicFetch } from './client';

export interface MfaSetup { secret: string | null; qr_data_url: string | null; mfa_required?: boolean }
export interface RecoveryResult { recovery_codes: string[]; mfa_enabled?: boolean }
export interface InvitationInfo { full_name: string; email: string; role: string; mfa_required: boolean; expires_at: string }
export interface StaffPolicy { mfa_required_roles: string[]; allowed_email_domains: string[]; invitation_hours: number }

export async function accessRequest<T>(path: string, body?: unknown, authenticated = false, signal?: AbortSignal): Promise<T> {
  const options: RequestInit = { method: body === undefined ? 'GET' : 'POST', signal, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) };
  const response = authenticated ? await apiFetch(path, options) : await publicFetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || 'No se pudo completar la operación. Revisa los datos e intenta nuevamente.');
  return data;
}
export const inspectInvitation = (token: string, signal?: AbortSignal) => accessRequest<InvitationInfo>('/auth/invitations/inspect', { token }, false, signal);
export const setupInvitation = (token: string, enable_mfa: boolean, signal?: AbortSignal) => accessRequest<MfaSetup>('/auth/invitations/setup', { token, enable_mfa }, false, signal);
export const acceptInvitation = (token: string, password: string, enable_mfa: boolean, otp_code?: string) => accessRequest<RecoveryResult>('/auth/invitations/accept', { token, password, enable_mfa, otp_code });
export const setupEnrollment = (token: string, signal?: AbortSignal) => accessRequest<MfaSetup>('/auth/mfa/enrollment/setup', { token }, false, signal);
export const confirmEnrollment = (token: string, otp_code: string) => accessRequest<RecoveryResult>('/auth/mfa/enrollment/confirm', { token, otp_code });
export const resendInvitation = (id: string) => accessRequest(`/users/${id}/invitation/resend`, {}, true);
export const cancelInvitation = (id: string) => accessRequest(`/users/${id}/invitation/cancel`, {}, true);
export const fetchStaffPolicy = (signal?: AbortSignal) => accessRequest<StaffPolicy>('/users/policy', undefined, true, signal);
export const requestPasswordReset = (email: string) => accessRequest<{ message: string }>('/auth/password-reset/request', { email });
export const confirmPasswordReset = (token: string, password: string) => accessRequest<{ changed: boolean }>('/auth/password-reset/confirm', { token, password });
