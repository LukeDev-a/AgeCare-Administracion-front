import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FunnelStage } from '../../api/commercial';
import { fmt, percent } from '../../lib/format';

const FUNNEL_COLORS = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const data = stages.map(stage => ({ name: stage.name, users: stage.users, rate: stage.rate_vs_first }));

  return (
    <ResponsiveContainer width="100%" height={stages.length * 46 + 20}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: 'var(--ink)' }} axisLine={false} tickLine={false} />
        <Tooltip
            formatter={(value, _name, item) => {
            const rate = (item.payload as { rate: number | null }).rate;
            return [`${fmt(Number(value))}${rate != null ? ' · ' + percent(rate) : ''}`, 'Usuarios'];
            }}
        />
        <Bar dataKey="users" radius={[0, 6, 6, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={FUNNEL_COLORS[index] ?? '#3987e5'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}