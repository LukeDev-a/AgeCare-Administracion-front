import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RolesWeekly } from '../../api/usersSupport';
import { ROLE_META } from '../../lib/roleMeta';

export function RoleWeeklyChart({ weekly }: { weekly: RolesWeekly }) {
  const data = weekly.weeks.map((week, index) => {
    const row: Record<string, string | number> = { week };
    weekly.series.forEach(series => {
      row[ROLE_META[series.role].name] = series.values[index] ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} axisLine={false} tickLine={false} width={40} />
        <Tooltip formatter={(value) => Number(value).toLocaleString('es-CL')} />
        {weekly.series.map(series => (
          <Line
            key={series.role}
            type="monotone"
            dataKey={ROLE_META[series.role].name}
            stroke={ROLE_META[series.role].color}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}