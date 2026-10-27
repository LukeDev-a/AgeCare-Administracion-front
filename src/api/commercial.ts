import { apiFetch } from './client';

export interface CommercialMetadata {
  data_origin: string;
  computed_at: string | null;
  freshness: { status: string; calculation_stale: boolean; sources: {
    name: string; updated_at: string | null; available_through: string | null; missing: boolean; stale: boolean;
  }[] } | null;
}
export interface CommercialPeriod { key: string; start_date: string; end_date: string }
export interface CommercialSummary extends CommercialMetadata {
  period: CommercialPeriod;
  as_of: string | null;
  downloads: number | null;
  new_users: number | null;
  churned_users: number | null;
  churn_rate: number | null;
  active_users: number | null;
  paying_users: number | null;
  paying_share: number | null;
  mrr_clp: number | null;
  deltas: {
    new_users_pct: number | null;
    active_users_pct: number | null;
    mrr_pct: number | null;
  };
}

export interface CommercialRegistrations extends CommercialMetadata {
  period: CommercialPeriod;
  granularity: string;
  buckets: { label: string; start: string; end: string }[];
  signups: (number | null)[];
  cancellations: (number | null)[];
}

export interface CommercialPlan {
  name: string;
  plan_code: string;
  users: number;
  share: number | null;
  price_clp: number | null;
  mrr_clp: number | null;
  monthly_churn: number;
}

export interface CommercialPlans extends CommercialMetadata {
  as_of: string;
  plans: CommercialPlan[];
  totals: { users: number; mrr_clp: number; monthly_churn: number | null };
}

export interface FunnelStage {
  stage: string;
  name: string;
  users: number | null;
  rate_vs_first: number | null;
  rate_vs_previous: number | null;
  unavailable_reason: string | null;
}

export interface CommercialFunnel extends CommercialMetadata {
  stages: FunnelStage[];
  as_of: string | null;
  cutoff_at: string | null;
  cohort_month: string | null;
  provisional: boolean;
  accounts: number;
  observed_accounts: number;
  cohorts: { month: string; accounts: number; observed_accounts: number; provisional: boolean }[];
  downloads: number | null;
  downloads_as_of: string | null;
  downloads_computed_at: string | null;
  downloads_data_origin: string;
  downloads_stale: boolean;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message ?? 'No fue posible cargar los datos de uso comercial.');
  }
  return response.json() as Promise<T>;
}

export const fetchCommercialSummary = (period: string) =>
  getJson<CommercialSummary>(`/metrics/commercial/summary?period=${period}`);

export const fetchCommercialRegistrations = (period: string) =>
  getJson<CommercialRegistrations>(`/metrics/commercial/registrations?period=${period}`);

export const fetchCommercialPlans = () => getJson<CommercialPlans>('/metrics/commercial/plans');

export const fetchCommercialFunnel = (month?: string) => getJson<CommercialFunnel>(
  '/metrics/commercial/funnel' + (month ? `?cohort_month=${encodeURIComponent(month)}` : ''));
