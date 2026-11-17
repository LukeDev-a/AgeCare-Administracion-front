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
export const fetchMfaRecoveries = (page: number, signal?: AbortSignal, background = false) =>
  accessRequest<{ total: number; items: MfaRecoveryRequest[] }>(`/mfa-recovery/requests?page=${page}`, undefined, true, signal, background);

export async function fetchPendingMfaCount(signal?: AbortSignal): Promise<number> {
  const first = await fetchMfaRecoveries(1, signal, true);
  if (!Number.isInteger(first.total) || first.total < 0 || !Array.isArray(first.items)) throw new Error('No se pudo consultar el contador MFA.');
  const ids = new Set<string>();
  function collect(items: MfaRecoveryRequest[]) {
    for (const item of items) if (item.status === 'pending' && item.can_decide) ids.add(item.id);
  }
  collect(first.items);
  const pages = Math.ceil(first.total / 25);
  for (let page = 2; page <= pages; page++) {
    const next = await fetchMfaRecoveries(page, signal, true);
    if (!Array.isArray(next.items)) throw new Error('No se pudo consultar el contador MFA.');
    collect(next.items);
    if (!next.items.length) break;
  }
  return ids.size;
}
export const decideMfaRecovery = (id: string, body: {
  decision: 'approve' | 'reject'; identity_verified: boolean; note: string; password: string; otp_code?: string;
}) => accessRequest(`/mfa-recovery/requests/${encodeURIComponent(id)}/decision`, body, true);
