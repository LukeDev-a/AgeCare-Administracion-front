export function canManageGames(role?: string): boolean {
  return role === 'admin' || role === 'editor';
}

export const GAME_TYPE_LABELS: Record<string, string> = {
  game: '🎮 Juego',
  app: '📱 App',
};

export const GAME_TIER_LABELS: Record<string, string> = {
  gratuito: 'Gratuito',
  dorado: 'Dorado',
  platino: 'Platino',
};
