"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { STAGE_LEVELS } from "@/features/mascot/constants";
import type { CelebrationView } from "../celebration";
import { StagePath } from "./stage-path";
import { TaskChecklist } from "./daily-goals";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CelebrationDialog({
  open,
  view,
  onClose,
}: {
  open: boolean;
  view: CelebrationView | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const tasks = view?.tasks ?? [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && view && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if ((!open || !view) && dialog.open) {
      dialog.close();
    }
  }, [open, view]);

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
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-card border border-border bg-surface p-0 text-ink-900 shadow-card backdrop:bg-ink-900/50"
    >
      {view ? (
        <div className="relative min-w-0 overflow-hidden p-4 sm:p-6">
          <Confetti />
          <StagePath stageId={view.stageId} species={view.species} idPrefix="kutlama-asama" />
          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2">
            <section className="min-w-0" aria-labelledby="kutlama-hedefler">
              <h3 id="kutlama-hedefler" className="text-base font-bold text-ink-900">
                Bugünün hedefleri
              </h3>
              <div className="mt-3">
                <TaskChecklist tasks={tasks} linked={false} />
              </div>
            </section>
            <section
              className="grid min-w-0 content-start gap-3 rounded-card bg-warning-50 p-4"
              aria-labelledby={titleId}
            >
              <Medal />
              <h2 id={titleId} className="text-lg font-extrabold break-words text-ink-900">
                {view.heading}
              </h2>
              <p className="break-words text-ink-900">{view.detail}</p>
              <p className="text-sm text-ink-700">
                Durak: {STAGE_LEVELS.find((level) => level.id === view.stageId)?.name}
              </p>
            </section>
          </div>
          <div className="mt-5">
            <Button ref={closeRef} onClick={onClose}>
              Tamam
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function Medal() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0 text-warning-800" aria-hidden="true">
        <circle cx="24" cy="20" r="12" fill="currentColor" />
        <path d="M16 30 L12 46 L24 38 L36 46 L32 30" fill="currentColor" />
      </svg>
      <p className="font-bold text-ink-900">Madalya</p>
    </div>
  );
}

function Confetti() {
  const spots = ["left-3 top-2", "left-10 top-6", "right-4 top-3", "right-12 top-8"];
  return (
    <div aria-hidden="true">
      {spots.map((spot) => (
        <span
          key={spot}
          className={`celebration-confetti absolute h-2 w-2 rounded-full bg-brand-600 ${spot}`}
        />
      ))}
    </div>
  );
}
