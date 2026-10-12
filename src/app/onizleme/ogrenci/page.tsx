import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { StateMessage } from "@/components/ui/state-message";
import {
  TableScroll,
  tableClassName,
  tdClassName,
  thClassName,
} from "@/components/ui/table-scroll";
import {
  DEMO_LAST_EXAM,
  DEMO_STUDENT,
  DEMO_SUGGESTION,
  DEMO_TASKS,
  DEMO_TODAY_GOAL,
} from "@/features/preview/demo-data";

export const metadata: Metadata = { title: "Öğrenci" };

export default function StudentPreviewPage() {
  return (
    <>
      <PageHeader
        title={`Merhaba, ${DEMO_STUDENT.displayName}`}
        description="Bugün küçük bir adım atmak yeterli."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Karakterin">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-3xl"
            >
              🌱
            </span>
            <div>
              <p className="font-bold text-ink-900">{DEMO_STUDENT.mascot.name}</p>
              <p className="text-sm text-ink-700">
                Seçtiğin {DEMO_STUDENT.mascot.kind} karakteri ·{" "}
                {DEMO_STUDENT.mascot.stageLabel}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Bugünün hedefi">
          <ProgressMeter
            label="Çözülen soru"
            value={DEMO_TODAY_GOAL.solved}
            max={DEMO_TODAY_GOAL.target}
            unit={DEMO_TODAY_GOAL.unit}
          />
        </Card>

        <Card title="Hızlı kayıt">
          <StateMessage
            variant="info"
            title="Günlük kayıt formu henüz hazır değil"
            description="Ders, soru sayısı, doğru, yanlış, boş ve süre alanları burada olacak."
          />
        </Card>

        <Card title="Öncelikli öneri">
          <p className="font-semibold text-ink-900">{DEMO_SUGGESTION.title}</p>
          <p className="mt-2 text-sm text-ink-700">
            <span className="font-semibold">Neden?</span> {DEMO_SUGGESTION.reason}
          </p>
        </Card>

        <Card title="Görevler">
          <ul className="space-y-2">
            {DEMO_TASKS.map((task) => (
              <li key={task.id} className="flex items-start gap-2">
                <span aria-hidden="true">{task.done ? "✓" : "○"}</span>
                <span className="text-ink-900">
                  {task.label}{" "}
                  <span
                    className={
                      task.done ? "text-sm text-success-700" : "text-sm text-ink-600"
                    }
                  >
                    ({task.done ? "tamamlandı" : "bekliyor"})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Son deneme"
          description={`${DEMO_LAST_EXAM.name} · ${DEMO_LAST_EXAM.dateLabel}`}
          className="md:col-span-2"
        >
          <ul className="space-y-2 sm:hidden">
            {DEMO_LAST_EXAM.results.map((row) => (
              <li key={row.subject} className="rounded-xl border border-border p-3">
                <p className="font-semibold text-ink-900">{row.subject}</p>
                <dl className="mt-1 grid grid-cols-4 gap-1 text-sm">
                  <div>
                    <dt className="text-ink-600">Doğru</dt>
                    <dd className="font-semibold">{row.correct}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-600">Yanlış</dt>
                    <dd className="font-semibold">{row.wrong}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-600">Boş</dt>
                    <dd className="font-semibold">{row.blank}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-600">Net</dt>
                    <dd className="font-semibold">—</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
            <TableScroll label="Son deneme ders sonuçları">
              <table className={tableClassName}>
                <caption className="sr-only">
                  {DEMO_LAST_EXAM.name} ders bazında doğru, yanlış ve boş sayıları
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className={thClassName}>
                      Ders
                    </th>
                    <th scope="col" className={thClassName}>
                      Doğru
                    </th>
                    <th scope="col" className={thClassName}>
                      Yanlış
                    </th>
                    <th scope="col" className={thClassName}>
                      Boş
                    </th>
                    <th scope="col" className={thClassName}>
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_LAST_EXAM.results.map((row) => (
                    <tr key={row.subject}>
                      <th scope="row" className={tdClassName}>
                        {row.subject}
                      </th>
                      <td className={tdClassName}>{row.correct}</td>
                      <td className={tdClassName}>{row.wrong}</td>
                      <td className={tdClassName}>{row.blank}</td>
                      <td className={tdClassName}>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
          <p className="mt-2 text-sm text-ink-600">
            Net değeri gösterilmiyor: deneme türüne göre net hesaplama kuralı henüz
            tanımlanmadı.
          </p>
        </Card>
      </div>
    </>
  );
}
