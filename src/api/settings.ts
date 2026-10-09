import { apiFetch } from './client';

export type SettingValue = null | boolean | number | string | SettingValue[] | { [key: string]: SettingValue };
export interface ValueSchema {
  type?: string | string[]; title?: string; description?: string;
  properties?: Record<string, ValueSchema>; required?: string[];
  enum?: SettingValue[]; minimum?: number; maximum?: number;
  minLength?: number; maxLength?: number; additionalProperties?: boolean | ValueSchema;
  [key: string]: unknown;
}
export interface SystemSetting {
  key: string; description: string; value: SettingValue; schema: ValueSchema; version: number;
  updated_at: string | null; updated_by: { admin_id: string; name: string | null } | null;
}
export interface SettingInput { value: SettingValue; version: number; change_note: string }
export class SettingsError extends Error {
  code: string;
  details: { field: string; issue: string }[];
  constructor(message: string, code: string, details: { field: string; issue: string }[] = []) {
    super(message); this.code = code; this.details = details;
  }
}
async function read<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new SettingsError(data?.error?.message ?? 'No se pudo completar la operación.',
    data?.error?.code ?? 'REQUEST_FAILED', data?.error?.details ?? []);
  return data;
}
export async function fetchSettings(key?: string, signal?: AbortSignal): Promise<SystemSetting[]> {
  const query = key ? `?${new URLSearchParams({ key })}` : '';
  const data = await read<{ settings: SystemSetting[] }>(await apiFetch(`/settings${query}`, { signal, cache: 'no-store' }));
  return data.settings;
}
export async function updateSetting(key: string, input: SettingInput): Promise<SystemSetting> {
  return read<SystemSetting>(await apiFetch(`/settings/${encodeURIComponent(key)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }));
}
