import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <Card title={COACHING_MESSAGES.cardTitle}>
      <div className="grid min-w-0 gap-4">
        <p className="min-w-0 text-lg font-semibold leading-snug break-words text-ink-900">
          {lead}
        </p>
        {reason ? (
          <p className="min-w-0 text-sm break-words text-ink-700">
            <span className="font-semibold text-ink-900">Gerekçe. </span>
            {reason}
          </p>
        ) : null}
        {showPractice || showLink ? (
          <div className="grid min-w-0 gap-2">
            <p className="text-sm font-bold text-ink-900">Sıradaki işlem</p>
            <div className="flex min-w-0 flex-wrap gap-2">
              {showPractice && item.practice ? (
                <CompletePracticeButton outcomeId={item.practice.outcomeId} />
              ) : null}
              {showLink && item.href && item.actionLabel ? (
                <ButtonLink href={item.href}>{item.actionLabel}</ButtonLink>
              ) : null}
            </div>
          </div>
        ) : null}
        {audience === "parent" && readOnlyNote ? (
          <p className="text-sm text-ink-700">{readOnlyNote}</p>
        ) : null}
        {showDetails ? (
          <details className="min-w-0 rounded-xl border border-border bg-canvas px-3">
            <summary className="min-h-11 cursor-pointer py-3">
              <h3 className="inline text-base font-bold text-ink-900">
                {COACHING_MESSAGES.whyHeading}
              </h3>
            </summary>
            <div className="grid min-w-0 gap-2 pb-3">
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
          <details className="min-w-0 rounded-xl border border-border bg-canvas px-3">
            <summary className="min-h-11 cursor-pointer py-3">
              <h3 id="oneri-sade" className="inline text-base font-bold text-ink-900">
                Sade anlatım
              </h3>
            </summary>
            <div className="grid min-w-0 gap-2 pb-3">
              <p className="min-w-0 break-words text-ink-900">{explanation}</p>
              <p className="text-sm text-ink-700">
                Bu cümle bir öneridir. Kayıtlarını ve puanını değiştirmez.
              </p>
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  );
}
