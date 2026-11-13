import { apiFetch } from './client';

export interface SystemNotice { version: number | null; enabled: boolean; title: string; body: string }
export async function fetchSystemNotice(signal?: AbortSignal): Promise<SystemNotice> {
  const response = await apiFetch('/runtime/notice', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo actualizar el aviso del sistema.');
  return response.json();
}
