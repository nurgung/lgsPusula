import type { SpeciesCode } from "../species";

const SIZE_CLASS = {
  48: "h-12 w-12",
  96: "h-24 w-24",
  112: "h-28 w-28",
} as const;

/** Shape distinguishes the species. The name next to it carries the meaning. */
export function MascotMark({
  code,
  size = 48,
}: {
  code: SpeciesCode;
  size?: keyof typeof SIZE_CLASS;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 text-brand-700 ${SIZE_CLASS[size]}`}
    >
      {code === "cat" ? (
        <>
          <circle cx="24" cy="28" r="12" fill="currentColor" />
          <path d="M12 22 L16 8 L22 20 M36 22 L32 8 L26 20" fill="currentColor" />
        </>
      ) : null}
      {code === "turtle" ? (
        <>
          <ellipse cx="24" cy="26" rx="14" ry="10" fill="currentColor" />
          <circle cx="38" cy="22" r="4" fill="currentColor" />
        </>
      ) : null}
      {code === "sparrow" ? (
        <>
          <circle cx="22" cy="26" r="10" fill="currentColor" />
          <path d="M30 26 L42 22 L30 32 Z" fill="currentColor" />
        </>
      ) : null}
      {code === "daisy" ? (
        <>
          <circle
            cx="24"
            cy="14"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            cx="34"
            cy="24"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="34"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            cx="14"
            cy="24"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle cx="24" cy="24" r="4" fill="currentColor" />
        </>
      ) : null}
      {code === "sapling" ? (
        <>
          <path d="M24 40 V18" stroke="currentColor" strokeWidth="3" />
          <path d="M24 28 C16 26 14 18 18 16 C20 22 24 24 24 28" fill="currentColor" />
          <path d="M24 22 C32 20 34 12 30 10 C28 16 24 18 24 22" fill="currentColor" />
        </>
      ) : null}
    </svg>
  );
}
