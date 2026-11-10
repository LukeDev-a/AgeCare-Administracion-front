import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LatencyComponent } from '../../api/operational';

export function LatencyChart({ components }: { components: LatencyComponent[] }) {
  const data = components.map(component => ({ name: component.name, p95: component.p95_ms }));

  return (
    <ResponsiveContainer width="100%" height={components.length * 40 + 20}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--ink-soft)' }} tickFormatter={value => `${value} ms`} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 13, fill: 'var(--ink)' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--line)', borderRadius: 12, color: 'var(--ink)' }} formatter={(value) => [`${Number(value).toLocaleString('es-CL')} ms`, 'Tiempo p95']} />
        <Bar dataKey="p95" fill="#3987e5" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
