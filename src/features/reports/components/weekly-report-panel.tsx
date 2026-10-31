import { StateMessage } from "@/components/ui/state-message";
import {
  TableScroll,
  tableClassName,
  tdClassName,
  thClassName,
} from "@/components/ui/table-scroll";
import { formatExamScore, formatNet } from "@/features/exams/net-rules";
import { formatTurkishDate } from "@/features/study/calendar";
import { REPORT_MESSAGES } from "../messages";
import {
  formatDurationMinutes,
  formatMetricOrMissing,
  formatNetDelta,
  formatOptionalNet,
  shortSubjectHeader,
  type WeeklyReportModel,
} from "../weekly-model";

const numericCell = `${tdClassName} text-right tabular-nums`;
const numericHead = `${thClassName} text-right`;

function SummaryCards({ model }: { model: WeeklyReportModel }) {
  const duration =
    model.summary.durationMinutes === null
      ? "Kayıt yok"
      : formatDurationMinutes(model.summary.durationMinutes);
  const items = [
    ["Toplam süre", duration],
    ["Toplam soru", formatMetricOrMissing(model.summary.questionCount, " soru")],
    ["Doğru", formatMetricOrMissing(model.summary.correctCount)],
    ["Yanlış", formatMetricOrMissing(model.summary.wrongCount)],
    ["Boş", formatMetricOrMissing(model.summary.blankCount)],
    ["Çalışma günü", formatMetricOrMissing(model.summary.studyDayCount, " gün")],
    ["Deneme", `${model.summary.examCount} deneme`],
    [
      "Son deneme neti",
      model.summary.lastExamTotalNet === null
        ? "Kayıt yok"
        : formatNet(model.summary.lastExamTotalNet),
    ],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="min-w-0 rounded-card border border-border bg-surface-muted px-3 py-3"
        >
          <dt className="text-sm text-ink-600">{label}</dt>
          <dd className="font-bold break-words text-ink-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StudyTables({ model }: { model: WeeklyReportModel }) {
  if (model.studyRows.length === 0) {
    return (
      <StateMessage
        variant="empty"
        title="Bu dönemde çalışma kaydı yok."
        description={REPORT_MESSAGES.noSubjects}
      />
    );
  }
  return (
    <div className="grid min-w-0 gap-4">
      <TableScroll label="Dönem çalışma kayıtları">
        <table className={tableClassName}>
          <caption className="sr-only">
            Çalışma kayıtları: tarih, gün, ders, soru, doğru, yanlış, boş, süre
          </caption>
          <thead>
            <tr>
              <th className={thClassName} scope="col">
                Tarih
              </th>
              <th className={thClassName} scope="col">
                Gün
              </th>
              <th className={thClassName} scope="col">
                Ders
              </th>
              <th className={numericHead} scope="col">
                Toplam soru
              </th>
              <th className={numericHead} scope="col">
                Doğru
              </th>
              <th className={numericHead} scope="col">
                Yanlış
              </th>
              <th className={numericHead} scope="col">
                Boş
              </th>
              <th className={numericHead} scope="col">
                Süre
              </th>
            </tr>
          </thead>
          <tbody>
            {model.studyRows.map((row) => (
              <tr key={`${row.studiedOn}-${row.subjectId}`}>
                <td className={tdClassName}>{formatTurkishDate(row.studiedOn)}</td>
                <td className={tdClassName}>{row.dayName}</td>
                <th className={`${tdClassName} text-left font-semibold`} scope="row">
                  {row.subjectName}
                </th>
                <td className={numericCell}>{row.questionCount}</td>
                <td className={numericCell}>{row.correctCount}</td>
                <td className={numericCell}>{row.wrongCount}</td>
                <td className={numericCell}>{row.blankCount}</td>
                <td className={numericCell}>{row.durationMinutes} dk</td>
              </tr>
            ))}
            <tr>
              <th className={`${tdClassName} text-left font-bold`} scope="row" colSpan={3}>
                Toplam
              </th>
              <td className={`${numericCell} font-bold`}>
                {model.studyTotals.questionCount}
              </td>
              <td className={`${numericCell} font-bold`}>
                {model.studyTotals.correctCount}
              </td>
              <td className={`${numericCell} font-bold`}>{model.studyTotals.wrongCount}</td>
              <td className={`${numericCell} font-bold`}>{model.studyTotals.blankCount}</td>
              <td className={`${numericCell} font-bold`}>
                {model.studyTotals.durationMinutes} dk
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <TableScroll label="Derslere göre çalışma özeti">
        <table className={tableClassName}>
          <caption className="sr-only">Derslere göre soru, doğru, yanlış, boş ve süre</caption>
          <thead>
            <tr>
              <th className={thClassName} scope="col">
                Ders
              </th>
              <th className={numericHead} scope="col">
                Toplam soru
              </th>
              <th className={numericHead} scope="col">
                Doğru
              </th>
              <th className={numericHead} scope="col">
                Yanlış
              </th>
              <th className={numericHead} scope="col">
                Boş
              </th>
              <th className={numericHead} scope="col">
                Toplam süre
              </th>
            </tr>
          </thead>
          <tbody>
            {model.subjectRows.map((row) => (
              <tr key={row.subjectId}>
                <th className={`${tdClassName} text-left font-semibold`} scope="row">
                  {row.subjectName}
                </th>
                <td className={numericCell}>{row.questionCount}</td>
                <td className={numericCell}>{row.correctCount}</td>
                <td className={numericCell}>{row.wrongCount}</td>
                <td className={numericCell}>{row.blankCount}</td>
                <td className={numericCell}>{row.durationMinutes} dk</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </div>
  );
}

function ExamTables({ model }: { model: WeeklyReportModel }) {
  if (model.examsInPeriod.length === 0) {
    return (
      <StateMessage
        variant="empty"
        title="Bu dönemde deneme yok."
        description={REPORT_MESSAGES.noExams}
      />
    );
  }
  return (
    <div className="grid min-w-0 gap-4">
      {!model.canCompareExams ? (
        <StateMessage
          variant="info"
          title="Tek deneme var."
          description={REPORT_MESSAGES.singleExamNote}
        />
      ) : null}
      <TableScroll label="Deneme bazlı sonuçlar">
        <table className={tableClassName}>
          <caption className="sr-only">Deneme adı, tarih, ders netleri, toplam net ve puan</caption>
          <thead>
            <tr>
              <th className={thClassName} scope="col">
                Tarih
              </th>
              <th className={thClassName} scope="col">
                Deneme adı
              </th>
              {model.lgsSubjectCodes.map((code) => (
                <th key={code} className={numericHead} scope="col">
                  {shortSubjectHeader(code)} net
                </th>
              ))}
              <th className={numericHead} scope="col">
                Toplam net
              </th>
              <th className={thClassName} scope="col">
                Puan
              </th>
            </tr>
          </thead>
          <tbody>
            {model.examsInPeriod.map((exam) => (
              <tr key={`${exam.takenOn}-${exam.title}`}>
                <td className={tdClassName}>{formatTurkishDate(exam.takenOn)}</td>
                <th className={`${tdClassName} text-left font-semibold`} scope="row">
                  {exam.title}
                </th>
                {model.lgsSubjectCodes.map((code) => {
                  const subject = exam.subjects.find((row) => row.subjectCode === code);
                  return (
                    <td key={code} className={numericCell}>
                      {subject ? formatNet(subject.net) : "Kayıt yok"}
                    </td>
                  );
                })}
                <td className={numericCell}>{formatNet(exam.totalNet)}</td>
                <td className={numericCell}>{formatExamScore(exam.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      {model.examComparisons.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Karşılaştırılacak ders neti yok."
          description="Aynı derse ait en az iki deneme neti gerekir."
        />
      ) : (
        <TableScroll label="Denemelerde ders bazlı performans">
          <table className={tableClassName}>
            <caption className="sr-only">
              Ders, son deneme neti, önceki deneme neti, değişim ve değerlendirme
            </caption>
            <thead>
              <tr>
                <th className={thClassName} scope="col">
                  Ders
                </th>
                <th className={numericHead} scope="col">
                  Son deneme neti
                </th>
                <th className={numericHead} scope="col">
                  Önceki deneme neti
                </th>
                <th className={numericHead} scope="col">
                  Net değişimi
                </th>
                <th className={thClassName} scope="col">
                  Değerlendirme
                </th>
              </tr>
            </thead>
            <tbody>
              {model.examComparisons.map((row) => (
                <tr key={row.subjectName}>
                  <th className={`${tdClassName} text-left font-semibold`} scope="row">
                    {row.subjectName}
                  </th>
                  <td className={numericCell}>{formatOptionalNet(row.latestNet)}</td>
                  <td className={numericCell}>{formatOptionalNet(row.previousNet)}</td>
                  <td className={numericCell}>{formatNetDelta(row.delta)}</td>
                  <td className={tdClassName}>{row.assessment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </div>
  );
}

function OutcomeTables({ model }: { model: WeeklyReportModel }) {
  if (model.outcomeGaps.length === 0) {
    return (
      <StateMessage
        variant="empty"
        title="Bağlı kazanım eksikliği yok."
        description={REPORT_MESSAGES.noOutcomes}
      />
    );
  }
  return (
    <div className="grid min-w-0 gap-4">
      <TableScroll label="Yanlış ve boş kazanımlar">
        <table className={tableClassName}>
          <caption className="sr-only">
            Ders, kazanım kodu, açıklama, yanlış, boş ve toplam eksik
          </caption>
          <thead>
            <tr>
              <th className={thClassName} scope="col">
                Ders
              </th>
              <th className={thClassName} scope="col">
                Kazanım kodu
              </th>
              <th className={thClassName} scope="col">
                Kazanım açıklaması
              </th>
              <th className={numericHead} scope="col">
                Yanlış
              </th>
              <th className={numericHead} scope="col">
                Boş
              </th>
              <th className={numericHead} scope="col">
                Toplam eksik
              </th>
              <th className={thClassName} scope="col">
                Öncelik
              </th>
            </tr>
          </thead>
          <tbody>
            {model.outcomeGaps.map((row) => (
              <tr key={`${row.subjectId}-${row.outcomeCode}`}>
                <th className={`${tdClassName} text-left font-semibold`} scope="row">
                  {row.subjectName}
                </th>
                <td className={tdClassName}>{row.outcomeCode}</td>
                <td className={tdClassName}>{row.outcomeDescription}</td>
                <td className={numericCell}>{row.wrongCount}</td>
                <td className={numericCell}>{row.blankCount}</td>
                <td className={numericCell}>{row.totalGap}</td>
                <td className={tdClassName}>{row.priority ? "Öncelikli" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      {model.outcomeNetLinks.length > 0 ? (
        <ul className="grid min-w-0 gap-2 text-ink-900">
          {model.outcomeNetLinks.map((link) => (
            <li key={link.subjectName}>
              <span className="font-semibold">{link.subjectName}: </span>
              {link.note}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function GoalTable({ model }: { model: WeeklyReportModel }) {
  if (model.scope === "month") {
    return (
      <StateMessage
        variant="info"
        title="Aylık hedef yok."
        description={REPORT_MESSAGES.noMonthGoals}
      />
    );
  }
  if (model.goalRows.length === 0) {
    return (
      <StateMessage
        variant="empty"
        title="Bu dönemde gösterilecek hedef yok."
        description={REPORT_MESSAGES.noGoals}
      />
    );
  }
  return (
    <TableScroll label="Haftalık hedef ve gerçekleşme">
      <table className={tableClassName}>
        <caption className="sr-only">
          Hedef, hedeflenen soru, gerçekleşen soru ve gerçekleşme oranı
        </caption>
        <thead>
          <tr>
            <th className={thClassName} scope="col">
              Ders veya hedef
            </th>
            <th className={numericHead} scope="col">
              Hedeflenen soru
            </th>
            <th className={numericHead} scope="col">
              Gerçekleşen soru
            </th>
            <th className={numericHead} scope="col">
              Gerçekleşme oranı
            </th>
          </tr>
        </thead>
        <tbody>
          {model.goalRows.map((row) => (
            <tr key={row.label}>
              <th className={`${tdClassName} text-left font-semibold`} scope="row">
                {row.label}
              </th>
              <td className={numericCell}>{row.targetQuestions}</td>
              <td className={numericCell}>{row.doneQuestions}</td>
              <td className={numericCell}>{row.ratioLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export function WeeklyReportPanel({ model }: { model: WeeklyReportModel }) {
  const studyTitle = model.scope === "month" ? "Aylık çalışma" : "Haftalık çalışma";
  const examTitle = model.scope === "month" ? "Aylık deneme" : "Haftalık deneme";
  const evalTitle =
    model.scope === "month" ? "Aylık değerlendirme" : "Haftalık değerlendirme";
  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-2">
        <p className="text-sm text-ink-700">
          {model.studentName} · {model.periodLabel}
        </p>
        <p className="text-sm text-ink-600">{model.periodNote}</p>
        <SummaryCards model={model} />
      </div>
      <section className="grid min-w-0 gap-3" aria-labelledby="rapor-calisma">
        <h3 id="rapor-calisma" className="font-bold text-ink-900">
          {studyTitle}
        </h3>
        <StudyTables model={model} />
      </section>
      <section className="grid min-w-0 gap-3" aria-labelledby="rapor-deneme">
        <h3 id="rapor-deneme" className="font-bold text-ink-900">
          {examTitle}
        </h3>
        <ExamTables model={model} />
      </section>
      <section className="grid min-w-0 gap-3" aria-labelledby="rapor-kazanim">
        <h3 id="rapor-kazanim" className="font-bold text-ink-900">
          Kazanım eksikleri
        </h3>
        <OutcomeTables model={model} />
      </section>
      <section className="grid min-w-0 gap-3" aria-labelledby="rapor-hedef">
        <h3 id="rapor-hedef" className="font-bold text-ink-900">
          Hedef ve gerçekleşme
        </h3>
        {model.scope === "week" ? (
          <p className="text-sm text-ink-700">{REPORT_MESSAGES.goalCountNote}</p>
        ) : null}
        <GoalTable model={model} />
      </section>
      <section className="grid min-w-0 gap-2" aria-labelledby="rapor-degerlendirme">
        <h3 id="rapor-degerlendirme" className="font-bold text-ink-900">
          {evalTitle}
        </h3>
        <ul className="grid min-w-0 gap-2 text-ink-900">
          {model.evaluation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
