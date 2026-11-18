import type { OpsComponent } from '../../api/operational';
import { fmt, formatUptime, percent } from '../../lib/format';
import { getOpsStatus } from '../../lib/statusMeta';
import { opsDate, opsOrigin, opsMeasurement } from '../../lib/operationalMeta';

export function OpsComponentCard({ component }: { component: OpsComponent }) {
  const disconnected = component.freshness === 'not_integrated';
  const stale = component.freshness === 'stale';
  const real = component.data_origin === 'real' && component.freshness !== 'stored';
  const status = getOpsStatus(disconnected || stale ? null : component.status);
  const label = disconnected ? 'Sin mediciones conectadas' : stale ? 'Sin datos recientes'
    : component.freshness === 'no_data' ? 'Esperando mediciones' : status.label;
  const latencyValue = (value: number | null) => value == null ? (real ? 'Sin muestras suficientes' : 'Sin datos') : `${fmt(value)} ms`;
  const observationLabel = component.measurement_source === 'database_probe' ? 'Comprobaciones correctas' : 'Solicitudes sin error técnico';

  return (
    <article className="tw:flex tw:min-w-0 tw:flex-col tw:gap-4 tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:leading-relaxed">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3">
        <div>
          <h3 className="tw:text-base tw:font-bold">{component.name}</h3>
        </div>
        <span className={`chip ${status.className} tw:text-sm`}>{label}</span>
      </div>
      {!disconnected && <div className="tw:grid tw:grid-cols-2 tw:gap-4">
        <div>
          <p className="tw:text-sm tw:text-muted">{real ? `${observationLabel} · última hora` : 'Disponible en los últimos 30 días'}</p>
          <p className="tw:mt-2 tw:text-2xl tw:font-bold tw:tabular-nums">{real
            ? component.observed_success_rate == null ? 'Sin datos' : percent(component.observed_success_rate)
            : component.uptime_30d == null ? 'Sin historial suficiente' : formatUptime(component.uptime_30d)}</p>
        </div>
        <div>
          <p className="tw:text-sm tw:text-muted">Tiempo de respuesta p95 · última hora</p>
          <p className="tw:mt-2 tw:text-xl tw:font-bold tw:tabular-nums">{latencyValue(component.latency_p95_ms)}</p>
        </div>
      </div>}
      {component.note && !disconnected && <p className="tw:rounded-xl tw:bg-canvas tw:p-3 tw:text-sm">{component.note}</p>}
      {disconnected && <p className="tw:text-sm tw:text-muted">Este servicio todavía no tiene una fuente de mediciones integrada.</p>}
      <details className="tw:mt-auto tw:border-0 tw:border-t tw:border-solid tw:border-stroke tw:pt-3 tw:text-sm tw:text-muted">
        <summary className="tw:min-h-8 tw:cursor-pointer tw:font-semibold tw:text-brand-ink">Entender estas mediciones</summary>
        <div className="tw:mt-4 tw:space-y-4">
          <div><p className="tw:font-semibold tw:text-ink">Qué estamos midiendo</p><p className="tw:mt-1">{opsMeasurement(component.measurement_source ?? component.measurement_kind)}{disconnected ? '.' : ' durante la última hora.'}</p></div>
          {real && <>
            <p>{component.sample_count ?? 0} mediciones en la última hora. Los tiempos p50 y p95 requieren al menos {component.minimum_samples ?? 20} mediciones correctas.</p>
            {component.successful_sample_count != null && <p>Mediciones correctas disponibles: {component.successful_sample_count}.</p>}
            <p>El porcentaje se calcula sobre las mediciones realizadas. No representa disponibilidad durante los períodos sin observaciones.</p>
            <p>Disponibilidad medida en los tramos cubiertos de 30 días: {component.uptime_30d == null ? 'sin historial o cobertura suficientes.' : formatUptime(component.uptime_30d)}</p>
            {component.measurement_source === 'database_probe' && component.coverage_ratio != null && <p>Cobertura observada de esos 30 días: {percent(component.coverage_ratio)}. Los intervalos sin mediciones quedan fuera del cálculo.</p>}
            {component.key === 'auth' && <p>Una contraseña o un código incorrectos no se consideran una caída. Se observan respuestas técnicas del acceso a la consola, sin guardar credenciales.</p>}
          </>}
          <div className="tw:rounded-xl tw:bg-canvas tw:p-4">
            <p className="tw:font-semibold tw:text-ink">Tiempo habitual</p>
            <p className="tw:my-1 tw:text-base tw:font-bold tw:text-ink">p50: {latencyValue(component.latency_p50_ms)}</p>
            <p>La mitad de las mediciones termina en este tiempo o menos.</p>
          </div>
          <div className="tw:rounded-xl tw:bg-canvas tw:p-4">
            <p className="tw:font-semibold tw:text-ink">Tiempo para el 95 % de las mediciones</p>
            <p className="tw:my-1 tw:text-base tw:font-bold tw:text-ink">p95: {latencyValue(component.latency_p95_ms)}</p>
            <p>95 de cada 100 mediciones terminan en este tiempo o menos. Las otras 5 tardan más.</p>
          </div>
          <p>Los tiempos se muestran en milisegundos (ms). 1.000 ms equivalen a un segundo. «Sin datos» indica que falta esa medición.</p>
          <dl className="tw:space-y-3 tw:border-0 tw:border-t tw:border-solid tw:border-stroke tw:pt-4">
            <div><dt className="tw:font-semibold tw:text-ink">Última comprobación</dt><dd className="tw:mt-1">{opsDate(component.checked_at)} · Horario de Santiago</dd></div>
            {real && <div><dt className="tw:font-semibold tw:text-ink">Primera observación disponible</dt><dd className="tw:mt-1">{opsDate(component.first_observed_at)}</dd></div>}
            <div><dt className="tw:font-semibold tw:text-ink">Tipo de datos</dt><dd className="tw:mt-1">{opsOrigin(component.data_origin)}</dd></div>
          </dl>
        </div>
      </details>
    </article>
  );
}
