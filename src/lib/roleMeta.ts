import type { RoleKey } from '../api/usersSupport';
import { CHART_COLORS } from './colors';

export const ROLE_META: Record<RoleKey, { name: string; color: string; sub: string }> = {
  family: { name: 'Familiares', color: CHART_COLORS.s1, sub: 'usuario principal · observa y decide' },
  caregiver: { name: 'Cuidadoras', color: CHART_COLORS.s2, sub: 'operan el día a día' },
  elder: { name: 'Adultos mayores', color: CHART_COLORS.s3, sub: 'vista accesible + Director Musical' },
  doctor: { name: 'Médicos', color: CHART_COLORS.s4, sub: 'prescripción · rol acotado v1' },
};

export function roleLabel(role: string): string {
  return ROLE_META[role as RoleKey]?.name ?? role;
}