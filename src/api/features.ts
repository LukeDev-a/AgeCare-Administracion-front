import { apiFetch } from './client';

export interface FeatureAdoptionRow {
  name: string;
  adoption: (number | null)[];
}

export interface FeatureAdoption {
  days: number;
  roles: string[];
  features: FeatureAdoptionRow[];
}

export interface TopFeatureItem {
  name: string;
  adoption: number;
}

export interface TopFeaturesByRole {
  role: string;
  features: TopFeatureItem[];
}

export interface TopFeatures {
  top_by_role: TopFeaturesByRole[];
}

export interface FeatureAlert {
  name: string;
  roles: string[];
  adoption: number[];
  expected_low: boolean;
  note?: string | null;
}

export interface FeatureAlerts {
  threshold: number;
  alerts: FeatureAlert[];
}

async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error('No fue posible cargar el uso por funcionalidad.');
  return response.json() as Promise<T>;
}

export const fetchFeatureAdoption = (days: number) => getJson<FeatureAdoption>(`/metrics/features/adoption?days=${days}`);
export const fetchTopFeatures = (days: number) => getJson<TopFeatures>(`/metrics/features/top?days=${days}&limit=1`);
export const fetchFeatureAlerts = (days: number) => getJson<FeatureAlerts>(`/metrics/features/alerts?days=${days}&threshold=0.15`);