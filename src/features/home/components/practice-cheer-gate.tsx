"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CelebrationCopy } from "../celebration";
import { resolvePracticeCheer } from "../celebration-action";
import { PracticeCheerDialog } from "./practice-cheer-dialog";

function stripCheerParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("alkis")) return;
  url.searchParams.delete("alkis");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

/**
 * Opens after Tamamlandı, from a signed `alkis` marker.
 * Tamam and Escape remove it. This is not the goal, badge, or stage window.
 */
export function PracticeCheerGate() {
  const params = useSearchParams();
  const token = params.get("alkis");
  const [copy, setCopy] = useState<CelebrationCopy | null>(null);
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!token || started.current === token) return;
    started.current = token;
    void resolvePracticeCheer(token)
      .then((next) => {
        if (!next) {
          stripCheerParam();
          setCopy(null);
          return;
        }
        setCopy(next);
      })
      .catch(() => {
        stripCheerParam();
        setCopy(null);
      });
  }, [token]);

  function close() {
    stripCheerParam();
    setCopy(null);
  }

  return <PracticeCheerDialog open={copy != null} copy={copy} onClose={close} />;
}
