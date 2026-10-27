import type { CommercialMetadata } from '../../api/commercial';

export function analyticsDate(value: string | null | undefined): string {
  if (!value) return 'Sin datos';
  if (value.length === 10) return value.split('-').reverse().join('/');
  return new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago' });
}

const sourceNames: Record<string, string> = { daily: 'indicadores diarios', hourly: 'indicadores horarios',
  plans: 'planes', accounts: 'cuentas', activity: 'actividad', payments: 'pagos' };

export function AnalyticsMetadata({ value }: { value: CommercialMetadata }) {
  return <div className="mini-note" style={{ marginTop: 10 }}>
    <div>{value.data_origin === 'demo' ? 'Datos de demostración' : value.data_origin === 'real'
      ? 'Datos de fuentes reales' : value.data_origin === 'mixed' ? 'Fuentes no comparables: orígenes diferentes' : 'Origen de datos sin verificar'}</div>
    <div>Calculado: {analyticsDate(value.computed_at)} · Horario de Santiago</div>
    {value.freshness?.calculation_stale && <div role="status">El cálculo tiene más de 24 horas.</div>}
    {value.freshness?.sources.map(source => <div key={source.name}>
      Fuente {sourceNames[source.name] ?? source.name}: {analyticsDate(source.available_through)}
      {source.missing ? ' · Sin fuente disponible' : source.stale ? ' · Desactualizada: más de 24 horas' : ''}
    </div>)}
  </div>;
}
