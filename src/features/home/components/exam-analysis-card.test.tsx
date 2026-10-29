import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildExamAnalysis, type AnalysisExam } from "@/features/exams/analysis";
import { supportiveCopyIssues } from "@/features/mascot/messages";
import type { PeriodSummary } from "@/features/study/summary";
import { ExamAnalysisCard } from "./exam-analysis-card";
import { HomeSummaryBand } from "./home-summary-band";

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

const render_ = (exams: AnalysisExam[]) =>
  render(<ExamAnalysisCard analysis={buildExamAnalysis(exams)} />);

describe("ExamAnalysisCard", () => {
  it("shows a short guiding empty state and no chart when there is no exam", () => {
    render_([]);
    expect(screen.getByRole("heading", { name: "Deneme Analizi" })).toBeTruthy();
    expect(screen.getByText("Henüz deneme kaydın yok.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Deneme ekle" }).getAttribute("href")).toBe(
      "/ogrenci/denemeler/yeni",
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText("Son deneme puanı")).toBeNull();
  });

  it("shows one point per chart and draws no comparison for a single exam", () => {
    render_([exam("a", { score: 431.25, totalNet: 52.3333, takenOn: "2026-10-20" })]);
    expect(screen.getByTestId("latest-score").textContent).toBe("431,25");
    const latestNet = screen.getByText("Son deneme neti").closest("div")!;
    expect(latestNet.textContent).toContain("52,33");
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(document.querySelectorAll("polyline")).toHaveLength(0);
    expect(document.querySelectorAll("circle")).toHaveLength(2);
    expect(screen.getAllByText(/Tek kayıt var/)).toHaveLength(2);
    expect(screen.queryByText(/farkı/)).toBeNull();
    expect(screen.getByText(/aynı türden bir deneme daha gerekir/)).toBeTruthy();
  });

  it("shows a score increase and a net increase from the real records", () => {
    render_([
      exam("b", { takenOn: "2026-10-20", score: 412.5, totalNet: 52.3333 }),
      exam("a", { takenOn: "2026-10-01", score: 400, totalNet: 40.1167 }),
    ]);
    expect(screen.getByTestId("latest-score").textContent).toBe("412,5");
    const score = screen.getByText("Puan farkı").closest("div")!;
    expect(score.textContent).toContain("+12,5");
    expect(score.textContent).toContain("puan arttı");
    const net = screen.getByText("Net farkı").closest("div")!;
    expect(net.textContent).toContain("+12,21");
    expect(net.textContent).toContain("net arttı");
    expect(document.querySelectorAll("polyline")).toHaveLength(2);
    expect(screen.getByText(/Önceki denemeye göre \(Deneme a,/)).toBeTruthy();
  });

  it("shows a score decrease neutrally", () => {
    render_([
      exam("b", { takenOn: "2026-10-20", score: 390 }),
      exam("a", { takenOn: "2026-10-01", score: 400 }),
    ]);
    const score = screen.getByText("Puan farkı").closest("div")!;
    expect(score.textContent).toContain("−10");
    expect(score.textContent).toContain("puan azaldı");
    expect(supportiveCopyIssues(document.body.textContent ?? "")).toEqual([]);
  });

  it("marks the score as missing but keeps the net when the score is absent", () => {
    render_([
      exam("b", { takenOn: "2026-10-20", score: null, totalNet: 50 }),
      exam("a", { takenOn: "2026-10-01", score: 400, totalNet: 45 }),
    ]);
    expect(screen.getByText("Puan kaydı yok")).toBeTruthy();
    expect(screen.queryByTestId("latest-score")).toBeNull();
    const score = screen.getByText("Puan farkı").closest("div")!;
    expect(within(score).getByText("Veri yok")).toBeTruthy();
    const net = screen.getByText("Net farkı").closest("div")!;
    expect(net.textContent).toContain("+5,00");
    // One score is recorded, so the score chart shows a single point.
    expect(screen.getAllByText(/Tek kayıt var/)).toHaveLength(1);
  });

  it("marks the net as missing but keeps the score when the net is absent", () => {
    render_([
      exam("b", { takenOn: "2026-10-20", score: 410, totalNet: null }),
      exam("a", { takenOn: "2026-10-01", score: 400, totalNet: 45 }),
    ]);
    expect(screen.getByTestId("latest-score").textContent).toBe("410");
    const latestNet = screen.getByText("Son deneme neti").closest("div")!;
    expect(within(latestNet).getByText("Veri yok")).toBeTruthy();
    const net = screen.getByText("Net farkı").closest("div")!;
    expect(within(net).getByText("Veri yok")).toBeTruthy();
    const score = screen.getByText("Puan farkı").closest("div")!;
    expect(score.textContent).toContain("+10");
    // Missing values are never plotted as zero.
    expect(
      screen.getByRole("img", { name: /Net gelişimi/ }).getAttribute("aria-label"),
    ).not.toMatch(/: 0[,;.]/);
  });

  it("orders same-day exams by store order and compares the latest with the one before", () => {
    render_([
      exam("second", { takenOn: "2026-10-10", score: 420 }),
      exam("first", { takenOn: "2026-10-10", score: 400 }),
    ]);
    expect(screen.getByTestId("latest-score").textContent).toBe("420");
    expect(screen.getByText(/Önceki denemeye göre \(Deneme first,/)).toBeTruthy();
  });

  it("keeps chart labels, summary and table on the same records", () => {
    const exams = [
      exam("c", { takenOn: "2026-10-20", score: 420, totalNet: 55.5 }),
      exam("b", { takenOn: "2026-10-10", score: 410, totalNet: 52 }),
      exam("a", { takenOn: "2026-10-01", score: 400, totalNet: 50.25 }),
    ];
    render_(exams);
    const scoreChart = screen.getByRole("img", { name: /Puan gelişimi/ });
    expect(scoreChart.getAttribute("aria-label")).toContain("400");
    expect(scoreChart.getAttribute("aria-label")).toContain("410");
    expect(scoreChart.getAttribute("aria-label")).toContain("420");
    const netChart = screen.getByRole("img", { name: /Net gelişimi/ });
    expect(netChart.getAttribute("aria-label")).toContain("50,25");
    expect(netChart.getAttribute("aria-label")).toContain("55,50");

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("Deneme a");
    expect(rows[0]!.textContent).toContain("400");
    expect(rows[0]!.textContent).toContain("50,25");
    expect(rows[2]!.textContent).toContain("Deneme c");
    expect(rows[2]!.textContent).toContain("55,50");
    // The summary shows the last table row.
    expect(screen.getByTestId("latest-score").textContent).toBe("420");
  });

  it("says when exams of another type were left out", () => {
    render_([
      exam("full", { takenOn: "2026-10-20" }),
      exam("branch", { takenOn: "2026-10-15", examType: "branch" }),
    ]);
    expect(screen.getByText(/1 deneme farklı türde/)).toBeTruthy();
  });

  it("links to the exam list", () => {
    render_([exam("a")]);
    expect(screen.getByRole("link", { name: "Tüm denemeler" }).getAttribute("href")).toBe(
      "/ogrenci/denemeler",
    );
  });

  it("keeps long titles and the chart inside the card width", () => {
    render_([exam("a", { title: "Çok uzun bir deneme adı ".repeat(8) })]);
    const svg = screen.getAllByRole("img")[0]!;
    expect(svg.getAttribute("class")).toContain("w-full");
    expect(svg.getAttribute("viewBox")).toBe("0 0 260 190");
  });
});

const week: PeriodSummary = {
  from: "2026-10-19",
  to: "2026-10-23",
  questionCount: 0,
  correctCount: 0,
  wrongCount: 0,
  blankCount: 0,
  durationMinutes: 0,
  bySubject: [],
};

describe("HomeSummaryBand", () => {
  it("renders analysis, week, latest exam and badges in one reading order", () => {
    render(
      <HomeSummaryBand
        week={week}
        analysis={buildExamAnalysis([exam("a", { title: "Ekim denemesi" })])}
        rewards={[
          {
            eventType: "study_log",
            points: 5,
            sourceDate: "2026-10-23",
            ruleVersion: "mascot-v1",
          },
        ]}
      />,
    );
    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings).toEqual(["Deneme Analizi", "Bu hafta", "Son deneme", "Rozetlerin"]);
    expect(screen.getByRole("link", { name: "Denemeye bak" })).toBeTruthy();
  });

  it("does not repeat the empty exam message when there is no exam", () => {
    render(<HomeSummaryBand week={week} analysis={buildExamAnalysis([])} rewards={[]} />);
    expect(screen.getAllByText("Henüz deneme kaydın yok.")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Son deneme" })).toBeNull();
  });
});
