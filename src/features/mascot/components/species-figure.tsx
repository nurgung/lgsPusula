import type { SpeciesCode } from "../species";
import "./species-figure.css";

function Ball({ className }: { className: string }) {
  return (
    <span className={className}>
      <i />
      <i />
      <i />
    </span>
  );
}

function Cat() {
  return (
    <>
      <span className="species-shadow" />
      <Ball className="species-ball species-fill-brand-dark species-cat-body" />
      <Ball className="species-ball species-fill-brand-soft species-cat-chest" />
      <span className="species-cat-tail">
        <Ball className="species-ball species-fill-brand species-cat-tail-a" />
      </span>
      <Ball className="species-ball species-fill-brand species-cat-head" />
      <span className="species-ear species-cat-ear-l" />
      <span className="species-ear species-ear-inner species-cat-ear-l-inner" />
      <span className="species-ear species-cat-ear-r" />
      <span className="species-ear species-ear-inner species-cat-ear-r-inner" />
      <span className="species-eye species-cat-eye-l" />
      <span className="species-eye species-cat-eye-r" />
      <span className="species-nose species-cat-nose" />
      <span className="species-whisker species-cat-whisker-l" />
      <span className="species-whisker species-cat-whisker-r" />
      <Ball className="species-ball species-fill-brand-dark species-cat-paw-l" />
      <Ball className="species-ball species-fill-brand-dark species-cat-paw-r" />
    </>
  );
}

function Turtle() {
  return (
    <>
      <span className="species-shadow" />
      <Ball className="species-ball species-fill-brand-soft species-turtle-plastron" />
      <Ball className="species-ball species-fill-green species-turtle-shell" />
      <span className="species-spot species-turtle-spot-a" />
      <span className="species-spot species-turtle-spot-b" />
      <Ball className="species-ball species-fill-brand species-turtle-head" />
      <span className="species-eye species-turtle-eye" />
      <Ball className="species-ball species-fill-brand-dark species-turtle-leg-a" />
      <Ball className="species-ball species-fill-brand-dark species-turtle-leg-b" />
      <Ball className="species-ball species-fill-brand-dark species-turtle-leg-c" />
      <Ball className="species-ball species-fill-brand-dark species-turtle-leg-d" />
    </>
  );
}

function Sparrow() {
  return (
    <>
      <span className="species-shadow" />
      <Ball className="species-ball species-fill-amber-dark species-sparrow-body" />
      <Ball className="species-ball species-fill-cream species-sparrow-belly" />
      <span className="species-wing species-sparrow-wing" />
      <Ball className="species-ball species-fill-ink species-sparrow-head" />
      <span className="species-beak" />
      <span className="species-eye species-sparrow-eye" />
      <span className="species-tail-feather species-sparrow-tail" />
      <span className="species-leg species-sparrow-leg-l" />
      <span className="species-leg species-sparrow-leg-r" />
    </>
  );
}

function Daisy() {
  return (
    <>
      <span className="species-shadow" />
      <span className="species-stem" />
      <span className="species-sway-pivot">
        <span className="species-leaf species-daisy-leaf-l" />
      </span>
      <span className="species-sway-pivot species-sway-late">
        <span className="species-leaf species-daisy-leaf-r" />
      </span>
      <span className="species-flower">
        <i className="species-petal" />
        <i className="species-petal" />
        <i className="species-petal" />
        <i className="species-petal" />
        <i className="species-petal" />
        <i className="species-petal" />
        <i className="species-petal" />
        <i className="species-petal" />
        <Ball className="species-ball species-fill-amber species-daisy-center" />
      </span>
    </>
  );
}

function Platypus() {
  return (
    <>
      <span className="species-shadow" />
      <span className="species-platypus-tail" />
      <Ball className="species-ball species-fill-amber-dark species-platypus-body" />
      <Ball className="species-ball species-fill-amber species-platypus-head" />
      <span className="species-platypus-bill" />
      <span className="species-eye species-platypus-eye" />
      <Ball className="species-ball species-fill-amber-dark species-platypus-foot-l" />
      <Ball className="species-ball species-fill-amber-dark species-platypus-foot-r" />
    </>
  );
}

function Capybara() {
  return (
    <>
      <span className="species-shadow" />
      <Ball className="species-ball species-fill-amber-dark species-capybara-body" />
      <Ball className="species-ball species-fill-amber species-capybara-head" />
      <Ball className="species-ball species-fill-amber-dark species-capybara-snout" />
      <span className="species-ear species-capybara-ear-l" />
      <span className="species-ear species-capybara-ear-r" />
      <span className="species-eye species-capybara-eye" />
      <span className="species-nose species-capybara-nose" />
      <Ball className="species-ball species-fill-amber-dark species-capybara-paw-l" />
      <Ball className="species-ball species-fill-amber-dark species-capybara-paw-r" />
    </>
  );
}

function Sapling() {
  return (
    <>
      <span className="species-shadow" />
      <Ball className="species-ball species-fill-amber-dark species-sapling-soil" />
      <span className="species-stem species-sapling-stem" />
      <span className="species-sway-pivot">
        <span className="species-leaf species-sapling-leaf-l" />
      </span>
      <span className="species-sway-pivot species-sway-late">
        <span className="species-leaf species-sapling-leaf-r" />
      </span>
      <span className="species-leaf species-sapling-bud" />
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

/** Layered mascot. Motion is CSS, so the figure is visible before any script runs. */
export function SpeciesFigure({
  code,
  size = "regular",
}: {
  code: SpeciesCode;
  /** `compact` fits the current stop on the stage path. */
  size?: "regular" | "compact";
}) {
  const Figure = FIGURES[code];
  return (
    <span
      className="species-stage"
      data-species-figure={code}
      data-figure-size={size}
      aria-hidden="true"
    >
      <span className={`species-rig species-rig-${code}`}>
        <Figure />
      </span>
    </span>
  );
}
