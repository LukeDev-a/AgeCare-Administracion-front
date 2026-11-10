import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FunnelStage } from '../../api/commercial';
import { fmt, percent } from '../../lib/format';

const FUNNEL_COLORS = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  if (!stages.length || stages.some(stage => stage.users == null || stage.unavailable_reason === 'not_comparable')) return <div className="tw:my-5 tw:rounded-xl tw:bg-canvas tw:p-5 tw:text-muted">Sin datos comparables para representar todas las etapas.</div>;
  const data = stages.map(stage => ({ name: stage.name, users: stage.users, rate: stage.rate_vs_first }));

  return (
    <ResponsiveContainer width="100%" height={stages.length * 46 + 20}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 13, fill: 'var(--ink)' }} axisLine={false} tickLine={false} />
        <Tooltip
            contentStyle={{ background: 'var(--surface)', borderColor: 'var(--line)', borderRadius: 12, color: 'var(--ink)' }}
            formatter={(value, _name, item) => {
            const rate = (item.payload as { rate: number | null }).rate;
            return [`${fmt(Number(value))}${rate != null ? ' · ' + percent(rate) + ' de las cuentas creadas' : ''}`, 'Cuentas'];
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
