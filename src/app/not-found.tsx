import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";

export default function NotFound() {
  return (
    <main id={MAIN_CONTENT_ID} className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="sr-only">Sayfa bulunamadı</h1>
      <StateMessage
        variant="empty"
        title="Aradığın sayfa bulunamadı"
        description="Bağlantı hatalı olabilir veya sayfa kaldırılmış olabilir."
        action={
          <ButtonLink href="/" variant="secondary">
            Ana sayfaya dön
          </ButtonLink>
        }
      />
    </main>
  );
}
