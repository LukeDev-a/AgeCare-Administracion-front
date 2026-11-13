import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { confirmMfaRecovery, requestMfaRecovery } from '../../api/mfaRecovery';
import { ThemeToggle } from '../../components/ThemeToggle';

export function MfaRecoveryPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname);
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    submitting.current = true; setBusy(true); setError('');
    try {
      if (token) await confirmMfaRecovery(token);
      else await requestMfaRecovery(String(fields.get('email') ?? '').trim(), String(fields.get('password') ?? ''), String(fields.get('reason') ?? '').trim());
      form.reset(); setDone(true);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo completar la solicitud.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section className="login-screen"><div className="login-card tw:space-y-5 tw:text-base tw:leading-relaxed">
    <div className="login-theme"><ThemeToggle /></div>
    <h1 className="tw:text-2xl tw:font-bold">Recuperar acceso MFA</h1>
    {done ? <div role="status" className="tw:space-y-3 tw:rounded-xl tw:bg-canvas tw:p-4">
      {token ? <><p>Solicitud confirmada. Otro administrador debe verificar tu identidad y aprobarla.</p><p>Recibirás la decisión por correo. Si se aprueba, inicia sesión con tu contraseña para configurar y verificar un nuevo autenticador.</p></>
        : <><p>Si los datos corresponden a una cuenta habilitada, recibirás un enlace para confirmar la solicitud.</p><p>Vence en 30 minutos. Revisa spam y espera un minuto antes de solicitar otro. Se permiten hasta tres solicitudes por hora.</p></>}
    </div> : <>
      <p className="tw:text-muted">{token ? 'Confirma que solicitaste recuperar el acceso. Tu MFA actual seguirá activo hasta que otro administrador apruebe la solicitud.' : 'Utiliza esta opción si perdiste el autenticador y todos tus códigos de recuperación. Necesitas tu contraseña y acceso al correo registrado.'}</p>
      <form className="login-form" onSubmit={submit}>
        {!token && <>
          <label className="login-field">Correo registrado<input name="email" type="email" required maxLength={254} autoComplete="username" disabled={busy} /></label>
          <label className="login-field">Contraseña actual<input name="password" type="password" required maxLength={128} autoComplete="current-password" disabled={busy} /></label>
          <label className="login-field">Motivo de la solicitud<textarea name="reason" required minLength={5} maxLength={500} rows={3} disabled={busy} /></label>
          <p className="tw:text-sm tw:text-muted">No incluyas contraseñas ni códigos en el motivo. Si tampoco recuerdas tu contraseña, recupérala primero.</p>
        </>}
        {error && <p role="alert" className="audit-error">{error}</p>}
        <button className="login-submit" disabled={busy}>{busy ? 'Procesando…' : token ? 'Confirmar solicitud' : 'Solicitar recuperación MFA'}</button>
      </form>
      {token && <Link to="/recuperar-mfa" reloadDocument>Solicitar otro enlace</Link>}
    </>}
    <Link to="/recuperar-contrasena" className="tw:block tw:text-brand-ink">Recuperar contraseña</Link>
    <Link to="/login" className="tw:block tw:text-brand-ink">Volver al inicio de sesión</Link>
  </div></section>;
}
