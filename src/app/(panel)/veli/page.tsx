import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireParent } from "@/features/access/guards";
import { RedeemInviteForm } from "@/features/family/components/redeem-invite-form";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { weekWindows } from "@/features/reports/periods";
import { purgeExpiredReportJobs } from "@/services/supabase/report-store";
import { createServiceClient } from "@/services/supabase/server-client";
import { formatTurkishDateRange, istanbulToday } from "@/features/study/calendar";
import { loadStudyRecords } from "@/features/study/load-study";
import { summarizeLogs } from "@/features/study/summary";

export const metadata: Metadata = { title: "Özet" };
export const instant = false;

export default function ParentHomePage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <ParentHome />
    </Suspense>
  );
}

async function ParentHome() {
  const user = await requireParent();
  await purgeExpiredReportJobs(createServiceClient());
  const links = await loadOwnFamilyLinks();
  const active = links.filter((link) => link.status === "active");
  const pending = links.filter((link) => link.status === "pending");
  const today = istanbulToday();
  const week = weekWindows(today).current;
  const snapshots = await Promise.all(
    active.map(async (link) => {
      const study = await loadStudyRecords(link.student_id, week);
      return { link, summary: summarizeLogs(study.logs, week) };
    }),
  );

  return (
    <>
      <PageHeader
        title={`Merhaba, ${user.displayName}`}
        description="Bağlı öğrencini seç. Yalnızca aktif bağlantının kayıtlarını görürsün. Kayıt giremez ve değiştiremezsin."
      />
      <div className="grid gap-6">
        {active.length === 0 && pending.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Henüz bir öğrenciye bağlı değilsin."
            description="Çocuğundan aldığın kodu aşağıya yaz. O onaylamadan kayıtlarını göremezsin."
          />
        ) : null}

        {snapshots.map(({ link, summary }) => (
          <Card
            key={link.id}
            title={link.student_display_name}
            description={`Bağlantı açık · ${formatTurkishDateRange(week)} · birim: soru ve dakika`}
          >
            <div className="grid gap-4">
              <p className="text-ink-900">
                Bu hafta {summary.questionCount} soru, {summary.durationMinutes} dakika.
              </p>
              <div>
                <ButtonLink href={`/veli/ogrenci/${link.student_id}`}>
                  Öğrenciyi gör
                </ButtonLink>
              </div>
              <RevokeLinkButton
                linkId={link.id}
                description="Kaldırınca bu öğrencinin sayfasını göremezsin. Yeniden bağlanmak için yeni bir kod gerekir."
              />
            </div>
          </Card>
        ))}

        {pending.map((link) => (
          <Card
            key={link.id}
            title={link.student_display_name}
            description="Öğrencinin onayı bekleniyor. Onay gelmeden kayıtları göremezsin."
          />
        ))}

        <Card
          title="Öğrenci bağla"
          description="Burada kod üretilmez. Öğrenci kendi sayfasında «Veli bağla» ile kod oluşturur; sen o kodu aşağıya yazarsın. Kod 24 saat geçerlidir ve bir kez kullanılır."
        >
          <RedeemInviteForm />
        </Card>
      </div>
    </>
  );
}
