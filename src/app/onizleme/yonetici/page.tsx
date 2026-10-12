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
import { DEMO_SUBJECTS } from "@/features/preview/demo-data";

export const metadata: Metadata = { title: "Yönetici" };

export default function AdminPreviewPage() {
  return (
    <>
      <PageHeader
        title="Yönetim"
        description="Müfredat kataloğu ve sistem ayarları. Yönetici rolü öğrenci kayıtlarını varsayılan olarak göremez."
      />

      <div className="grid gap-4">
        <Card title="Müfredat kataloğu" description="Dersler ve kazanım kayıtları">
          <TableScroll label="Ders kataloğu tablosu">
            <table className={tableClassName}>
              <caption className="sr-only">Ders listesi ve kazanım verisi durumu</caption>
              <thead>
                <tr>
                  <th scope="col" className={thClassName}>
                    Ders
                  </th>
                  <th scope="col" className={thClassName}>
                    Kazanım verisi
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEMO_SUBJECTS.map((subject) => (
                  <tr key={subject}>
                    <th scope="row" className={tdClassName}>
                      {subject}
                    </th>
                    <td className={tdClassName}>Henüz girilmedi</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <p className="mt-2 text-sm text-ink-600">
            Kazanım kataloğunun kaynağı ve güncelleme sorumluluğu henüz belirlenmedi.
          </p>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Sistem ayarları">
            <StateMessage variant="info" title="Henüz hazır değil" />
          </Card>
          <Card title="Denetim kayıtları">
            <StateMessage
              variant="info"
              title="Henüz hazır değil"
              description="Kayıtlar parola, belirteç veya gereksiz kişisel veri içermeyecek."
            />
          </Card>
        </div>
      </div>
    </>
  );
}
