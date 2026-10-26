import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EarnedBadges } from "./earned-badges";

describe("EarnedBadges", () => {
  it("shows an empty state and a link to every badge", () => {
    render(<EarnedBadges rewards={[]} />);
    expect(screen.getByText("Henüz rozetin yok.")).toBeTruthy();
    expect(screen.queryByText("Henüz değil")).toBeNull();
    expect(screen.queryByRole("list", { name: "Kazanılan rozetler" })).toBeNull();
    expect(screen.getByRole("link", { name: "Tüm rozetler" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
  });

  it("lists earned badges without the long description and hides the ones not earned", () => {
    render(
      <EarnedBadges
        rewards={[
          {
            eventType: "study_log",
            points: 5,
            sourceDate: "2026-10-23",
            ruleVersion: "mascot-v1",
          },
          {
            eventType: "daily_goal",
            points: 10,
            sourceDate: "2026-10-23",
            ruleVersion: "mascot-v1",
          },
        ]}
      />,
    );
    expect(screen.getByText("2 rozet kazandın.")).toBeTruthy();
    const strip = screen.getByRole("list", { name: "Kazanılan rozetler" });
    expect(strip.className).toContain("overflow-x-auto");
    expect(screen.getByRole("link", { name: /İlk kayıt/ }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
    expect(screen.getByRole("link", { name: /Hedefe ulaştın/ }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
    expect(screen.getAllByText("Kazandın")).toHaveLength(2);
    expect(
      screen.queryByText("Bir çalışma kaydı eklediğinde durur. Silmek bunu geri almaz."),
    ).toBeNull();
    expect(
      screen.queryByText(
        "Tüm dersler için seçtiğin günlük soru hedefini bir kez tamamladığında durur.",
      ),
    ).toBeNull();
    expect(screen.queryByText("Deneme kaydı")).toBeNull();
    expect(screen.queryByText("Henüz değil")).toBeNull();
    expect(screen.queryByText(/mascot-v1/)).toBeNull();
  });
});
