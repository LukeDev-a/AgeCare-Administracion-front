import type { EndUserSummary } from '../../api/endUsers';

export type SubscriptionState = 'active' | 'past_due' | 'cancelled';
export type ChargeState = 'approved' | 'pending' | 'failed' | 'refunded';
export interface Entry { at: string; actor: string; description: string; reason: string }
export interface Subscription {
  id: string; code?: string; version?: number; userId: string; accountActive: boolean; name: string; email: string; plan: string; price: number;
  state: SubscriptionState; startedAt: string; endsAt: string; history: Entry[];
}
export interface Charge {
  id: string; code?: string; version?: number; userId: string; accountActive: boolean; subscriptionId: string; name: string; email: string; plan: string;
  amount: number; state: ChargeState; at: string; history: Entry[];
}
export interface PaymentData { subscriptions: Subscription[]; charges: Charge[] }
export type PaymentAction =
  | { type: 'cancel'; id: string; reason: string; actor: string }
  | { type: 'extend'; id: string; reason: string; actor: string; days: number }
  | { type: 'refund'; id: string; reason: string; actor: string };
export const SUBSCRIPTION_LABELS: Record<SubscriptionState, string> = {
  active: 'Activa', past_due: 'Pago pendiente', cancelled: 'Renovación cancelada',
};
export const CHARGE_LABELS: Record<ChargeState, string> = {
  approved: 'Aprobado', pending: 'Pendiente', failed: 'Rechazado', refunded: 'Reembolsado',
};
export const PLANS = ['Dorado', 'Platino', 'Proveedor'];
export const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
export const date = (value: string) => new Date(value).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' });
export function plusDays(value: string, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
}

export function initialPayments(accounts: readonly EndUserSummary[], now = new Date().toISOString()): PaymentData {
  // Solo las identidades proceden del directorio; planes, importes y movimientos siguen siendo ejemplos.
  const prices = [3990, 6990, 9990];
  const subscriptions: Subscription[] = [...accounts].sort((a, b) => a.user_id.localeCompare(b.user_id)).map((account, i) => ({
    id: `SUS-${String(i + 1).padStart(4, '0')}`, userId: account.user_id, accountActive: account.is_active,
    name: account.full_name, email: account.email,
    plan: PLANS[i % 3], price: prices[i % 3],
    state: !account.is_active || i === 5 || i === 10 ? 'cancelled' : i === 3 || i === 8 ? 'past_due' : 'active',
    startedAt: plusDays(now, -60 - i), endsAt: plusDays(now, i === 3 || i === 8 ? -2 : 2 + i * 2), history: [],
  }));
  const charges: Charge[] = subscriptions.flatMap((s, i) => [
    { id: `COB-${String(i * 2 + 1).padStart(4, '0')}`, userId: s.userId, accountActive: s.accountActive, subscriptionId: s.id, name: s.name, email: s.email,
      plan: s.plan, amount: s.price, state: s.state === 'past_due' ? 'pending' as const : 'approved' as const,
      at: plusDays(now, -i), history: [] },
    { id: `COB-${String(i * 2 + 2).padStart(4, '0')}`, userId: s.userId, accountActive: s.accountActive, subscriptionId: s.id, name: s.name, email: s.email,
      plan: s.plan, amount: s.price, state: i === 2 ? 'refunded' as const : i === 8 ? 'failed' as const : 'approved' as const,
      at: plusDays(now, -32 - i), history: [] },
  ]);
  return { subscriptions, charges };
}

export function applyPaymentAction(data: PaymentData, action: PaymentAction, now = new Date().toISOString()): PaymentData {
  const reason = action.reason.trim();
  if (reason.length < 5 || reason.length > 500) throw new Error('Escribe un motivo de entre 5 y 500 caracteres.');
  const entry = (description: string): Entry => ({ at: now, actor: action.actor, description, reason });
  if (action.type === 'refund') {
    const record = data.charges.find(c => c.id === action.id);
    if (!record || record.state !== 'approved') throw new Error('Solo puedes reembolsar un cobro aprobado.');
    return { ...data, charges: data.charges.map(c => c.id === action.id
      ? { ...c, state: 'refunded', history: [...c.history, entry(`Reembolso completo de ${money(c.amount)}`)] } : c) };
  }
  const record = data.subscriptions.find(s => s.id === action.id);
  if (!record || record.state === 'cancelled') throw new Error('Esta suscripción ya tiene la renovación cancelada.');
  if (action.type === 'extend' && (!Number.isInteger(action.days) || action.days < 1 || action.days > 90)) {
    throw new Error('La extensión debe ser de 1 a 90 días completos.');
  }
  return { ...data, subscriptions: data.subscriptions.map(s => s.id !== action.id ? s : action.type === 'cancel'
    ? { ...s, state: 'cancelled', history: [...s.history, entry('Renovación cancelada')] }
    : { ...s, endsAt: plusDays(s.endsAt, action.days), history: [...s.history, entry(`Acceso extendido ${action.days} días`)] }) };
}

export function paymentSummary(data: PaymentData, now = new Date().toISOString()) {
  const active = data.subscriptions.filter(s => s.state === 'active');
  const recent = data.charges.filter(c => c.at >= plusDays(now, -30) && c.at <= now);
  const settled = recent.filter(c => c.state !== 'pending');
  const approved = settled.filter(c => c.state === 'approved' || c.state === 'refunded');
  const renewals = active.filter(s => s.endsAt >= now && s.endsAt <= plusDays(now, 7));
  const received = recent.filter(c => c.state === 'approved' || c.state === 'refunded').reduce((n, c) => n + c.amount, 0);
  const refunded = data.charges.filter(c => {
    const refundedAt = c.history.at(-1)?.at ?? c.at;
    return c.state === 'refunded' && refundedAt >= plusDays(now, -30) && refundedAt <= now;
  }).reduce((n, c) => n + c.amount, 0);
  return { mrr: active.reduce((n, s) => n + s.price, 0), active: active.length,
    overdue: data.subscriptions.filter(s => s.state === 'past_due').length,
    pending: data.charges.filter(c => c.state === 'pending').length,
    approval: settled.length ? approved.length / settled.length * 100 : null,
    net: received - refunded,
    renewals: renewals.length, renewalAmount: renewals.reduce((n, s) => n + s.price, 0) };
}
