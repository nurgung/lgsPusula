import type { NextRequest } from "next/server";
import { buildContentSecurityPolicy, createNonce } from "@/lib/csp";
import { refreshSession } from "@/services/supabase/refresh-session";

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "production" ? "production" : "development",
  );
  const requestHeaders = new Headers();
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = await refreshSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Static files and the service worker do not need a session or a nonce.
      source:
        "/((?!_next/static|_next/image|favicon.ico|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
