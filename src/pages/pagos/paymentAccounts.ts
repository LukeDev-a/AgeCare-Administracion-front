import { fetchEndUsers, type EndUserSummary } from '../../api/endUsers';

/** Lee el directorio completo con su contrato existente, sin crear ni cambiar cuentas. */
export async function fetchPaymentAccounts(signal: AbortSignal): Promise<EndUserSummary[]> {
  const accounts = new Map<string, EndUserSummary>();
  for (let page = 1; ; page++) {
    const result = await fetchEndUsers('', '', page, signal);
    if (signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
    const previous = accounts.size;
    result.items.forEach(account => accounts.set(account.user_id, account));
    if (accounts.size >= result.total) return [...accounts.values()];
    if (accounts.size === previous) throw new Error('El directorio cambió durante la consulta. Vuelve a intentar.');
  }
}
