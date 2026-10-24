"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type { CelebrationCopy } from "../celebration";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PIECES = 12;

export function PracticeCheerDialog({
  open,
  copy,
  onClose,
}: {
  open: boolean;
  copy: CelebrationCopy | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && copy && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if ((!open || !copy) && dialog.open) {
      dialog.close();
    }
  }, [open, copy]);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-surface p-0 text-ink-900 shadow-card backdrop:bg-ink-900/50"
    >
      {copy ? (
        <div className="relative min-w-0 overflow-hidden p-5 sm:p-6">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: PIECES }, (_, index) => (
              <span key={index} className="practice-confetti" />
            ))}
          </div>
          <h2 id={titleId} className="relative text-xl font-extrabold break-words text-ink-900">
            {copy.heading}
          </h2>
          <p className="relative mt-3 break-words text-ink-900">{copy.detail}</p>
          <div className="relative mt-5">
            <Button ref={closeRef} onClick={onClose}>
              Tamam
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
