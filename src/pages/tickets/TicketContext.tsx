const LABELS: Record<string, string> = {
  patients: 'Personas a su cuidado', display_name: 'Nombre', devices: 'Dispositivos',
  platform: 'Sistema del dispositivo', app_version: 'Versión de la aplicación',
  plan: 'Plan', os: 'Sistema operativo', device: 'Dispositivo',
};

export function TicketContext({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span>Sin datos</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Sí' : 'No'}</span>;
  if (Array.isArray(value)) return value.length ? <ul className="tw:space-y-3">{value.map((item, index) => <li key={index}><TicketContext value={item} /></li>)}</ul> : <span>Sin registros</span>;
  if (typeof value === 'object') return <dl className="tw:grid tw:gap-4">{Object.entries(value).map(([key, item]) => <div key={key} className="tw:rounded-lg tw:border tw:border-solid tw:border-stroke tw:p-4">
    <dt className="tw:mb-2 tw:font-semibold">{LABELS[key] ?? key.replaceAll('_', ' ')}</dt><dd className="tw:break-words tw:text-muted"><TicketContext value={item} /></dd>
  </div>)}</dl>;
  return <span>{String(value)}</span>;
}
