import type { SpeciesCode } from "../species";
import "./species-figure.css";

/**
 * Flat, outlined SVG characters. One bold outline, few shapes and big eyes keep
 * each species readable at 48 px and at hero size. Colors come from design tokens
 * in `species-figure.css`; there are no image files and no scripts.
 */

type Eye = { cx: number; cy: number; rx?: number; ry?: number };

function Eyes({ eyes }: { eyes: readonly Eye[] }) {
  return (
    <g className="species-eyes">
      {eyes.map((eye) => {
        const rx = eye.rx ?? 4.5;
        const ry = eye.ry ?? 6;
        return (
          <g key={`${eye.cx}-${eye.cy}`}>
            <ellipse className="species-fill-ink" cx={eye.cx} cy={eye.cy} rx={rx} ry={ry} />
            <circle
              className="species-fill-white"
              cx={eye.cx - rx * 0.3}
              cy={eye.cy - ry * 0.35}
              r={Math.max(1.3, rx * 0.34)}
            />
          </g>
        );
      })}
    </g>
  );
}

function Blush({ cx, cy }: { cx: number; cy: number }) {
  return <ellipse className="species-fill-blush" cx={cx} cy={cy} rx="6" ry="3.6" />;
}

function Cat() {
  return (
    <>
      <g className="species-cat-tail">
        <path
          className="species-tail-outline"
          d="M82 114 C106 116 112 90 98 80"
        />
        <path className="species-tail-fill species-stroke-orange" d="M82 114 C106 116 112 90 98 80" />
      </g>
      <ellipse className="species-line species-fill-orange species-cat-body" cx="60" cy="106" rx="25" ry="21" />
      <ellipse className="species-fill-cream" cx="60" cy="111" rx="13" ry="13" />
      <ellipse className="species-line species-fill-cream species-cat-paw-l" cx="48" cy="125" rx="9" ry="6" />
      <ellipse className="species-line species-fill-cream species-cat-paw-r" cx="72" cy="125" rx="9" ry="6" />
      <path className="species-line species-fill-orange" d="M29 52 L29 20 L53 36 Z" />
      <path className="species-line species-fill-orange" d="M91 52 L91 20 L67 36 Z" />
      <path className="species-fill-blush" d="M34 42 L34 28 L45 36 Z" />
      <path className="species-fill-blush" d="M86 42 L86 28 L75 36 Z" />
      <ellipse className="species-line species-fill-orange species-cat-head" cx="60" cy="62" rx="35" ry="30" />
      <path className="species-stripe" d="M60 33 V43 M51 35 L53 43 M69 35 L67 43" />
      <Eyes eyes={[{ cx: 46, cy: 62 }, { cx: 74, cy: 62 }]} />
      <Blush cx={36} cy={72} />
      <Blush cx={84} cy={72} />
      <path className="species-line species-fill-blush species-cat-nose" d="M55 70 H65 L60 76 Z" />
      <path className="species-stripe" d="M60 76 Q56 82 50 79 M60 76 Q64 82 70 79" />
      <path className="species-whisker" d="M20 66 L33 69 M20 76 L33 74 M100 66 L87 69 M100 76 L87 74" />
    </>
  );
}

function Turtle() {
  return (
    <>
      <path className="species-line species-fill-lime" d="M18 104 L5 110 L19 113 Z" />
      <ellipse className="species-line species-fill-lime species-turtle-leg-a" cx="34" cy="120" rx="10" ry="8" />
      <ellipse className="species-line species-fill-lime species-turtle-leg-b" cx="76" cy="121" rx="10" ry="8" />
      <g className="species-turtle-head">
        <ellipse className="species-line species-fill-lime" cx="92" cy="96" rx="13" ry="9" />
        <circle className="species-line species-fill-lime" cx="100" cy="76" r="17" />
        <Eyes eyes={[{ cx: 105, cy: 73, rx: 3.6, ry: 5 }]} />
        <Blush cx={104} cy={84} />
        <path className="species-stripe" d="M101 87 Q108 91 113 85" />
      </g>
      <path className="species-line species-fill-green species-turtle-shell" d="M16 106 C14 56 98 54 100 106 Z" />
      <path className="species-shell-pattern" d="M58 66 L72 74 V90 L58 98 L44 90 V74 Z M44 74 L30 80 M72 74 L86 80 M44 90 L32 98 M72 90 L84 98 M58 66 V56" />
      <rect className="species-line species-fill-lime species-turtle-plastron" x="12" y="102" width="92" height="14" rx="7" />
    </>
  );
}

