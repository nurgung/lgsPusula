import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireAdmin } from "@/features/access/guards";

export const metadata: Metadata = { title: "Yönetim" };
export const instant = false;

export default function AdminHomePage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  const user = await requireAdmin();

  return (
    <>
      <PageHeader
        title="Yönetim"
        description="Bu sayfa yalnızca iki adımlı doğrulaması tamamlanmış yönetici oturumunda açılır."
      />
      <div className="grid gap-6">
        <StateMessage
          variant="success"
          title="Bu oturumda doğrulama tamam."
          description={`${user.displayName}, yönetim sayfasındasın. Yönetici olmak öğrenci kayıtlarını görmeyi sağlamaz.`}
        />
        <Card title="Müfredat">
          <p className="text-ink-700">
            Ders, konu ve kazanım ekleme sonraki aşamada bu sayfaya eklenecek.
          </p>
        </Card>
      </div>
    </>
  );
}
