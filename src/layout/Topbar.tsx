import { useLocation } from 'react-router-dom';
import { VIEW_META } from '../routes/routeMeta';
import { ThemeToggle } from '../components/ThemeToggle';

export function Topbar() {
  const location = useLocation();
  const key = location.pathname.replace(/^\//, '');
  const meta = VIEW_META[key] ?? { title: '', crumb: '' };

  return (
    <header className="topbar">
      <div>
        <div className="tb-title">{meta.title}</div>
        <div className="tb-crumb">{meta.crumb}</div>
      </div>
      <div className="tb-spacer" />
      <ThemeToggle />
      <span className="env-badge">Consola AgeCare</span>
      <span className="tb-date">
        {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </span>
    </header>
  );
}
