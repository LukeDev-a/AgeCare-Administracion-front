import { CHART_COLORS } from './colors';
import type { TicketStatus } from '../api/tickets';

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'resolved'],
  in_progress: ['waiting_user', 'resolved'],
  waiting_user: ['in_progress', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: [],
};

export const TICKET_STATUS_META: Record<string, { className: string; icon: string; label: string }> = {
  open: { className: 'neutral', icon: '●', label: 'Abierto' },
  in_progress: { className: 'warn', icon: '▲', label: 'En curso' },
  waiting_user: { className: 'serious', icon: '●', label: 'Esperando usuario' },
  resolved: { className: 'ok', icon: '✔', label: 'Resuelto' },
  closed: { className: 'neutral', icon: '●', label: 'Cerrado' },
};

export const TICKET_PRIORITY_META: Record<string, { className: string; label: string }> = {
  low: { className: 'neutral', label: '◆ Baja' },
  medium: { className: 'neutral', label: '◆ Media' },
  high: { className: 'serious', label: '◆ Alta' },
  critical: { className: 'crit', label: '◆ Crítica' },
};

export const CATEGORY_COLORS: Record<string, string> = {
  account_access: CHART_COLORS.s1,
  wearable_sync: CHART_COLORS.s2,
  alerts_push: CHART_COLORS.s3,
  billing_plans: CHART_COLORS.s4,
  medications: CHART_COLORS.s5,
  other: CHART_COLORS.neutral,
};

export const TICKET_CATEGORY_NAMES: Record<string, string> = {
  account_access: 'Acceso y cuenta',
  wearable_sync: 'Wearable y sincronización',
  alerts_push: 'Alertas y push',
  billing_plans: 'Pagos y planes',
  medications: 'Medicamentos',
  other: 'Otros',
};
