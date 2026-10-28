import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { STAGE_LEVELS } from "@/features/mascot/constants";
import { SpeciesFigure } from "@/features/mascot/components/species-figure";
import { SPECIES } from "@/features/mascot/species";

export const metadata: Metadata = { title: "Karakterler" };

const HEALTH_STATES = [
  { id: "healthy", label: "İyi görünüyor" },
  { id: "tired", label: "Biraz yorgun" },
  { id: "sick", label: "Dinleniyor" },
  { id: "recovering", label: "Toparlanıyor" },
] as const;

export default function CharactersPreviewPage() {
  return (
    <>
      <PageHeader
        title="Karakterler"
        description="Yedi karakterin net çizimleri. Örnek gösterimdir; öğrenci verisi yoktur."
      />
      <div className="grid min-w-0 gap-section">
        <Card title="Karakter ailesi" headingLevel={2}>
          <ul className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
            {SPECIES.map((species) => (
              <li
                key={species.code}
                className="flex min-w-0 flex-col items-center gap-2 rounded-card border border-border bg-canvas-soft p-3"
              >
                <SpeciesFigure code={species.code} size="hero" stage="growing" />
                <p className="text-center font-bold text-ink-900">{species.name}</p>
              </li>
            ))}
          </ul>
        </Card>

        {(["cat", "daisy"] as const).map((code) => (
          <Card
            key={code}
            title={`Sağlık durumları: ${SPECIES.find((item) => item.code === code)?.name}`}
            headingLevel={2}
          >
            <ul className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
              {HEALTH_STATES.map((state) => (
                <li
                  key={state.id}
                  className="flex min-w-0 flex-col items-center gap-2 rounded-card border border-border bg-canvas-soft p-3"
                >
                  <SpeciesFigure code={code} size="hero" health={state.id} stage="growing" />
                  <p className="text-center text-helper font-semibold text-ink-900">
                    {state.label}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ))}

        <Card title="Aşamalar" headingLevel={2}>
          <ul className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
            {STAGE_LEVELS.map((level) => (
              <li
                key={level.id}
                className="flex min-w-0 flex-col items-center gap-2 rounded-card border border-border bg-canvas-soft p-3"
              >
                <SpeciesFigure code="turtle" size="hero" stage={level.id} />
                <p className="text-center text-helper font-semibold text-ink-900">
                  {level.name}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Küçük boy" headingLevel={2}>
          <ul className="flex min-w-0 flex-wrap gap-3">
            {SPECIES.map((species) => (
              <li key={species.code}>
                <SpeciesFigure code={species.code} size="compact" stage="settling" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
