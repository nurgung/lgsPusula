import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { connection } from "next/server";
import { SkipLink } from "@/components/layout/skip-link";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/features/pwa/service-worker-register";
import { publicEnv } from "@/lib/env/public";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: "LGS Pusula",
    template: "%s | LGS Pusula",
  },
  description:
    "8. sınıf öğrencileri için günlük çalışma, deneme sonucu ve gelişim takibi uygulaması.",
  robots: { index: false, follow: false },
  applicationName: "LGS Pusula",
  appleWebApp: { capable: true, title: "LGS Pusula", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

/** A nonce is minted per request, so the document cannot be a static shell. */
export const instant = false;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html lang="tr" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SkipLink />
        <ServiceWorkerRegister />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
