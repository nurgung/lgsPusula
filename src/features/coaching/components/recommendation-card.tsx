import { ButtonLink } from "@/components/ui/button";
import { formatTurkishDateRange } from "@/features/study/calendar";
import { COACHING_MESSAGES } from "../messages";
import { coachingLead, studentVisibleEvidence, studentVisibleReason } from "../present";
import type { CoachingReport } from "../rules";
import { CompletePracticeButton } from "./complete-practice-button";

export function RecommendationCard({
  report,
  audience = "student",
  readOnlyNote,
  explanation = null,
}: {
  report: CoachingReport;
  audience?: "student" | "parent";
  readOnlyNote?: string;
  explanation?: string | null;
}) {
  const item = report.recommendation;
  const reason = studentVisibleReason(item.reason);
  const details = studentVisibleEvidence(item.evidence);
  const lead = coachingLead(item.message, item.evidence);
  const parentWindow =
    audience === "parent"
      ? `Çalışma: ${formatTurkishDateRange(report.practiceWindow)}. Deneme ve kazanım: ${formatTurkishDateRange(report.examWindow)}.`
      : null;
  const showPractice = audience === "student" && item.practice != null;
  const showLink = audience === "student" && item.href != null && item.actionLabel != null;
  const showDetails = details.length > 0 || parentWindow != null;

  const action =
    showPractice || showLink ? (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {showPractice && item.practice ? (
          <CompletePracticeButton outcomeId={item.practice.outcomeId} />
        ) : null}
        {showLink && item.href && item.actionLabel ? (
          <ButtonLink href={item.href} variant={showPractice ? "secondary" : "primary"}>
            {item.actionLabel}
          </ButtonLink>
        ) : null}
      </div>
    ) : null;

  return (
    <section
      className="min-w-0 rounded-card border-2 border-brand-700 bg-surface p-3 shadow-card sm:p-4"
      aria-labelledby="bugunku-koc"
    >
      <h2 id="bugunku-koc" className="text-sm font-bold text-brand-700">
        {COACHING_MESSAGES.cardTitle}
      </h2>
      <div className="mt-2 grid min-w-0 gap-2">
        <div className="flex min-w-0 items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2">
          <CoachMark />
          <p className="min-w-0 text-lg font-extrabold leading-snug break-words text-ink-900">
            {lead}
          </p>
        </div>
        {action}
        {reason ? (
          <p className="min-w-0 text-sm leading-snug break-words text-ink-700">
            <span className="font-semibold text-ink-900">Gerekçe. </span>
            {reason}
          </p>
        ) : null}
        {audience === "parent" && readOnlyNote ? (
          <p className="min-w-0 text-sm break-words text-ink-700">{readOnlyNote}</p>
        ) : null}
        {showDetails ? (
          <details className="min-w-0 rounded-xl border border-border bg-canvas px-3">
            <summary className="min-h-11 cursor-pointer rounded-xl py-2">
              <h3 className="inline text-base font-bold text-ink-900">
                {COACHING_MESSAGES.whyHeading}
              </h3>
            </summary>
            <div className="grid min-w-0 gap-2 pb-2">
              {parentWindow ? (
                <p className="min-w-0 text-sm break-words text-ink-700">{parentWindow}</p>
              ) : null}
              {details.length > 0 ? (
                <ul className="grid min-w-0 list-disc gap-1 pl-5 text-sm text-ink-700">
                  {details.map((line) => (
                    <li key={line} className="min-w-0 break-words">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
        ) : null}
        {explanation ? (
          <section
            className="min-w-0 rounded-xl border border-border bg-canvas px-3 py-2"
            aria-labelledby="oneri-sade"
          >
            <h3 id="oneri-sade" className="text-sm font-bold text-ink-900">
              Sade anlatım
            </h3>
            <p className="mt-1 min-w-0 text-sm leading-snug break-words text-ink-900">
              {explanation}
            </p>
            <p className="mt-1 text-sm leading-snug text-ink-700">
              {COACHING_MESSAGES.narrationDisclaimer}
            </p>
          </section>
        ) : (
          <p className="min-w-0 text-sm leading-snug break-words text-ink-700">
            {COACHING_MESSAGES.narrationAbsent}
          </p>
        )}
      </div>
    </section>
  );
}

function CoachMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-700"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H10l-4 3v-3H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      </svg>
    </span>
  );
}
