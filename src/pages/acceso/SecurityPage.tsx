import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accessRequest, type RecoveryResult } from '../../api/accountAccess';
import { clearSession } from '../../api/client';
import { RecoveryCodes } from '../../components/RecoveryCodes';
import { SecurityActionModal } from './SecurityActionModal';
import { securityStyles as s, type SecurityAction, type SecurityProof, type SecurityStatus } from './securityStyles';

export function SecurityPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState<SecurityAction | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    accessRequest<SecurityStatus>('/auth/me', undefined, true, controller.signal).then(result => {
      if (!controller.signal.aborted) setStatus(result);
    }).catch(exception => {
      if (!controller.signal.aborted) setError(exception instanceof Error ? exception.message : 'No se pudo consultar la seguridad de tu cuenta.');
    });
    return () => controller.abort();
  }, [attempt]);
  function reload() { setError(''); setStatus(null); setAttempt(value => value + 1); }
  async function confirm(proof: SecurityProof) {
    if (!action || !status) return;
    if (action === 'setup' && !status.mfa_enabled) {
      const result = await accessRequest<{ enrollment_token: string }>('/auth/mfa/setup', { password: proof.password }, true);
      sessionStorage.setItem('agecare-mfa-enrollment', result.enrollment_token); navigate('/configurar-mfa');
      return;
    }
    if (!status.mfa_enabled || action === 'setup' || action === 'disable' && status.mfa_required) throw new Error('Esta acción no está disponible para tu cuenta.');
    const result = await accessRequest<RecoveryResult>(`/auth/mfa/${action}`, proof, true);
    if (action === 'disable') { clearSession(); navigate('/login', { replace: true }); }
    else { setAction(null); setCodes(result.recovery_codes); }
  }
  return <section aria-label="Seguridad de mi cuenta" className="tw:mx-auto tw:max-w-6xl tw:space-y-6">
    <header className={s.panel}><div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div className="tw:space-y-2"><p className="tw:text-xs tw:font-bold tw:uppercase tw:tracking-wider tw:text-brand-ink">Protección del acceso</p><h2 className="tw:text-3xl tw:font-bold tw:tracking-tight">Seguridad de mi cuenta</h2><p className={s.muted}>Consulta tu verificación en dos pasos y gestiona las opciones disponibles para tu cuenta.</p></div>{!codes && <button type="button" className={s.button} disabled={!status && !error || !!action} onClick={reload}>Actualizar estado</button>}</div></header>
    {codes ? <section className={s.panel}><p className={s.warning}>Los códigos anteriores quedaron invalidados. Guarda los nuevos antes de continuar.</p><RecoveryCodes codes={codes} onDone={() => setCodes(null)} variant="console" /></section>
      : error ? <div className={s.panel}><p role="alert" className={s.warning}>{error}</p><button type="button" className={`${s.button} ${s.primary}`} onClick={reload}>Reintentar consulta</button></div>
        : !status ? <p role="status" className={s.notice}>Cargando configuración de seguridad…</p> : <>
          <section className={s.panel} aria-label="Estado de la verificación"><div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3"><div className="tw:space-y-2"><h3 className={s.heading}>Verificación en dos pasos (MFA)</h3><p className={s.muted}>{status.mfa_enabled ? 'Tu autenticador está configurado.' : 'Todavía no has vinculado un autenticador.'}</p></div><span className={`${s.badge} ${status.mfa_enabled ? 'tw:text-positive' : 'tw:text-warning'}`}>{status.mfa_enabled ? 'Activada' : 'Sin configurar'}</span></div><div className={s.notice}><p className="tw:font-semibold tw:text-ink">{status.mfa_required ? 'Obligatoria para tu cuenta' : 'Opcional para tu cuenta'}</p><p className="tw:mt-2">{status.mfa_required ? 'La política de acceso exige MFA; no se puede desactivar desde esta pantalla.' : 'Puedes activar o desactivar la verificación en dos pasos, confirmando tu identidad.'}</p></div></section>
          <div className="tw:grid tw:items-start tw:gap-6 tw:md:grid-cols-2">
            {!status.mfa_enabled ? <section className={s.panel}><h3 className={s.heading}>Configura tu autenticador</h3><p className={s.muted}>Vincula una aplicación autenticadora mediante un QR y confirma su código. Al finalizar obtendrás tus códigos de recuperación.</p><button type="button" className={`${s.button} ${s.primary}`} onClick={() => setAction('setup')}>Configurar autenticador</button></section>
              : <section className={s.panel}><h3 className={s.heading}>Códigos de recuperación</h3><p className={s.muted}>Te permiten acceder si no puedes usar el autenticador. Cada uno funciona una sola vez.</p><p className={s.notice}>Al renovar se invalidan todos los códigos anteriores. Verás y podrás descargar la lista nueva una sola vez.</p><button type="button" className={`${s.button} ${s.primary}`} onClick={() => setAction('recovery-codes')}>Renovar códigos de recuperación</button></section>}
            {status.mfa_enabled && !status.mfa_required && <section className={s.panel}><h3 className={s.heading}>Desactivar la verificación</h3><p className={s.muted}>Tu cuenta dejará de pedir el segundo factor. Se invalidarán el autenticador y los códigos, y se cerrarán las sesiones abiertas.</p><button type="button" className={`${s.button} ${s.danger}`} onClick={() => setAction('disable')}>Desactivar MFA</button></section>}
            <details className={s.panel}><summary className="tw:cursor-pointer tw:font-semibold">¿Autenticador o código de recuperación?</summary><div className="tw:space-y-4"><p className={s.muted}><strong className="tw:text-ink">Autenticador:</strong> usa el código de seis dígitos de tu aplicación. Cambia periódicamente; si ya utilizaste uno, espera al siguiente.</p><p className={s.muted}><strong className="tw:text-ink">Recuperación:</strong> usa uno de los códigos que guardaste. Solo puede utilizarse una vez.</p><p className={s.muted}>Para confirmar una acción necesitas tu contraseña y solo uno de estos dos métodos.</p></div></details>
          </div>
        </>}
    {action && status && <SecurityActionModal key={action} action={action} status={status} onConfirm={confirm} onClose={() => setAction(null)} />}
  </section>;
}
