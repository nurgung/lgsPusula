type ProgressMeterProps = {
  label: string;
  value: number;
  max: number;
  unit: string;
  /**
   * `regular` is the short bar. `strong` is at least 16px.
   * `hero` keeps the same count and bar, with a larger figure for the daily goal.
   */
  size?: "regular" | "strong" | "hero";
  /**
   * `brand` is the soft teal track. `quiet` is a neutral track so an empty
   * goal does not look filled. The fill still uses the real percent.
   */
  track?: "brand" | "quiet";
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

const TRACK = {
  regular: "mt-2 h-3 w-full overflow-hidden rounded-full",
  strong: "mt-2 h-5 w-full overflow-hidden rounded-full",
  hero: "mt-3 h-5 w-full overflow-hidden rounded-full",
} as const;

const TRACK_COLOR = {
  brand: "bg-brand-100",
  quiet: "bg-border",
} as const;

export function ProgressMeter({
  label,
  value,
  max,
  unit,
  size = "regular",
  track = "brand",
}: ProgressMeterProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);
  const valueText = `${value} / ${max} ${unit}`;

  return (
    <div>
      {size === "hero" ? (
        <div className="grid gap-1">
          <span className="text-sm font-semibold text-ink-700">{label}</span>
          <p className="flex flex-wrap items-baseline gap-x-2 text-ink-900">
            <span className="text-4xl font-extrabold tabular-nums leading-none">{value}</span>
            <span className="text-lg font-bold text-ink-700">{` / ${max} ${unit}`}</span>
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
          <span className="font-semibold text-ink-900">{label}</span>
          <span className="text-ink-700">{valueText}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
        className={`${TRACK[size]} ${TRACK_COLOR[track]}`}
      >
        <div className={`h-full rounded-full bg-brand-600 ${barWidth(percent)}`} />
      </div>
    </div>
  );
}
