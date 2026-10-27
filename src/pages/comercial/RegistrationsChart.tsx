import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RegistrationsChartProps {
  labels: string[];
  signups: (number | null)[];
  cancellations: (number | null)[];
}

export function RegistrationsChart({ labels, signups, cancellations }: RegistrationsChartProps) {
  if (labels.length !== signups.length || labels.length !== cancellations.length) {
    return <div role="alert">La fuente entregó series desalineadas. No es posible representar el gráfico.</div>;
  }
  const data = labels.map((label, index) => ({
    label,
    Altas: signups[index],
    Bajas: cancellations[index],
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} axisLine={false} tickLine={false} width={40} />
        <Tooltip formatter={(value) => Number(value).toLocaleString('es-CL')} />
        <Line type="monotone" dataKey="Altas" stroke="#2a78d6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Bajas" stroke="#eb6834" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
