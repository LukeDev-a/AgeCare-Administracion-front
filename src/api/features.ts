import { apiFetch } from './client';
import type { ActivityRequestInit } from '../lib/requestActivity';

export interface AdoptionCalculation {
  role: string;
  applicable: boolean;
  status: 'calculated' | 'not_applicable' | 'not_calculable';
  reason: 'not_applicable' | 'missing_active_users' | 'no_active_users' | 'missing_usage' | 'invalid_data' | null;
  users: number | null;
  active_users: number | null;
}

export interface FeatureAdoptionRow {
  feature_key: string;
  name: string;
  adoption: (number | null)[];
  calculation_details?: AdoptionCalculation[];
}

export interface FeatureAdoption {
  data_through?: string | null;
  computed_at: string;
  days: number;
  roles: string[];
  features: FeatureAdoptionRow[];
}

export interface TopFeatureItem {
  feature_key: string;
  name: string;
  adoption: number;
}

export interface TopFeaturesByRole {
  role: string;
  features: TopFeatureItem[];
}

export interface TopFeatures {
  data_through?: string | null;
  calculable_only?: boolean;
  computed_at: string;
  top_by_role: TopFeaturesByRole[];
}

export interface FeatureAlert {
  feature_key: string;
  name: string;
  roles: string[];
  adoption: number[];
  expected_low: boolean;
  note?: string | null;
}

export interface FeatureAlerts {
  data_through?: string | null;
  calculable_only?: boolean;
  computed_at: string;
  threshold: number;
  alerts: FeatureAlert[];
}

async function getJson<T>(path: string, options?: ActivityRequestInit): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'No fue posible cargar el uso por funcionalidad.');
  }
  return response.json() as Promise<T>;
}

export const fetchFeatureAdoption = (days: number, options?: ActivityRequestInit) => getJson<FeatureAdoption>(`/metrics/features/adoption?days=${days}`, options);
export const fetchTopFeatures = (days: number, limit = 1, options?: ActivityRequestInit) => getJson<TopFeatures>(`/metrics/features/top?days=${days}&limit=${limit}`, options);
export const fetchFeatureAlerts = (days: number, threshold = 0.15, options?: ActivityRequestInit) => getJson<FeatureAlerts>(`/metrics/features/alerts?days=${days}&threshold=${threshold}`, options);
