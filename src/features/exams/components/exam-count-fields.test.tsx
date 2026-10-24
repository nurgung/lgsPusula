import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExamCountFields } from "./exam-count-fields";

describe("ExamCountFields", () => {
  it("reduces the blank count as correct and wrong are typed", () => {
    render(
      <ExamCountFields
        idPrefix="turkce"
        namePrefix="turkce"
        fixedQuestionCount={20}
        initialCorrect=""
        initialWrong=""
        fieldErrors={{}}
      />,
    );
    const blank = screen.getByRole("textbox", { name: "Boş" });
    expect(blank).toHaveProperty("readOnly", true);
    expect(blank).toHaveProperty("value", "20");

    fireEvent.change(screen.getByRole("textbox", { name: "Doğru" }), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Yanlış" }), {
      target: { value: "3" },
    });

    expect(blank).toHaveProperty("value", "5");
    expect(screen.getByText(/Soru sayısından doğru ve yanlış/)).toBeTruthy();
  });

  it("explains when correct and wrong pass the question count", () => {
    render(
      <ExamCountFields
        idPrefix="branch"
        namePrefix="branch"
        initialQuestionCount="10"
        initialCorrect="8"
        initialWrong="4"
        fieldErrors={{}}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Boş" })).toHaveProperty("value", "");
    expect(screen.getByText(/soru sayısını geçemez/)).toBeTruthy();
  });
});
