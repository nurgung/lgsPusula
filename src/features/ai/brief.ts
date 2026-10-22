import type { CoachingReport } from "@/features/coaching/rules";

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+/g;

export type AiBrief = {
  ruleId: string;
  practiceWindow: string;
  examWindow: string;
  lines: string[];
};

function cleanLine(value: string): string {
  return value
    .replace(UUID_PATTERN, "")
    .replace(EMAIL_PATTERN, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

/**
 * The only text that may leave the server. It is the rule card itself:
 * no account id, no name, no href, and no exam title.
 */
export function coachingBrief(report: CoachingReport): AiBrief {
  const item = report.recommendation;
  const lines = [item.message, item.reason, ...item.evidence]
    .map(cleanLine)
    .filter((line) => line.length > 0)
    .slice(0, 8);
  return {
    ruleId: item.ruleId,
    practiceWindow: `${report.practiceWindow.from}/${report.practiceWindow.to}`,
    examWindow: `${report.examWindow.from}/${report.examWindow.to}`,
    lines,
  };
}
