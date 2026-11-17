import { Link } from 'react-router-dom';
import type { OwnProfile } from '../../api/profile';
import { STAFF_ROLES } from '../../lib/staffMeta';
import { profileStyles as s } from './profileStyles';

const MODULE_NAMES: Record<string, string> = {
  metrics: 'Indicadores y estadísticas', games: 'Juegos y aplicaciones',
  ops: 'Monitoreo operativo', support: 'Soporte y tickets', content: 'Curación de contenido',
  marketplace: 'Catálogos marketplace', moderation: 'Moderación', settings: 'Configuración',
  legal: 'Legales y privacidad', staff: 'Cuentas de la consola', audit: 'Auditoría',
  end_users: 'Cuentas y adultos mayores',
};

function loginDate(value: string | null): string {
  if (!value) return 'Sin inicios de sesión registrados';
  const date = new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z');
  if (Number.isNaN(date.getTime())) return 'Sin información disponible';
  return date.toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'long', timeStyle: 'short' });
}

export function ProfileDetails({ profile }: { profile: OwnProfile }) {
  const initials = profile.full_name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
  const modules = [...new Set(profile.permissions)];
  return <>
    <div className="tw:grid tw:items-start tw:gap-6 tw:lg:grid-cols-[1.3fr_1fr]">
      <section className={s.panel} aria-label="Datos de mi cuenta">
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-4"><span aria-hidden="true" className="tw:flex tw:size-16 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-2xl tw:bg-brand-soft tw:text-2xl tw:font-bold tw:text-brand-ink">{initials}</span><div className="tw:min-w-0 tw:flex-1 tw:space-y-2"><h3 className="tw:break-words tw:text-2xl tw:font-bold">{profile.full_name}</h3><span className={`${s.badge} tw:text-brand-ink`}>{STAFF_ROLES[profile.role as keyof typeof STAFF_ROLES] ?? profile.role}</span></div></div>
        <dl className="tw:grid tw:gap-5">
          <div className="tw:space-y-1 tw:rounded-xl tw:bg-canvas tw:p-4"><dt className={s.muted}>Correo electrónico</dt><dd className="tw:break-all tw:font-semibold">{profile.email}</dd></div>
          <div className="tw:space-y-1"><dt className={s.muted}>Último inicio de sesión</dt><dd className="tw:font-semibold">{loginDate(profile.last_login_at)}</dd><dd className={s.muted}>Hora de Santiago (Chile)</dd></div>
        </dl>
        <details className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-4"><summary className="tw:cursor-pointer tw:text-sm tw:font-semibold">Datos técnicos de la cuenta</summary><dl className="tw:mt-3"><dt className={s.muted}>Identificador de cuenta</dt><dd className="tw:mt-1 tw:break-all tw:text-sm">{profile.id}</dd></dl></details>
      </section>
      <section className={s.panel} aria-label="Seguridad del acceso"><div className="tw:space-y-2"><h3 className={s.heading}>Seguridad de mi cuenta</h3><p className={s.muted}>Verificación en dos pasos (MFA)</p></div>
        <div className={s.notice}><span className={`${s.badge} ${profile.mfa_enabled ? 'tw:text-positive' : 'tw:text-warning'}`}>{profile.mfa_enabled ? 'Activada' : 'Sin configurar'}</span><p className="tw:mt-3 tw:font-semibold tw:text-ink">{profile.mfa_required ? 'Obligatoria para tu cuenta' : 'Opcional para tu cuenta'}</p><p className="tw:mt-2">{profile.mfa_enabled ? 'Tu autenticador está vinculado a esta cuenta.' : profile.mfa_required ? 'Debes configurar un autenticador para completar el acceso.' : 'Puedes añadir un autenticador para proteger tu acceso.'}</p></div>
        <p className={s.muted}>En Seguridad puedes configurar tu autenticador o gestionar los códigos de recuperación, según el estado de tu cuenta.</p>
        <Link className={`${s.button} ${s.primary} tw:w-full`} to="/seguridad">Seguridad de mi cuenta</Link>
      </section>
    </div>
    <section className={s.panel} aria-label="Módulos disponibles"><div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><h3 className={s.heading}>Módulos que puedes consultar</h3><span className={s.badge}>{modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}</span></div>
      <p className={s.muted}>Estos accesos corresponden a tu rol. Los permisos para crear, modificar o eliminar se comprueban por separado.</p>
      {modules.length ? <ul className="tw:grid tw:list-none tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-3">{modules.map(module => <li key={module} className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-4 tw:text-sm tw:font-semibold"><span aria-hidden="true" className="tw:size-2 tw:shrink-0 tw:rounded-full tw:bg-brand" />{MODULE_NAMES[module] ?? module}</li>)}</ul>
        : <p className={s.notice}>No tienes módulos de consulta asignados. Puedes consultar tu perfil y gestionar tu seguridad.</p>}
    </section>
  </>;
}
