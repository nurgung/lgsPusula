import { describe, expect, it } from "vitest";
import {
  ANALYSIS_MAX_POINTS,
  buildExamAnalysis,
  formatSignedChange,
  type AnalysisExam,
} from "./analysis";

function exam(id: string, overrides: Partial<AnalysisExam> = {}): AnalysisExam {
  return {
    id,
    title: `Deneme ${id}`,
    takenOn: "2026-10-01",
    examType: "lgs_full",
    totalNet: 40,
    score: 400,
    ...overrides,
  };
}

/** Store order is newest first. */
const newestFirst = (...items: AnalysisExam[]) => items;

describe("buildExamAnalysis", () => {
  it("returns an empty analysis when there are no exams", () => {
    const analysis = buildExamAnalysis([]);
    expect(analysis.latest).toBeNull();
    expect(analysis.previous).toBeNull();
    expect(analysis.series).toEqual([]);
    expect(analysis.scorePoints).toEqual([]);
    expect(analysis.netPoints).toEqual([]);
    expect(analysis.scoreChange).toBeNull();
    expect(analysis.netChange).toBeNull();
  });

  it("shows a single exam as one point with no comparison", () => {
    const analysis = buildExamAnalysis([exam("a", { totalNet: 52.3333, score: 431.25 })]);
    expect(analysis.latest?.id).toBe("a");
    expect(analysis.previous).toBeNull();
    expect(analysis.latestScore).toBe(431.25);
    expect(analysis.latestNet).toBe(52.3333);
    expect(analysis.scorePoints).toHaveLength(1);
    expect(analysis.netPoints).toHaveLength(1);
    expect(analysis.scoreChange).toBeNull();
    expect(analysis.netChange).toBeNull();
  });

  it("orders several exams by date, oldest to newest", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("c", { takenOn: "2026-10-20", score: 420, totalNet: 55 }),
        exam("b", { takenOn: "2026-10-10", score: 400, totalNet: 50 }),
        exam("a", { takenOn: "2026-10-01", score: 380, totalNet: 45 }),
      ),
    );
    expect(analysis.series.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(analysis.scorePoints.map((point) => point.value)).toEqual([380, 400, 420]);
    expect(analysis.netPoints.map((point) => point.value)).toEqual([45, 50, 55]);
    expect(analysis.latest?.id).toBe("c");
    expect(analysis.previous?.id).toBe("b");
  });

  it("reports a score increase as latest minus previous", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("b", { takenOn: "2026-10-20", score: 412.5 }),
        exam("a", { takenOn: "2026-10-01", score: 400 }),
      ),
    );
    expect(analysis.scoreChange).toEqual({ delta: 12.5, direction: "up" });
  });

  it("reports a score decrease as a negative difference", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("b", { takenOn: "2026-10-20", score: 390 }),
        exam("a", { takenOn: "2026-10-01", score: 400 }),
      ),
    );
    expect(analysis.scoreChange).toEqual({ delta: -10, direction: "down" });
  });

  it("reports no change when both values match", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("b", { takenOn: "2026-10-20", totalNet: 50, score: 400 }),
        exam("a", { takenOn: "2026-10-01", totalNet: 50, score: 400 }),
      ),
    );
    expect(analysis.scoreChange?.direction).toBe("same");
    expect(analysis.netChange?.direction).toBe("same");
  });

  it("computes the net change from the two-decimal values the student sees", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("b", { takenOn: "2026-10-20", totalNet: 52.3333 }),
        exam("a", { takenOn: "2026-10-01", totalNet: 40.1167 }),
      ),
    );
    // 52,33 − 40,12
    expect(analysis.netChange).toEqual({ delta: 12.21, direction: "up" });
  });

  it("keeps the net but hides the score change when a score is missing", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("b", { takenOn: "2026-10-20", score: null, totalNet: 50 }),
        exam("a", { takenOn: "2026-10-01", score: 400, totalNet: 45 }),
      ),
    );
    expect(analysis.latestScore).toBeNull();
    expect(analysis.scoreChange).toBeNull();
    expect(analysis.scorePoints.map((point) => point.examId)).toEqual(["a"]);
    expect(analysis.netChange).toEqual({ delta: 5, direction: "up" });
    expect(analysis.netPoints).toHaveLength(2);
  });

  it("keeps the score but hides the net change when a net is missing", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("b", { takenOn: "2026-10-20", score: 410, totalNet: null }),
        exam("a", { takenOn: "2026-10-01", score: 400, totalNet: 45 }),
      ),
    );
    expect(analysis.latestNet).toBeNull();
    expect(analysis.netChange).toBeNull();
    expect(analysis.netPoints.map((point) => point.examId)).toEqual(["a"]);
    expect(analysis.scoreChange).toEqual({ delta: 10, direction: "up" });
  });

  it("never treats a missing or invalid value as zero", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("b", { takenOn: "2026-10-20", score: null, totalNet: Number.NaN }),
        exam("a", { takenOn: "2026-10-01", score: null, totalNet: -1 }),
      ),
    );
    expect(analysis.scorePoints).toEqual([]);
    expect(analysis.netPoints).toEqual([]);
    expect(analysis.scoreChange).toBeNull();
    expect(analysis.netChange).toBeNull();
  });

  it("does not compare with an older exam when the previous one has no score", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("c", { takenOn: "2026-10-20", score: 410 }),
        exam("b", { takenOn: "2026-10-10", score: null }),
        exam("a", { takenOn: "2026-10-01", score: 400 }),
      ),
    );
    expect(analysis.previous?.id).toBe("b");
    expect(analysis.scoreChange).toBeNull();
    expect(analysis.scorePoints.map((point) => point.examId)).toEqual(["a", "c"]);
  });

  it("uses the store order for exams saved on the same date", () => {
    // Store order is newest created first, so "second" was saved after "first".
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("second", { takenOn: "2026-10-10", score: 420, totalNet: 55 }),
        exam("first", { takenOn: "2026-10-10", score: 400, totalNet: 50 }),
        exam("older", { takenOn: "2026-10-01", score: 380, totalNet: 45 }),
      ),
    );
    expect(analysis.series.map((item) => item.id)).toEqual(["older", "first", "second"]);
    expect(analysis.latest?.id).toBe("second");
    expect(analysis.previous?.id).toBe("first");
    expect(analysis.scoreChange).toEqual({ delta: 20, direction: "up" });
  });

  it("keeps full and branch exams apart", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("full-new", { takenOn: "2026-10-20", totalNet: 60 }),
        exam("branch", { takenOn: "2026-10-15", examType: "branch", totalNet: 15 }),
        exam("full-old", { takenOn: "2026-10-01", totalNet: 50 }),
      ),
    );
    expect(analysis.series.map((item) => item.id)).toEqual(["full-old", "full-new"]);
    expect(analysis.previous?.id).toBe("full-old");
    expect(analysis.excludedOtherType).toBe(1);
    expect(analysis.netChange).toEqual({ delta: 10, direction: "up" });
  });

  it("shows no comparison when the only other exam has a different type", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("full", { takenOn: "2026-10-20" }),
        exam("branch", { takenOn: "2026-10-15", examType: "branch" }),
      ),
    );
    expect(analysis.previous).toBeNull();
    expect(analysis.netChange).toBeNull();
    expect(analysis.scoreChange).toBeNull();
  });

  it("limits the series to the newest exams and says so", () => {
    const many = Array.from({ length: ANALYSIS_MAX_POINTS + 3 }, (_, index) =>
      exam(`e${index}`, {
        takenOn: `2026-09-${String(index + 1).padStart(2, "0")}`,
        totalNet: index,
      }),
    ).reverse();
    const analysis = buildExamAnalysis(many);
    expect(analysis.series).toHaveLength(ANALYSIS_MAX_POINTS);
    expect(analysis.truncated).toBe(true);
    expect(analysis.series.at(-1)?.id).toBe(`e${ANALYSIS_MAX_POINTS + 2}`);
  });

  it("derives chart points and summary values from the same records", () => {
    const analysis = buildExamAnalysis(
      newestFirst(
        exam("b", { takenOn: "2026-10-20", score: 410, totalNet: 55.5 }),
        exam("a", { takenOn: "2026-10-01", score: 400, totalNet: 50.25 }),
      ),
    );
    const lastScore = analysis.scorePoints.at(-1);
    const lastNet = analysis.netPoints.at(-1);
    expect(lastScore?.examId).toBe(analysis.latest?.id);
    expect(lastScore?.value).toBe(analysis.latestScore);
    expect(lastNet?.examId).toBe(analysis.latest?.id);
    expect(lastNet?.value).toBe(analysis.latestNet);
    const first = analysis.scorePoints[0]!;
    expect(first.examId).toBe(analysis.previous?.id);
    expect(lastScore!.value - first.value).toBe(analysis.scoreChange?.delta);
  });

  it("does not change the input order", () => {
    const input = newestFirst(
      exam("b", { takenOn: "2026-10-20" }),
      exam("a", { takenOn: "2026-10-01" }),
    );
    buildExamAnalysis(input);
    expect(input.map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("formatSignedChange", () => {
  it("writes an explicit sign with a real minus", () => {
    expect(formatSignedChange(12.5, 2)).toBe("+12,5");
    expect(formatSignedChange(-3, 2)).toBe("−3");
    expect(formatSignedChange(0, 2)).toBe("0");
    expect(formatSignedChange(2.1, 2, 2)).toBe("+2,10");
  });
});
