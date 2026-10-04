import { useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  function toggleTheme() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    try { localStorage.setItem('agecare-theme', next ? 'dark' : 'light'); }
    catch { /* El cambio funciona también sin almacenamiento disponible. */ }
    setDark(next);
  }
  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}
      aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-pressed={dark} title={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
      <span>{dark ? 'Tema claro' : 'Tema oscuro'}</span>
    </button>
  );
}
