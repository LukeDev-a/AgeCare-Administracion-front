import { apiFetch } from './client';
import type { PaymentData, PaymentAction } from '../pages/pagos/paymentData';

async function read(response: Response): Promise<PaymentData> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'No fue posible guardar o consultar los pagos.');
  }
  const body = await response.json();
  if (body.data_origin !== 'demo') throw new Error('El origen de los pagos no es compatible con esta versión.');
  return body;
}

export async function fetchPayments(signal?: AbortSignal): Promise<PaymentData> {
  const data = await read(await apiFetch('/payments', { signal, cache: 'no-store' }));
  if (data.subscriptions.length || data.charges.length) return data;
  return read(await apiFetch('/payments/initialize', { method: 'POST', signal }));
}

export async function savePaymentOperation(action: PaymentAction, version: number): Promise<PaymentData> {
  const kind = action.type === 'refund' ? 'charges' : 'subscriptions';
  return read(await apiFetch(`/payments/${kind}/${encodeURIComponent(action.id)}/operate`, {
    method: 'POST', body: JSON.stringify({ action: action.type, version, reason: action.reason.trim(), confirmed: true,
      ...(action.type === 'extend' ? { days: action.days } : {}) }),
  }));
}
