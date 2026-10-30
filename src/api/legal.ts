import { apiFetch } from './client';

export type LegalDocType = 'terms' | 'privacy';
export interface LegalVersion {
  version_id: string;
  doc_type: LegalDocType;
  semver: string;
  status: 'draft' | 'published';
  display_state: 'draft' | 'scheduled' | 'current' | 'historical';
  effective_date: string;
  effective_at: string;
  published_at: string | null;
  requires_reacceptance: boolean;
  content_md: string;
  changelog: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}
export interface LegalDocuments {
  documents: { doc_type: LegalDocType; current: { version_id: string; semver: string } | null; versions: LegalVersion[] }[];
  computed_at: string;
  timezone: string;
  earliest_major_effective_date: string;
}
export interface LegalDraftInput {
  semver: string;
  content_md: string;
  changelog: string;
  effective_date: string;
}
export type LegalVersionSummary = Pick<LegalVersion, 'version_id' | 'doc_type' | 'semver' | 'status' | 'effective_date' | 'effective_at' | 'published_at' | 'requires_reacceptance'>;

async function result<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    let message = fallback;
    try { message = (await response.json())?.error?.message ?? fallback; } catch { /* Mantener mensaje de contexto. */ }
    throw new Error(message);
  }
  return response.json();
}
export async function fetchLegalDocuments(type?: LegalDocType): Promise<LegalDocuments> {
  const response = await apiFetch(`/legal/documents${type ? `?doc_type=${type}` : ''}`);
  return result(response, 'No fue posible consultar los documentos legales.');
}
export async function createLegalDraft(type: LegalDocType, input: LegalDraftInput): Promise<LegalVersionSummary> {
  const response = await apiFetch(`/legal/documents/${type}/versions`, { method: 'POST', body: JSON.stringify(input) });
  return result(response, 'No fue posible crear el borrador.');
}
export async function publishLegalVersion(id: string): Promise<LegalVersionSummary> {
  const response = await apiFetch(`/legal/versions/${encodeURIComponent(id)}/publish`, { method: 'POST' });
  return result(response, 'No fue posible publicar la versión.');
}
