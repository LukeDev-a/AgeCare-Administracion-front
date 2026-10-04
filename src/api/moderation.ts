import { apiFetch } from './client';

export type ModerationType = 'review' | 'caregiver_profile' | 'photo' | 'chat_message';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface ModerationItem {
  id: string;
  type: ModerationType;
  status: ModerationStatus;
  author?: { name: string } | null;
  reported_by?: { name: string } | null;
  report_reason?: string | null;
  content?: unknown;
  created_at: string;
}

export interface ModerationQueueResponse {
  items: ModerationItem[];
  total: number;
  page: number;
}

export interface ModerationListParams {
  status: string;
  type?: string;
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
  const query = new URLSearchParams({ page: '1', page_size: '25', status: params.status });
  if (params.type) query.set('type', params.type);
  const response = await apiFetch(`/moderation/queue?${query}`);
  if (!response.ok) throw new Error('No fue posible cargar la cola de moderación.');
  return response.json();
}

export async function decideModeration(itemId: string, decision: 'approve' | 'reject'): Promise<void> {
  const payload =
    decision === 'approve'
      ? { note: 'Aprobado desde la consola administrativa.' }
      : { reason_code: 'other', note: 'Rechazado durante la revisión administrativa.' };
  const response = await apiFetch(`/moderation/queue/${itemId}/${decision}`, { method: 'POST', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible resolver el elemento.'));
}