import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccessRoute } from '../routes/permissions';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  soon?: boolean;
  adminOnly?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Analítica',
    items: [
      { to: '/comercial', icon: '📈', label: 'Uso comercial' },
      { to: '/operativo', icon: '🖥️', label: 'Estado operativo' },
      { to: '/usuarios', icon: '👥', label: 'Usuarios y soporte' },
      { to: '/funcional', icon: '🧩', label: 'Uso por funcionalidad' },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/usuarios-app', icon: '👤', label: 'Usuarios y pacientes', adminOnly: true },
      { to: '/tickets', icon: '🎫', label: 'Tickets de soporte'},
      { to: '/contenido', icon: '📰', label: 'Curación de contenido'},
      { to: '/catalogos', icon: '🛍️', label: 'Catálogos marketplace'},
      { to: '/moderacion', icon: '🛡️', label: 'Moderación'},
      { to: '/juegos', icon: '🎮', label: 'Administración de juegos' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/auditoria', icon: '📋', label: 'Auditoría', adminOnly: true },
      { to: '/cuentas', icon: '🔑', label: 'Cuentas de la consola', adminOnly: true },
      { to: '/config', icon: '⚙️', label: 'Configuración'},
      { to: '/legales', icon: '📜', label: 'Legales y privacidad'},
    ],
  },
];

export function Sidebar() {
  const { logout, user } = useAuth();
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group, items: group.items.filter(item => canAccessRoute(item.to, user?.permissions)),
  })).filter(group => group.items.length > 0);

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">A</div>
        <div>
          <div className="logo-name">AgeCare</div>
          <div className="logo-sub">Consola de administración</div>
        </div>
      </div>
      <nav className="nav" aria-label="Módulos de la consola">
        {visibleGroups.map(group => (
          <div key={group.label}>
            <div className="nav-group">{group.label}</div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="ico">{item.icon}</span>
                {item.label}
                {item.soon && <span className="soon">v1</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="nav-group account-group-title">Mi cuenta</div>
        <div className="sidebar-account">
          <div className="sf-avatar">{user?.full_name.slice(0, 2).toUpperCase() || 'AD'}</div>
          <div>
            <div className="sf-name">{user?.full_name || 'Administrador'}</div>
            <div className="sf-role">{user?.role || 'Staff'} · Wellq Co</div>
          </div>
        </div>
        <nav className="account-links" aria-label="Mi cuenta">
          <NavLink to="/perfil" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="ico" aria-hidden="true">👤</span>Mi perfil
          </NavLink>
          <NavLink to="/seguridad" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="ico" aria-hidden="true">🔒</span>Seguridad de mi cuenta
          </NavLink>
        </nav>
        <button className="logout-button" type="button" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
