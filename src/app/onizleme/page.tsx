import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROLE_LABELS } from "@/types/roles";

const pages = [
  {
    href: "/onizleme/ogrenci",
    title: ROLE_LABELS.student,
    text: "Bugünün hedefi, öneri, görevler ve son deneme özeti.",
  },
  {
    href: "/onizleme/veli",
    title: ROLE_LABELS.parent,
    text: "Bağlı öğrencinin haftalık özeti ve rapor alanı.",
  },
  {
    href: "/onizleme/yonetici",
    title: ROLE_LABELS.admin,
    text: "Müfredat kataloğu ve sistem ayarları taslağı.",
  },
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
        title="Sayfa taslakları"
        description="Rollere göre planlanan sayfaların görünüm taslakları. Hiçbiri gerçek veriye bağlı değildir."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {pages.map((page) => (
          <li key={page.href}>
            <Card title={page.title} description={page.text}>
              <ButtonLink href={page.href} variant="secondary">
                Taslağı aç
              </ButtonLink>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
