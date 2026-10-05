import type { MfaSetup } from '../api/accountAccess';

export function MfaProvision({ setup }: { setup: MfaSetup }) {
  if (!setup.secret) return null;
  return <div className="mfa-provision"><p>Agrega AgeCare a tu aplicación autenticadora escaneando el QR. Después escribe el código de seis dígitos que muestra la aplicación.</p>
    {setup.qr_data_url && <img className="mfa-qr" src={setup.qr_data_url} alt="Código QR para configurar tu autenticador de AgeCare" />}
    <p className="card-sub">También puedes ingresar esta clave manualmente:</p><code className="mfa-secret">{setup.secret}</code>
  </div>;
}
