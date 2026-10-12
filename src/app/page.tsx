import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";

const features = [
  {
    title: "Günlük çalışma",
    text: "Ders ve konu bazında soru, doğru, yanlış, boş ve süre kaydı.",
  },
  {
    title: "Deneme takibi",
    text: "Deneme sonuçlarını ve tekrar etmen gereken kazanımları görme.",
  },
  {
    title: "Kişisel gelişim",
    text: "Kimseyle kıyaslanmadan kendi ilerlemeni izleme ve karakterini büyütme.",
  },
  {
    title: "Veli görünümü",
    text: "Onay verdiğin velinin gelişimini takip edebilmesi.",
  },
];

export default function HomePage() {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-16"
    >
      <p className="text-sm font-bold tracking-wide text-brand-700 uppercase">
        LGS Pusula
      </p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        Çalışmanı planla, gelişimini gör.
      </h1>
      <p className="mt-4 max-w-prose text-lg text-ink-700">
        LGS Pusula, 8. sınıf öğrencilerinin günlük çalışmalarını ve deneme sonuçlarını
        takip etmelerine yardım eden bir uygulamadır.
      </p>

      <StateMessage
        className="mt-8"
        variant="info"
        title="Uygulama geliştirme aşamasında"
        description="Hesap oluşturma, giriş ve veri kaydı henüz kullanılamıyor. Bu sürümde gerçek öğrenci bilgisi girilmemelidir."
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/giris">Giriş yap</ButtonLink>
      </div>

      <h2 className="mt-12 text-xl font-bold text-ink-900">Neler planlanıyor?</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <li key={feature.title}>
            <Card title={feature.title} headingLevel={3} description={feature.text} />
          </li>
        ))}
      </ul>
    </main>
  );
}
