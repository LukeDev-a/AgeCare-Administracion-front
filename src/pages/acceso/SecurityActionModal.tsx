import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { PasswordField } from '../../components/PasswordField';
import { securityStyles as s, type SecurityAction, type SecurityProof, type SecurityStatus } from './securityStyles';

const titles = { setup: 'Configurar autenticador', 'recovery-codes': 'Renovar códigos de recuperación', disable: 'Desactivar MFA' };
export function SecurityActionModal({ action, status, onConfirm, onClose }: {
  action: SecurityAction; status: SecurityStatus; onConfirm: (proof: SecurityProof) => Promise<void>; onClose: () => void;
}) {
  const [method, setMethod] = useState<'authenticator' | 'recovery'>('authenticator');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const allowed = action === 'setup' ? !status.mfa_enabled : status.mfa_enabled && (action !== 'disable' || !status.mfa_required);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !allowed) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password') || '');
    const otp_code = String(fields.get('otp') || '').trim() || undefined;
    const recovery_code = String(fields.get('recovery') || '').trim() || undefined;
    if (action !== 'setup' && (!otp_code && !recovery_code || otp_code && recovery_code)) {
      setError('Usa solo uno: un código nuevo del autenticador o un código de recuperación.'); return;
    }
    submitting.current = true; setBusy(true); setError('');
    try { await onConfirm({ password, ...(action !== 'setup' ? { otp_code, recovery_code } : {}) }); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo completar la operación.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (!allowed) return null;
  return <Modal title={titles[action]} onClose={onClose} busy={busy} dirty={dirty} error={error}>
    <div className="tw:mx-auto tw:max-w-2xl tw:space-y-5">
      <div className={action === 'setup' ? s.notice : s.warning}>
        <h3 className="tw:font-bold tw:text-ink">{action === 'setup' ? 'Vincula una aplicación autenticadora' : action === 'disable' ? 'Tu cuenta dejará de usar verificación en dos pasos' : 'Los códigos anteriores dejarán de funcionar'}</h3>
        <p className="tw:mt-2">{action === 'setup' ? 'Confirma tu contraseña para continuar a la pantalla del QR. Allí deberás verificar el código de tu autenticador para completar la configuración.' : action === 'disable' ? 'Se invalidarán el autenticador, los códigos de recuperación y las sesiones abiertas. Tendrás que iniciar sesión nuevamente.' : 'Se generará una lista nueva que verás una sola vez. Guárdala antes de salir de esta pantalla.'}</p>
      </div>
      <form className="tw:space-y-5" onChange={() => setDirty(true)} onSubmit={event => void submit(event)}>
        <PasswordField label="Contraseña actual" name="password" required minLength={8} maxLength={128} autoComplete="current-password" disabled={busy} />
        {action !== 'setup' && <>
          <label className={s.label}>Verificar con<select className={s.field} aria-label="Método de verificación" value={method} disabled={busy} onChange={event => { setMethod(event.target.value as 'authenticator' | 'recovery'); setError(''); }}><option value="authenticator">Aplicación autenticadora</option><option value="recovery">Código de recuperación</option></select></label>
          {method === 'authenticator' ? <label className={s.label}>Código del autenticador<input key="otp" className={s.field} name="otp" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" disabled={busy} /><span className={s.muted}>Usa los seis dígitos que muestra tu aplicación. Si ya usaste ese código, espera al siguiente.</span></label>
            : <label className={s.label}>Código de recuperación<input key="recovery" className={s.field} name="recovery" required maxLength={40} autoComplete="off" spellCheck={false} autoCapitalize="none" disabled={busy} /><span className={s.muted}>Usa uno de los códigos guardados al configurar MFA. Cada código funciona una sola vez.</span></label>}
        </>}
        <div className={s.actions}><button className={`${s.button} ${action === 'disable' ? s.danger : s.primary}`} type="submit" disabled={busy}>{busy ? 'Verificando…' : action === 'setup' ? 'Continuar a la configuración' : action === 'disable' ? 'Confirmar desactivación' : 'Confirmar renovación'}</button></div>
      </form>
    </div>
  </Modal>;
}
