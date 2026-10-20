import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { RecommendationCard } from "@/features/coaching/components/recommendation-card";
import { loadCoachingReport } from "@/features/coaching/load-coaching";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { CreateInviteForm } from "@/features/family/components/create-invite-form";
import { RespondLinkForms } from "@/features/family/components/respond-link-forms";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { formatTurkishDate, goalWindow, istanbulToday } from "@/features/study/calendar";
import { GoalProgressList } from "@/features/study/components/goal-progress-list";
import { StudyLogForm } from "@/features/study/components/study-log-form";
import { StudyLogList } from "@/features/study/components/study-log-list";
import { loadStudyRecords } from "@/features/study/load-study";

export const metadata: Metadata = { title: "Ana sayfa" };
export const instant = false;

export default function StudentHomePage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <StudentHome />
    </Suspense>
  );
}

async function StudentHome() {
  const user = await requireStudent();
  const today = istanbulToday();
  const week = goalWindow("week", today);
  const [links, catalog, study, coaching] = await Promise.all([
    loadOwnFamilyLinks(),
    loadCatalog({ includeArchived: false }),
    loadStudyRecords(user.id, { from: week.from, to: today }),
    loadCoachingReport(user.id, today),
  ]);
  const subjects = catalog.map((subject) => ({ id: subject.id, name: subject.name }));
  const todayLogs = study.logs.filter((log) => log.studiedOn === today);
  const active = links.find((link) => link.status === "active");
  const pending = links.find((link) => link.status === "pending");

  return (
    <>
      <PageHeader
        title={`Merhaba, ${user.displayName}`}
        description={`Bugün ${formatTurkishDate(today)}. Gün, Türkiye saatiyle (İstanbul) gece yarısı değişir.`}
      />
      <div className="grid gap-6">
        <RecommendationCard report={coaching} />

        <Card
          title="Bugünün hedefi"
          description={`${formatTurkishDate(today)} · birim: soru`}
        >
          <div className="grid gap-4">
            <GoalProgressList
              goals={study.goals}
              logs={study.logs}
              today={today}
              period="day"
              emptyTitle="Bugün için hedefin yok."
              emptyDescription="İstersen bir soru sayısı seç. Seçmezsen de kayıt yazabilirsin."
            />
            <div>
              <ButtonLink href="/ogrenci/hedefler" variant="secondary">
                Hedefi düzenle
              </ButtonLink>
            </div>
          </div>
        </Card>

        <Card
          title="Bu haftanın hedefi"
          description="Hafta pazartesi başlar, pazar biter."
        >
          <GoalProgressList
            goals={study.goals}
            logs={study.logs}
            today={today}
            period="week"
            emptyTitle="Bu hafta için hedefin yok."
            emptyDescription="Haftalık hedef, pazartesiden pazara kadar çözdüğün soruları sayar."
          />
        </Card>

        <Card
          title="Hızlı kayıt"
          description="Dersini ve soru sayılarını yaz. Konu seçmek istersen ayrıntılı formu kullan."
        >
          {subjects.length === 0 ? (
            <StateMessage
              variant="empty"
              title="Ders listesi henüz hazır değil."
              description="Yönetici dersleri ekleyince buradan kayıt yazabilirsin."
            />
          ) : (
            <div className="grid gap-4">
              <StudyLogForm
                mode="create"
                catalog={catalog}
                subjects={subjects}
                today={today}
                showPicker={false}
              />
              <div>
                <ButtonLink href="/ogrenci/calisma/yeni" variant="secondary">
                  Konu seçerek kaydet
                </ButtonLink>
              </div>
            </div>
          )}
        </Card>

        <Card
          title="Bugünün kayıtları"
          description={`${formatTurkishDate(today)} · birim: soru ve dakika`}
        >
          <StudyLogList logs={todayLogs} editable />
        </Card>

        <StateMessage
          variant="info"
          title="Velin neleri görebilir?"
          description="Bağlantıyı sen onaylarsan velin kayıtlarını ve hedeflerini görebilir. Değiştiremez. Onaylamazsan hiçbir şey göremez."
        />

        {active ? (
          <Card title="Bağlı velin" description="Çalışmalarını görebilir, değiştiremez.">
            <div className="grid gap-4">
              <p className="font-semibold text-ink-900">{active.parent_display_name}</p>
              <RevokeLinkButton
                linkId={active.id}
                description="Kaldırınca velin çalışmalarını göremez. İstersen sonra yeni bir kodla yine bağlanabilirsiniz."
              />
            </div>
          </Card>
        ) : null}

        {pending ? (
          <Card
            title="Bağlantı isteği"
            description={`${pending.parent_display_name} velin olarak bağlanmak istiyor.`}
          >
            <RespondLinkForms linkId={pending.id} />
          </Card>
        ) : null}

        {!active && !pending ? (
          <Card title="Veli bağlantısı">
            <div className="grid gap-4">
              <StateMessage
                variant="empty"
                title="Henüz bir velin bağlı değil."
                description="Kod üret, veline söyle. Veli kodu girince isteği burada görürsün. Onaylamadan bağlantı kurulmaz."
              />
              <CreateInviteForm />
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
