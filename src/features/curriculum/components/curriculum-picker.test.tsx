import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogSubject } from "../catalog";
import { CurriculumPicker } from "./curriculum-picker";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const meta = {
  sourceName: "Kurgusal kaynak",
  sourceVersion: "deneme-1",
  createdAt: "2026-10-13T09:00:00Z",
  sortOrder: 0,
  archived: false,
};

const catalog: CatalogSubject[] = [
  {
    ...meta,
    id: uuid(1),
    code: "fen",
    name: "Fen Bilimleri",
    topics: [
      {
        ...meta,
        id: uuid(11),
        name: "Işık ve ses",
        outcomes: [
          {
            ...meta,
            id: uuid(111),
            code: "F.8.5.1",
            description: "Işığın yansımasını açıklar.",
          },
        ],
      },
    ],
  },
  {
    ...meta,
    id: uuid(2),
    code: "matematik",
    name: "Matematik",
    topics: [{ ...meta, id: uuid(21), name: "Üslü ifadeler", outcomes: [] }],
  },
];

const hiddenValue = (container: HTMLElement, name = "catalogItem") =>
  (container.querySelector(`input[type="hidden"][name="${name}"]`) as HTMLInputElement)
    .value;

describe("CurriculumPicker", () => {
  it("groups its controls under a legend with visible labels", () => {
    render(<CurriculumPicker catalog={catalog} legend="Konu seç" optional />);
    expect(screen.getByRole("group", { name: "Konu seç (isteğe bağlı)" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "Ders (isteğe bağlı)" })).toBeDefined();
    expect(screen.getByRole("searchbox", { name: "Ara (isteğe bağlı)" })).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe(
      "Bir ders seç ya da aramaya başla.",
    );
  });

  it("finds an outcome without Turkish characters and stores the choice", () => {
    const onChange = vi.fn();
    const { container } = render(
      <CurriculumPicker catalog={catalog} onChange={onChange} />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "isik" } });
    expect(screen.getByRole("status").textContent).toBe("2 sonuç bulundu.");

    fireEvent.click(screen.getByRole("radio", { name: /Kazanım F\.8\.5\.1/ }));
    expect(hiddenValue(container)).toBe(`outcome:${uuid(111)}`);
    expect(onChange).toHaveBeenLastCalledWith({ kind: "outcome", id: uuid(111) });
    expect(screen.getByText(/^Seçilen: F\.8\.5\.1/)).toBeDefined();
  });

  it("keeps the choice when the list is filtered again, and can clear it", () => {
    const { container } = render(<CurriculumPicker catalog={catalog} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: uuid(2) } });
    fireEvent.click(screen.getByRole("radio", { name: /Konu: Üslü ifadeler/ }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bulunmayan" } });

    expect(screen.getByRole("status").textContent).toBe(
      "Sonuç bulunamadı. Başka bir kelime dene.",
    );
    expect(hiddenValue(container)).toBe(`topic:${uuid(21)}`);

    fireEvent.click(screen.getByRole("button", { name: "Seçimi kaldır" }));
    expect(hiddenValue(container)).toBe("");
  });

  it("ignores a default value that is not a valid selection", () => {
    const { container } = render(
      <CurriculumPicker catalog={catalog} defaultValue="subject:1" />,
    );
    expect(hiddenValue(container)).toBe("");
  });

  it("shows an empty state when there is no catalog yet", () => {
    render(<CurriculumPicker catalog={[]} />);
    expect(screen.getByText("Konu listesi henüz hazır değil.")).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
