import { apiFetch } from './client';

export type ModerationType = 'review' | 'caregiver_profile' | 'photo' | 'chat_message';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type RejectReason = 'offensive' | 'spam' | 'privacy' | 'off_topic' | 'other';

export interface ModerationItem {
  id: string;
  type: ModerationType;
  status: ModerationStatus;
  author?: { name: string } | null;
  reported_by?: { name: string } | null;
  report_reason?: string | null;
  content?: unknown;
  created_at: string;
  is_safety?: boolean;
  content_available?: boolean;
  decision_note?: string | null;
  reject_reason_code?: RejectReason | null;
  decided_by_name?: string | null;
  decided_at?: string | null;
}

export interface ModerationQueueResponse {
  items: ModerationItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ModerationListParams {
  status: string;
  type?: string;
  page?: number;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchModerationQueue(params: ModerationListParams): Promise<ModerationQueueResponse> {
  const query = new URLSearchParams({ page: String(params.page ?? 1), page_size: '25', status: params.status });
  if (params.type) query.set('type', params.type);
  const response = await apiFetch(`/moderation/queue?${query}`);
  if (!response.ok) throw new Error('No fue posible cargar la cola de moderación.');
  return response.json();
}

export type ModerationDecision = { decision: 'approve'; note?: string } | { decision: 'reject'; reason_code: RejectReason; note?: string };
export async function decideModeration(itemId: string, input: ModerationDecision): Promise<void> {
  const { decision, ...payload } = input;
  const response = await apiFetch(`/moderation/queue/${itemId}/${decision}`, { method: 'POST', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible resolver el elemento.'));
}
