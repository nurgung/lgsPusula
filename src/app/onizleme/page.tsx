import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const pages = [
  {
    href: "/onizleme/bilesenler",
    title: "Bileşenler",
    text: "Form alanları, onay penceresi ve anlık bildirimler.",
  },
  {
    href: "/onizleme/durumlar",
    title: "Durum örnekleri",
    text: "Yükleniyor, boş, hata, başarı ve bilgi mesajları.",
  },
] as const;

export default function PreviewIndexPage() {
  return (
    <>
      <PageHeader
        title="Bileşen önizlemesi"
        description="Ortak arayüz bileşenlerinin örnekleri. Gerçek öğrenci verisi yoktur."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {pages.map((page) => (
          <li key={page.href}>
            <Card title={page.title} description={page.text}>
              <ButtonLink href={page.href} variant="secondary">
                Örneği aç
              </ButtonLink>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
