interface Period<T extends string | number> {
  key: T;
  label: string;
}

interface PeriodSelectorProps<T extends string | number> {
  periods: readonly Period<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function PeriodSelector<T extends string | number >({ periods, value, onChange }: PeriodSelectorProps<T>) {
  return (
    <div className="seg" role="tablist" aria-label="Selector de periodo">
      {periods.map(period => (
        <button
          key={period.key}
          type="button"
          role="tab"
          className={period.key === value ? 'on' : ''}
          onClick={() => onChange(period.key)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}