import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { badgesFor, type RewardEvent } from "@/features/mascot/rules";

const BADGE_DETAIL_HREF = "/ogrenci/karakter";

export function EarnedBadges({
  rewards,
  className,
}: {
  rewards: readonly RewardEvent[];
  className?: string;
}) {
  const earned = badgesFor(rewards).filter((badge) => badge.earned);

  return (
    <Card title="Rozetlerin" icon={<TrophyIcon />} headingLevel={3} className={className}>
      {earned.length === 0 ? (
        <div className="grid min-w-0 gap-4">
          <StateMessage
            variant="empty"
            title="Henüz rozetin yok."
            description="İlk çalışma kaydın bir rozet getirir. Bir gün ara vermek kazandığın rozeti silmez."
          />
          <div>
            <ButtonLink href={BADGE_DETAIL_HREF} variant="secondary">
              Tüm rozetler
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="grid min-w-0 gap-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-ink-900">{earned.length} rozet kazandın.</p>
            <ButtonLink href={BADGE_DETAIL_HREF} variant="secondary">
              Tüm rozetler
            </ButtonLink>
          </div>
          {/* Phones: one controlled sideways row. From sm up the badges wrap and need no scrolling. */}
          <ul
            aria-label="Kazanılan rozetler"
            className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 py-1 sm:flex-wrap sm:overflow-visible"
          >
            {earned.map((badge) => (
              <li
                key={badge.id}
                className="w-[9.75rem] shrink-0 snap-start sm:snap-align-none"
              >
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
    </Card>
  );
}

function BadgeMark() {
  return (
    <span className="inline-flex size-11 items-center justify-center rounded-full border-2 border-warning-500 bg-warning-50 text-warning-800 shadow-soft">
      <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
        <circle cx="24" cy="18" r="10" fill="currentColor" />
        <path d="M16 26 L13 42 L24 35 L35 42 L32 26" fill="currentColor" />
      </svg>
    </span>
  );
}

function TrophyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" />
    </svg>
  );
}
