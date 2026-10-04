import { HEAT_RAMP_SWATCHES } from '../../lib/heatmap';

export function HeatmapLegend() {
  return (
    <div className="legend" style={{ marginTop: 12 }}>
      <span>Adopción: 0%</span>
      {HEAT_RAMP_SWATCHES.map((color, index) => (
        <span key={index} style={{ width: 26, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />
      ))}
      <span>100%</span>
      <span style={{ marginLeft: 14 }}>— = no disponible para el rol</span>
    </div>
  );
}