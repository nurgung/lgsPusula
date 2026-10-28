import { STAGE_LEVELS } from "@/features/mascot/constants";
import { CharacterStatus } from "@/features/mascot/components/character-status";
import type { GrowthView } from "@/features/mascot/growth";
import type { SpeciesCode } from "@/features/mascot/species";
import { StageJourney } from "./stage-path";

/**
 * Character-first home band: figure + stage, stats, four-stop path, next-stage progress.
 * Uses real growth-v1 / mascot species data only.
 */
export function CharacterHero({
  species,
  growth,
}: {
  species: SpeciesCode | null;
  growth: GrowthView;
}) {
  const currentIndex = Math.max(
    0,
    STAGE_LEVELS.findIndex((level) => level.id === growth.stageId),
  );

  return (
    <section
      className="min-w-0 rounded-panel border border-border bg-surface p-4 shadow-raised sm:p-6"
      aria-label="Karakterin ve aşama yolun"
      data-character-hero=""
    >
      <CharacterStatus
        species={species}
        growth={growth}
        showLinks
        layout="home"
        path={<StageJourney currentIndex={currentIndex} />}
      />
    </section>
  );
}
