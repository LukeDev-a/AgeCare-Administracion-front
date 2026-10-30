import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RolesWeekly } from '../../api/usersSupport';
import { ROLE_META } from '../../lib/roleMeta';
import { weeklyRangeLabel, weeklyShortLabel } from '../../lib/usersSupportMeta';

export function RoleWeeklyChart({ weekly }: { weekly: RolesWeekly }) {
  if (weekly.series.some(series => series.values.length !== weekly.weeks.length)
    || (weekly.week_details != null && weekly.week_details.length !== weekly.weeks.length)) {
    return <div role="alert">Las series no coinciden con las semanas recibidas. No se puede representar el gráfico.</div>;
  }
  if (!weekly.weeks.length || !weekly.series.length) return <p>Sin datos de actividad semanal.</p>;
  const data = weekly.weeks.map((week, index) => {
    const period = weekly.week_details?.[index];
    const row: Record<string, string | number> = { week: period ? weeklyShortLabel(period) : week,
      range: period ? weeklyRangeLabel(period) + (period.is_current_week ? ' · En curso · datos parciales' : '') : week };
    weekly.series.forEach(series => {
      row[ROLE_META[series.role]?.name ?? series.role] = series.values[index];
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 16 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="week" minTickGap={30} height={55} tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} axisLine={false} tickLine={false} width={40} />
        <Tooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.range ?? label}
          formatter={(value) => Number(value).toLocaleString('es-CL')} />
        {weekly.series.map(series => (
          <Line
            key={series.role}
            type="monotone"
            dataKey={ROLE_META[series.role]?.name ?? series.role}
            stroke={ROLE_META[series.role]?.color ?? 'var(--ink)'}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
