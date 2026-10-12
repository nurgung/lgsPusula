import { StateMessage } from "@/components/ui/state-message";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <StateMessage variant="loading" title="Sayfa yükleniyor, lütfen bekle." />
    </div>
  );
}
