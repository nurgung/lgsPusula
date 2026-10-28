import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { cn } from "@/lib/cn";
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
  path,
}: {
  species: SpeciesCode | null;
  growth: GrowthView;
  showLinks?: boolean;
  /** Home leads with one large figure, stats, optional path, then progress. Detail keeps the sentence block. */
  layout?: "home" | "detail";
  /** Inserted after the home stats (stage journey). */
  path?: ReactNode;
}) {
  const chosen = species ? speciesByCode(species) : undefined;
  const health = HEALTH_TEXT[growth.health];
  const unmet = growth.requirements.filter((item) => !item.met);
  const meter = unmet[0];
  const pointsLine = `Toplam ${growth.points} ${MASCOT_MESSAGES.pointsUnit}. Aşama: ${growth.stageName}.`;
  const streakLine = `Çalışma serisi: ${growth.currentStreak} gün. En uzun seri: ${growth.longestStreak} gün. Toplam ${growth.studyDays} farklı gün, ${growth.questions} soru.`;

  if (layout === "home") {
    return (
      <div className="grid min-w-0 gap-section">
        <div className="grid min-w-0 items-center gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-8">
          <div className="mx-auto flex w-full max-w-[15rem] items-center justify-center rounded-panel bg-canvas-soft px-4 py-5 sm:px-5 sm:py-6 lg:mx-0">
            {chosen ? (
              <SpeciesFigure
                code={chosen.code}
                size="hero"
                health={growth.health}
                stage={growth.stageId}
              />
            ) : (
              <span className="flex min-h-40 w-full items-center justify-center rounded-panel bg-brand-50 px-3 text-center text-helper font-semibold text-ink-900">
                Henüz seçilmedi
              </span>
            )}
          </div>

          <div className="grid min-w-0 gap-3">
            <div className="grid min-w-0 gap-2">
              <p className="text-helper font-semibold text-ink-700">Şu anki aşama</p>
              <p className="text-section font-extrabold break-words text-ink-900 sm:text-2xl">
                {growth.stageName}
              </p>
              {chosen ? (
                <p className="min-w-0 text-body font-semibold break-words text-ink-900">
                  {chosen.kindLabel}: {chosen.name}. Buradasın.
                </p>
              ) : (
                <div className="grid gap-1">
                  <p className="font-semibold text-ink-900">{MASCOT_MESSAGES.noSpeciesTitle}</p>
                  <p className="text-helper break-words text-ink-700">
                    {MASCOT_MESSAGES.noSpeciesDescription}
                  </p>
                </div>
              )}
              <p
                className={cn(
                  "w-fit max-w-full rounded-pill px-3 py-1 text-helper font-bold break-words",
                  growth.health === "healthy" && "bg-success-50 text-success-700",
                  growth.health === "tired" && "bg-warning-50 text-warning-800",
                  growth.health === "sick" && "bg-danger-50 text-danger-700",
                  growth.health === "recovering" && "bg-accent-50 text-accent-700",
                )}
              >
                Sağlık: {health.label}
              </p>
              <p className="text-helper break-words text-ink-700">{health.detail}</p>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat
            value={String(growth.points)}
            label="Karakter puanı"
            icon={<PointsIcon />}
          />
          <Stat
            value={`${growth.currentStreak} gün`}
            label="Çalışma serisi"
            icon={<StreakIcon />}
          />
          <Stat
            value={String(growth.questions)}
            label="Toplam soru"
            icon={<QuestionsIcon />}
          />
        </dl>

        {path}

        {growth.nextStageName ? (
          <div className="grid min-w-0 gap-2 rounded-card border border-border bg-surface-muted p-card-y px-card-x">
            <p className="font-semibold text-ink-900">
              Sonraki aşama: {growth.nextStageName}
            </p>
            {meter ? (
              <ProgressMeter
                label={meter.gap}
                value={meter.current}
                max={meter.target}
                unit={meter.unit}
                size="strong"
              />
            ) : null}
            {unmet.length > 1 ? (
              <ul className="grid list-disc gap-1 pl-5 text-ink-900">
                {unmet.slice(1).map((item) => (
                  <li key={item.id} className="break-words text-helper">
                    {item.gap}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <p
          className={cn(
            "min-w-0 break-words text-ink-900",
            !growth.nextStageName && "font-semibold",
          )}
        >
          {growth.nextStep}
        </p>
        <p className="text-helper break-words text-ink-700">{MASCOT_MESSAGES.streakNote}</p>
        <p className="text-helper break-words text-ink-700">{MASCOT_MESSAGES.noRegression}</p>

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

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
        {chosen ? (
          <SpeciesFigure
            code={chosen.code}
            health={growth.health}
            stage={growth.stageId}
          />
        ) : (
          <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-panel bg-brand-50 px-3 text-center text-helper font-semibold text-ink-900">
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
              <p className="font-semibold text-ink-900">{MASCOT_MESSAGES.noSpeciesTitle}</p>
              <p className="text-helper break-words text-ink-700">
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
              size="regular"
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
      <p className="text-helper break-words text-ink-700">{MASCOT_MESSAGES.streakNote}</p>
      <p className="text-helper break-words text-ink-700">{MASCOT_MESSAGES.noRegression}</p>

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

function Stat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface p-3 shadow-soft sm:p-4">
      <div className="flex min-w-0 items-start gap-2 text-brand-700">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <dt className="text-helper font-semibold leading-snug break-words text-ink-700">
          {label}
        </dt>
      </div>
      <dd className="text-metric font-extrabold break-words tabular-nums text-ink-900 sm:text-metric-lg">
        {value}
      </dd>
    </div>
  );
}

function PointsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 14.5 8.5 20.5 9.3 16 13.4 17.2 19.3 12 16.5 6.8 19.3 8 13.4 3.5 9.3 9.5 8.5 12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StreakIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 14c0-3 2-5 4-7 2 2 4 4 4 7a4 4 0 1 1-8 0Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10 15c.5 1 1.5 2 2 2s1.5-1 2-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QuestionsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4H18v14.5A1.5 1.5 0 0 1 16.5 20H7.5A2.5 2.5 0 0 1 5 17.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
