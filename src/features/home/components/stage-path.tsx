import { STAGE_LEVELS, type StageId } from "@/features/mascot/constants";
import { SpeciesFigure } from "@/features/mascot/components/species-figure";
import type { HealthStatus } from "@/features/mascot/growth";
import { speciesByCode, type SpeciesCode } from "@/features/mascot/species";
import { cn } from "@/lib/cn";

/** Share of the desktop track filled up to the current stop. Static names so Tailwind keeps them. */
const PATH_FILL = ["w-0", "w-1/4", "w-1/2", "w-3/4"] as const;

/**
 * Current stop only, for a compact glance. Prefer the full CharacterHero path on home.
 */
export function StageGlance({
  stageName,
  className,
}: {
  stageName: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex min-h-touch min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-control border border-border bg-surface-muted px-3 py-2",
        className,
      )}
      data-stage-glance=""
    >
      <span className="text-helper font-semibold text-ink-700">Aşama</span>
      <span className="min-w-0 text-body font-extrabold break-words text-ink-900">
        {stageName}
      </span>
      <span className="rounded-pill bg-brand-100 px-2 py-0.5 text-helper font-bold text-ink-900">
        Buradasın
      </span>
    </p>
  );
}

/**
 * Four-stop path for the celebration dialog and as a building block for CharacterHero.
 * Home uses CharacterHero; do not re-embed CharacterStatus here.
 */
export function StagePath({
  stageId,
  species,
  idPrefix = "asama",
}: {
  stageId: StageId;
  species: SpeciesCode | null;
  idPrefix?: string;
}) {
  const currentIndex = STAGE_LEVELS.findIndex((level) => level.id === stageId);
  const chosen = species ? speciesByCode(species) : undefined;
  const headingId = `${idPrefix}-baslik`;

  return (
    <section className="min-w-0" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-section font-bold break-words text-ink-900">
        Aşama yolun
      </h2>
      <ol className="mt-3 grid min-w-0 grid-cols-2 items-start gap-2 sm:grid-cols-4">
        {STAGE_LEVELS.map((level, index) => {
          const place =
            index < currentIndex ? "done" : index === currentIndex ? "current" : "next";
          return (
            <li
              key={level.id}
              aria-current={place === "current" ? "step" : undefined}
              data-stage-current={place === "current" ? "" : undefined}
              className={cn(
                "grid min-w-0 content-start rounded-card border",
                place === "current"
                  ? "stage-current-motion gap-2 border-2 border-brand-700 bg-brand-50 p-3 shadow-card"
                  : "gap-1 border-border bg-surface p-2",
              )}
            >
              {place === "current" ? (
                <p className="w-fit max-w-full rounded-pill bg-brand-100 px-2 py-1 text-helper font-bold break-words text-ink-900">
                  {level.name}
                </p>
              ) : (
                <p className="text-helper font-semibold break-words text-ink-900">
                  {level.name}
                </p>
              )}
              {place === "current" ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {chosen ? (
                    <SpeciesFigure
                      code={chosen.code}
                      size="compact"
                      health={"healthy" satisfies HealthStatus}
                      stage={stageId}
                    />
                  ) : null}
                  <p className="min-w-0 text-helper break-words text-ink-900">
                    {chosen
                      ? `${chosen.name}. Buradasın.`
                      : "Buradasın. Karakter seçilmedi."}
                  </p>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-1">
                  {place === "done" ? (
                    <span aria-hidden="true" className="text-helper font-bold text-ink-900">
                      ✓
                    </span>
                  ) : null}
                  <p className="text-helper text-ink-700">
                    {place === "done" ? "Geçildi" : "Sırada"}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Connected four-stop journey for the home character band. */
export function StageJourney({
  currentIndex,
  headingId = "asama-yolu-baslik",
}: {
  currentIndex: number;
  headingId?: string;
}) {
  const fill = PATH_FILL[currentIndex] ?? "w-0";
  const last = STAGE_LEVELS.length - 1;

  return (
    <div className="grid min-w-0 gap-3">
      <h2 id={headingId} className="text-section font-bold break-words text-ink-900">
        Aşama yolun
      </h2>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-4 right-[12.5%] left-[12.5%] hidden h-1 -translate-y-1/2 rounded-pill bg-border lg:block"
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-4 left-[12.5%] hidden h-1 -translate-y-1/2 rounded-pill bg-brand-600 lg:block",
            fill,
          )}
        />
        <ol className="relative grid gap-3 lg:grid-cols-4">
          {STAGE_LEVELS.map((level, index) => {
            const place =
              index < currentIndex ? "done" : index === currentIndex ? "current" : "next";
            return (
              <li
                key={level.id}
                aria-current={place === "current" ? "step" : undefined}
                data-stage-current={place === "current" ? "" : undefined}
                className="relative grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 lg:block lg:pt-4"
              >
                {index < last ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-1/2 bottom-[calc(-50%-0.75rem)] left-4 w-1 -translate-x-1/2 lg:hidden",
                      index < currentIndex ? "bg-brand-600" : "bg-border",
                    )}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 grid size-8 place-items-center rounded-pill border-2 text-helper font-bold",
                    "lg:absolute lg:top-4 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2",
                    place === "current" && "border-brand-700 bg-brand-600 text-white",
                    place === "done" && "border-brand-700 bg-brand-50 text-brand-800",
                    place === "next" && "border-border bg-surface text-ink-600",
                  )}
                >
                  {place === "done" ? "✓" : place === "current" ? "●" : "○"}
                </span>
                <div
                  className={cn(
                    "min-w-0 rounded-card border px-3 py-2",
                    place === "current" &&
                      "border-2 border-brand-700 bg-brand-50 shadow-card",
                    place === "done" && "border-brand-100 bg-surface",
                    place === "next" && "border-border bg-surface",
                    // Below lg a stop is one compact line (name, then status) so the path stays short.
                    "max-lg:flex max-lg:flex-wrap max-lg:items-center max-lg:justify-between max-lg:gap-x-3 max-lg:gap-y-1",
                    "lg:mt-4 lg:text-center",
                  )}
                >
                  <p
                    className={cn(
                      "leading-snug break-words text-ink-900",
                      place === "current"
                        ? "text-card-title font-extrabold"
                        : "text-body font-bold",
                    )}
                  >
                    {level.name}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-helper max-lg:mt-0",
                      place === "current" &&
                        "inline-block rounded-pill bg-brand-100 px-2 py-0.5 font-bold text-ink-900",
                      place === "done" && "font-semibold text-ink-900",
                      place === "next" && "text-ink-600",
                    )}
                  >
                    {place === "done"
                      ? "Geçildi"
                      : place === "current"
                        ? "Buradasın"
                        : "Sırada"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
