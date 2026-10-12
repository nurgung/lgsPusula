import type { Metadata } from "next";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";

export const metadata: Metadata = { title: "Durum örnekleri" };

export default function StatesPreviewPage() {
  return (
    <>
      <PageHeader
        title="Durum örnekleri"
        description="Her sayfada kullanılacak ortak mesaj kalıpları."
      />
      <div className="grid gap-4">
        <StateMessage variant="loading" title="Kayıtların yükleniyor..." />
        <StateMessage
          variant="empty"
          title="Çalışma kaydını henüz eklemedin."
          description="İstersen şimdi kaydedebilirsin."
          action={
            <ButtonLink href="/onizleme/ogrenci" variant="secondary">
              Kayıt ekle
            </ButtonLink>
          }
        />
        <StateMessage
          variant="error"
          title="Kayıt kaydedilemedi."
          description="Bağlantında bir sorun olabilir. Girdiğin bilgiler kaybolmadı."
          action={<Button variant="secondary">Tekrar dene</Button>}
        />
        <StateMessage variant="success" title="Kaydın eklendi. Harika bir adım!" />
        <StateMessage
          variant="info"
          title="Bu öneri, son deneme kayıtlarına dayanıyor."
        />
      </div>
    </>
  );
}
