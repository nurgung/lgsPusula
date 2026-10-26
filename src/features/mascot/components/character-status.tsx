import { ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { MASCOT_MESSAGES } from "../messages";
import type { GrowthView } from "../growth";
import { speciesByCode, type SpeciesCode } from "../species";
import { SpeciesFigure } from "./species-figure";

const HEALTH_TEXT = {
  healthy: {
    label: MASCOT_MESSAGES.healthHealthy,
    detail: MASCOT_MESSAGES.healthHealthyDetail,
  },
  tired: {
    label: MASCOT_MESSAGES.healthTired,
    detail: MASCOT_MESSAGES.healthTiredDetail,
  },
  sick: {
    label: MASCOT_MESSAGES.healthSick,
    detail: MASCOT_MESSAGES.healthSickDetail,
  },
  recovering: {
    label: MASCOT_MESSAGES.healthRecovering,
    detail: MASCOT_MESSAGES.healthRecoveringDetail,
  },
} as const;

export function CharacterStatus({
  species,
  growth,
  showLinks = false,
  layout = "detail",
}: {
  species: SpeciesCode | null;
  growth: GrowthView;
  showLinks?: boolean;
  /** Home leads with one large figure and three counts. Detail keeps the sentence block. */
  layout?: "home" | "detail";
}) {
  const chosen = species ? speciesByCode(species) : undefined;
  const health = HEALTH_TEXT[growth.health];
  const unmet = growth.requirements.filter((item) => !item.met);
  const meter = unmet[0];
  const pointsLine = `Toplam ${growth.points} ${MASCOT_MESSAGES.pointsUnit}. Aşama: ${growth.stageName}.`;
  const streakLine = `Çalışma serisi: ${growth.currentStreak} gün. En uzun seri: ${growth.longestStreak} gün. Toplam ${growth.studyDays} farklı gün, ${growth.questions} soru.`;

  return (
    <div className="grid min-w-0 gap-3">
      {layout === "home" ? (
        <div className="grid min-w-0 items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex items-center justify-center rounded-card bg-canvas-soft px-3 py-2 sm:px-4">
            {chosen ? (
              <SpeciesFigure
                code={chosen.code}
                size="hero"
                health={growth.health}
                stage={growth.stageId}
              />
            ) : (
              <span className="flex h-40 w-[8.75rem] shrink-0 items-center justify-center rounded-3xl bg-brand-50 px-3 text-center text-sm font-semibold text-ink-900 sm:h-[13rem] sm:w-[11.25rem]">
                Henüz seçilmedi
              </span>
            )}
          </div>
          <div className="grid min-w-0 gap-3">
            {chosen ? (
              <p className="min-w-0 font-semibold break-words text-ink-900">
                {chosen.kindLabel}: {chosen.name}. Buradasın.
              </p>
            ) : (
              <div className="grid gap-1">
                <p className="font-semibold text-ink-900">
                  {MASCOT_MESSAGES.noSpeciesTitle}
                </p>
                <p className="text-sm break-words text-ink-700">
                  {MASCOT_MESSAGES.noSpeciesDescription}
                </p>
              </div>
            )}
            <dl className="grid grid-cols-3 gap-2">
              <Stat value={String(growth.points)} label="Karakter puanı" />
              <Stat value={`${growth.currentStreak} gün`} label="Çalışma serisi" />
              <Stat value={String(growth.questions)} label="Toplam soru" />
            </dl>
            <p className="min-w-0 break-words text-ink-900">
              Sağlık: {health.label}. {health.detail}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
          {chosen ? (
            <SpeciesFigure
              code={chosen.code}
              health={growth.health}
              stage={growth.stageId}
            />
          ) : (
            <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-brand-50 px-3 text-center text-sm font-semibold text-ink-900">
              Henüz seçilmedi
            </span>
          )}
          <div className="grid min-w-0 gap-1">
            {chosen ? (
              <p className="min-w-0 font-semibold break-words text-ink-900">
                {chosen.kindLabel}: {chosen.name}. Buradasın.
              </p>
            ) : (
              <div className="grid gap-1">
                <p className="font-semibold text-ink-900">
                  {MASCOT_MESSAGES.noSpeciesTitle}
                </p>
                <p className="text-sm break-words text-ink-700">
                  {MASCOT_MESSAGES.noSpeciesDescription}
                </p>
              </div>
            )}
            <p className="min-w-0 break-words text-ink-900">{pointsLine}</p>
            <p className="min-w-0 break-words text-ink-900">
              Sağlık: {health.label}. {health.detail}
            </p>
            <p className="min-w-0 break-words text-ink-900">{streakLine}</p>
          </div>
        </div>
      )}

      {growth.nextStageName ? (
        <div className="grid min-w-0 gap-2">
          <p className="font-semibold text-ink-900">
            Sonraki aşama: {growth.nextStageName}
          </p>
          {meter ? (
            <ProgressMeter
              label={meter.gap}
              value={meter.current}
              max={meter.target}
              unit={meter.unit}
              size={layout === "home" ? "strong" : "regular"}
            />
          ) : null}
          {unmet.length > 1 ? (
            <ul className="grid list-disc gap-1 pl-5 text-ink-900">
              {unmet.slice(1).map((item) => (
                <li key={item.id} className="break-words">
                  {item.gap}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <p
        className={
          growth.nextStageName
            ? "min-w-0 break-words text-ink-900"
            : "min-w-0 break-words font-semibold text-ink-900"
        }
      >
        {growth.nextStep}
      </p>
      <p className="text-sm break-words text-ink-700">{MASCOT_MESSAGES.streakNote}</p>
      <p className="text-sm break-words text-ink-700">{MASCOT_MESSAGES.noRegression}</p>

      {showLinks ? (
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/ogrenci/karakter">
            {chosen ? "Karaktere bak" : "Karakter seç"}
          </ButtonLink>
          <ButtonLink href="/ogrenci/bildirimler" variant="ghost">
            Hatırlatma ayarları
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-1">
      <dt className="text-sm font-semibold leading-snug text-ink-700">{label}</dt>
      <dd className="text-2xl font-extrabold tabular-nums leading-none text-ink-900 sm:text-3xl">
        {value}
      </dd>
    </div>
  );
}
