import type { Metadata } from "next";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Çevrimdışı" };
export const instant = false;

export default function OfflinePage() {
  return (
    <main id={MAIN_CONTENT_ID} className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <PageHeader
        title="İnternet yok"
        description="Kayıtların bu telefonda saklanmaz. Bağlantı gelince sayfayı yenile."
      />
      <p className="text-ink-900">
        Eski bir sayfanın kopyası gösterilmez. Böylece çalışma kayıtların bu cihazda
        kalmaz.
      </p>
      <div className="mt-6">
        <ButtonLink href="/giris">Giriş sayfasına dön</ButtonLink>
      </div>
    </main>
  );
}
