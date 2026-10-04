import { apiFetch } from './client';

export interface CommercialSummary {
  downloads: number;
  new_users: number;
  churned_users: number;
  churn_rate: number;
  active_users: number;
  paying_users: number;
  paying_share: number;
  mrr_clp: number;
  deltas: {
    new_users_pct: number | null;
    active_users_pct: number | null;
    mrr_pct: number | null;
  };
}

export interface CommercialRegistrations {
  buckets: { label: string }[];
  signups: number[];
  cancellations: number[];
}

export interface CommercialPlan {
  name: string;
  plan_code: string;
  users: number;
  share: number;
  price_clp: number | null;
  mrr_clp: number | null;
  monthly_churn: number;
}

export interface CommercialPlans {
  plans: CommercialPlan[];
  totals: { users: number; mrr_clp: number; monthly_churn: number };
}

export interface FunnelStage {
  name: string;
  users: number;
  rate_vs_first: number | null;
}

export interface CommercialFunnel {
  stages: FunnelStage[];
  as_of: string;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error('No fue posible cargar los datos de uso comercial.');
  return response.json() as Promise<T>;
}

export const fetchCommercialSummary = (period: string) =>
  getJson<CommercialSummary>(`/metrics/commercial/summary?period=${period}`);

export const fetchCommercialRegistrations = (period: string) =>
  getJson<CommercialRegistrations>(`/metrics/commercial/registrations?period=${period}`);

export const fetchCommercialPlans = () => getJson<CommercialPlans>('/metrics/commercial/plans');

export const fetchCommercialFunnel = () => getJson<CommercialFunnel>('/metrics/commercial/funnel');