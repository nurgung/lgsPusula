"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { reportRouteError } from "@/features/monitoring/actions";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Only the digest is logged or reported; the message may contain user data.
    console.error("Route error", error.digest ?? "no-digest");
    if (error.digest) void reportRouteError(error.digest);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <StateMessage
        variant="error"
        title="Bir şeyler ters gitti"
        description="Sayfa şu anda gösterilemiyor. Biraz sonra tekrar deneyebilirsin."
        action={<Button onClick={() => retry()}>Tekrar dene</Button>}
      />
    </main>
  );
}
