import type { FeatureAdoption } from '../../api/features';
import { featureRoleName } from '../../lib/featureRoleMeta';
import { heatColor, heatInk } from '../../lib/heatmap';
import { adoptionPercent, featureCalculationReason } from '../../lib/featureCalculationMeta';

export function HeatmapTable({ data }: { data: FeatureAdoption }) {
  if (data.features.some(feature => feature.adoption.length !== data.roles.length
    || (feature.calculation_details != null && (feature.calculation_details.length !== data.roles.length
      || feature.calculation_details.some((detail, index) => detail.role !== data.roles[index]))))) {
    return <p role="alert">Los porcentajes no coinciden con los perfiles recibidos. No se puede representar la matriz.</p>;
  }
  if (!data.features.length || !data.roles.length) return <p>Sin datos de adopción para este período.</p>;
  return (
    <table className="tw:w-full tw:min-w-[720px] tw:border-collapse tw:text-sm tw:[&_th]:px-5 tw:[&_th]:py-5 tw:[&_td]:border tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-5 tw:[&_td]:py-5 tw:[&_td]:text-center">
      <thead>
        <tr>
          <th scope="col" className="tw:bg-canvas tw:text-left tw:font-semibold">Funcionalidad</th>
          {data.roles.map(role => (
            <th key={role} scope="col" className="tw:min-w-36 tw:bg-canvas tw:font-semibold">{featureRoleName(role)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.features.map(feature => (
          <tr key={feature.feature_key}>
            <th scope="row" className="tw:border-t tw:border-solid tw:border-stroke tw:text-left tw:font-semibold">{feature.name}</th>
            {feature.adoption.map((rate, index) => {
              const details = feature.calculation_details?.[index];
              if (details?.status === 'not_applicable' || details?.status === 'not_calculable') {
                const label = details.status === 'not_applicable' ? 'No aplica' : 'No calculable';
                return <td key={index} className="tw:bg-canvas tw:text-muted" title={featureCalculationReason(details.reason)}>
                  <span className="tw:font-semibold">{label}</span>{details.status === 'not_calculable' && <div className="tw:mt-2 tw:text-sm tw:leading-relaxed">{featureCalculationReason(details.reason)}</div>}
                </td>;
              }
              if (rate == null) return <td key={index} className="tw:bg-canvas tw:text-muted" title="Estado de cálculo sin informar">Sin datos</td>;
              const value = rate * 100;
              const display = adoptionPercent(rate);
              return (
                <td
                  key={index}
                  className="tw:text-base tw:font-bold tw:tabular-nums"
                  style={{ background: heatColor(value), color: heatInk(value) }}
                  title={`${feature.name} — ${featureRoleName(data.roles[index])}: ${display} informado para los activos del perfil`}
                >
                  {display}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
