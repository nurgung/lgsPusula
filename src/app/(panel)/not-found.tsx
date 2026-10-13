import { StateMessage } from "@/components/ui/state-message";

export default function PanelNotFound() {
  return (
    <>
      <h1 className="sr-only">Sayfa bulunamadı</h1>
      <StateMessage
        variant="empty"
        title="Aradığın sayfa bulunamadı"
        description="Bağlantı hatalı olabilir veya sayfa kaldırılmış olabilir."
      />
    </>
  );
}
