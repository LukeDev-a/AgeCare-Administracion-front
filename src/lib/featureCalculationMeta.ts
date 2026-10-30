import { percent } from './format';

export const adoptionPercent = (value: number) => value > 0 && value < .001 ? '<0,1 %' : percent(value);

export const featureCalculationReason = (reason: string | null | undefined) => ({
  not_applicable: 'La función no está disponible para este perfil.',
  missing_active_users: 'Faltan datos de usuarios activos para este perfil y período.',
  no_active_users: 'No hay usuarios activos para calcular el porcentaje.',
  missing_usage: 'Faltan datos de uso de la función para este perfil y período.',
  invalid_data: 'Los datos de uso y usuarios activos son inconsistentes.',
}[reason ?? ''] ?? 'No hay información suficiente para interpretar el cálculo.');