function Sparrow() {
  return (
    <>
      <path className="species-line species-fill-ink-soft species-sparrow-tail" d="M34 92 L6 100 L8 114 L38 106 Z" />
      <path className="species-leg-line" d="M52 112 V124 M70 112 V124" />
      <path className="species-foot-line" d="M46 125 H58 M64 125 H76" />
      <ellipse className="species-line species-fill-brown species-sparrow-body" cx="56" cy="88" rx="33" ry="28" />
      <ellipse className="species-fill-cream species-sparrow-belly" cx="64" cy="98" rx="20" ry="17" />
      <g className="species-sparrow-wing">
        <path className="species-line species-fill-ink-soft" d="M22 84 C30 66 62 70 66 92 C52 102 28 100 22 84 Z" />
        <path className="species-stripe" d="M32 88 Q46 90 58 88" />
      </g>
      <circle className="species-line species-fill-brown species-sparrow-head" cx="78" cy="52" r="23" />
      <path className="species-fill-ink-soft" d="M60 40 C66 26 90 26 98 42 C86 36 72 36 60 40 Z" />
      <path className="species-line species-fill-orange species-sparrow-beak" d="M98 48 L116 55 L98 62 Z" />
      <Eyes eyes={[{ cx: 86, cy: 50, rx: 4, ry: 5.2 }]} />
      <Blush cx={88} cy={63} />
    </>
  );
}

function Platypus() {
  return (
    <>
      <ellipse className="species-line species-fill-slate species-platypus-tail" cx="15" cy="108" rx="14" ry="8" />
      <ellipse className="species-line species-fill-brown species-platypus-body" cx="48" cy="102" rx="36" ry="22" />
      <ellipse className="species-fill-tan" cx="52" cy="112" rx="22" ry="9" />
      <ellipse className="species-line species-fill-slate species-platypus-foot-l" cx="36" cy="124" rx="11" ry="5" />
      <ellipse className="species-line species-fill-slate species-platypus-foot-r" cx="62" cy="124" rx="11" ry="5" />
      <circle className="species-line species-fill-brown species-platypus-head" cx="78" cy="76" r="21" />
      <path
        className="species-line species-fill-slate species-platypus-bill"
        d="M84 76 C98 68 118 72 118 82 C118 92 98 94 84 88 Z"
      />
      <circle className="species-fill-ink" cx="102" cy="78" r="1.8" />
      <circle className="species-fill-ink" cx="110" cy="80" r="1.8" />
      <Eyes eyes={[{ cx: 82, cy: 68, rx: 4, ry: 5.4 }]} />
      <Blush cx={80} cy={82} />
    </>
  );
}

function Capybara() {
  return (
    <>
      <rect className="species-line species-fill-tan species-capybara-leg-a" x="22" y="106" width="19" height="22" rx="8" />
      <rect className="species-line species-fill-tan species-capybara-leg-b" x="60" y="106" width="19" height="22" rx="8" />
      <ellipse className="species-line species-fill-tan species-capybara-body" cx="50" cy="98" rx="40" ry="25" />
      <path className="species-line species-fill-brown species-capybara-ear" d="M70 60 C68 44 84 40 88 54 Z" />
      <ellipse className="species-line species-fill-tan species-capybara-head" cx="86" cy="72" rx="22" ry="21" />
      <ellipse className="species-line species-fill-brown species-capybara-snout" cx="104" cy="82" rx="12" ry="11" />
      <ellipse className="species-fill-ink" cx="108" cy="78" rx="3" ry="2.2" />
      <path className="species-stripe" d="M103 90 Q108 93 112 89" />
      <Eyes eyes={[{ cx: 88, cy: 64, rx: 4, ry: 5.4 }]} />
      <Blush cx={84} cy={80} />
    </>
  );
}

const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

function Daisy() {
  return (
    <>
      <path className="species-stem-outline" d="M60 128 C60 104 58 84 60 64" />
      <path className="species-stem-fill" d="M60 128 C60 104 58 84 60 64" />
      <g className="species-sway-pivot">
        <path className="species-line species-fill-green species-daisy-leaf-l" d="M59 112 C40 114 26 104 22 90 C40 90 54 98 59 112 Z" />
      </g>
      <g className="species-sway-pivot species-sway-late">
        <path className="species-line species-fill-green species-daisy-leaf-r" d="M61 100 C80 102 94 92 98 78 C80 78 66 86 61 100 Z" />
      </g>
      <g className="species-flower">
        {PETAL_ANGLES.map((angle) => (
          <ellipse
            key={angle}
            className="species-line species-fill-white species-petal"
            cx="60"
            cy="22"
            rx="9"
            ry="17"
            transform={`rotate(${angle} 60 46)`}
          />
        ))}
        <circle className="species-line species-fill-amber species-daisy-center" cx="60" cy="46" r="15" />
        <Eyes eyes={[{ cx: 54, cy: 44, rx: 2.6, ry: 3.4 }, { cx: 66, cy: 44, rx: 2.6, ry: 3.4 }]} />
        <path className="species-stripe" d="M54 52 Q60 58 66 52" />
      </g>
    </>
  );
}

