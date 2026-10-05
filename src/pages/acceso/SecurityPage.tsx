import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { accessRequest, type RecoveryResult } from '../../api/accountAccess';
import { clearSession } from '../../api/client';
import { RecoveryCodes } from '../../components/RecoveryCodes';

export function SecurityPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ mfa_enabled: boolean; mfa_required: boolean } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    accessRequest<{ mfa_enabled: boolean; mfa_required: boolean }>('/auth/me', undefined, true, controller.signal).then(result => { if (!controller.signal.aborted) setStatus(result); }).catch(exception => { if (!controller.signal.aborted) setError(exception.message); });
    return () => controller.abort();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !status) return;
    const formElement = event.currentTarget;
    const fields = new FormData(formElement);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value || 'recovery-codes';
    const password = String(fields.get('password') || '');
    setBusy(true); setError('');
    try {
      if (!status.mfa_enabled) {
        const result = await accessRequest<{ enrollment_token: string }>('/auth/mfa/setup', { password }, true);
        sessionStorage.setItem('agecare-mfa-enrollment', result.enrollment_token); navigate('/configurar-mfa');
      } else {
        const otp_code = String(fields.get('otp') || '').trim() || undefined;
        const recovery_code = String(fields.get('recovery') || '').trim() || undefined;
        if (!otp_code && !recovery_code) throw new Error('Ingresa un código nuevo del autenticador o un código de recuperación.');
        if (otp_code && recovery_code) throw new Error('Usa solo uno: el código del autenticador o el de recuperación.');
        const proof = { password, otp_code, recovery_code };
        const result = await accessRequest<RecoveryResult>(`/auth/mfa/${action}`, proof, true);
        if (action === 'disable') { clearSession(); navigate('/login', { replace: true }); }
        else { setCodes(result.recovery_codes); formElement.reset(); }
      }
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Seguridad de mi cuenta"><div className="card"><h2 className="card-title">Verificación en dos pasos</h2>
    {codes ? <RecoveryCodes codes={codes} onDone={() => setCodes(null)} /> : !status ? !error && <p role="status">Cargando configuración…</p> : <>
      <p className="card-sub">{status.mfa_enabled ? 'Tu autenticador está configurado.' : 'Agrega un autenticador para proteger el acceso a tu cuenta.'} {status.mfa_required ? 'MFA es obligatorio para tu cuenta.' : 'MFA es opcional para tu cuenta.'}</p>
      <form className="ticket-form invitation-form" onSubmit={submit}>
        <label className="wide">Contraseña actual<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" disabled={busy} /></label>
        {status.mfa_enabled && <><label>Código del autenticador<input name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" disabled={busy} /></label><label>Código de recuperación (alternativa)<input name="recovery" maxLength={40} autoComplete="off" disabled={busy} /></label><p className="card-sub wide">Usa uno de los dos códigos. Los códigos del autenticador ya utilizados no pueden reutilizarse; espera el siguiente.</p></>}
        <div className="ticket-form-actions">{status.mfa_enabled ? <><button className="action-button" name="action" value="recovery-codes" disabled={busy}>Renovar códigos de recuperación</button>{!status.mfa_required && <button className="staff-delete-button" name="action" value="disable" disabled={busy}>Desactivar MFA</button>}</> : <button className="action-button" disabled={busy}>Configurar autenticador</button>}</div>
      </form>
    </>}{error && <p className="audit-error" role="alert">{error}</p>}
  </div></section>;
}
