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
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
  page: number;
}

export interface ContentListParams {
  search?: string;
  type?: string;
  status?: string;
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
  const query = new URLSearchParams({ page: '1', page_size: '25' });
  if (params.search) query.set('q', params.search);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  const response = await apiFetch(`/content/items?${query}`);
  if (!response.ok) throw new Error('No fue posible cargar el contenido.');
  return response.json();
}

export async function createContent(payload: { type: string; title: string; body: string; tags: string[] }): Promise<void> {
  const response = await apiFetch('/content/items', { method: 'POST', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible crear el contenido.'));
}

export async function updateContent(contentId: string, payload: { title: string; body: string; tags: string[] }): Promise<void> {
  const response = await apiFetch(`/content/items/${contentId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible guardar el contenido.'));
}

export async function changeContentPublication(contentId: string, unpublish: boolean): Promise<void> {
  const response = await apiFetch(`/content/items/${contentId}/${unpublish ? 'unpublish' : 'publish'}`, { method: 'POST' });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible cambiar el estado.'));
}

export async function deleteContent(contentId: string): Promise<void> {
  const response = await apiFetch(`/content/items/${contentId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible eliminar el contenido.'));
}