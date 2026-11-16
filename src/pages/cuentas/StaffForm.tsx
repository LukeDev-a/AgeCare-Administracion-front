import { useEffect, useState, type FormEvent } from 'react';
import type { StaffAccount, StaffCreateInput, StaffInput, StaffRole } from '../../api/staff';
import { STAFF_ROLES } from '../../lib/staffMeta';
import { fetchStaffPolicy, type StaffPolicy } from '../../api/accountAccess';
import { Modal } from '../../components/Modal';
import { staffStyles as s } from './staffStyles';

export function StaffForm({ account, currentId, onSave, onClose }: {
  account: StaffAccount | null; currentId?: string;
  onSave: (input: StaffInput | StaffCreateInput) => Promise<void>; onClose: () => void;
}) {
  const [name, setName] = useState(account?.full_name || '');
  const [email, setEmail] = useState(account?.email || '');
  const [role, setRole] = useState<StaffRole>(account?.role || 'analyst');
  const [active, setActive] = useState(account?.is_active ?? false);
  const [requireMfa, setRequireMfa] = useState(true);
  const [policy, setPolicy] = useState<StaffPolicy | null>(null);
  const [policyRevision, setPolicyRevision] = useState(0);
  const [policyError, setPolicyError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const self = !!account && account.id === currentId;
  const ready = account && ['active', 'inactive'].includes(account.account_status);
  const forcedMfa = role === 'admin' || policy?.mfa_required_roles.includes(role) || false;
  const dirty = name !== (account?.full_name || '') || email !== (account?.email || '') || role !== (account?.role || 'analyst') || active !== (account?.is_active ?? false) || !requireMfa;
  useEffect(() => {
    const controller = new AbortController();
    fetchStaffPolicy(controller.signal).then(result => { if (!controller.signal.aborted) setPolicy(result); }).catch(exception => {
      if (!controller.signal.aborted) setPolicyError(exception instanceof Error ? exception.message : 'No se pudo consultar la configuración de acceso.');
    });
    return () => controller.abort();
  }, [policyRevision]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !policy) return;
    setError(''); setSaving(true);
    try {
      const input = { full_name: name.trim(), email: email.trim(), role };
      await onSave(account ? { ...input, ...(ready ? { is_active: active } : {}) } : { ...input, require_mfa: requireMfa || forcedMfa });
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo guardar la cuenta.'); }
    finally { setSaving(false); }
  }
  return <Modal title={account ? 'Editar cuenta' : 'Crear cuenta de la consola'} onClose={onClose} dirty={dirty} busy={saving} error={error}>
    <div className="tw:mx-auto tw:max-w-3xl tw:space-y-5">
      <p className={s.notice}>{account ? 'Actualiza los datos y permisos de esta persona. Los cambios se aplican al guardar.' : 'La persona recibirá una invitación y elegirá su propia contraseña. No tienes que crearla ni compartirla.'}</p>
      {policyError && <div role="alert" className={s.error}><p>{policyError}</p><button type="button" className={`${s.button} tw:mt-3`} disabled={saving} onClick={() => { setPolicyError(''); setPolicyRevision(value => value + 1); }}>Reintentar configuración de acceso</button></div>}
      {!policy && !policyError && <p role="status" className={s.muted}>Consultando la configuración de acceso…</p>}
      <form className="tw:space-y-5" onSubmit={submit}>
        <section className={s.section}><h3 className="tw:font-bold">1. Datos de la persona</h3>
          <label className={s.label}>Nombre completo<input className={s.field} required minLength={2} maxLength={120} value={name} disabled={saving} onChange={event => setName(event.target.value)} autoComplete="name" /></label>
          <label className={s.label}>Correo electrónico<input className={s.field} type="email" required maxLength={254} value={email} disabled={saving || !!account && !ready} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
          {policy && <p className={s.muted}>Dominios de correo admitidos: {policy.allowed_email_domains.join(', ')}.</p>}
          {account && !ready && <p className={s.muted}>La persona debe aceptar la invitación para activar su acceso. Para corregir el correo, elimina esta cuenta pendiente y crea una nueva.</p>}
        </section>
        <section className={s.section}><h3 className="tw:font-bold">2. Permisos y acceso</h3>
          <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2"><label className={s.label}>Rol<select className={s.field} aria-label="Rol" value={role} disabled={saving || self} onChange={event => setRole(event.target.value as StaffRole)}>{Object.entries(STAFF_ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {ready && <label className={s.label}>Estado de la cuenta<select className={s.field} aria-label="Estado de la cuenta" value={String(active)} disabled={saving || self} onChange={event => setActive(event.target.value === 'true')}><option value="true">Activa · puede acceder</option><option value="false">Inactiva · sin acceso</option></select></label>}</div>
          <p className={s.muted}>El rol determina qué módulos puede consultar y qué acciones puede realizar.</p>
          {self && <p className={s.notice}>Estás editando tu propia cuenta. Puedes cambiar tus datos; tu rol y estado se mantienen para conservar el acceso.</p>}
          {account && !self && ready && <p className={s.notice}>Cambiar el rol o el estado cerrará las sesiones abiertas. Una cuenta inactiva se conserva, pero no puede acceder. Si se activa o cambia de rol, deberá iniciar sesión nuevamente.</p>}
        </section>
        {!account && <section className={s.section}><h3 className="tw:font-bold">3. Seguridad e invitación</h3>
          <label className="tw:flex tw:cursor-pointer tw:items-start tw:gap-3 tw:rounded-xl tw:bg-canvas tw:p-4"><input className="tw:mt-1 tw:size-5 tw:shrink-0" type="checkbox" checked={requireMfa || forcedMfa} disabled={saving || forcedMfa || !policy} onChange={event => setRequireMfa(event.target.checked)} /><span><strong className="tw:block">Exigir verificación en dos pasos (MFA)</strong><span className={s.muted}>{forcedMfa ? 'Obligatoria para este rol según la política de acceso.' : 'Si se exige, la persona deberá configurar su autenticador para entrar.'}</span></span></label>
          <p className={s.muted}>La invitación se enviará al correo indicado y su enlace vencerá en {policy?.invitation_hours ?? 24} horas. El envío se procesa en cola.</p>
        </section>}
        <div className={`${s.actions} tw:justify-end tw:border-x-0 tw:border-b-0 tw:border-t tw:border-solid tw:border-stroke tw:pt-5`}><button type="submit" className={`${s.button} ${s.primary}`} disabled={saving || !policy}>{saving ? 'Guardando…' : account ? 'Guardar cuenta' : 'Crear y enviar invitación'}</button></div>
      </form>
    </div>
  </Modal>;
}
