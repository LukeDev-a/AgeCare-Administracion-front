import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TicketCategory } from '../../api/usersSupport';
import { CATEGORY_COLORS } from '../../lib/ticketMeta';

export function TicketsCategoryChart({ categories }: { categories: TicketCategory[] }) {
  const row: Record<string, number | string> = { name: 'Tickets' };
  categories.forEach(category => {
    row[category.name] = category.count;
  });

  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={[row]} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip formatter={(value) => Number(value).toLocaleString('es-CL')} />
        {categories.map(category => (
          <Bar key={category.category} dataKey={category.name} stackId="categories" fill={CATEGORY_COLORS[category.category] ?? '#c9d2de'} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}