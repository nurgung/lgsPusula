import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_VISIBLE_TOASTS,
  TOAST_AUTO_DISMISS_MS,
  ToastProvider,
  useToast,
  type ToastInput,
} from "./toast";

function Trigger({ toast }: { toast: ToastInput }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(toast)}>
      Göster
    </button>
  );
}

function renderWith(toast: ToastInput) {
  render(
    <ToastProvider>
      <Trigger toast={toast} />
    </ToastProvider>,
  );
  return () => fireEvent.click(screen.getByRole("button", { name: "Göster" }));
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps both live regions in the page before any toast is shown", () => {
    renderWith({ variant: "success", title: "Kaydın eklendi." });
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("announces success politely and closes it after the timeout", () => {
    const show = renderWith({ variant: "success", title: "Kaydın eklendi." });
    show();
    expect(screen.getByRole("status").textContent).toContain("Başarılı");
    expect(screen.getByRole("status").textContent).toContain("Kaydın eklendi.");
    expect(screen.getByRole("alert").textContent).toBe("");

    act(() => {
      vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS);
    });
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("announces errors assertively and keeps them until closed", () => {
    const show = renderWith({ variant: "error", title: "Kayıt kaydedilemedi." });
    show();
    expect(screen.getByRole("alert").textContent).toContain("Kayıt kaydedilemedi.");

    act(() => {
      vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS * 5);
    });
    expect(screen.getByRole("alert").textContent).toContain("Kayıt kaydedilemedi.");

    fireEvent.click(
      screen.getByRole("button", { name: "Bildirimi kapat: Kayıt kaydedilemedi." }),
    );
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("does not auto-close while the pointer or focus is on the toast", () => {
    const show = renderWith({ variant: "info", title: "Bilgi notu" });
    show();
    const close = screen.getByRole("button", { name: "Bildirimi kapat: Bilgi notu" });
    fireEvent.focus(close);
    act(() => {
      vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS * 2);
    });
    expect(screen.getByRole("status").textContent).toContain("Bilgi notu");
  });

  it(`shows at most ${MAX_VISIBLE_TOASTS} toasts`, () => {
    const show = renderWith({ variant: "info", title: "Not" });
    for (let i = 0; i < MAX_VISIBLE_TOASTS + 2; i++) show();
    expect(screen.getAllByRole("button", { name: "Bildirimi kapat: Not" })).toHaveLength(
      MAX_VISIBLE_TOASTS,
    );
  });

  it("throws a clear error when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger toast={{ variant: "info", title: "x" }} />)).toThrow(
      "useToast must be used inside <ToastProvider>.",
    );
  });
});
