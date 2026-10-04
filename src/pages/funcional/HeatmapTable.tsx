import type { FeatureAdoption } from '../../api/features';
import { featureRoleName } from '../../lib/featureRoleMeta';
import { heatColor, heatInk } from '../../lib/heatmap';

export function HeatmapTable({ data }: { data: FeatureAdoption }) {
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
          <tr key={feature.name}>
            <th className="rowh">{feature.name}</th>
            {feature.adoption.map((rate, index) => {
              if (rate === null) {
                return (
                  <td key={index} className="na" title="No disponible para este rol">
                    —
                  </td>
                );
              }
              const value = rate * 100;
              const display = value.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + '%';
              return (
                <td
                  key={index}
                  style={{ background: heatColor(value), color: heatInk(value) }}
                  title={`${feature.name} — ${featureRoleName(data.roles[index])}: ${display} de los activos del rol`}
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