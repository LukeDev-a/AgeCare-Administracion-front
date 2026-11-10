import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { confirmPasswordReset, requestPasswordReset } from '../../api/accountAccess';
import { clearSession } from '../../api/client';
import { ThemeToggle } from '../../components/ThemeToggle';

export function PasswordResetPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname);
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password') ?? '');
    setError('');
    if (token && password !== fields.get('confirm')) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (token) {
        await confirmPasswordReset(token, password);
        clearSession();
        setChanged(true);
      } else {
        await requestPasswordReset(String(fields.get('email') ?? '').trim());
        setSent(true);
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No fue posible completar la solicitud.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <section className="login-screen"><div className="login-card tw:space-y-6 tw:text-base tw:leading-relaxed">
    <div className="login-theme"><ThemeToggle /></div>
    <h1 className="tw:text-2xl tw:font-bold">{changed ? 'Contraseña actualizada' : token ? 'Establece tu nueva contraseña' : 'Recupera tu contraseña'}</h1>
    {changed ? <div className="tw:space-y-4" role="status"><p>Tu contraseña se guardó y las sesiones anteriores se cerraron.</p><p>Inicia sesión con la nueva contraseña y tu código MFA, si lo tienes activado.</p></div>
      : <>
        <p className="tw:text-muted">{token ? 'Elige una contraseña de entre 8 y 128 caracteres. Al guardarla se cerrarán tus sesiones abiertas.' : 'Escribe el correo de tu cuenta para solicitar un enlace de recuperación.'}</p>
        {sent && <div role="status" className="tw:space-y-2 tw:rounded-xl tw:bg-canvas tw:p-4"><p>Si el correo corresponde a una cuenta activa, recibirás un enlace para cambiar tu contraseña.</p><p>El enlace vence en 30 minutos. Revisa también spam y espera un minuto antes de solicitar otro.</p></div>}
        <form className="login-form" onSubmit={submit}>
          {token ? <>
            <label className="login-field">Nueva contraseña<input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required disabled={busy} /></label>
            <label className="login-field">Repite la nueva contraseña<input name="confirm" type="password" minLength={8} maxLength={128} autoComplete="new-password" required disabled={busy} /></label>
          </> : <label className="login-field">Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy} /></label>}
          {error && <p className="audit-error" role="alert">{error}</p>}
          <button type="submit" className="login-submit" disabled={busy}>{busy ? 'Procesando…' : token ? 'Guardar nueva contraseña' : 'Enviar enlace de recuperación'}</button>
        </form>
        {token && <Link to="/recuperar-contrasena" reloadDocument className="tw:block tw:text-brand-ink">Solicitar otro enlace</Link>}
      </>}
    <Link to="/login" className="tw:block tw:text-brand-ink">Volver al inicio de sesión</Link>
  </div></section>;
}
