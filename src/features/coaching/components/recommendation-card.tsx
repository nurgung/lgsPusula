import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatTurkishDateRange } from "@/features/study/calendar";
import { COACHING_MESSAGES } from "../messages";
import { studentVisibleEvidence, studentVisibleReason } from "../present";
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
  const evidence = studentVisibleEvidence(item.evidence);
  return (
    <Card title={COACHING_MESSAGES.cardTitle}>
      <div className="grid min-w-0 gap-4">
        {audience === "parent" ? (
          <p className="text-sm text-ink-700">
            Çalışma: {formatTurkishDateRange(report.practiceWindow)}. Deneme ve kazanım:{" "}
            {formatTurkishDateRange(report.examWindow)}.
          </p>
        ) : null}
        <p
          className={
            audience === "student"
              ? "min-w-0 rounded-xl bg-brand-50 p-4 text-lg font-semibold leading-snug break-words text-ink-900"
              : "min-w-0 break-words text-ink-900"
          }
        >
          {item.message}
        </p>
        {audience === "student" && item.practice ? (
          <CompletePracticeButton outcomeId={item.practice.outcomeId} />
        ) : null}
        <section aria-labelledby="oneri-neden" className="grid min-w-0 gap-2">
          <h3 id="oneri-neden" className="text-base font-bold text-ink-900">
            {COACHING_MESSAGES.whyHeading}
          </h3>
          {reason ? (
            <p className="min-w-0 break-words text-sm text-ink-700">{reason}</p>
          ) : null}
          {evidence.length > 0 ? (
            <ul className="grid min-w-0 list-disc gap-1 pl-5 text-sm text-ink-700">
              {evidence.map((line) => (
                <li key={line} className="min-w-0 break-words">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        {explanation ? (
          <section aria-labelledby="oneri-sade" className="grid min-w-0 gap-2">
            <h3 id="oneri-sade" className="text-base font-bold text-ink-900">
              Sade anlatım
            </h3>
            <p className="min-w-0 break-words text-ink-900">{explanation}</p>
            <p className="text-sm text-ink-700">
              Bu cümle bir öneridir. Kayıtlarını ve puanını değiştirmez.
            </p>
          </section>
        ) : null}
        {audience === "student" && item.href && item.actionLabel ? (
          <div>
            <ButtonLink href={item.href}>{item.actionLabel}</ButtonLink>
          </div>
        ) : null}
        {audience === "parent" && readOnlyNote ? (
          <p className="text-sm text-ink-700">{readOnlyNote}</p>
        ) : null}
      </div>
    </Card>
  );
}
