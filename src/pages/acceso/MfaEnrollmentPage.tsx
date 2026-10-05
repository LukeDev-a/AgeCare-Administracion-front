import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirmEnrollment, setupEnrollment, type MfaSetup } from '../../api/accountAccess';
import { clearSession } from '../../api/client';
import { MfaProvision } from '../../components/MfaProvision';
import { RecoveryCodes } from '../../components/RecoveryCodes';
import { ThemeToggle } from '../../components/ThemeToggle';

export function MfaEnrollmentPage() {
  const navigate = useNavigate();
  const [token] = useState(() => sessionStorage.getItem('agecare-mfa-enrollment') || '');
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    if (token) setupEnrollment(token, controller.signal).then(result => { if (!controller.signal.aborted) setSetup(result); }).catch(exception => { if (!controller.signal.aborted) setError(exception.message); });
    return () => controller.abort();
  }, [token]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const otp = String(new FormData(event.currentTarget).get('otp') || '');
    setBusy(true); setError('');
    try { const result = await confirmEnrollment(token, otp); setCodes(result.recovery_codes); setSetup(null); sessionStorage.removeItem('agecare-mfa-enrollment'); clearSession(); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo activar MFA.'); }
    finally { setBusy(false); }
  }
  return <section className="login-screen"><div className="login-card access-card"><div className="login-theme"><ThemeToggle /></div>
    {codes ? <RecoveryCodes codes={codes} onDone={() => navigate('/login', { replace: true })} /> : <>
      <h1 className="login-title">Configura tu autenticador</h1><p className="login-subtitle">Confirma MFA antes de acceder a la consola.</p>
      {!token ? <p>Inicia sesión para configurar la verificación en dos pasos.</p> : setup ? <form className="login-form invitation-form" onSubmit={submit}><MfaProvision setup={setup} /><label className="login-field">Código del autenticador<input autoFocus name="otp" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" disabled={busy} /></label><button className="login-submit" disabled={busy}>{busy ? 'Verificando…' : 'Activar MFA'}</button></form> : !error && <p role="status">Preparando configuración…</p>}
      {error && <p className="audit-error" role="alert">{error}</p>}<Link to="/login">Volver al inicio de sesión</Link>
    </>}
  </div></section>;
}
