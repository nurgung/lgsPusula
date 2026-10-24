import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CatalogSubject } from "@/features/curriculum/catalog";
import { MistakeForm } from "./mistake-form";

const source = {
  sourceName: "test",
  sourceVersion: "1",
  createdAt: "2026-10-24T00:00:00Z",
};

const catalog = [
  {
    ...source,
    id: "turkce",
    code: "turkce",
    name: "Türkçe",
    sortOrder: 1,
    archived: false,
    topics: [
      {
        ...source,
        id: "okuma",
        name: "Okuma",
        sortOrder: 1,
        archived: false,
        outcomes: [
          {
            ...source,
            id: "o1",
            code: "T.8.3.13",
            description: "Okuduklarını özetler.",
            sortOrder: 1,
            archived: false,
          },
        ],
      },
    ],
  },
] satisfies CatalogSubject[];

describe("MistakeForm", () => {
  it("opens one dropdown for each wrong answer", () => {
    render(
      <MistakeForm
        examId="11111111-1111-4111-8111-111111111111"
        catalog={catalog}
        subjects={[
          {
            resultId: "22222222-2222-4222-8222-222222222222",
            subjectId: "turkce",
            subjectName: "Türkçe",
            wrongCount: 6,
            blankCount: 1,
          },
        ]}
        initialRows={[]}
      />,
    );

    expect(screen.getAllByRole("combobox", { name: /yanlış/ })).toHaveLength(6);
    expect(screen.getByRole("combobox", { name: "1. boş" })).toBeTruthy();
    const first = screen.getByRole("combobox", { name: "1. yanlış" });
    expect(first.querySelector("option[value='outcome:o1']")?.textContent).toBe(
      "T.8.3.13 Okuduklarını özetler.",
    );
  });
});
