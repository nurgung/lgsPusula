import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatTurkishDateRange } from "@/features/study/calendar";
import { COACHING_RULE_VERSION } from "../constants";
import { COACHING_MESSAGES } from "../messages";
import type { CoachingReport } from "../rules";

export function RecommendationCard({ report }: { report: CoachingReport }) {
  const item = report.recommendation;
  return (
    <Card
      title={COACHING_MESSAGES.cardTitle}
      description={`Kural: ${COACHING_RULE_VERSION}`}
    >
      <div className="grid min-w-0 gap-4">
        <p className="text-sm text-ink-700">
          Çalışma: {formatTurkishDateRange(report.practiceWindow)}. Deneme ve kazanım:{" "}
          {formatTurkishDateRange(report.examWindow)}.
        </p>
        <p className="min-w-0 break-words text-ink-900">{item.message}</p>
        <section aria-labelledby="oneri-neden" className="grid min-w-0 gap-2">
          <h3 id="oneri-neden" className="text-base font-bold text-ink-900">
            {COACHING_MESSAGES.whyHeading}
          </h3>
          <p className="min-w-0 break-words text-sm text-ink-700">{item.reason}</p>
          <ul className="grid min-w-0 list-disc gap-1 pl-5 text-sm text-ink-700">
            {item.evidence.map((line) => (
              <li key={line} className="min-w-0 break-words">
                {line}
              </li>
            ))}
          </ul>
        </section>
        {item.href && item.actionLabel ? (
          <div>
            <ButtonLink href={item.href} variant="secondary">
              {item.actionLabel}
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
