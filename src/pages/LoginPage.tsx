import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LoginError, lockoutRemaining, lockoutTime } from '../lib/loginLockout';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [lock, setLock] = useState<{ email: string; until: number } | null>(null);
  const [now, setNow] = useState(0);
  const submitting = useRef(false);
  const remaining = lock?.email === email.trim().toLowerCase() ? lockoutRemaining(lock.until, now) : 0;
  useEffect(() => {
    if (!lock) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lock]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || remaining > 0) return;
    submitting.current = true;
    const form = new FormData(event.currentTarget);
    const otpCode = String(form.get('otp_code') ?? '').trim();
    const recoveryCode = String(form.get('recovery_code') ?? '').trim();
    setError('');
    setIsSubmitting(true);
    try {
      await login({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        ...(otpCode ? { otp_code: otpCode } : {}),
        ...(recoveryCode ? { recovery_code: recoveryCode } : {}),
      });
      navigate('/comercial', { replace: true });
    } catch (err) {
      if (err instanceof LoginError && err.retryAfterSeconds) {
        const receivedAt = Date.now();
        setNow(receivedAt);
        setLock({ email: String(form.get('email') ?? '').trim().toLowerCase(), until: receivedAt + err.retryAfterSeconds * 1000 });
      }
      if (err instanceof Error && err.message === 'MFA_ENROLLMENT_REQUIRED') { navigate('/configurar-mfa'); return; }
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-screen">
      <div className="login-card">
        <div className="login-theme"><ThemeToggle /></div>
        <div className="login-brand">
          <div className="logo-mark">A</div>
          <div>
            <div className="login-title">Acceso administrativo</div>
            <div className="login-subtitle">Ingresa a la consola de AgeCare</div>
          </div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Correo electrónico</label>
            <input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={event => { setEmail(event.target.value); setError(''); }} />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <div className="login-field">
            <label htmlFor="login-otp">Código MFA (opcional)</label>
            <input id="login-otp" name="otp_code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" />
          </div>
          <div className="login-error" role="alert" aria-live="polite">{remaining > 0 ? 'Cuenta bloqueada temporalmente por intentos fallidos.' : lock?.email === email.trim().toLowerCase() && lock.until <= now ? 'El tiempo de bloqueo terminó. Puedes volver a intentar iniciar sesión.' : error}</div>
          {remaining > 0 && <p className="login-help">Podrás volver a intentar en <strong role="timer" aria-live="off">{lockoutTime(remaining)}</strong>. No necesitas enviar más intentos mientras esperas.</p>}
          <div className="login-field"><label htmlFor="login-recovery">Código de recuperación (si no tienes tu autenticador)</label><input id="login-recovery" name="recovery_code" autoComplete="off" maxLength={40} /><p className="card-sub">Usa el código MFA o un código de recuperación, no ambos.</p></div>
          <button className={`login-submit${isSubmitting ? ' is-loading' : ''}`} type="submit" disabled={isSubmitting || remaining > 0}>
            {isSubmitting && <span className="login-spinner" aria-hidden="true" />}
            <span className="login-submit-label">{isSubmitting ? 'Verificando...' : 'Iniciar sesión'}</span>
          </button>
          <Link to="/recuperar-contrasena" className="tw:py-2 tw:text-center tw:text-sm tw:font-semibold tw:text-brand-ink">¿Olvidaste tu contraseña?</Link>
          <Link to="/recuperar-mfa" className="tw:py-2 tw:text-center tw:text-sm tw:font-semibold tw:text-brand-ink">Perdí mi autenticador y mis códigos de recuperación</Link>
          <div className="login-help">Usa las credenciales de una cuenta de staff autorizada.</div>
        </form>
      </div>
    </section>
  );
}
