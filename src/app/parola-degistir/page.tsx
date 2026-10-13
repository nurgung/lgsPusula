import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { requireUser } from "@/features/auth/session";

export const metadata: Metadata = { title: "Parola değiştir" };

export default function ChangePasswordPage() {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-16"
    >
      <PageHeader title="Parola değiştir" />
      <Suspense
        fallback={<StateMessage variant="loading" title="Sayfa hazırlanıyor..." />}
      >
        <ChangePasswordContent />
      </Suspense>
    </main>
  );
}

async function ChangePasswordContent() {
  const user = await requireUser({ allowPendingPasswordChange: true });
  return (
    <div className="grid gap-4">
      {user.mustChangePassword ? (
        <StateMessage
          variant="info"
          title="Önce kendi parolanı belirle"
          description="Sana verilen parola geçici. Devam etmek için yalnızca senin bildiğin yeni bir parola seç."
        />
      ) : (
        <p className="text-ink-700">
          Parolanı değiştirdiğinde diğer cihazlardaki oturumların kapanır.
        </p>
      )}
      <Card>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
