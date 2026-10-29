import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { canReadStudentRecord } from "@/features/access/student-access";
import { requireParent } from "@/features/access/guards";
import { loadCoachingExplanation } from "@/features/ai/load-explanation";
import { RecommendationCard } from "@/features/coaching/components/recommendation-card";
import { loadCoachingReport } from "@/features/coaching/load-coaching";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { formatTurkishDateRange, istanbulToday } from "@/features/study/calendar";
import { ExamList } from "@/features/exams/components/exam-list";
import { loadExamListWithSubjects } from "@/features/exams/load-exams";
import { ParentMascotCard } from "@/features/mascot/components/mascot-panels";
import { evaluateGrowth } from "@/features/mascot/growth";
import { loadMascotSummary } from "@/features/mascot/load-mascot";
import { PeriodSummaryPanel } from "@/features/reports/components/period-summary";
import { DocxDownload } from "@/features/reports/components/docx-download";
import { ReportDownloadForm } from "@/features/reports/components/report-download-form";
import { WeeklyReportPanel } from "@/features/reports/components/weekly-report-panel";
import { REPORT_MESSAGES } from "@/features/reports/messages";
import {
  monthWindows,
  parentOverviewWindow,
  weekWindows,
} from "@/features/reports/periods";
import { buildWeeklyReportModel } from "@/features/reports/weekly-model";
import { purgeExpiredReportJobs } from "@/services/supabase/report-store";
import { createServiceClient } from "@/services/supabase/server-client";
import { GoalProgressList } from "@/features/study/components/goal-progress-list";
import { StudyLogList } from "@/features/study/components/study-log-list";
import { loadStudyContributions, loadStudyRecords } from "@/features/study/load-study";
import { summarizeLogs } from "@/features/study/summary";

export const metadata: Metadata = { title: "Öğrenci" };
export const instant = false;

export default function ParentStudentPage({
  params,
}: PageProps<"/veli/ogrenci/[studentId]">) {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <ParentStudent params={params} />
    </Suspense>
  );
}

