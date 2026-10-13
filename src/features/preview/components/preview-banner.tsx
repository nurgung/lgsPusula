export function PreviewBanner() {
  return (
    <div
      role="note"
      aria-label="Önizleme uyarısı"
      className="border-b-4 border-warning-500 bg-warning-50 px-4 py-3 text-sm text-warning-800"
    >
      <p className="mx-auto max-w-5xl">
        <strong>Önizleme (geliştirme ortamı):</strong> Bu sayfalar ortak bileşenlerin
        örnekleridir. Gerçek öğrenci verisi göstermez. Giriş ve yetkilendirme bu
        sayfalarda yoktur.
      </p>
    </div>
  );
}
