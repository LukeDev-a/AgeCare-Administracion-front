import { apiFetch } from './client';

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

async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'No fue posible cargar usuarios y soporte.');
  }
  return response.json() as Promise<T>;
}

export const fetchRolesSummary = (days = 30) => getJson<RolesSummary>(`/metrics/roles/summary?days=${encodeURIComponent(days)}`);
export const fetchRolesWeekly = (weeks = 8) => getJson<RolesWeekly>(`/metrics/roles/weekly-active?weeks=${encodeURIComponent(weeks)}`);
export const fetchSupportSummary = () => getJson<SupportSummary>('/support/summary');
export const fetchTicketsByCategory = (days = 30) => getJson<TicketsByCategory>(`/support/tickets/by-category?days=${encodeURIComponent(days)}`);
export const fetchRecentTickets = () => getJson<TicketsList>('/support/tickets?page=1&page_size=6&order=-created_at');
