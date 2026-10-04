import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LatencyComponent } from '../../api/operational';

export function LatencyChart({ components }: { components: LatencyComponent[] }) {
  const data = components.map(component => ({ name: component.name, p95: component.p95_ms }));

  return (
    <ResponsiveContainer width="100%" height={components.length * 40 + 20}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12, fill: 'var(--ink)' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => `${Number(value).toLocaleString('es-CL')} ms`} />
        <Bar dataKey="p95" fill="#3987e5" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
