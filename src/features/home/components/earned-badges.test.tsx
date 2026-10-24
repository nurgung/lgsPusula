import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EarnedBadges } from "./earned-badges";

describe("EarnedBadges", () => {
  it("shows an empty state and a link to every badge", () => {
    render(<EarnedBadges rewards={[]} />);
    expect(screen.getByText("Henüz rozetin yok.")).toBeTruthy();
    expect(screen.queryByText("Henüz değil")).toBeNull();
    expect(screen.getByRole("link", { name: "Tüm rozetler" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
  });

  it("lists a few earned badges and hides the ones not earned", () => {
    render(
      <EarnedBadges
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
    expect(screen.getByText(/1 rozet kazandın/)).toBeTruthy();
    expect(screen.getByText(/İlk kayıt/)).toBeTruthy();
    expect(screen.getByText("Kazandın")).toBeTruthy();
    expect(screen.queryByText("Deneme kaydı")).toBeNull();
    expect(screen.queryByText(/mascot-v1/)).toBeNull();
  });
});
