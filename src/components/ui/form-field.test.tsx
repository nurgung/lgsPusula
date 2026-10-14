import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FormErrorSummary,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-field";

describe("TextField", () => {
  it("has a visible label linked to the input", () => {
    render(<TextField label="Görünen ad" name="displayName" />);
    const input = screen.getByRole("textbox", { name: "Görünen ad" });
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("links hint and error text to the input and marks it invalid", () => {
    render(
      <TextField
        id="ad"
        label="Görünen ad"
        hint="Takma ad da olabilir."
        error="Görünen ad boş olamaz."
      />,
    );
    const input = screen.getByRole("textbox", { name: "Görünen ad" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("ad-ipucu ad-hata");
    expect(document.getElementById("ad-ipucu")?.textContent).toBe(
      "Takma ad da olabilir.",
    );
    expect(document.getElementById("ad-hata")?.textContent).toBe(
      "Hata: Görünen ad boş olamaz.",
    );
  });

  it("marks optional fields in the label text", () => {
    render(<TextField label="Not" optional />);
    expect(screen.getByRole("textbox", { name: "Not (isteğe bağlı)" })).toBeDefined();
  });
});

describe("TextAreaField", () => {
  it("has a visible label and links its error", () => {
    render(<TextAreaField id="aciklama" label="Açıklama" error="Açıklamayı yaz." />);
    const textarea = screen.getByRole("textbox", { name: "Açıklama" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.getAttribute("aria-describedby")).toBe("aciklama-hata");
  });
});

describe("NumberField", () => {
  it("opens the numeric keyboard and describes the unit", () => {
    render(<NumberField id="soru" label="Soru sayısı" unit="soru" />);
    const input = screen.getByRole("textbox", { name: "Soru sayısı" });
    expect(input.getAttribute("type")).toBe("text");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("aria-describedby")).toBe("soru-birim");
    expect(document.getElementById("soru-birim")?.textContent).toBe("soru");
  });

  it("uses the decimal keyboard when decimals are allowed", () => {
    render(<NumberField label="Net" allowDecimal />);
    expect(screen.getByRole("textbox", { name: "Net" }).getAttribute("inputmode")).toBe(
      "decimal",
    );
  });
});

describe("SelectField", () => {
  it("renders a labelled select with an optional empty choice", () => {
    render(
      <SelectField
        label="Ders"
        placeholder="Ders seç"
        options={[
          { value: "mat", label: "Matematik" },
          { value: "fen", label: "Fen Bilimleri" },
        ]}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Ders" });
    expect(select.querySelectorAll("option")).toHaveLength(3);
  });
});

describe("FormErrorSummary", () => {
  it("renders nothing without errors", () => {
    const { container } = render(<FormErrorSummary errors={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("announces errors and links each one to its field", () => {
    render(
      <FormErrorSummary
        errors={[
          { fieldId: "dogru", message: "Doğru sayısı eksi olamaz." },
          { fieldId: "bos", message: "Boş sayısını yaz." },
        ]}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("düzeltilmesi gereken");
    expect(
      screen
        .getByRole("link", { name: "Doğru sayısı eksi olamaz." })
        .getAttribute("href"),
    ).toBe("#dogru");
  });
});
