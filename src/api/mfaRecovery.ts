import { accessRequest } from './accountAccess';

export interface MfaRecoveryRequest {
  id: string; admin_id: string; full_name: string; email: string; reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  confirmed_at: string; expires_at: string; decided_at: string | null;
  decided_by_name: string | null; decision_note: string | null; can_decide: boolean;
}
export const requestMfaRecovery = (email: string, password: string, reason: string) =>
  accessRequest('/auth/mfa-recovery/request', { email, password, reason });
export const confirmMfaRecovery = (token: string) => accessRequest('/auth/mfa-recovery/confirm', { token });
export const fetchMfaRecoveries = (page: number, signal?: AbortSignal) =>
  accessRequest<{ total: number; items: MfaRecoveryRequest[] }>(`/mfa-recovery/requests?page=${page}`, undefined, true, signal);
export const decideMfaRecovery = (id: string, body: {
  decision: 'approve' | 'reject'; identity_verified: boolean; note: string; password: string; otp_code?: string;
}) => accessRequest(`/mfa-recovery/requests/${encodeURIComponent(id)}/decision`, body, true);
