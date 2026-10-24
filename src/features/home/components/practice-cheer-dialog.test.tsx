import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PracticeCheerDialog } from "./practice-cheer-dialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

const copy = {
  heading: "Başarıya bir adım daha yaklaştın.",
  detail: "Bu kazanımın sorularını bitirdin. Sıradaki yanlış veya boş kazanıma geçebilirsin.",
};

describe("PracticeCheerDialog", () => {
  it("shows the encouragement and a close button", () => {
    const onClose = vi.fn();
    render(<PracticeCheerDialog open copy={copy} onClose={onClose} />);
    expect(screen.getByRole("heading", { name: copy.heading })).toBeTruthy();
    expect(screen.getByText(copy.detail)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tamam" })).toBeTruthy();
    expect(document.querySelectorAll(".practice-confetti")).toHaveLength(12);
    expect(screen.queryByText("Madalya")).toBeNull();
    expect(screen.queryByText(/Level/)).toBeNull();
  });
});
