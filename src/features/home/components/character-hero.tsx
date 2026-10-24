import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { STAGE_LEVELS } from "@/features/mascot/constants";
import { MascotMark } from "@/features/mascot/components/mascot-mark";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { stageForPoints, totalPoints, type RewardEvent } from "@/features/mascot/rules";
import { speciesByCode, type SpeciesCode } from "@/features/mascot/species";

export function CharacterHero({
  species,
  rewards,
}: {
  species: SpeciesCode | null;
  rewards: readonly RewardEvent[];
}) {
  const chosen = species ? speciesByCode(species) : undefined;
  const points = totalPoints(rewards);
  const stage = stageForPoints(points);
  const stageIndex = STAGE_LEVELS.findIndex((level) => level.id === stage.id) + 1;

  return (
    <Card variant="feature" title={chosen ? chosen.name : "Karakterin"}>
      <div className="grid min-w-0 gap-5">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-3xl bg-brand-50">
            {chosen ? (
              <MascotMark code={chosen.code} size={112} />
            ) : (
              <span className="px-3 text-center text-sm font-semibold text-ink-900">
                Henüz seçilmedi
              </span>
            )}
          </div>
          <div className="grid min-w-0 gap-2">
            {chosen ? (
              <>
                <p className="text-ink-700">
                  {chosen.kindLabel} · Aşama {stageIndex} / {STAGE_LEVELS.length}:{" "}
                  {stage.name}
                </p>
                <p className="text-sm text-ink-600">{chosen.description}</p>
              </>
            ) : (
              <div className="grid gap-1">
                <p className="font-semibold text-ink-900">
                  {MASCOT_MESSAGES.noSpeciesTitle}
                </p>
                <p className="text-sm text-ink-700">
                  {MASCOT_MESSAGES.noSpeciesDescription}
                </p>
              </div>
            )}
            <p className="text-ink-900">
              <span className="text-3xl font-extrabold tabular-nums">{points}</span>{" "}
              <span className="font-semibold">{MASCOT_MESSAGES.pointsUnit}</span>
            </p>
          </div>
        </div>
        {stage.nextAt != null && stage.nextName ? (
          <ProgressMeter
            label={`Sonraki aşama: ${stage.nextName}`}
            value={points}
            max={stage.nextAt}
            unit={MASCOT_MESSAGES.pointsUnit}
          />
        ) : (
          <p className="text-ink-900">Bu en yüksek aşama.</p>
        )}
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
    </Card>
  );
}
