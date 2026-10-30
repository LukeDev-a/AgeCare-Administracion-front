export const LEGAL_NAMES = { terms: 'Términos de servicio', privacy: 'Política de privacidad' };
export const LEGAL_STATES = { draft: 'Borrador', scheduled: 'Publicada · vigencia futura', current: 'Vigente', historical: 'Histórica' };

export function legalDate(value?: string | null): string {
  if (!value) return 'Sin fecha registrada';
  return new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' }).format(new Date(value));
}
export function legalDay(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}
