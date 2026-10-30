import type { FeatureAlert } from '../../api/features';
import { featureRoleName } from '../../lib/featureRoleMeta';
import { adoptionPercent } from '../../lib/featureCalculationMeta';

export function FeatureAlertList({ alerts, expected }: { alerts: FeatureAlert[]; expected: boolean }) {
  if (alerts.some(alert => alert.roles.length !== alert.adoption.length)) {
    return <p role="alert">Los porcentajes de alerta no coinciden con los perfiles recibidos.</p>;
  }
  if (!alerts.length) return <p>{expected ? 'No se informa uso bajo esperado para este umbral.' : 'No hay funciones a revisar con este umbral.'}</p>;
  return <ul className="flag-list">{alerts.map(alert => <li key={alert.feature_key}>
    <span className={`chip ${expected ? 'neutral' : 'warn'}`}>{expected ? 'Uso bajo esperado' : 'Revisar uso bajo'}</span>
    <div><div className="fl-t">{alert.name}</div>
      {alert.roles.map((role, index) => <div className="fl-s" key={role}>{featureRoleName(role)}: {adoptionPercent(alert.adoption[index])}</div>)}
      <div className="fl-s">{alert.note ?? (expected ? 'Clasificada como función de uso poco frecuente esperado.' : 'Adopción informada inferior al umbral seleccionado.')}</div>
    </div>
  </li>)}</ul>;
}
