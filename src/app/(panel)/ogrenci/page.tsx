import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { CreateInviteForm } from "@/features/family/components/create-invite-form";
import { RespondLinkForms } from "@/features/family/components/respond-link-forms";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { loadOwnFamilyLinks } from "@/features/family/load-links";

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
  const links = await loadOwnFamilyLinks();
  const active = links.find((link) => link.status === "active");
  const pending = links.find((link) => link.status === "pending");

  return (
    <>
      <PageHeader
        title={`Merhaba, ${user.displayName}`}
        description="Günlük çalışma ve deneme ekranları sonraki aşamada eklenecek. Şimdilik veli bağlantını buradan yönetirsin."
      />
      <div className="grid gap-6">
        <StateMessage
          variant="info"
          title="Velin neleri görebilir?"
          description="Bağlantıyı sen onaylarsan velin ilerlemeni ve sonuçlarını görebilir. Kayıtlarını değiştiremez. Onaylamazsan hiçbir şey göremez."
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
