export const fmt = (n: number) => n.toLocaleString('es-CL');

export const percent = (value: number) =>
  (value * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + '%';

export const money = (value: number) => '$' + Number(value).toLocaleString('es-CL');

export const moneyOrDash = (value: number | null | undefined) => (value ? money(value) : '—');

export const delta = (value: number | null | undefined) =>
  value == null
    ? 'Sin comparación disponible'
    : `${value >= 0 ? '+' : ''}${(value * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% vs periodo anterior`;

export const deltaClass = (value: number | null | undefined) =>
  value != null && value < 0 ? 'down' : 'up';

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

export const formatUptime = (value: number) =>
  (value * 100).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

export const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`;

export const ticketDate = (value: string) =>
  new Date(value).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });