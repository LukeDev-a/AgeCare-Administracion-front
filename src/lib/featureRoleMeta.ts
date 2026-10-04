import { CHART_COLORS } from './colors';

export const FEATURE_ROLE_NAMES: Record<string, string> = {
  family: 'Familiar',
  caregiver: 'Cuidadora',
  elder: 'Adulto mayor',
  doctor: 'Médico',
};

export const FEATURE_ROLE_COLORS: Record<string, string> = {
  family: CHART_COLORS.s1,
  caregiver: CHART_COLORS.s2,
  elder: CHART_COLORS.s3,
  doctor: CHART_COLORS.s4,
};

export function featureRoleName(role: string): string {
  return FEATURE_ROLE_NAMES[role] ?? role;
}