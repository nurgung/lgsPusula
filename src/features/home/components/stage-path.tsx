import { ButtonLink } from "@/components/ui/button";
import { STAGE_LEVELS, type StageId } from "@/features/mascot/constants";
import { SpeciesFigure } from "@/features/mascot/components/species-figure";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { speciesByCode, type SpeciesCode } from "@/features/mascot/species";
import { cn } from "@/lib/cn";

export function StagePath({
  stageId,
  species,
  points,
  detailed = false,
  idPrefix = "asama",
}: {
  stageId: StageId;
  species: SpeciesCode | null;
  points?: number;
  /** Home band adds the point count and the no-regression line. The dialog stays short. */
  detailed?: boolean;
  idPrefix?: string;
}) {
  const currentIndex = STAGE_LEVELS.findIndex((level) => level.id === stageId);
  const chosen = species ? speciesByCode(species) : undefined;
  const headingId = `${idPrefix}-baslik`;

  return (
    <section className="min-w-0" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-bold break-words text-ink-900">
        Aşama yolun
      </h2>
      <ol className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {STAGE_LEVELS.map((level, index) => {
          const place =
            index < currentIndex ? "done" : index === currentIndex ? "current" : "next";
          return (
            <li
              key={level.id}
              aria-current={place === "current" ? "step" : undefined}
              data-stage-current={place === "current" ? "" : undefined}
              className={cn(
                "grid min-w-0 gap-2 rounded-card border p-3",
                place === "current"
                  ? "stage-current-motion border-brand-700 bg-surface"
                  : "border-border bg-surface",
              )}
            >
              {place === "current" ? (
                <p className="w-fit max-w-full rounded-full bg-brand-100 px-2 py-1 text-sm font-bold break-words text-ink-900">
                  {level.name}
                </p>
              ) : (
                <p className="text-sm font-bold break-words text-ink-900">{level.name}</p>
              )}
              {place === "current" ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {chosen ? <SpeciesFigure code={chosen.code} size="compact" /> : null}
                  <p className="min-w-0 text-sm break-words text-ink-900">
                    {chosen
                      ? `${chosen.name}. Buradasın.`
                      : "Buradasın. Karakter seçilmedi."}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-700">{place === "done" ? "Geçildi" : "Sırada"}</p>
              )}
            </li>
          );
        })}
      </ol>
      {detailed ? (
        <div className="mt-4 grid min-w-0 gap-2">
          {points != null ? (
            <p className="text-ink-900">
              <span className="text-2xl font-extrabold tabular-nums">{points}</span>{" "}
              <span className="font-semibold">{MASCOT_MESSAGES.pointsUnit}</span>
            </p>
          ) : null}
          <p className="text-sm text-ink-700">{MASCOT_MESSAGES.noRegression}</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/ogrenci/karakter">
              {chosen ? "Karaktere bak" : "Karakter seç"}
            </ButtonLink>
            <ButtonLink href="/ogrenci/bildirimler" variant="ghost">
              Hatırlatma ayarları
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </section>
  );
}
