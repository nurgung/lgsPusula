import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser, landingPathFor } from "@/features/auth/session";
import { getSupabaseConfig } from "@/services/supabase/config";

export const metadata: Metadata = { title: "Giriş" };

const SIGN_OUT_MESSAGES: Record<string, string> = {
  tamam: "Çıkış yaptın.",
  tum: "Tüm cihazlarda çıkış yaptın.",
};

export default function LoginPage({ searchParams }: PageProps<"/giris">) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-16"
    >
      <PageHeader title="Giriş" description="Hesabına kullanıcı adın ve parolanla gir." />
      <Suspense
        fallback={
          <StateMessage variant="loading" title="Giriş sayfası hazırlanıyor..." />
        }
      >
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginContent({ searchParams }: Pick<PageProps<"/giris">, "searchParams">) {
  await connection();
  if (!getSupabaseConfig()) {
    return (
      <StateMessage
        variant="info"
        title="Giriş henüz kullanılamıyor"
        description="Hesap sistemi bu ortamda kurulmamış. Kurulum tamamlandığında bu sayfadan hesabına girebileceksin."
        action={
          <ButtonLink href="/" variant="secondary">
            Ana sayfaya dön
          </ButtonLink>
        }
      />
    );
  }

  const user = await getCurrentUser();
  if (user) redirect(landingPathFor(user));

  const { cikis } = await searchParams;
  const signOutMessage = typeof cikis === "string" ? SIGN_OUT_MESSAGES[cikis] : undefined;

  return (
    <div className="grid gap-4">
      {signOutMessage ? <StateMessage variant="success" title={signOutMessage} /> : null}
      <Card>
        <LoginForm />
      </Card>
    </div>
  );
}
