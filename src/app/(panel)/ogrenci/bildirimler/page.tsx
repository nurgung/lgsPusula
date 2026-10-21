import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { NotificationForm } from "@/features/mascot/components/notification-form";
import { loadOwnMascot } from "@/features/mascot/load-mascot";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";

export const metadata: Metadata = { title: "Hatırlatmalar" };
export const instant = false;

export default function NotificationsPage({
  searchParams,
}: PageProps<"/ogrenci/bildirimler">) {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <Notifications searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function Notifications({
  searchParams,
}: Pick<PageProps<"/ogrenci/bildirimler">, "searchParams">) {
  const user = await requireStudent();
  const mascot = await loadOwnMascot(user.id, { openReminder: false });
  const saved = one((await searchParams).durum) === "kaydedildi";

  return (
    <>
      <PageHeader
        title="Hatırlatmalar"
        description="Hatırlatma yalnızca uygulamada görünür. E-posta yok. Metinde sınav sonucu yer almaz."
      />
      <div className="grid gap-6">
        {saved ? (
          <StateMessage variant="success" title={MASCOT_MESSAGES.savedPreferences} />
        ) : null}
        <Card title="Ayarlar">
          <NotificationForm
            enabled={mascot.preferences.enabled}
            quietStart={mascot.preferences.quietStart}
            quietEnd={mascot.preferences.quietEnd}
            maxPerDay={mascot.preferences.maxPerDay}
          />
        </Card>
      </div>
    </>
  );
}
