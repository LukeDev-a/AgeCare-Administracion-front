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
    <table className="heat">
      <thead>
        <tr>
          <th />
          {data.roles.map(role => (
            <th key={role}>{featureRoleName(role)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.features.map(feature => (
          <tr key={feature.feature_key}>
            <th className="rowh">{feature.name}</th>
            {feature.adoption.map((rate, index) => {
              const details = feature.calculation_details?.[index];
              if (details?.status === 'not_applicable' || details?.status === 'not_calculable') {
                const label = details.status === 'not_applicable' ? 'No aplica' : 'No calculable';
                return <td key={index} className="na" title={featureCalculationReason(details.reason)}>
                  {label}{details.status === 'not_calculable' && <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4 }}>{featureCalculationReason(details.reason)}</div>}
                </td>;
              }
              if (rate == null) return <td key={index} className="na" title="Estado de cálculo sin informar">Sin datos</td>;
              const value = rate * 100;
              const display = adoptionPercent(rate);
              return (
                <td
                  key={index}
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
