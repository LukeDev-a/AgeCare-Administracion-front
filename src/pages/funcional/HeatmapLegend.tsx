import { HEAT_RAMP_SWATCHES } from '../../lib/heatmap';

export function HeatmapLegend({ statesAvailable = true }: { statesAvailable?: boolean }) {
  return (
    <div className="legend" style={{ marginTop: 12 }}>
      <span>Adopción: 0%</span>
      {HEAT_RAMP_SWATCHES.map((color, index) => (
        <span key={index} style={{ width: 26, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />
      ))}
      <span>100%</span>
      {statesAvailable && <>
        <span style={{ marginLeft: 14 }}>No aplica: función no disponible para ese perfil</span>
        <span>No calculable: faltan datos o usuarios activos para obtener el porcentaje</span>
        <span>0 %: cálculo válido con uso registrado en cero</span>
      </>}
    </div>
  );
}
