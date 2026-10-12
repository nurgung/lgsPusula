type ProgressMeterProps = {
  label: string;
  value: number;
  max: number;
  unit: string;
};

export function ProgressMeter({ label, value, max, unit }: ProgressMeterProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);
  const valueText = `${value} / ${max} ${unit}`;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span className="font-semibold text-ink-900">{label}</span>
        <span className="text-ink-700">{valueText}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-brand-100"
      >
        <div
          className="h-full rounded-full bg-brand-600"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
