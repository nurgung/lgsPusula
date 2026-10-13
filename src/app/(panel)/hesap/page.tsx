import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { SignOutControls } from "@/features/auth/components/sign-out-controls";
import { MFA_PATH } from "@/features/auth/paths";
import { CHANGE_PASSWORD_PATH, requireUser } from "@/features/auth/session";
import { ROLE_LABELS } from "@/types/roles";

export const metadata: Metadata = { title: "Hesabım" };
export const instant = false;

export default function AccountPage({ searchParams }: PageProps<"/hesap">) {
  return (
    <Suspense
      fallback={<StateMessage variant="loading" title="Hesap bilgilerin yükleniyor..." />}
    >
      <AccountContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountContent({
  searchParams,
}: Pick<PageProps<"/hesap">, "searchParams">) {
  const user = await requireUser();
  const { durum } = await searchParams;

  return (
    <>
      <PageHeader title="Hesabım" />
      <div className="grid gap-6">
        {durum === "parola-degisti" ? (
          <StateMessage
            variant="success"
            title="Parolan değişti."
            description="Diğer cihazlardaki oturumların kapatıldı."
          />
        ) : null}

        <Card title={`Merhaba, ${user.displayName}`}>
          <dl className="grid gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
            <dt className="font-semibold text-ink-900">Kullanıcı adı</dt>
            <dd className="min-w-0 break-words text-ink-700">{user.username}</dd>
            <dt className="font-semibold text-ink-900">Hesap türü</dt>
            <dd className="text-ink-700">
              {user.roles.map((role) => ROLE_LABELS[role]).join(", ")}
            </dd>
          </dl>
        </Card>

        {user.roles.includes("admin") ? (
          <Card
            title="İki adımlı doğrulama"
            description="Yönetim sayfası bu doğrulama tamamlanmış bir oturum ister."
          >
            {user.assuranceLevel === "aal2" ? (
              <StateMessage variant="success" title="Bu oturumda doğrulama tamam." />
            ) : (
              <ButtonLink href={MFA_PATH}>Doğrulamayı aç</ButtonLink>
            )}
          </Card>
        ) : null}

        <Card title="Güvenlik">
          <div className="grid gap-4">
            <div>
              <ButtonLink href={CHANGE_PASSWORD_PATH} variant="secondary">
                Parolamı değiştir
              </ButtonLink>
            </div>
            <SignOutControls />
          </div>
        </Card>
      </div>
    </>
  );
}
