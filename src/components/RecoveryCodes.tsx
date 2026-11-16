import { useState } from 'react';

export function RecoveryCodes({ codes, onDone, variant = 'access' }: { codes: string[]; onDone: () => void; variant?: 'access' | 'console' }) {
  const [saved, setSaved] = useState(false);
  function download() {
    const url = URL.createObjectURL(new Blob(['Códigos de recuperación de AgeCare\nCada código puede utilizarse una sola vez.\n\n' + codes.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'agecare-codigos-recuperacion.txt';
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (variant === 'console') return <div className="tw:space-y-5">
    <h2 className="tw:text-xl tw:font-bold">Guarda tus códigos de recuperación</h2>
    <p className="tw:text-sm tw:leading-relaxed tw:text-muted">Te permiten iniciar sesión si pierdes acceso a tu autenticador. Cada código funciona una sola vez y esta lista no vuelve a mostrarse.</p>
    <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-3">{codes.map(code => <code key={code} className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:p-4 tw:text-center tw:font-mono tw:text-base tw:select-all tw:[overflow-wrap:anywhere]">{code}</code>)}</div>
    <button className={button} type="button" onClick={download}>Descargar códigos</button>
    <label className="tw:flex tw:cursor-pointer tw:items-start tw:gap-3 tw:rounded-xl tw:bg-canvas tw:p-4 tw:text-sm"><input className="tw:mt-0.5 tw:size-5 tw:shrink-0" type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} />He guardado mis códigos en un lugar seguro</label>
    <button className={button} type="button" disabled={!saved} onClick={onDone}>Continuar</button>
  </div>;
  return <div className="login-form"><h2>Guarda tus códigos de recuperación</h2><p>Te permiten iniciar sesión si pierdes acceso a tu autenticador. Cada código funciona una sola vez y esta lista no vuelve a mostrarse.</p>
    <div className="recovery-codes">{codes.map(code => <code key={code}>{code}</code>)}</div>
    <button className="theme-toggle" type="button" onClick={download}>Descargar códigos</button>
    <label className="mfa-check"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} />He guardado mis códigos en un lugar seguro</label>
    <button className="login-submit" type="button" disabled={!saved} onClick={onDone}>Continuar</button>
  </div>;
}

const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-ink tw:enabled:border-brand tw:enabled:bg-brand-soft tw:enabled:text-brand-ink tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
