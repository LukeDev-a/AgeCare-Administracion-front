import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CommercialPlan } from '../../api/commercial';
import { PLAN_COLORS } from './planColors';

interface PlanMixChartProps {
  plans: CommercialPlan[];
}

export function PlanMixChart({ plans }: PlanMixChartProps) {
  const row: Record<string, number | string> = { name: 'Cantidad registrada por plan' };
  plans.forEach(plan => {
    row[plan.name] = plan.users;
  });

  return <div className="tw:mt-5">
    <div className="tw:flex tw:flex-wrap tw:gap-x-6 tw:gap-y-2 tw:text-sm tw:font-medium">
      {plans.map(plan => <span key={plan.plan_code} className="tw:inline-flex tw:items-center tw:gap-2">
        <span aria-hidden="true" className="tw:h-3 tw:w-3 tw:rounded-sm" style={{ background: PLAN_COLORS[plan.plan_code] ?? '#c9d2de' }} />{plan.name}
      </span>)}
    </div>
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={[row]} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--line)', borderRadius: 12, color: 'var(--ink)' }} formatter={(value) => Number(value).toLocaleString('es-CL')} />
        {plans.map(plan => (
          <Bar key={plan.plan_code} dataKey={plan.name} stackId="plans" fill={PLAN_COLORS[plan.plan_code] ?? '#c9d2de'} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
