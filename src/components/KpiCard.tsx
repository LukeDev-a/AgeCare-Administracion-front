interface KpiCardProps {
  label: string;
  value: string;
  deltaText?: string;
  deltaClass?: string;
  note?: string;
}

export function KpiCard({ label, value, deltaText, deltaClass, note }: KpiCardProps) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {deltaText && <div className={`kpi-delta ${deltaClass ?? ''}`}>{deltaText}</div>}
      {note && <div className="kpi-note">{note}</div>}
    </div>
  );
}