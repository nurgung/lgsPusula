import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { badgesFor, type RewardEvent } from "@/features/mascot/rules";

const BADGE_DETAIL_HREF = "/ogrenci/karakter";

export function EarnedBadges({ rewards }: { rewards: readonly RewardEvent[] }) {
  const earned = badgesFor(rewards).filter((badge) => badge.earned);

  return (
    <Card
      title="Rozetlerin"
      headingLevel={3}
      description={
        earned.length > 0 ? "Açıklamalar karakter sayfasında." : undefined
      }
    >
      {earned.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Henüz rozetin yok."
          description="İlk çalışma kaydın bir rozet getirir. Bir gün ara vermek kazandığın rozeti silmez."
        />
      ) : (
        <div className="grid min-w-0 gap-3">
          <p className="text-ink-900">{earned.length} rozet kazandın.</p>
          <ul
            aria-label="Kazanılan rozetler"
            className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 py-1"
          >
            {earned.map((badge) => (
              <li key={badge.id} className="w-[9.75rem] shrink-0 snap-start">
                <Link
                  href={BADGE_DETAIL_HREF}
                  className="flex h-full min-h-11 min-w-0 flex-col gap-2 rounded-xl border border-success-700/30 bg-success-50 p-3 break-words text-ink-900 hover:border-brand-700"
                >
                  <BadgeMark />
                  <span className="text-base font-bold leading-snug break-words">
                    {badge.name}
                  </span>
                  <span className="text-sm font-semibold text-success-700">
                    {MASCOT_MESSAGES.badgeEarned}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4">
        <ButtonLink href={BADGE_DETAIL_HREF} variant="secondary">
          Tüm rozetler
        </ButtonLink>
      </div>
    </Card>
  );
}

function BadgeMark() {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 text-warning-800">
      <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
        <circle cx="24" cy="18" r="10" fill="currentColor" />
        <path d="M16 26 L13 42 L24 35 L35 42 L32 26" fill="currentColor" />
      </svg>
    </span>
  );
}
