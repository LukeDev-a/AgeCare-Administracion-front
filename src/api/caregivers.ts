import { apiFetch } from './client';

export type CaregiverStatus = 'pending' | 'approved' | 'suspended';

export interface Caregiver {
  caregiver_id: string;
  name: string;
  zone: string;
  specialties: string[];
  languages: string[];
  certifications_count: number;
  reviews_count: number;
  rating_avg: number | null;
  status: CaregiverStatus;
  submitted_at: string;
}

export interface CaregiversListResponse {
  items: Caregiver[];
  total: number;
  page: number;
}

export interface CaregiverListParams {
  search?: string;
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

export async function fetchCaregivers(params: CaregiverListParams): Promise<CaregiversListResponse> {
  const query = new URLSearchParams({ page: '1', page_size: '25' });
  if (params.search) query.set('q', params.search);
  if (params.status) query.set('status', params.status);
  const response = await apiFetch(`/marketplace/caregivers?${query}`);
  if (!response.ok) throw new Error('No fue posible cargar los perfiles de cuidadoras.');
  return response.json();
}

export async function updateCaregiverStatus(caregiverId: string, status: CaregiverStatus): Promise<void> {
  const payload: { status: CaregiverStatus; reason?: string } = { status };
  if (status === 'suspended') payload.reason = 'Perfil suspendido durante la revisión administrativa.';
  const response = await apiFetch(`/marketplace/caregivers/${caregiverId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible actualizar el perfil.'));
}