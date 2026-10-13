import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { SignOutControls } from "@/features/auth/components/sign-out-controls";
import { CHANGE_PASSWORD_PATH, requireUser } from "@/features/auth/session";
import { ROLE_LABELS } from "@/types/roles";

export const metadata: Metadata = { title: "Hesabım" };

export default function AccountPage({ searchParams }: PageProps<"/hesap">) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16"
    >
      <PageHeader title="Hesabım" />
      <Suspense
        fallback={
          <StateMessage variant="loading" title="Hesap bilgilerin yükleniyor..." />
        }
      >
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AccountContent({
  searchParams,
}: Pick<PageProps<"/hesap">, "searchParams">) {
  const user = await requireUser();
  const { durum } = await searchParams;

  return (
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

      <StateMessage
        variant="info"
        title="Sayfaların hazırlanıyor"
        description="Günlük kayıt, deneme ve veli bağlantısı ekranları sonraki aşamalarda bu hesaba eklenecek."
      />

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
  );
}
