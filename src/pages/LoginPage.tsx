import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const otpCode = String(form.get('otp_code') ?? '').trim();
    setError('');
    setIsSubmitting(true);
    try {
      await login({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        ...(otpCode ? { otp_code: otpCode } : {}),
      });
      navigate('/comercial', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    } finally {
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
            <input id="login-email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <div className="login-field">
            <label htmlFor="login-otp">Código MFA (opcional)</label>
            <input id="login-otp" name="otp_code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" />
          </div>
          <div className="login-error" role="alert" aria-live="polite">{error}</div>
          <button className={`login-submit${isSubmitting ? ' is-loading' : ''}`} type="submit" disabled={isSubmitting}>
            {isSubmitting && <span className="login-spinner" aria-hidden="true" />}
            <span className="login-submit-label">{isSubmitting ? 'Verificando...' : 'Iniciar sesión'}</span>
          </button>
          <div className="login-help">Usa las credenciales de una cuenta de staff autorizada.</div>
        </form>
      </div>
    </section>
  );
}
