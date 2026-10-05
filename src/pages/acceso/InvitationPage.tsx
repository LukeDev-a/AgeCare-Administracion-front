import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { acceptInvitation, inspectInvitation, setupInvitation, type InvitationInfo, type MfaSetup } from '../../api/accountAccess';
import { MfaProvision } from '../../components/MfaProvision';
import { RecoveryCodes } from '../../components/RecoveryCodes';
import { ThemeToggle } from '../../components/ThemeToggle';
import { clearSession } from '../../api/client';

export function InvitationPage() {
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [enableMfa, setEnableMfa] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fatal, setFatal] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [activated, setActivated] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        if (!token) throw new Error('Abre el enlace completo de la invitación que recibiste por correo.');
        const result = await inspectInvitation(token, controller.signal);
        if (!controller.signal.aborted) setInfo(result);
      } catch (exception) { if (!controller.signal.aborted) setFatal(exception instanceof Error ? exception.message : 'La invitación no está disponible.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [token]);
  useEffect(() => {
    if (!info) return;
    const controller = new AbortController();
    async function load() {
      setSetup(null); setError('');
      try { const result = await setupInvitation(token, enableMfa || info!.mfa_required, controller.signal); if (!controller.signal.aborted) setSetup(result); }
      catch (exception) { if (!controller.signal.aborted) setError(exception instanceof Error ? exception.message : 'No se pudo configurar MFA.'); }
    }
    void load(); return () => controller.abort();
  }, [info, enableMfa, token]);
  function done() { window.history.replaceState(null, '', window.location.pathname); clearSession(); navigate('/login', { replace: true }); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !setup) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password') || '');
    if (password !== fields.get('confirm')) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true); setError('');
    try {
      const result = await acceptInvitation(token, password, enableMfa || !!info?.mfa_required, String(fields.get('otp') || '') || undefined);
      window.history.replaceState(null, '', window.location.pathname);
      setSetup(null); setActivated(true); setCodes(result.recovery_codes);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo activar la cuenta.'); }
    finally { setBusy(false); }
  }
  return <section className="login-screen"><div className="login-card access-card"><div className="login-theme"><ThemeToggle /></div>
    {activated ? codes?.length ? <RecoveryCodes codes={codes} onDone={done} /> : <div className="login-form"><h1>Cuenta activada</h1><p>Ya puedes iniciar sesión en la consola de AgeCare.</p><button className="login-submit" onClick={done}>Ir al inicio de sesión</button></div>
      : loading ? <p role="status">Comprobando invitación…</p> : fatal ? <><p role="alert" className="audit-error">{fatal}</p><Link to="/login">Ir al inicio de sesión</Link></> : info && <>
      <h1 className="login-title">Bienvenido a AgeCare</h1><p className="login-subtitle">{info.full_name} · {info.email}</p>
      <form className="login-form invitation-form" onSubmit={submit}>
        <label className="login-field">Tu contraseña<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" disabled={busy} /></label>
        <label className="login-field">Confirma tu contraseña<input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" disabled={busy} /></label>
        <label className="mfa-check"><input type="checkbox" checked={enableMfa || info.mfa_required} disabled={info.mfa_required || busy} onChange={event => setEnableMfa(event.target.checked)} />Verificación en dos pasos {info.mfa_required ? '(obligatoria)' : '(opcional)'}</label>
        {setup && <MfaProvision setup={setup} />}
        {(enableMfa || info.mfa_required) && <label className="login-field">Código del autenticador<input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={busy} /></label>}
        {error && <p role="alert" className="audit-error">{error}</p>}
        <button className="login-submit" type="submit" disabled={busy || !setup}>{busy ? 'Activando…' : 'Activar cuenta'}</button>
      </form>
    </>}
  </div></section>;
}
