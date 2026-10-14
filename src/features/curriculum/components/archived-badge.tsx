/** Text label, not just a colour, so the state is clear without seeing colours. */
export function ArchivedBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-ink-600 px-2 py-0.5 text-xs font-semibold text-ink-700">
      Eski sürüm
    </span>
  );
}

export function SourceLine({
  sourceName,
  sourceVersion,
  createdAt,
}: {
  sourceName: string;
  sourceVersion: string;
  createdAt: string;
}) {
  const date = new Date(createdAt).toLocaleDateString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <p className="text-sm text-ink-600">
      Kaynak: {sourceName}, {sourceVersion}. Eklenme: {date}.
    </p>
  );
}
