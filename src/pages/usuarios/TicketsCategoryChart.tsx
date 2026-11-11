import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TicketCategory } from '../../api/usersSupport';
import { CATEGORY_COLORS } from '../../lib/ticketMeta';

export function TicketsCategoryChart({ categories }: { categories: TicketCategory[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, categories.length * 52)}>
      <BarChart data={categories} layout="vertical" margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 13, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => [Number(value).toLocaleString('es-CL'), 'Tickets']}
          contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: 12, color: 'var(--ink)' }}
          itemStyle={{ color: 'var(--ink)' }} cursor={{ fill: 'var(--surface-muted)' }} />
        <Bar dataKey="count" maxBarSize={28} radius={[0, 6, 6, 0]}>
          {categories.map(category => <Cell key={category.category} fill={CATEGORY_COLORS[category.category] ?? '#c9d2de'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
