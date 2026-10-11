import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { StaffAccount, StaffCreateInput, StaffInput, StaffRole } from '../../api/staff';
import { STAFF_ROLES } from '../../lib/staffMeta';
import { fetchStaffPolicy, type StaffPolicy } from '../../api/accountAccess';

export function StaffForm({ account, currentId, onSave, onClose }: {
  account: StaffAccount | null; currentId?: string;
  onSave: (input: StaffInput | StaffCreateInput) => Promise<void>; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(account?.full_name || '');
  const [email, setEmail] = useState(account?.email || '');
  const [role, setRole] = useState<StaffRole>(account?.role || 'analyst');
  const [active, setActive] = useState(account?.is_active ?? false);
  const [requireMfa, setRequireMfa] = useState(true);
  const [policy, setPolicy] = useState<StaffPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const self = account?.id === currentId;
  const ready = account && ['active', 'inactive'].includes(account.account_status);
  const forcedMfa = role === 'admin' || policy?.mfa_required_roles.includes(role) || false;
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  useEffect(() => { const controller = new AbortController(); fetchStaffPolicy(controller.signal).then(result => { if (!controller.signal.aborted) setPolicy(result); }).catch(exception => { if (!controller.signal.aborted) setError(exception.message); }); return () => controller.abort(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(''); setSaving(true);
    try {
      const input = { full_name: name.trim(), email: email.trim(), role };
      await onSave(account ? { ...input, ...(ready ? { is_active: active } : {}) } : { ...input, require_mfa: requireMfa || forcedMfa });
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo guardar la cuenta.'); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialogRef} className="audit-dialog" aria-labelledby="staff-form-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="audit-detail"><h2 id="staff-form-title" className="card-title">{account ? 'Editar cuenta' : 'Crear cuenta de la consola'}</h2>
      <form className="ticket-form" onSubmit={submit}>
        <label className="wide">Nombre completo<input autoFocus required minLength={2} maxLength={120} value={name} disabled={saving} onChange={event => setName(event.target.value)} autoComplete="name" /></label>
        <label className="wide">Correo electrónico<input type="email" required maxLength={254} value={email} disabled={saving || !!account && !ready} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
        {policy && <p className="card-sub wide">Dominios autorizados: {policy.allowed_email_domains.join(', ')}.</p>}
        <label>Rol<select value={role} disabled={saving || self} onChange={event => setRole(event.target.value as StaffRole)}>{Object.entries(STAFF_ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {ready && <label>Estado<select value={String(active)} disabled={saving || self} onChange={event => setActive(event.target.value === 'true')}><option value="true">Activa</option><option value="false">Inactiva</option></select></label>}
        {!account && <><label className="mfa-check wide"><input type="checkbox" checked={requireMfa || forcedMfa} disabled={saving || forcedMfa || !policy} onChange={event => setRequireMfa(event.target.checked)} />Exigir verificación en dos pasos {forcedMfa ? '(obligatoria para este rol)' : ''}</label><p className="card-sub wide">Se enviará una invitación por correo. Su titular elegirá la contraseña y configurará su autenticador. El enlace vence en {policy?.invitation_hours ?? 24} horas.</p></>}
        {account && !ready && <p className="card-sub wide">Esta cuenta debe aceptar una invitación para configurar sus credenciales. Para cambiar su correo, elimina la cuenta pendiente y crea una nueva.</p>}
        {self && <p className="card-sub wide">Puedes actualizar tus datos. Tu rol y estado se mantienen para conservar el acceso a la consola.</p>}
        {account && !self && ready && <p className="card-sub wide">Cambiar el rol o el estado invalida las sesiones abiertas. Al desactivar, la cuenta se conserva y no puede acceder. Si se activa o cambia de rol, deberá iniciar sesión nuevamente.</p>}
        {error && <p role="alert" className="audit-error wide">{error}</p>}
        <div className="ticket-form-actions"><button type="button" className="theme-toggle" disabled={saving} onClick={onClose}>Cancelar</button><button type="submit" className="action-button" disabled={saving || !policy}>{saving ? 'Guardando…' : account ? 'Guardar cuenta' : 'Enviar invitación'}</button></div>
      </form>
    </div>
  </dialog>;
}
