import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StateMessage } from "./state-message";

describe("StateMessage", () => {
  it("announces errors as alerts with a visible text label", () => {
    render(<StateMessage variant="error" title="Kayıt kaydedilemedi." />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Hata");
    expect(alert.textContent).toContain("Kayıt kaydedilemedi.");
  });

  it("marks loading as a busy status region", () => {
    render(<StateMessage variant="loading" title="Yükleniyor" />);
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
  });

  it("announces success as a status message", () => {
    render(<StateMessage variant="success" title="Kaydın eklendi." />);
    expect(screen.getByRole("status").textContent).toContain("Başarılı");
  });

  it("renders the optional description and action", () => {
    render(
      <StateMessage
        variant="empty"
        title="Henüz kayıt yok"
        description="İstersen şimdi ekleyebilirsin."
        action={<button type="button">Kayıt ekle</button>}
      />,
    );
    expect(screen.getByText("İstersen şimdi ekleyebilirsin.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Kayıt ekle" })).toBeDefined();
  });
});
