import { ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { STAGE_LEVELS, type StageId } from "@/features/mascot/constants";
import { SpeciesFigure } from "@/features/mascot/components/species-figure";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { stageForPoints } from "@/features/mascot/rules";
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
  const progress = points != null ? stageForPoints(points) : null;
  const remaining =
    progress?.nextAt != null ? progress.nextAt - progress.points : null;

  return (
    <section
      className={cn(
        "min-w-0",
        detailed && "rounded-card border border-border bg-surface p-3 shadow-card sm:p-4",
      )}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="text-lg font-bold break-words text-ink-900">
        Aşama yolun
      </h2>
      {detailed && progress ? (
        <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
          {chosen ? <SpeciesFigure code={chosen.code} size="compact" /> : null}
          <div className="grid min-w-0 flex-1 gap-2">
            <p className="text-ink-900">
              <span className="text-2xl font-extrabold tabular-nums">{progress.points}</span>{" "}
              <span className="font-semibold">{MASCOT_MESSAGES.pointsUnit}</span>
            </p>
            <p className="text-sm break-words text-ink-900">
              {chosen ? `${chosen.name}. Buradasın.` : "Buradasın. Karakter seçilmedi."}
            </p>
            {remaining != null && progress.nextAt != null && progress.nextName ? (
              <>
                <ProgressMeter
                  label={`Sonraki aşama: ${progress.nextName}`}
                  value={progress.points}
                  max={progress.nextAt}
                  unit={MASCOT_MESSAGES.pointsUnit}
                />
                <p className="text-sm font-semibold text-ink-900">
                  Kalan {remaining} {MASCOT_MESSAGES.pointsUnit}.
                </p>
              </>
            ) : (
              <p className="font-semibold text-ink-900">Bu en yüksek aşama.</p>
            )}
          </div>
        </div>
      ) : null}
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
                <p className="w-fit max-w-full rounded-full bg-brand-100 px-2 py-1 text-sm font-bold break-words text-ink-900">
                  {level.name}
                </p>
              ) : (
                <p className="text-sm font-semibold break-words text-ink-900">{level.name}</p>
              )}
              {place === "current" && !detailed ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {chosen ? <SpeciesFigure code={chosen.code} size="compact" /> : null}
                  <p className="min-w-0 text-sm break-words text-ink-900">
                    {chosen
                      ? `${chosen.name}. Buradasın.`
                      : "Buradasın. Karakter seçilmedi."}
                  </p>
                </div>
              ) : place === "current" ? (
                <p className="text-sm text-ink-900">Buradasın.</p>
              ) : (
                <div className="flex min-w-0 items-center gap-1">
                  {place === "done" ? (
                    <span aria-hidden="true" className="text-sm font-bold text-ink-900">
                      ✓
                    </span>
                  ) : null}
                  <p className="text-sm text-ink-700">
                    {place === "done" ? "Geçildi" : "Sırada"}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {detailed ? (
        <div className="mt-3 grid min-w-0 gap-2">
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
