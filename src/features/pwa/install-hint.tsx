"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

/**
 * Chromium offers installation through `beforeinstallprompt`. iPhone instructions
 * stay on the account page because that browser does not fire this event.
 */
export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!prompt || hidden) return null;

  return (
    <div className="border-b border-border bg-brand-50 px-4 py-3">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-900">
          Uygulamayı ana ekranına ekleyebilirsin. Kayıtların telefonda durmaz.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void prompt.prompt();
              setHidden(true);
            }}
          >
            Ekle
          </Button>
          <Button variant="secondary" onClick={() => setHidden(true)}>
            Şimdi değil
          </Button>
        </div>
      </div>
    </div>
  );
}
