import { apiFetch } from './client';

export type ContentType = 'news' | 'joke';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  audio_available: boolean;
  updated_at: string;
  tags: string[];
  body: string;
  publish_at: string | null;
  published_at: string | null;
  audio_status: string;
  audio_error: string | null;
  text_version: number;
  approved_version: number | null;
  provenance: { source: string; url: string; author?: string; license?: string; license_url?: string; changes?: string; rights_verified?: boolean } | null;
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ContentListParams {
  search?: string;
  type?: string;
  status?: string;
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

export async function fetchContent(params: ContentListParams): Promise<ContentListResponse> {
  const query = new URLSearchParams({ page: String(params.page ?? 1), page_size: '25' });
  if (params.search) query.set('q', params.search);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  const response = await apiFetch(`/content/items?${query}`);
  if (!response.ok) throw new Error('No fue posible cargar el contenido.');
  return response.json();
}

export async function createContent(payload: { type: string; title: string; body: string; tags: string[]; publish_at?: string | null }): Promise<void> {
  const response = await apiFetch('/content/items', { method: 'POST', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible crear el contenido.'));
}

export async function updateContent(contentId: string, payload: { title?: string; body?: string; tags?: string[]; publish_at?: string | null }): Promise<ContentItem> {
  const response = await apiFetch(`/content/items/${contentId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible guardar el contenido.'));
  return response.json();
}

export async function changeContentPublication(contentId: string, unpublish: boolean): Promise<void> {
  const response = await apiFetch(`/content/items/${contentId}/${unpublish ? 'unpublish' : 'publish'}`, { method: 'POST' });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible cambiar el estado.'));
}

export async function deleteContent(contentId: string): Promise<void> {
  const response = await apiFetch(`/content/items/${contentId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible eliminar el contenido.'));
}

export async function contentAction(id: string, action: 'approve' | 'audio/retry', version?: number) {
  const response = await apiFetch(`/content/items/${id}/${action}`, { method: 'POST', body: action === 'approve' ? JSON.stringify({ version }) : undefined });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No se pudo completar la acción.'));
  return response.json();
}
export async function fetchContentAudio(id: string) {
  const response = await apiFetch(`/content/items/${id}/audio`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'Audio no disponible.'));
  return response.blob();
}
export interface NewsCandidate {
  id: string; title: string; original_text: string; source_url: string; author: string | null;
  source_date: string | null; status: string; rights_status: string; source_changed: boolean;
  source_hash: string;
  editorial_note: string | null; classification: string | null; item_id: string | null;
  adaptation: { title: string; body: string; classification: string; changes: string; unsuitable: boolean } | null;
}
export interface EditorialJob {
  id: string; kind: string; status: string; error: string | null; created_at: string;
  result: { candidates?: number; duplicates?: number; changed?: number } | null;
}
async function editorialRequest<T>(path: string, body?: object): Promise<T> {
  const response = await apiFetch(`/content/${path}`, body === undefined ? { cache: 'no-store' }
    : { method: 'POST', body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No se pudo completar la solicitud editorial.'));
  return response.json();
}
export const fetchCandidates = (page: number) => editorialRequest<{ items: NewsCandidate[]; total: number }>(`candidates?page=${page}`);
export const fetchEditorialJobs = () => editorialRequest<{ items: EditorialJob[] }>('jobs');
export const fetchEditorialRuntime = () => editorialRequest<{ worker_enabled: boolean; gemini_ready: boolean }>('runtime');
export const requestCollection = () => editorialRequest('collect', {});
export const requestAdaptation = (id: string) => editorialRequest(`candidates/${id}/adapt`, {});
export const reviewCandidate = (id: string, action: string, note: string, source_hash: string) => editorialRequest(`candidates/${id}/review`, { action, note, source_hash });
export const createCandidateDraft = (id: string, title: string, body: string) => editorialRequest<ContentItem>(`candidates/${id}/draft`, { title, body });
