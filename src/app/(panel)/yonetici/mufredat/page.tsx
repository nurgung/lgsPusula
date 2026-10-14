import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireAdmin } from "@/features/access/guards";
import { createSubjectAction } from "@/features/curriculum/actions";
import { ArchivedBadge } from "@/features/curriculum/components/archived-badge";
import { subjectFields } from "@/features/curriculum/components/catalog-fields";
import { CatalogForm } from "@/features/curriculum/components/catalog-form";
import { loadCatalog } from "@/features/curriculum/load-catalog";

export const metadata: Metadata = { title: "Müfredat" };
export const instant = false;

export default function CurriculumAdminPage() {
  return (
    <Suspense
      fallback={<StateMessage variant="loading" title="Müfredat yükleniyor..." />}
    >
      <CurriculumAdmin />
    </Suspense>
  );
}

async function CurriculumAdmin() {
  await requireAdmin();
  const catalog = await loadCatalog({ includeArchived: true });

  return (
    <>
      <p className="mb-4">
        <Link href="/yonetici" className="font-semibold text-brand-700 underline">
          Yönetim sayfasına dön
        </Link>
      </p>
      <PageHeader
        title="Müfredat"
        description="Ders, konu ve kazanımları buradan eklersin. Eskiyen kayıtlar silinmez, “eski sürüm” olarak işaretlenir; öğrenci yalnızca güncel olanları görür."
      />
      <div className="grid gap-6">
        <Card title="Dersler">
          {catalog.length === 0 ? (
            <StateMessage
              variant="empty"
              title="Henüz ders yok."
              description="Aşağıdaki formla ders ekleyebilir ya da yükleme betiğiyle bir dosyadan aktarabilirsin."
            />
          ) : (
            <ul className="grid gap-3">
              {catalog.map((subject) => {
                const outcomeCount = subject.topics.reduce(
                  (sum, topic) => sum + topic.outcomes.length,
                  0,
                );
                return (
                  <li
                    key={subject.id}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                        <span className="break-words">{subject.name}</span>
                        {subject.archived ? <ArchivedBadge /> : null}
                      </p>
                      <p className="text-sm text-ink-600">
                        Kod: {subject.code} · {subject.topics.length} konu ·{" "}
                        {outcomeCount} kazanım
                      </p>
                    </div>
                    <ButtonLink
                      href={`/yonetici/mufredat/${subject.id}`}
                      variant="secondary"
                      aria-label={`${subject.name} dersini düzenle`}
                    >
                      Düzenle
                    </ButtonLink>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Ders ekle">
          <CatalogForm
            action={createSubjectAction}
            fields={subjectFields({}, { withCode: true })}
            submitLabel="Dersi ekle"
            pendingLabel="Ekleniyor..."
            idPrefix="ders-ekle"
          />
        </Card>
      </div>
    </>
  );
}