function Sapling() {
  return (
    <>
      <path className="species-stem-outline" d="M60 94 C60 80 60 66 60 52" />
      <path className="species-stem-fill" d="M60 94 C60 80 60 66 60 52" />
      <g className="species-sway-pivot">
        <path className="species-line species-fill-green species-sapling-leaf-l" d="M59 70 C38 72 22 60 20 40 C42 38 56 52 59 70 Z" />
      </g>
      <g className="species-sway-pivot species-sway-late">
        <path className="species-line species-fill-teal species-sapling-leaf-r" d="M61 58 C82 60 98 48 100 28 C78 26 64 40 61 58 Z" />
      </g>
      <path className="species-line species-fill-teal species-sapling-bud" d="M60 52 C50 44 52 28 60 22 C68 28 70 44 60 52 Z" />
      <path className="species-line species-fill-brown species-sapling-pot" d="M30 92 H90 L82 126 Q60 134 38 126 Z" />
      <rect className="species-line species-fill-tan species-sapling-rim" x="26" y="86" width="68" height="10" rx="5" />
      <Eyes eyes={[{ cx: 49, cy: 107, rx: 3.4, ry: 4.6 }, { cx: 71, cy: 107, rx: 3.4, ry: 4.6 }]} />
      <path className="species-stripe species-stripe-light" d="M54 116 Q60 121 66 116" />
    </>
  );
}

const FIGURES = {
  cat: Cat,
  turtle: Turtle,
  sparrow: Sparrow,
  platypus: Platypus,
  capybara: Capybara,
  daisy: Daisy,
  sapling: Sapling,
} as const;

/**
 * Low, wide animals fill less of the box than the tall ones. A fixed scale around the
 * ground point makes every species about equally large without moving its feet.
 */
const FIT: Record<SpeciesCode, string | undefined> = {
  cat: undefined,
  turtle: "translate(-4.8 -10.4) scale(1.08)",
  sparrow: undefined,
  platypus: "translate(-4.8 -10.4) scale(1.08)",
  capybara: "translate(-4.8 -10.4) scale(1.08)",
  daisy: undefined,
  sapling: undefined,
};

const PLANTS: readonly SpeciesCode[] = ["daisy", "sapling"];

type Health = "healthy" | "tired" | "sick" | "recovering";
type Stage = "new" | "settling" | "growing" | "companion";

/** Small shapes next to the figure. The words beside the figure still name the stage. */
function StageMark({ stage }: { stage: Stage }) {
  if (stage === "settling") {
    return (
      <path
        className="species-line species-fill-teal species-mark"
        d="M17 14 L21 24 L31 28 L21 32 L17 42 L13 32 L3 28 L13 24 Z"
      />
    );
  }
  if (stage === "growing") {
    return (
      <g className="species-mark">
        <path className="species-stem-outline" d="M13 128 V108" />
        <path className="species-stem-fill" d="M13 128 V108" />
        <path className="species-line species-fill-green" d="M13 116 C4 116 2 106 4 100 C12 102 14 108 13 116 Z" />
        <path className="species-line species-fill-teal" d="M13 110 C22 110 24 100 22 94 C14 96 12 102 13 110 Z" />
      </g>
    );
  }
  if (stage === "companion") {
    return (
      <g className="species-mark">
        <ellipse className="species-ring" cx="60" cy="72" rx="56" ry="64" />
        <path
          className="species-line species-fill-amber"
          d="M104 10 L108 20 L118 24 L108 28 L104 38 L100 28 L90 24 L100 20 Z"
        />
      </g>
    );
  }
  return null;
}

function HealthMark({ health, code }: { health: Health; code: SpeciesCode }) {
  if (health === "tired") {
    return (
      <path
        className="species-line species-fill-sky species-mark"
        d="M106 18 C106 18 97 30 97 36 a9 9 0 0 0 18 0 C115 30 106 18 106 18 Z"
      />
    );
  }
  if (health === "sick" && !PLANTS.includes(code)) {
    return (
      <g className="species-mark species-blanket">
        <path
          className="species-line species-fill-teal-soft"
          d="M20 110 Q60 100 100 110 Q108 118 100 128 Q60 138 20 128 Q12 118 20 110 Z"
        />
        <path className="species-stitch" d="M26 119 Q60 111 94 119" />
      </g>
    );
  }
  if (health === "recovering") {
    return (
      <g className="species-mark">
        <path className="species-stem-outline" d="M106 128 V110" />
        <path className="species-stem-fill" d="M106 128 V110" />
        <path className="species-line species-fill-green" d="M106 118 C115 118 117 108 115 102 C107 104 105 110 106 118 Z" />
      </g>
    );
  }
  return null;
}

/** Vector mascot. Motion is CSS, so the figure is visible before any script runs. */
export function SpeciesFigure({
  code,
  size = "regular",
  health = "healthy",
  stage = "new",
}: {
  code: SpeciesCode;
  /** `compact` fits a stop. `hero` is the home stage. `regular` stays the smaller figure. */
  size?: "regular" | "compact" | "hero";
  health?: Health;
  stage?: Stage;
}) {
  const Figure = FIGURES[code];
  return (
    <span
      className="species-stage"
      data-species-figure={code}
      data-figure-size={size}
      data-health={health}
      data-growth-stage={stage}
      aria-hidden="true"
    >
      <svg className="species-svg" viewBox="0 0 120 140" focusable="false">
        <ellipse className="species-shadow" cx="60" cy="131" rx="38" ry="6" />
        <g transform={FIT[code]}>
          <g className={`species-rig species-rig-${code}`}>
            <Figure />
          </g>
        </g>
        <StageMark stage={stage} />
        <HealthMark health={health} code={code} />
      </svg>
    </span>
  );
}
