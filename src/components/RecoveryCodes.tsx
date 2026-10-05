import { useState } from 'react';

export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  function download() {
    const url = URL.createObjectURL(new Blob(['Códigos de recuperación de AgeCare\nCada código puede utilizarse una sola vez.\n\n' + codes.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'agecare-codigos-recuperacion.txt';
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="login-form"><h2>Guarda tus códigos de recuperación</h2><p>Te permiten iniciar sesión si pierdes acceso a tu autenticador. Cada código funciona una sola vez y esta lista no vuelve a mostrarse.</p>
    <div className="recovery-codes">{codes.map(code => <code key={code}>{code}</code>)}</div>
    <button className="theme-toggle" type="button" onClick={download}>Descargar códigos</button>
    <label className="mfa-check"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} />He guardado mis códigos en un lugar seguro</label>
    <button className="login-submit" type="button" disabled={!saved} onClick={onDone}>Continuar</button>
  </div>;
}
