import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { cn } from "@/lib/cn";
import { MASCOT_MESSAGES } from "../messages";
import type { GrowthView } from "../growth";
import { speciesByCode, type SpeciesCode } from "../species";
import { HeroScene } from "./hero-scene";
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
  intro,
}: {
  species: SpeciesCode | null;
  growth: GrowthView;
  showLinks?: boolean;
  /** Home leads with one large figure, stats, optional path, then progress. Detail keeps the sentence block. */
  layout?: "home" | "detail";
  /** Inserted after the home stats (stage journey). */
  path?: ReactNode;
  /** Greeting block at the top of the home band. */
  intro?: ReactNode;
}) {
  const chosen = species ? speciesByCode(species) : undefined;
  const health = HEALTH_TEXT[growth.health];
  const unmet = growth.requirements.filter((item) => !item.met);
  const meter = unmet[0];
  const pointsLine = `Toplam ${growth.points} ${MASCOT_MESSAGES.pointsUnit}. Aşama: ${growth.stageName}.`;
  const streakLine = `Çalışma serisi: ${growth.currentStreak} gün. En uzun seri: ${growth.longestStreak} gün. Toplam ${growth.studyDays} farklı gün, ${growth.questions} soru.`;

  if (layout === "home") {
    return (
      <div className="grid min-w-0" data-character-band="">
        <div className="relative isolate min-w-0 overflow-hidden bg-linear-to-br from-accent-100 via-accent-50 to-brand-100 p-4 sm:p-6">
          <HeroScene />
          <div className="relative z-10 grid min-w-0 gap-4 lg:grid-cols-[auto_minmax(0,1fr)_16.5rem] lg:gap-x-6 lg:[grid-template-areas:'figure_intro_side'_'figure_stage_side'_'figure_stats_side']">
            {intro ? (
              <div className="min-w-0 max-xs:order-1 lg:[grid-area:intro]">{intro}</div>
            ) : null}

            <div className="flex min-w-0 justify-center self-end max-xs:order-3 lg:[grid-area:figure] lg:justify-start">
              {chosen ? (
                <SpeciesFigure
                  code={chosen.code}
                  size="hero"
                  health={growth.health}
                  stage={growth.stageId}
                />
              ) : (
                <span className="flex min-h-40 w-full max-w-[15rem] items-center justify-center rounded-panel bg-surface/90 px-3 text-center text-helper font-semibold text-ink-900">
                  Henüz seçilmedi
                </span>
              )}
            </div>

            <div className="grid min-w-0 content-start gap-2 max-xs:order-2 lg:[grid-area:stage]">
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
            </div>

            <dl className="grid gap-2 xs:grid-cols-3 sm:gap-3 max-xs:order-4 lg:[grid-area:stats]">
              <Stat
                value={String(growth.points)}
                label="Karakter puanı"
                icon={<PointsIcon />}
                tone="brand"
              />
              <Stat
                value={`${growth.currentStreak} gün`}
                label="Çalışma serisi"
                icon={<StreakIcon />}
                tone="warm"
              />
              <Stat
                value={String(growth.questions)}
                label="Toplam soru"
                icon={<QuestionsIcon />}
                tone="cool"
              />
            </dl>

            <aside
              className="grid min-w-0 content-start gap-3 rounded-card border border-surface bg-surface/90 p-card-y px-card-x shadow-card max-xs:order-5 lg:[grid-area:side]"
              aria-label="Sağlık durumu ve sonraki aşama"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill bg-danger-50 text-danger-700"
                >
                  <HeartIcon />
                </span>
                <div className="grid min-w-0 gap-1">
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

              {growth.nextStageName ? (
                <div className="grid min-w-0 gap-2 border-t border-border pt-3">
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
            </aside>
          </div>
        </div>

        <div className="grid min-w-0 gap-section p-4 sm:p-6">
          {path}

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

const STAT_TONE = {
  brand: "bg-brand-100 text-brand-800",
  warm: "bg-warning-50 text-warning-800",
  cool: "bg-accent-100 text-accent-700",
} as const;

function Stat({
  value,
  label,
  icon,
  tone = "brand",
}: {
  value: string;
  label: string;
  icon: ReactNode;
  tone?: keyof typeof STAT_TONE;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-card border border-surface bg-surface/90 p-3 shadow-card xs:flex-col xs:items-stretch xs:justify-start xs:gap-2 sm:p-4">
      {/* Narrow phones: one row (symbol, label, value). From xs: symbol above the label, three columns. */}
      <div className="flex min-w-0 items-center gap-2 xs:flex-col xs:items-start sm:flex-row sm:items-start">
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-control sm:mt-0.5",
            STAT_TONE[tone],
          )}
        >
          {icon}
        </span>
        <dt className="min-w-0 text-helper font-semibold leading-snug break-words text-ink-700">
          {label}
        </dt>
      </div>
      <dd className="shrink-0 text-section font-extrabold break-words tabular-nums text-ink-900 xs:shrink sm:text-page-title">
        {value}
      </dd>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
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
