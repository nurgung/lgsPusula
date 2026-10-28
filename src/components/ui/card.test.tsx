import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("renders a titled section with helper description", () => {
    render(
      <Card title="Haftalık özet" description="Bu haftanın soru toplamı.">
        <p>120 soru</p>
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Haftalık özet" })).toBeDefined();
    expect(screen.getByText("Bu haftanın soru toplamı.")).toBeDefined();
    expect(screen.getByText("120 soru")).toBeDefined();
  });

  it("keeps accent and quiet variants on token surfaces", () => {
    const { rerender, container } = render(<Card variant="accent" title="Deneme" />);
    expect(container.firstElementChild?.className).toContain("bg-accent-50");
    rerender(<Card variant="quiet" title="Bilgi" />);
    expect(container.firstElementChild?.className).toContain("bg-surface-muted");
  });
});
