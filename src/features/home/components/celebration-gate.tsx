"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCelebration } from "../celebration-action";
import type { CelebrationView } from "../celebration";
import { CelebrationDialog } from "./celebration-dialog";

function stripCelebrationParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("kutlama")) return;
  url.searchParams.delete("kutlama");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

/**
 * Opens only when this save put a signed `kutlama` marker on the address.
 * Tamam and Escape remove that marker, so a later refresh the same day stays quiet.
 */
export function CelebrationGate() {
  const params = useSearchParams();
  const token = params.get("kutlama");
  const [view, setView] = useState<CelebrationView | null>(null);
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!token || started.current === token) return;
    started.current = token;
    void resolveCelebration(token)
      .then((next) => {
        if (!next) {
          stripCelebrationParam();
          setView(null);
          return;
        }
        setView(next);
      })
      .catch(() => {
        stripCelebrationParam();
        setView(null);
      });
  }, [token]);

  function close() {
    stripCelebrationParam();
    setView(null);
  }

  return <CelebrationDialog open={view != null} view={view} onClose={close} />;
}
