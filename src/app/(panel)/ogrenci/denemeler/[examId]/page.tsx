import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { TableScroll } from "@/components/ui/table-scroll";
import { requireStudent } from "@/features/access/guards";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { DeleteExamButton } from "@/features/exams/components/delete-exam-button";
import { ExamForm } from "@/features/exams/components/exam-form";
import { EXAM_TYPE_LABELS } from "@/features/exams/labels";
import { loadExamDetail } from "@/features/exams/load-exams";
import { EXAM_MESSAGES } from "@/features/exams/messages";
import { formatNet, type LgsSubjectCode } from "@/features/exams/net-rules";
import { formatTurkishDate, istanbulToday } from "@/features/study/calendar";

export const metadata: Metadata = { title: "Deneme detayı" };
export const instant = false;

const STATUS: Record<string, string> = {
  guncellendi: EXAM_MESSAGES.updated,
};

export default function ExamDetailPage({
  params,
  searchParams,
}: PageProps<"/ogrenci/denemeler/[examId]">) {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Deneme yükleniyor..." />}>
      <ExamDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function ExamDetail({
  params,
  searchParams,
}: Pick<PageProps<"/ogrenci/denemeler/[examId]">, "params" | "searchParams">) {
  const user = await requireStudent();
  const { examId } = await params;
  const query = await searchParams;
  const exam = await loadExamDetail(user.id, examId);
  if (!exam) notFound();

  const today = istanbulToday();
  const catalog = await loadCatalog({ includeArchived: false });
  const subjects = catalog.map((subject) => ({
    id: subject.id,
    code: subject.code,
    name: subject.name,
  }));
  const status = STATUS[one(query.durum)];

  const lgsDefaults = Object.fromEntries(
    exam.subjects.map((subject) => [
      subject.subjectCode,
      {
        subjectId: subject.subjectId,
        questionCount: String(subject.questionCount),
        correctCount: String(subject.correctCount),
        wrongCount: String(subject.wrongCount),
        blankCount: String(subject.blankCount),
      },
    ]),
  ) as Partial<
    Record<
      LgsSubjectCode,
      {
        subjectId: string;
        questionCount: string;
        correctCount: string;
        wrongCount: string;
        blankCount: string;
      }
    >
  >;
  const branchSubject = exam.examType === "branch" ? exam.subjects[0] : undefined;

  return (
    <>
      <PageHeader
        title={exam.title}
        description={`${EXAM_TYPE_LABELS[exam.examType]} · ${formatTurkishDate(exam.takenOn)} · Toplam net ${formatNet(exam.totalNet)} (kural ${exam.ruleVersion})`}
      />
      {status ? <StateMessage variant="success" title={status} /> : null}

      <Card className="mb-4">
        <h2 className="mb-3 font-bold text-ink-900">Ders netleri</h2>
        <TableScroll label="Ders netleri tablosu">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-ink-700">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Ders
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Soru
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Doğru
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Yanlış
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Boş
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Net
                </th>
              </tr>
            </thead>
            <tbody>
              {exam.subjects.map((subject) => (
                <tr key={subject.subjectId} className="border-b border-border">
                  <th scope="row" className="py-2 pr-3 font-medium text-ink-900">
                    {subject.subjectName}
                  </th>
                  <td className="py-2 pr-3 tabular-nums">{subject.questionCount}</td>
                  <td className="py-2 pr-3 tabular-nums">{subject.correctCount}</td>
                  <td className="py-2 pr-3 tabular-nums">{subject.wrongCount}</td>
                  <td className="py-2 pr-3 tabular-nums">{subject.blankCount}</td>
                  <td className="py-2 tabular-nums">{formatNet(subject.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <p className="mt-3 text-ink-900">
          Toplam net: <strong>{formatNet(exam.totalNet)}</strong> (eksi toplam 0 alınır)
        </p>
        <div className="mt-4">
          <ButtonLink
            href={`/ogrenci/denemeler/${exam.id}/kazanimlar`}
            variant="secondary"
          >
            Yanlış / boş → kazanım
          </ButtonLink>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-bold text-ink-900">Düzenle</h2>
        <p className="mb-4 text-sm text-ink-700">
          Sayıları değiştirince net yeniden hesaplanır. Bu denemenin kural sürümü{" "}
          {exam.ruleVersion} olarak kalır.
        </p>
        <ExamForm
          mode="edit"
          examId={exam.id}
          subjects={subjects}
          today={today}
          defaults={{
            title: exam.title,
            takenOn: exam.takenOn,
            examType: exam.examType,
            lgs: lgsDefaults,
            branch: branchSubject
              ? {
                  subjectId: branchSubject.subjectId,
                  questionCount: String(branchSubject.questionCount),
                  correctCount: String(branchSubject.correctCount),
                  wrongCount: String(branchSubject.wrongCount),
                  blankCount: String(branchSubject.blankCount),
                }
              : undefined,
          }}
        />
      </Card>

      <Card>
        <DeleteExamButton examId={exam.id} />
        <div className="mt-4">
          <ButtonLink href="/ogrenci/denemeler" variant="secondary">
            Listeye dön
          </ButtonLink>
        </div>
      </Card>
    </>
  );
}
