"use client";

import { useEffect } from "react";
import { reportRouteError } from "@/features/monitoring/actions";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    if (error.digest) void reportRouteError(error.digest);
  }, [error]);

  return (
    <html lang="tr">
      <body className="p-4">
        <main className="mx-auto max-w-md py-10">
          <h1 className="text-2xl font-bold">Bir şeyler ters gitti</h1>
          <p className="mt-2">
            Uygulama şu anda açılamıyor. Biraz sonra tekrar deneyebilirsin.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-4 min-h-11 rounded-xl bg-brand-600 px-4 font-semibold text-white"
          >
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}
