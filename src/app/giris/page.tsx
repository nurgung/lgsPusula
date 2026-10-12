import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";

export const metadata: Metadata = { title: "Giriş" };

export default function LoginPage() {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-16"
    >
      <PageHeader title="Giriş" />
      <StateMessage
        variant="info"
        title="Giriş henüz kullanılamıyor"
        description="Hesap sistemi hazırlanıyor. Güvenli giriş tamamlandığında bu sayfadan hesabına girebileceksin."
        action={
          <ButtonLink href="/" variant="secondary">
            Ana sayfaya dön
          </ButtonLink>
        }
      />
    </main>
  );
}
