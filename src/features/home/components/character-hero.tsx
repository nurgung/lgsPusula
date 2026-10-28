import { STAGE_LEVELS } from "@/features/mascot/constants";
import { CharacterStatus } from "@/features/mascot/components/character-status";
import type { GrowthView } from "@/features/mascot/growth";
import type { SpeciesCode } from "@/features/mascot/species";
import { StageJourney } from "./stage-path";

/**
 * Character-first home band: scene with the figure, greeting, stats, health card,
 * then the four-stop path and next-stage progress.
 * Uses real growth-v1 / mascot species data only.
 */
export function CharacterHero({
  species,
  growth,
  greeting,
}: {
  species: SpeciesCode | null;
  growth: GrowthView;
  /** Page title block. The page has no other `h1` when this is set. */
  greeting?: { name: string; dateLabel: string };
}) {
  const currentIndex = Math.max(
    0,
    STAGE_LEVELS.findIndex((level) => level.id === growth.stageId),
  );

  return (
    <section
      className="min-w-0 overflow-hidden rounded-panel border border-border bg-surface shadow-raised"
      aria-label="Karakterin ve aşama yolun"
      data-character-hero=""
    >
      <CharacterStatus
        species={species}
        growth={growth}
        showLinks
        layout="home"
        path={<StageJourney currentIndex={currentIndex} />}
        intro={
          greeting ? (
            <header className="grid min-w-0 gap-1">
              <p className="text-helper font-bold tracking-wide text-brand-800 uppercase">
                Bugün de bir adım daha
              </p>
              <h1 className="text-page-title font-extrabold break-words text-ink-900 sm:text-3xl">
                Merhaba, {greeting.name}
              </h1>
              <p className="max-w-prose break-words text-body text-ink-700">
                Bugün {greeting.dateLabel}. Hedeflerine giden yolda seninleyiz.
              </p>
            </header>
          ) : null
        }
      />
    </section>
  );
}
