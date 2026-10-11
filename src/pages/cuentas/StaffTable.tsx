import type { StaffAccount } from '../../api/staff';
import { MAIL_STATES, STAFF_ROLES, STAFF_STATES, staffDate } from '../../lib/staffMeta';

export function StaffTable({ items, loading, currentId, busy, onEdit, onDelete, onResend, onCancel }: {
  items: StaffAccount[]; loading: boolean; currentId?: string; busy: boolean;
  onEdit: (account: StaffAccount) => void; onDelete: (account: StaffAccount) => void;
  onResend: (account: StaffAccount) => void; onCancel: (account: StaffAccount) => void;
}) {
  return <div className="audit-table-scroll" aria-busy={loading}><table className="data">
    <thead><tr>{['Nombre', 'Correo', 'Rol', 'Estado', 'Fecha de creación', 'Último acceso', 'Acciones'].map(label => <th key={label}>{label}</th>)}</tr></thead>
    <tbody>{loading ? <tr><td colSpan={7}>Cargando cuentas…</td></tr> : !items.length ? <tr><td colSpan={7}>No hay cuentas para estos filtros.</td></tr> : items.map(account => <tr key={account.id}>
      <td><strong>{account.full_name}</strong>{account.id === currentId && <div className="card-sub">Tu cuenta</div>}</td>
      <td>{account.email}</td><td>{STAFF_ROLES[account.role]}</td>
      <td><span className={`chip ${account.is_active ? 'ok' : 'neutral'}`}>{STAFF_STATES[account.account_status]}</span>
        {['pending', 'expired', 'cancelled'].includes(account.account_status) && <><div className="card-sub">{MAIL_STATES[account.invitation_delivery_status || '']}</div><div className="card-sub">{account.invitation_expires_at ? `Vence: ${staffDate(account.invitation_expires_at)}` : ''}</div></>}
        <div className="card-sub">{account.mfa_enabled ? 'MFA configurado' : account.mfa_required ? 'MFA obligatorio' : 'MFA opcional'}</div>
      </td>
      <td>{staffDate(account.created_at)}</td><td>{staffDate(account.last_login_at)}</td>
      <td><div className="audit-actions"><button type="button" className="action-button" disabled={busy} onClick={() => onEdit(account)}>Editar</button>
        {['pending', 'expired', 'cancelled'].includes(account.account_status) && <button type="button" className="theme-toggle" disabled={busy} onClick={() => onResend(account)}>Reenviar invitación</button>}
        {['pending', 'expired'].includes(account.account_status) && <button type="button" className="theme-toggle" disabled={busy} onClick={() => onCancel(account)}>Cancelar invitación</button>}
        <button type="button" className="staff-delete-button" disabled={busy || account.id === currentId} title={account.id === currentId ? 'No puedes eliminar tu propia cuenta' : 'Eliminar cuenta'} onClick={() => onDelete(account)}>Eliminar</button></div></td>
    </tr>)}</tbody>
  </table></div>;
}
