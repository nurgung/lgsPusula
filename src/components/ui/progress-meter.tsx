type ProgressMeterProps = {
  label: string;
  value: number;
  max: number;
  unit: string;
  /** `strong` is at least 16px. Other screens keep the shorter bar. */
  size?: "regular" | "strong";
};

// Full class names so Tailwind can see them. The bar is rounded to 5 points;
// the text beside it keeps the exact count. No inline style (production CSP).
const BAR_WIDTH: Record<number, string> = {
  0: "w-0",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-full",
};

function barWidth(percent: number): string {
  const step = Math.min(100, Math.max(0, Math.round(percent / 5) * 5));
  return BAR_WIDTH[step] ?? "w-0";
}

export function ProgressMeter({
  label,
  value,
  max,
  unit,
  size = "regular",
}: ProgressMeterProps) {
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
        className={
          size === "strong"
            ? "mt-2 h-5 w-full overflow-hidden rounded-full bg-brand-100"
            : "mt-2 h-3 w-full overflow-hidden rounded-full bg-brand-100"
        }
      >
        <div className={`h-full rounded-full bg-brand-600 ${barWidth(percent)}`} />
      </div>
    </div>
  );
}
