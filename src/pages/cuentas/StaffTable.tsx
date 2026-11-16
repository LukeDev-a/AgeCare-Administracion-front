import type { StaffAccount } from '../../api/staff';
import { MAIL_STATES, STAFF_ROLES, STAFF_STATES, staffDate } from '../../lib/staffMeta';
import { staffStyles as s, staffStateColor } from './staffStyles';

export function StaffTable({ items, loading, currentId, busy, onEdit, onDelete, onResend, onCancel }: {
  items: StaffAccount[]; loading: boolean; currentId?: string; busy: boolean;
  onEdit: (account: StaffAccount) => void; onDelete: (account: StaffAccount) => void;
  onResend: (account: StaffAccount) => void; onCancel: (account: StaffAccount) => void;
}) {
  if (loading) return <p role="status" className={s.notice}>Cargando cuentas…</p>;
  if (!items.length) return <div className="tw:space-y-2 tw:py-10 tw:text-center"><h3 className="tw:font-semibold">No encontramos cuentas con estos filtros</h3><p className={s.muted}>Prueba otro nombre, correo o estado, o limpia los filtros.</p></div>;
  return <div className={s.scroll}><table className={s.table}>
    <caption className="tw:sr-only">Cuentas del personal con acceso a la consola</caption>
    <thead><tr>{['Persona', 'Rol', 'Acceso a la consola', 'Verificación en dos pasos', 'Actividad', 'Acciones'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
    <tbody>{items.map(account => <tr key={account.id}>
      <td className="tw:min-w-56"><div className="tw:flex tw:items-start tw:gap-3"><span aria-hidden="true" className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-brand-soft tw:font-bold tw:text-brand-ink">{account.full_name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span><div className="tw:min-w-0 tw:space-y-1"><strong className="tw:block tw:break-words">{account.full_name}</strong><span className="tw:block tw:break-all tw:text-muted">{account.email}</span>{account.id === currentId && <span className={s.badge}>Tu cuenta</span>}</div></div></td>
      <td><span className={s.badge}>{STAFF_ROLES[account.role]}</span></td>
      <td><span className={`${s.badge} ${staffStateColor(account.account_status)}`}>{STAFF_STATES[account.account_status]}</span>
        {['pending', 'expired', 'cancelled'].includes(account.account_status) && <div className="tw:mt-2 tw:max-w-48 tw:space-y-1 tw:text-xs tw:leading-relaxed tw:text-muted"><p>{MAIL_STATES[account.invitation_delivery_status || ''] || 'Sin información del envío'}</p>{account.invitation_expires_at && <p>Vencimiento del enlace: {staffDate(account.invitation_expires_at)}</p>}</div>}
      </td>
      <td><p className="tw:font-semibold">{account.mfa_enabled ? 'Configurada' : account.mfa_required ? 'Obligatoria · sin configurar' : 'Opcional · sin configurar'}</p><p className="tw:mt-1 tw:text-xs tw:leading-relaxed tw:text-muted">{account.mfa_enabled ? 'Autenticador vinculado a la cuenta.' : account.mfa_required ? 'Debe configurarla para acceder.' : 'No se exige MFA para esta cuenta.'}</p></td>
      <td><p className="tw:text-xs tw:text-muted">Último acceso</p><p className="tw:mt-1">{account.last_login_at ? staffDate(account.last_login_at) : 'Sin accesos registrados'}</p><p className="tw:mt-3 tw:text-xs tw:text-muted">Creada: {staffDate(account.created_at)}</p></td>
      <td><div className="tw:flex tw:min-w-44 tw:flex-col tw:items-start tw:gap-2"><button type="button" className={`${s.button} ${s.primary}`} disabled={busy} aria-label={`Editar cuenta de ${account.full_name}`} onClick={() => onEdit(account)}>Editar cuenta</button>
        {['pending', 'expired', 'cancelled'].includes(account.account_status) && <button type="button" className={s.button} disabled={busy} onClick={() => onResend(account)}>Reenviar invitación</button>}
        {['pending', 'expired'].includes(account.account_status) && <button type="button" className={s.button} disabled={busy} onClick={() => onCancel(account)}>Cancelar invitación</button>}
        <button type="button" className={`${s.button} ${s.danger}`} disabled={busy || account.id === currentId} title={account.id === currentId ? 'No puedes eliminar tu propia cuenta' : 'Eliminar cuenta'} aria-label={`Eliminar cuenta de ${account.full_name}`} onClick={() => onDelete(account)}>Eliminar</button></div></td>
    </tr>)}</tbody>
  </table></div>;
}
