import type { FeatureAlert } from '../../api/features';
import { featureRoleName } from '../../lib/featureRoleMeta';
import { adoptionPercent } from '../../lib/featureCalculationMeta';

export function FeatureAlertList({ alerts, expected }: { alerts: FeatureAlert[]; expected: boolean }) {
  if (alerts.some(alert => alert.roles.length !== alert.adoption.length)) {
    return <p role="alert">Los porcentajes de alerta no coinciden con los perfiles recibidos.</p>;
  }
  if (!alerts.length) return <p className="tw:rounded-xl tw:bg-canvas tw:p-5 tw:text-muted">{expected ? 'No se informa uso bajo esperado para este umbral.' : 'No hay funciones a revisar con este umbral.'}</p>;
  return <ul className="tw:grid tw:list-none tw:gap-4 tw:lg:grid-cols-2">{alerts.map(alert => <li key={alert.feature_key} className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:p-5">
    <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3">
      <h4 className="tw:text-lg tw:font-semibold">{alert.name}</h4>
      <span className={`tw:rounded-full tw:px-3 tw:py-1 tw:text-sm tw:font-semibold ${expected ? 'tw:bg-panel tw:text-muted' : 'tw:bg-warning-bg tw:text-ink'}`}>{expected ? 'Uso bajo esperado' : 'Revisar uso bajo'}</span>
    </div>
    <div className="tw:my-4 tw:flex tw:flex-wrap tw:gap-2">{alert.roles.map((role, index) => <span className="tw:rounded-lg tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-3 tw:py-2 tw:font-medium" key={role}>{featureRoleName(role)}: {adoptionPercent(alert.adoption[index])}</span>)}</div>
    <p className="tw:leading-relaxed tw:text-muted">{alert.note ?? (expected ? 'Clasificada como función de uso poco frecuente esperado.' : 'Adopción informada inferior al umbral seleccionado.')}</p>
  </li>)}</ul>;
}
