import { apiFetch } from './client';
import type { ActivityRequestInit } from '../lib/requestActivity';

export type RoleKey = 'family' | 'caregiver' | 'elder' | 'doctor';

export interface RoleSummaryItem {
  role: RoleKey;
  active_users: number;
  growth_8w: number;
  sessions_per_week: number;
  avg_session_seconds: number;
  retention_30d: number;
}

export interface RolesSummary {
  data_through?: string | null;
  days: number;
  computed_at: string;
  roles: RoleSummaryItem[];
}

export interface WeeklyPeriod {
  start_date: string;
  end_date: string;
  is_current_week: boolean;
}

export interface RolesWeekly {
  data_through?: string | null;
  computed_at: string;
  week_details?: WeeklyPeriod[];
  weeks: string[];
  series: { role: RoleKey; values: number[] }[];
}

export interface SupportSummary {
  computed_at: string;
  open: number;
  in_progress: number;
  waiting_user: number;
  resolved_30d: number;
  first_response_hours_avg: number;
  csat_avg: number | null;
  csat_count: number;
  deltas: {
    open_wow: number;
    resolved_mom_pct: number | null;
    first_response_mom_hours: number | null;
  };
}

export interface TicketCategory {
  category: string;
  name: string;
  count: number;
  share: number;
}

export interface TicketsByCategory {
  days: number;
  total: number;
  categories: TicketCategory[];
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TicketSummaryItem {
  number: number;
  subject: string;
  requester: { role: RoleKey | string | null };
  priority: TicketPriority;
  status: TicketStatus;
}

export interface TicketsList {
  items: TicketSummaryItem[];
}

async function getJson<T>(path: string, options?: ActivityRequestInit): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'No fue posible cargar usuarios y soporte.');
  }
  return response.json() as Promise<T>;
}

export const fetchRolesSummary = (days = 30, options?: ActivityRequestInit) => getJson<RolesSummary>(`/metrics/roles/summary?days=${encodeURIComponent(days)}`, options);
export const fetchRolesWeekly = (weeks = 8, options?: ActivityRequestInit) => getJson<RolesWeekly>(`/metrics/roles/weekly-active?weeks=${encodeURIComponent(weeks)}`, options);
export const fetchSupportSummary = (options?: ActivityRequestInit) => getJson<SupportSummary>('/support/summary', options);
export const fetchTicketsByCategory = (days = 30, options?: ActivityRequestInit) => getJson<TicketsByCategory>(`/support/tickets/by-category?days=${encodeURIComponent(days)}`, options);
export const fetchRecentTickets = (options?: ActivityRequestInit) => getJson<TicketsList>('/support/tickets?page=1&page_size=6&order=-created_at', options);
