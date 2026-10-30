import type { MobileProfile } from '../api/endUsers';

export const MOBILE_PROFILES: Record<MobileProfile, string> = {
  family: 'Familiar', caregiver: 'Cuidador/a', doctor: 'Médico/a', elder: 'Adulto mayor',
};
export function directoryDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago', hourCycle: 'h23' }) : 'Sin fecha';
}
