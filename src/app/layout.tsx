import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { SkipLink } from "@/components/layout/skip-link";
import { ToastProvider } from "@/components/ui/toast";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SkipLink />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
