import type { CommercialMetadata } from '../../api/commercial';

export function analyticsDate(value: string | null | undefined): string {
  if (!value) return 'Sin datos';
  if (value.length === 10) return value.split('-').reverse().join('/');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin datos';
  return date.toLocaleString('es-CL', {
    timeZone: 'America/Santiago', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function AnalyticsMetadata({ value }: { value: CommercialMetadata }) {
  const missing = value.freshness?.sources.some(source => source.missing);
  const stale = value.freshness?.sources.some(source => source.stale && !source.missing);
  return <div className="tw:mt-5 tw:space-y-3 tw:border-0 tw:border-t tw:border-solid tw:border-stroke tw:pt-4 tw:text-sm tw:leading-relaxed">
    <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-2 tw:gap-y-1">
      <span className="tw:font-medium tw:text-muted">Última actualización de los indicadores</span>
      <span className="tw:font-semibold tw:text-ink">{value.computed_at ? analyticsDate(value.computed_at) : 'Fecha aún no disponible'}</span>
      {value.computed_at && <span className="tw:text-muted">(hora de Santiago)</span>}
    </div>
    {(value.freshness?.calculation_stale || missing || stale) && <div role="status" className="tw:space-y-1 tw:rounded-xl tw:bg-warning-bg tw:px-4 tw:py-3 tw:text-ink">
      {value.freshness?.calculation_stale && <p>La última actualización tiene más de 24 horas. Puede haber cambios que aún no se reflejen aquí.</p>}
      {missing && <p>Falta información para completar algunos indicadores.</p>}
      {stale && <p>Parte de la información lleva más de 24 horas sin actualizarse.</p>}
    </div>}
  </div>;
}
