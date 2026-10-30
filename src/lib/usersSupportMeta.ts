import type { WeeklyPeriod } from '../api/usersSupport';

export const usersSupportDate = (value: string | null | undefined) => value
  ? new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago' }) : 'Sin datos';

// Fechas civiles: UTC solo evita desplazarlas al día anterior en el navegador.
const civilDate = (value: string) => new Date(`${value}T00:00:00Z`);
export const weeklyDayLabel = (value: string) => civilDate(value).toLocaleDateString('es-CL', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
export function weeklyRangeLabel(period: WeeklyPeriod): string {
  const start = civilDate(period.start_date), end = civilDate(period.end_date);
  const month = (date: Date) => date.toLocaleDateString('es-CL', { month: 'long', timeZone: 'UTC' });
  if (start.getUTCFullYear() !== end.getUTCFullYear()) return `${weeklyDayLabel(period.start_date)} – ${weeklyDayLabel(period.end_date)}`;
  if (start.getUTCMonth() !== end.getUTCMonth()) return `${start.getUTCDate()} de ${month(start)} – ${end.getUTCDate()} de ${month(end)} de ${end.getUTCFullYear()}`;
  return `${start.getUTCDate()}–${end.getUTCDate()} de ${month(end)} de ${end.getUTCFullYear()}`;
}
export function weeklyShortLabel(period: WeeklyPeriod): string {
  const start = civilDate(period.start_date), end = civilDate(period.end_date);
  const month = (date: Date) => date.toLocaleDateString('es-CL', { month: 'short', timeZone: 'UTC' });
  const marker = period.is_current_week ? ' *' : '';
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    const beginning = start.getUTCMonth() === end.getUTCMonth() ? String(start.getUTCDate()) : `${start.getUTCDate()} ${month(start)}`;
    return `${beginning}–${end.getUTCDate()} ${month(end)} ${end.getUTCFullYear()}${marker}`;
  }
  const short = (value: string) => civilDate(value).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
  return `${short(period.start_date)} – ${short(period.end_date)}${marker}`;
}
