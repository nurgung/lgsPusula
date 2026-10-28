/**
 * Soft sky, hills and clouds behind the character. Decorative only: no text, no data,
 * hidden from assistive technology. Fills use design tokens, so there are no new colors.
 */
export function HeroScene() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 900 320"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-0 -z-10 size-full"
    >
      <circle className="fill-warning-50" cx="96" cy="64" r="26" />
      <ellipse className="fill-surface/70" cx="300" cy="70" rx="64" ry="13" />
      <ellipse className="fill-surface/60" cx="338" cy="58" rx="40" ry="11" />
      <ellipse className="fill-surface/70" cx="640" cy="46" rx="52" ry="11" />
      <path
        className="fill-brand-200/55"
        d="M220 320 L400 92 L486 196 L580 112 L760 320 Z"
      />
      <path
        className="fill-brand-100/90"
        d="M420 320 L610 150 L700 238 L770 176 L900 290 V320 Z"
      />
      <path
        className="fill-success-50/90"
        d="M0 320 V262 Q180 226 380 258 T900 250 V320 Z"
      />
    </svg>
  );
}
