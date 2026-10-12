import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

// jsdom does not implement modal dialogs; real browser behaviour is covered in tests/e2e.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ConfirmDialog
      open
      title="Kaydı silmek istiyor musun?"
      description="Bu kayıt kalıcı olarak silinir."
      confirmLabel="Sil"
      tone="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { ...utils, onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("is an accessible, named alert dialog", () => {
    renderDialog();
    const dialog = screen.getByRole("alertdialog", {
      name: "Kaydı silmek istiyor musun?",
    });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const descriptionId = dialog.getAttribute("aria-describedby");
    expect(descriptionId && document.getElementById(descriptionId)?.textContent).toBe(
      "Bu kayıt kalıcı olarak silinir.",
    );
  });

  it("moves focus to the safe cancel button when opened", () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Vazgeç" }));
  });

  it("calls the matching handler for each button", () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancels on Escape (native cancel event)", () => {
    const { onCancel } = renderDialog();
    fireEvent(screen.getByRole("alertdialog"), new Event("cancel", { cancelable: true }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("wraps Tab focus inside the dialog in both directions", () => {
    renderDialog();
    const cancel = screen.getByRole("button", { name: "Vazgeç" });
    const confirm = screen.getByRole("button", { name: "Sil" });
    const dialog = screen.getByRole("alertdialog");

    confirm.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it("disables both buttons while pending so the action cannot be sent twice", () => {
    const { onCancel } = renderDialog({ pending: true });
    const confirm = screen.getByRole("button", { name: "İşleniyor..." });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Vazgeç" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent(screen.getByRole("alertdialog"), new Event("cancel", { cancelable: true }));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("returns focus to the opener when closed", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { rerender, onConfirm, onCancel } = renderDialog({ open: false });
    rerender(
      <ConfirmDialog
        open
        title="Başlık"
        confirmLabel="Tamam"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(document.activeElement).not.toBe(opener);
    rerender(
      <ConfirmDialog
        open={false}
        title="Başlık"
        confirmLabel="Tamam"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
