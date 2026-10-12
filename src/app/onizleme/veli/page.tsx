import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import {
  TableScroll,
  tableClassName,
  tdClassName,
  thClassName,
} from "@/components/ui/table-scroll";
import { DEMO_STUDENT, DEMO_WEEK } from "@/features/preview/demo-data";

export const metadata: Metadata = { title: "Veli" };

export default function ParentPreviewPage() {
  const totalQuestions = DEMO_WEEK.days.reduce((sum, d) => sum + d.questions, 0);
  const totalMinutes = DEMO_WEEK.days.reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = DEMO_WEEK.days.filter((d) => d.questions > 0).length;

  return (
    <>
      <PageHeader
        title="Veli paneli"
        description="Yalnızca onaylı bağlantın olan öğrencinin özetini görürsün. Öğrencinin kayıtlarını değiştiremezsin."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Bağlı öğrenci">
          <p className="font-semibold text-ink-900">{DEMO_STUDENT.displayName}</p>
          <p className="mt-1 text-sm text-ink-700">Bağlantı durumu: Aktif (örnek)</p>
        </Card>

        <Card title="Haftalık özet" description={`Dönem: ${DEMO_WEEK.rangeLabel}`}>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-ink-600">Toplam soru</dt>
              <dd className="text-xl font-bold text-ink-900">{totalQuestions}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-600">Toplam süre</dt>
              <dd className="text-xl font-bold text-ink-900">{totalMinutes} dk</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-600">Kayıtlı gün</dt>
              <dd className="text-xl font-bold text-ink-900">{activeDays} / 7</dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Günlere göre çalışma"
          description={DEMO_WEEK.rangeLabel}
          className="md:col-span-2"
        >
          <TableScroll label="Günlere göre çalışma tablosu">
            <table className={tableClassName}>
              <caption className="sr-only">
                {DEMO_WEEK.rangeLabel} tarihleri arasında günlük soru sayısı ve dakika
                cinsinden süre
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={thClassName}>
                    Gün
                  </th>
                  <th scope="col" className={thClassName}>
                    Soru (adet)
                  </th>
                  <th scope="col" className={thClassName}>
                    Süre (dakika)
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEMO_WEEK.days.map((d) => (
                  <tr key={d.day}>
                    <th scope="row" className={tdClassName}>
                      {d.day}
                    </th>
                    <td className={tdClassName}>
                      {d.questions > 0 ? d.questions : "Kayıt yok"}
                    </td>
                    <td className={tdClassName}>
                      {d.minutes > 0 ? d.minutes : "Kayıt yok"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>

        <Card title="Raporlar">
          <StateMessage
            variant="info"
            title="Rapor oluşturma henüz hazır değil"
            description="Haftalık PDF raporu sonraki aşamalarda eklenecek."
          />
        </Card>

        <Card title="Bağlantı ve bildirim ayarları">
          <StateMessage
            variant="info"
            title="Ayarlar henüz hazır değil"
            description="Davet, onay ve bağlantıyı sonlandırma işlemleri hesap sistemiyle birlikte gelecek."
          />
        </Card>
      </div>
    </>
  );
}
