import Link from "next/link";
import { StateMessage } from "@/components/ui/state-message";
import { cn } from "@/lib/cn";

const TILE_CLASS = [
  "bg-tile-1",
  "bg-tile-2",
  "bg-tile-3",
  "bg-tile-4",
  "bg-tile-5",
  "bg-tile-6",
] as const;

export function SubjectTiles({
  subjects,
}: {
  subjects: readonly { id: string; name: string }[];
}) {
  return (
    <section className="min-w-0" aria-labelledby="ders-karolari">
      <h2 id="ders-karolari" className="text-lg font-bold text-ink-900">
        Dersler
      </h2>
      <p className="mt-1 text-sm text-ink-700">
        Bir derse dokununca bugünün kayıt formu o ders seçili açılır.
      </p>
      {subjects.length === 0 ? (
        <div className="mt-4">
          <StateMessage
            variant="empty"
            title="Ders listesi henüz hazır değil."
            description="Yönetici dersleri ekleyince karolar burada görünür."
          />
        </div>
      ) : (
        <ul className="mt-4 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3">
          {subjects.map((subject, index) => (
            <li key={subject.id} className="min-w-0">
              <Link
                href={`/ogrenci/calisma/yeni?ders=${encodeURIComponent(subject.id)}`}
                className={cn(
                  "flex min-h-11 min-w-0 items-center rounded-card border border-border p-3 text-base font-bold break-words text-ink-900",
                  TILE_CLASS[index % TILE_CLASS.length],
                )}
              >
                {subject.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
