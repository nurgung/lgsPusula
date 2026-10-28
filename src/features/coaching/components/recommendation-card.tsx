import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { formatTurkishDateRange } from "@/features/study/calendar";
import { cn } from "@/lib/cn";
import { COACHING_MESSAGES } from "../messages";
import { coachingLead, studentVisibleEvidence, studentVisibleReason } from "../present";
import type { CoachingReport } from "../rules";
import { CompletePracticeButton } from "./complete-practice-button";

export function RecommendationCard({
  report,
  audience = "student",
  readOnlyNote,
  explanation = null,
  afterAction = null,
}: {
  report: CoachingReport;
  audience?: "student" | "parent";
  readOnlyNote?: string;
  explanation?: string | null;
  /** Sits after the action row. Home no longer needs a stage glance here. */
  afterAction?: ReactNode;
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
      className="min-w-0 rounded-panel border-2 border-brand-200 bg-linear-to-br from-surface to-brand-50 p-4 shadow-card sm:p-5"
      aria-labelledby="bugunku-koc"
      data-coach-card=""
    >
      <div className="flex min-w-0 items-center gap-2">
        <CoachMark />
        <h2 id="bugunku-koc" className="text-helper font-bold tracking-wide text-brand-700 uppercase">
          {COACHING_MESSAGES.cardTitle}
        </h2>
      </div>

      <div className="mt-3 grid min-w-0 gap-3">
        <div className="flex min-w-0 items-start gap-3 rounded-card border border-brand-100 bg-brand-50 px-3 py-3 sm:items-center sm:px-5 sm:py-4">
          <MessageMark />
          <p className="min-w-0 text-card-title font-extrabold leading-snug break-words text-ink-900 sm:text-section">
            {lead}
          </p>
        </div>

        {reason ? (
          <p className="min-w-0 text-helper leading-snug break-words text-ink-700">
            <span className="font-semibold text-ink-900">Neden: </span>
            {reason}
          </p>
        ) : null}

        {audience === "parent" && readOnlyNote ? (
          <p className="min-w-0 text-helper break-words text-ink-700">{readOnlyNote}</p>
        ) : null}

        {action}
        {afterAction}

        {showDetails ? (
          <details className="min-w-0 rounded-card border border-border bg-surface-muted px-3 open:pb-2">
            <summary className="min-h-touch cursor-pointer rounded-control py-2">
              <h3 className="inline text-body font-bold text-ink-900">
                {COACHING_MESSAGES.whyHeading}
              </h3>
            </summary>
            <div className="grid min-w-0 gap-2 pb-1">
              {parentWindow ? (
                <p className="min-w-0 text-helper break-words text-ink-700">{parentWindow}</p>
              ) : null}
              {details.length > 0 ? (
                <ul className="grid min-w-0 list-disc gap-1 pl-5 text-helper text-ink-700">
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
            className="min-w-0 rounded-card border border-border bg-surface-muted px-3 py-2"
            aria-labelledby="oneri-sade"
          >
            <h3 id="oneri-sade" className="text-helper font-bold text-ink-900">
              Sade anlatım
            </h3>
            <p className="mt-1 min-w-0 text-helper leading-snug break-words text-ink-900">
              {explanation}
            </p>
            <p className="mt-1 text-helper leading-snug text-ink-600">
              {COACHING_MESSAGES.narrationDisclaimer}
            </p>
          </section>
        ) : (
          <p className="min-w-0 text-helper leading-snug break-words text-ink-600">
            {COACHING_MESSAGES.narrationAbsent}
          </p>
        )}
      </div>
    </section>
  );
}

function MessageMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-surface text-brand-700 shadow-soft"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l2.4 5.2 5.6.7-4.1 3.9 1.1 5.6L12 15.6 7 18.4l1.1-5.6L4 8.9l5.6-.7L12 3Z" />
      </svg>
    </span>
  );
}

function CoachMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-brand-100 text-brand-700",
        className,
      )}
    >
      <svg
        width="20"
        height="20"
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
