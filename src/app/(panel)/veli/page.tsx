import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireParent } from "@/features/access/guards";
import { RedeemInviteForm } from "@/features/family/components/redeem-invite-form";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { loadOwnFamilyLinks } from "@/features/family/load-links";

export const metadata: Metadata = { title: "Özet" };
export const instant = false;

export default function ParentHomePage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <ParentHome />
    </Suspense>
  );
}

async function ParentHome() {
  const user = await requireParent();
  const links = await loadOwnFamilyLinks();
  const active = links.filter((link) => link.status === "active");
  const pending = links.filter((link) => link.status === "pending");

  return (
    <>
      <PageHeader
        title={`Merhaba, ${user.displayName}`}
        description="Yalnızca bağlı olduğun öğrenciyi görürsün. Kayıt giremez ve değiştiremezsin."
      />
      <div className="grid gap-6">
        {active.length === 0 && pending.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Henüz bir öğrenciye bağlı değilsin."
            description="Çocuğundan aldığın kodu aşağıya yaz. O onaylamadan kayıtlarını göremezsin."
          />
        ) : null}

        {active.map((link) => (
          <Card
            key={link.id}
            title={link.student_display_name}
            description="Bağlantı açık"
          >
            <div className="grid gap-4">
              <div>
                <ButtonLink href={`/veli/ogrenci/${link.student_id}`}>
                  Öğrenciyi gör
                </ButtonLink>
              </div>
              <RevokeLinkButton
                linkId={link.id}
                description="Kaldırınca bu öğrencinin sayfasını göremezsin. Yeniden bağlanmak için yeni bir kod gerekir."
              />
            </div>
          </Card>
        ))}

        {pending.map((link) => (
          <Card
            key={link.id}
            title={link.student_display_name}
            description="Öğrencinin onayı bekleniyor. Onay gelmeden kayıtları göremezsin."
          />
        ))}

        <Card
          title="Öğrenci bağla"
          description="Kod 24 saat geçerlidir ve bir kez kullanılır."
        >
          <RedeemInviteForm />
        </Card>
      </div>
    </>
  );
}
