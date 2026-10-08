import { Link } from 'react-router-dom';
import type { OwnProfile } from '../../api/profile';
import { STAFF_ROLES } from '../../lib/staffMeta';

const MODULE_NAMES: Record<string, string> = {
  metrics: 'Indicadores y estadísticas', games: 'Juegos y aplicaciones',
  ops: 'Monitoreo operativo', support: 'Soporte y tickets', content: 'Contenido',
  marketplace: 'Marketplace', moderation: 'Moderación', settings: 'Configuración',
  legal: 'Documentos legales', staff: 'Cuentas de la consola', audit: 'Auditoría',
};

function loginDate(value: string | null): string {
  if (!value) return 'Sin inicios de sesión registrados';
  const date = new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z');
  if (Number.isNaN(date.getTime())) return 'Sin información disponible';
  return date.toLocaleString('es-CL', { timeZone: 'America/Santiago',
    dateStyle: 'long', timeStyle: 'short' });
}

export function ProfileDetails({ profile }: { profile: OwnProfile }) {
  return <>
    <div className="card">
      <h2 className="card-title">Datos de mi cuenta</h2>
      <p className="card-sub">Información de tu cuenta en la consola de administración.</p>
      <dl className="profile-fields">
        <div><dt>Nombre</dt><dd>{profile.full_name}</dd></div>
        <div><dt>Correo electrónico</dt><dd>{profile.email}</dd></div>
        <div><dt>Rol</dt><dd>{STAFF_ROLES[profile.role as keyof typeof STAFF_ROLES] ?? profile.role}</dd></div>
        <div><dt>Último inicio de sesión</dt><dd>{loginDate(profile.last_login_at)}<small>Zona horaria: America/Santiago</small></dd></div>
        <div><dt>Identificador de cuenta</dt><dd>{profile.id}</dd></div>
        <div><dt>Verificación en dos pasos</dt><dd>{profile.mfa_enabled ? 'Activada' : 'Sin configurar'}{profile.mfa_required ? ' · Obligatoria' : ' · Opcional'}</dd></div>
      </dl>
      <Link className="action-button" to="/seguridad">Seguridad de mi cuenta</Link>
    </div>
    <div className="card">
      <h2 className="card-title">Módulos que puedes consultar</h2>
      <p className="card-sub">Los permisos para crear, modificar o eliminar se comprueban por separado según tu rol.</p>
      {profile.permissions.length ? <ul className="profile-modules">
        {profile.permissions.map(module => <li key={module}>{MODULE_NAMES[module] ?? module}</li>)}
      </ul> : <p>No tienes módulos de consulta asignados. Puedes consultar tu perfil y gestionar tu seguridad.</p>}
    </div>
  </>;
}
