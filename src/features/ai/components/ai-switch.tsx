"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { setAiEnabledAction, type AiSwitchState } from "../switch-action";

const INITIAL: AiSwitchState = { status: "idle" };

export function AiSwitch({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(setAiEnabledAction, INITIAL);
  const current = state.status === "saved" ? state.enabled : enabled;

  return (
    <form action={action} className="grid gap-3">
      <p className="text-sm text-ink-700">
        Kapalıyken öneri yalnızca kurallardan gelir. Açıkken modele adın gitmez; kısa bir
        sayı özeti gidebilir. İstediğin zaman kapatabilirsin. Cümle puanı ve kaydı
        değiştirmez.
      </p>
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      {state.status === "saved" ? (
        <StateMessage
          variant="success"
          title={state.enabled ? "Sade anlatım açık." : "Sade anlatım kapalı."}
        />
      ) : null}
      <Button
        type="submit"
        name="enabled"
        value={current ? "false" : "true"}
        disabled={pending}
      >
        {pending
          ? "Kaydediliyor..."
          : current
            ? "Sade anlatımı kapat"
            : "Sade anlatımı aç"}
      </Button>
    </form>
  );
}
