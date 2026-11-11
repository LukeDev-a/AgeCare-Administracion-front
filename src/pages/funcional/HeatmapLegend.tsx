import { HEAT_RAMP_SWATCHES } from '../../lib/heatmap';

export function HeatmapLegend({ statesAvailable = true }: { statesAvailable?: boolean }) {
  return (
    <div className="tw:space-y-5 tw:rounded-xl tw:bg-canvas tw:p-5 tw:text-sm tw:leading-relaxed">
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      <span>Adopción: 0%</span>
      {HEAT_RAMP_SWATCHES.map((color, index) => (
        <span key={index} style={{ width: 26, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />
      ))}
      <span>100%</span>
      </div>
      <p className="tw:text-muted">Cuanto más intenso es el color, mayor es el porcentaje de uso. El número permite comparar sin depender del color.</p>
      {statesAvailable && <dl className="tw:grid tw:gap-5 tw:lg:grid-cols-3">
        <div><dt className="tw:font-bold tw:text-ink">No aplica</dt><dd className="tw:mt-1 tw:text-muted">La función no está disponible para ese perfil.</dd></div>
        <div><dt className="tw:font-bold tw:text-ink">No calculable</dt><dd className="tw:mt-1 tw:text-muted">No calculable indica que faltan datos o usuarios activos para obtener el porcentaje. La celda explica el motivo.</dd></div>
        <div><dt className="tw:font-bold tw:text-ink">0 %</dt><dd className="tw:mt-1 tw:text-muted">0 %: cálculo válido con uso registrado en cero. No equivale a datos faltantes.</dd></div>
      </dl>}
    </div>
  );
}
