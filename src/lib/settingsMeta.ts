import type { SettingValue, SystemSetting, ValueSchema } from '../api/settings';

const NAMES: Record<string, string> = {
  plan_prices: 'Precios de planes', churn_definition: 'Criterios para considerar una baja',
  alert_thresholds: 'Umbrales de alerta por defecto', medication_windows: 'Ventanas de medicación',
  feature_flags: 'Activación de funciones', system_texts: 'Textos del sistema',
};
export function supportsFields(value: SettingValue, schema: ValueSchema): boolean {
  const scalar = (item: SettingValue) => item !== null && ['string', 'number', 'boolean'].includes(typeof item);
  if (scalar(value)) return true;
  return !!value && !Array.isArray(value) && typeof value === 'object' && schema.type === 'object' &&
    Object.values(value).every(scalar);
}
export function settingName(setting: SystemSetting): string {
  return setting.schema.title || NAMES[setting.key] ||
    (setting.key.startsWith('ops_thresholds.') ? `Estado del servicio · ${fieldName(setting.key.split('.').slice(1).join('.'), {})}` : readableName(setting.key));
}
const readableName = (key: string) => key.replace(/[_.-]+/g, ' ').replace(/^./, letter => letter.toUpperCase());
const DESCRIPTIONS: Record<string, string> = {
  plan_prices: 'Define el precio de cada plan en pesos chilenos.',
  churn_definition: 'Define cuándo una cuenta se considera dada de baja para los indicadores: por cancelación o por días sin actividad.',
  'ops_thresholds.api_core': 'Define los límites de tiempo de respuesta y errores utilizados para evaluar el estado de la API principal.',
};
export const settingDescription = (setting: SystemSetting) => DESCRIPTIONS[setting.key] || setting.description;
const FIELDS: Record<string, string> = {
  gold: 'Dorado (CLP)', platinum: 'Platino (CLP)', provider: 'Proveedor (CLP)',
  p95_ms: 'Límite de tiempo de respuesta (milisegundos)', error_rate: 'Proporción máxima de errores',
  explicit_cancellation: 'Contar las cancelaciones como bajas', inactivity_days: 'Días sin actividad para considerar una baja',
  api_core: 'API principal',
};
export const fieldName = (key: string, schema: ValueSchema) => FIELDS[key] || schema.title || readableName(key);
export const fieldHelp = (key: string) => ({
  p95_ms: 'El 95 % de las respuestas debería completarse dentro de este tiempo. 1000 milisegundos equivalen a 1 segundo.',
  error_rate: 'Se expresa entre 0 y 1. Por ejemplo, 0,02 equivale al 2 % de las solicitudes.',
  explicit_cancellation: 'Si seleccionas Sí, las cuentas que cancelan se incluyen en el cálculo de bajas.',
  inactivity_days: 'Cantidad de días sin actividad a partir de la cual se considera una baja en los indicadores.',
} as Record<string, string>)[key];
export function displayValue(value: SettingValue, schema: ValueSchema): string {
  if (value === null) return 'Sin valor';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.map(item => displayValue(item, {})).join('; ');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${fieldName(key, schema.properties?.[key] ?? {})}: ${displayValue(item, schema.properties?.[key] ?? {})}`).join('\n');
  return typeof value === 'number' ? value.toLocaleString('es-CL', { maximumFractionDigits: 20 }) : value;
}
export function rules(schema: ValueSchema): string[] {
  const result: string[] = [];
  const types: Record<string, string> = { object: 'campos agrupados', array: 'lista', integer: 'número entero', number: 'número', boolean: 'sí/no', string: 'texto', null: 'sin valor' };
  if (schema.type) result.push(`Tipo: ${(Array.isArray(schema.type) ? schema.type : [schema.type]).map(type => types[type] || type).join(' o ')}`);
  if (schema.minimum !== undefined) result.push(`Mínimo: ${schema.minimum}`);
  if (schema.maximum !== undefined) result.push(`Máximo: ${schema.maximum}`);
  if (schema.minLength !== undefined) result.push(`Al menos ${schema.minLength} caracteres`);
  if (schema.maxLength !== undefined) result.push(`Hasta ${schema.maxLength} caracteres`);
  if (schema.enum) result.push(`Valores permitidos: ${schema.enum.map(value => JSON.stringify(value)).join(', ')}`);
  return result;
}
export function settingDate(value: string | null): string {
  if (!value) return 'Sin cambios registrados';
  const date = new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z');
  return Number.isNaN(date.getTime()) ? 'Sin fecha disponible' : date.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
}
