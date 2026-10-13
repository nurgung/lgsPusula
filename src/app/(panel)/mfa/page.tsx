import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { MfaEnrollForm } from "@/features/auth/components/mfa-enroll-form";
import { MfaVerifyForm } from "@/features/auth/components/mfa-verify-form";
import { ADMIN_HOME_PATH } from "@/features/auth/paths";
import { requireUser } from "@/features/auth/session";
import { AuthProviderError } from "@/services/supabase/auth-adapters";
import { createSessionClient } from "@/services/supabase/server-client";

export const metadata: Metadata = { title: "İki adımlı doğrulama" };
export const instant = false;

export default function MfaPage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <MfaSetup />
    </Suspense>
  );
}

async function MfaSetup() {
  const user = await requireUser();
  if (!user.roles.includes("admin")) notFound();
  if (user.assuranceLevel === "aal2") redirect(ADMIN_HOME_PATH);

  const session = await createSessionClient({ writable: false });
  const listed = await session.auth.mfa.listFactors();
  if (listed.error) throw new AuthProviderError("mfa_list");
  const verified = listed.data.totp.find((factor) => factor.status === "verified");

  return (
    <>
      <PageHeader
        title="İki adımlı doğrulama"
        description="Yönetim sayfası bu adımı ister. Veli sayfaların doğrulama olmadan da açılır."
      />
      <Card title={verified ? "Kodu gir" : "Uygulamayı bağla"}>
        {verified ? <MfaVerifyForm factorId={verified.id} /> : <MfaEnrollForm />}
      </Card>
    </>
  );
}
