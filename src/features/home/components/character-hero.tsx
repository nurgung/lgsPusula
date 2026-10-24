import { Card } from "@/components/ui/card";
import { CharacterStatus } from "@/features/mascot/components/character-status";
import type { GrowthView } from "@/features/mascot/growth";
import { speciesByCode, type SpeciesCode } from "@/features/mascot/species";

export function CharacterHero({
  species,
  growth,
}: {
  species: SpeciesCode | null;
  growth: GrowthView;
}) {
  const chosen = species ? speciesByCode(species) : undefined;
  return (
    <Card variant="feature" title={chosen ? chosen.name : "Karakterin"}>
      <CharacterStatus species={species} growth={growth} showLinks />
    </Card>
  );
}
