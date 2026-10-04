export interface GameKpi {
  label: string;
  value: string;
  deltaText?: string;
  deltaClass?: string;
  note?: string;
}

export interface TopGameRow {
  name: string;
  category: string;
  users: number;
  statusLabel: string;
  statusClass: string;
}

export interface GameAlert {
  metric: string;
  className: string;
  title: string;
  description: string;
}

export interface CatalogGame {
  id: string;
  name: string;
  developer: string;
  version: string;
  accessibilityLabel: string;
  accessibilityClass: string;
  visibility: string;
}

export const GAMES_KPIS: GameKpi[] = [
  { label: 'Títulos activos', value: '14', deltaText: '+2 publicados este mes', deltaClass: 'up' },
  { label: 'Jugadores (30 d)', value: '1.820', deltaText: '68% de usuarios mayores', deltaClass: 'up', note: 'Perfil: Adulto mayor' },
  { label: 'Tiempo medio / sesión', value: '18 min', deltaText: '+2 min vs mes anterior', deltaClass: 'up', note: 'Mayor retención matutina' },
  { label: 'Satisfacción de accesibilidad', value: '4,8 / 5', deltaText: 'Índice UX basado en 410 reportes' },
];

export const TOP_GAMES: TopGameRow[] = [
  { name: '🧠 Memoria Activa', category: 'Estimulación', users: 1240, statusLabel: '✔ Activo', statusClass: 'ok' },
  { name: '🎵 Director Musical', category: 'Ocio / Música', users: 980, statusLabel: '✔ Activo', statusClass: 'ok' },
  { name: '🧩 Sudoku Clásico', category: 'Lógica', users: 750, statusLabel: '✔ Activo', statusClass: 'ok' },
  { name: '🗣️ Trivia del Recuerdo', category: 'Social / Memoria', users: 410, statusLabel: '▲ En revisión UX', statusClass: 'warn' },
];

export const GAME_ALERTS: GameAlert[] = [
  {
    metric: '✔ 92%',
    className: 'ok',
    title: 'Tasa de toques exitosos (Hit Rate)',
    description: 'La ampliación del padding en botones ha reducido los toques fallidos un 14% esta semana.',
  },
  {
    metric: '▼ 18%',
    className: 'crit',
    title: 'Abandonos en pantallas de carga',
    description: 'El juego "Viaje Virtual" tarda más de 4 s en cargar. Requiere optimización de assets urgente.',
  },
  {
    metric: '● 3.2x',
    className: 'neutral',
    title: 'Multiplicador de uso diurno',
    description: 'Fuerte concentración de uso entre las 10:00 y 13:00. Oportunidad para push de estimulación.',
  },
];

export const GAME_CATALOG: CatalogGame[] = [
  { id: 'G-01', name: 'Memoria Activa', developer: 'AgeCare Studio', version: 'v2.1.4', accessibilityLabel: 'Alto contraste', accessibilityClass: 'ok', visibility: 'Pública' },
  { id: 'G-02', name: 'Director Musical', developer: 'AgeCare Studio', version: 'v1.8.0', accessibilityLabel: 'Modo simplificado', accessibilityClass: 'ok', visibility: 'Pública' },
  { id: 'G-05', name: 'Bingo Familiar', developer: 'PlaySenior Co.', version: 'v1.0.2', accessibilityLabel: 'Textos pequeños', accessibilityClass: 'warn', visibility: 'Oculta' },
  { id: 'G-06', name: 'Jardín Zen Virtual', developer: 'ZenStudios', version: 'v0.9-b', accessibilityLabel: 'En evaluación', accessibilityClass: 'neutral', visibility: 'Beta (100 usr)' },
];