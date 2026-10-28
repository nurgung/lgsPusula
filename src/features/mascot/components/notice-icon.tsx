import { cn } from "@/lib/cn";

const TONE = {
  brand: "bg-brand-100 text-brand-800",
  warm: "bg-warning-50 text-warning-800",
} as const;

/** Round bell chip in front of an in-app notice. The title and text carry the meaning. */
export function NoticeIcon({ tone = "brand" }: { tone?: keyof typeof TONE }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-pill",
        TONE[tone],
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </svg>
    </span>
  );
}