async function ParentStudent({
  params,
}: Pick<PageProps<"/veli/ogrenci/[studentId]">, "params">) {
  const { studentId } = await params;
  if (!z.uuid().safeParse(studentId).success) notFound();

  const user = await requireParent();
  const links = await loadOwnFamilyLinks();
  const activeLinks = links
    .filter((link) => link.status === "active")
    .map((link) => ({ studentId: link.student_id, parentId: link.parent_id }));

  if (!canReadStudentRecord(user, studentId, activeLinks)) notFound();

  const link = links.find(
    (item) => item.student_id === studentId && item.status === "active",
  );
  if (!link) notFound();

  const today = istanbulToday();
  const overview = parentOverviewWindow(today);
  const weeks = weekWindows(today);
  const months = monthWindows(today);
  await purgeExpiredReportJobs(createServiceClient());
  const [study, exams, mascot, coaching, contributions] = await Promise.all([
    loadStudyRecords(studentId, overview),
    loadExamListWithSubjects(studentId, overview),
    loadMascotSummary(studentId),
    loadCoachingReport(studentId, today),
    loadStudyContributions(studentId, today),
  ]);
  const explained = await loadCoachingExplanation(
    user,
    studentId,
    coaching,
    activeLinks,
    today,
  );
  const weekLogs = study.logs.filter(
    (item) => item.studiedOn >= weeks.current.from && item.studiedOn <= weeks.current.to,
  );
  const weekExams = exams.filter(
    (item) => item.takenOn >= weeks.current.from && item.takenOn <= weeks.current.to,
  );
  const weekNote = weeks.unfinished
    ? `${REPORT_MESSAGES.unfinishedWeek} ${REPORT_MESSAGES.comparisonNote}`
    : REPORT_MESSAGES.comparisonNote;
  const monthNote = months.unfinished
    ? `${REPORT_MESSAGES.unfinishedMonth} ${REPORT_MESSAGES.comparisonNote}`
    : REPORT_MESSAGES.comparisonNote;
  const weeklyReport = buildWeeklyReportModel({
    studentName: link.student_display_name,
    generatedAt: new Date(),
    period: "current",
    today,
    logs: study.logs,
    goals: study.goals,
    exams: exams.map((exam) => ({
      title: exam.title,
      takenOn: exam.takenOn,
      examType: exam.examType,
      totalNet: exam.totalNet,
      score: exam.score,
      ruleVersion: exam.ruleVersion,
      subjects: exam.subjects.map((subject) => ({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        net: subject.net,
      })),
    })),
    suggestion: {
      message: coaching.recommendation.message,
      reason: coaching.recommendation.reason,
      evidence: coaching.recommendation.evidence,
    },
  });

  return (
    <>
      <PageHeader
        title={link.student_display_name}
        description="Bu sayfa yalnızca aktif bağlantın olan öğrenciyi gösterir. Kayıtları görebilirsin, değiştiremezsin."
      />
      <div className="grid gap-6">
        <StateMessage
          variant="info"
          title="Kayıtları değiştiremezsin."
          description="Çalışma, hedef, deneme ve karakter özetini okuyabilirsin. Değiştirme yalnızca öğrenci hesabındadır."
        />
        <ParentMascotCard
          species={mascot.species}
          growth={evaluateGrowth({
            today,
            logs: contributions,
            rewards: mascot.rewards,
          })}
        />
        <RecommendationCard
          report={explained.report}
          audience="parent"
          readOnlyNote={REPORT_MESSAGES.parentSuggestionNote}
          explanation={explained.explanation}
        />
        <Card
          title={REPORT_MESSAGES.weekTitle}
          description={`${formatTurkishDateRange(weeks.current)} · ${REPORT_MESSAGES.weekHint}`}
        >
          <PeriodSummaryPanel
            currentLabel="Bu hafta"
            current={summarizeLogs(study.logs, weeks.current)}
            previousLabel="Geçen hafta"
            previous={summarizeLogs(study.logs, weeks.previous)}
            note={weekNote}
          />
        </Card>
        <Card
          title={REPORT_MESSAGES.monthTitle}
          description={`${formatTurkishDateRange(months.current)} · ${REPORT_MESSAGES.monthHint}`}
        >
          <PeriodSummaryPanel
            currentLabel="Bu ay"
            current={summarizeLogs(study.logs, months.current)}
            previousLabel="Geçen ay"
            previous={summarizeLogs(study.logs, months.previous)}
            note={monthNote}
          />
        </Card>
        <Card
          title="Bu haftanın hedefi"
          description={`${formatTurkishDateRange(weeks.current)} · birim: soru. Hafta pazartesi başlar, pazar biter.`}
        >
          <GoalProgressList
            goals={study.goals}
            logs={study.logs}
            today={today}
            emptyTitle="Henüz hedef yok."
            emptyDescription="Öğrenci bir hedef seçerse burada görürsün."
          />
        </Card>
        <Card
          title="Bu haftanın kayıtları"
          description={`${formatTurkishDateRange(weeks.current)} · birim: soru ve dakika`}
        >
          <StudyLogList
            logs={weekLogs}
            editable={false}
            emptyTitle="Bu hafta kayıt yok."
            emptyDescription="Öğrenci bir çalışma yazarsa burada görürsün. Kayıt yoksa bir ders sonucu çıkarılmaz."
          />
        </Card>
        <Card
          title="Bu haftanın denemeleri"
          description={`${formatTurkishDateRange(weeks.current)} · birim: net (doğru − yanlış ÷ 3)`}
        >
          <ExamList
            exams={weekExams}
            editable={false}
            emptyTitle="Bu hafta deneme yok."
            emptyDescription="Öğrenci bir deneme yazarsa burada görürsün. Deneme yoksa net hesaplanmaz."
          />
        </Card>
        <Card
          title="Haftalık rapor"
          description="PDF ve Word sunucuda üretilir. İndirmeden önce bağlantın yeniden kontrol edilir."
        >
          <div className="grid gap-6">
            <WeeklyReportPanel model={weeklyReport} />
            <ReportDownloadForm studentId={studentId} />
            <DocxDownload studentId={studentId} />
          </div>
        </Card>
        <Card title="Bağlantı">
          <RevokeLinkButton
            linkId={link.id}
            description="Kaldırınca bu sayfa bir sonraki istekte açılmaz."
          />
        </Card>
      </div>
    </>
  );
}
