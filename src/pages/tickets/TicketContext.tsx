const LABELS: Record<string, string> = {
  patients: 'Personas a su cuidado', display_name: 'Nombre', devices: 'Dispositivos',
  platform: 'Sistema del dispositivo', app_version: 'Versión de la aplicación',
  plan: 'Plan', os: 'Sistema operativo', device: 'Dispositivo',
};

export function TicketContext({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span>Sin datos</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Sí' : 'No'}</span>;
  if (Array.isArray(value)) return value.length ? <ul>{value.map((item, index) => <li key={index}><TicketContext value={item} /></li>)}</ul> : <span>Sin registros</span>;
  if (typeof value === 'object') return <dl>{Object.entries(value).map(([key, item]) => <div key={key}>
    <dt>{LABELS[key] ?? key.replaceAll('_', ' ')}</dt><dd><TicketContext value={item} /></dd>
  </div>)}</dl>;
  return <span>{String(value)}</span>;
}
