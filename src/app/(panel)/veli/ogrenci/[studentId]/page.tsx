import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { canReadStudentRecord } from "@/features/access/student-access";
import { requireParent } from "@/features/access/guards";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { loadOwnFamilyLinks } from "@/features/family/load-links";

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

  return (
    <>
      <PageHeader
        title={link.student_display_name}
        description="Bu sayfa yalnızca aktif bağlantın olan öğrenciyi gösterir."
      />
      <div className="grid gap-6">
        <StateMessage
          variant="info"
          title="Kayıtları değiştiremezsin."
          description="Çalışma ve deneme özetleri sonraki aşamada burada görünecek. Şimdilik yalnızca bağlantıyı görürsün."
        />
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
