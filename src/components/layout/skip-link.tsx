export const MAIN_CONTENT_ID = "ana-icerik";

export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-xl bg-surface px-4 py-3 font-semibold text-brand-700 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
    >
      İçeriğe geç
    </a>
  );
}
