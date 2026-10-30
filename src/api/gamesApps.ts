import { apiFetch } from './client';

export type GameAppType = 'game' | 'app';
export type GameAppTier = 'gratuito' | 'dorado' | 'platino';

export interface GameAppItem {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  item_type: GameAppType;
  category: string;
  min_tier: GameAppTier;
  is_active: boolean;
  featured: boolean;
  target_url?: string | null;
  resource_kind?: 'local' | 'external';
  created_at?: string;
  updated_at?: string;
  created_by_name?: string | null;
}

export interface ActiveGamesOut {
  items: GameAppItem[];
  count: number;
  updated_at: string;
}

export interface GameAppPayload {
  title: string;
  slug: string;
  description?: string;
  item_type: GameAppType;
  category: string;
  min_tier: GameAppTier;
  is_active: boolean;
  featured: boolean;
  target_url?: string;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data?.detail === 'string' ? data.detail : data?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchGamesApps(itemType: string, state = ''): Promise<GameAppItem[]> {
  const query = new URLSearchParams();
  if (itemType !== 'all') query.set('item_type', itemType);
  if (state) query.set('is_active', state);
  const path = `/games-apps/?${query}`;
  const response = await apiFetch(path);
  if (!response.ok) throw new Error('No fue posible cargar el catálogo de juegos y apps.');
  const data = await response.json();
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function fetchActiveGamesApps(): Promise<GameAppItem[]> {
  const response = await apiFetch('/games-apps/active');
  if (!response.ok) throw new Error('No fue posible cargar los módulos activos.');
  return response.json();
}

export async function createGameApp(payload: GameAppPayload): Promise<void> {
  const response = await apiFetch('/games-apps/', { method: 'POST', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible crear el elemento.'));
}

export async function updateGameApp(id: string, payload: Partial<GameAppPayload>): Promise<void> {
  const response = await apiFetch(`/games-apps/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible guardar los cambios.'));
}

export async function deleteGameApp(id: string): Promise<void> {
  const response = await apiFetch(`/games-apps/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible eliminar el elemento.'));
}

export async function toggleGameAppStatus(id: string): Promise<void> {
  const response = await apiFetch(`/games-apps/${id}/toggle`, { method: 'POST' });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible cambiar el estado.'));
}
