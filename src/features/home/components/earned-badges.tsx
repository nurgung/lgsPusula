import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { badgesFor, type RewardEvent } from "@/features/mascot/rules";

const SHOWN_BADGE_LIMIT = 3;

export function EarnedBadges({ rewards }: { rewards: readonly RewardEvent[] }) {
  const earned = badgesFor(rewards).filter((badge) => badge.earned);
  const shown = earned.slice(0, SHOWN_BADGE_LIMIT);

  return (
    <Card title="Rozetlerin">
      {earned.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Henüz rozetin yok."
          description="İlk çalışma kaydın bir rozet getirir. Bir gün ara vermek kazandığın rozeti silmez."
        />
      ) : (
        <div className="grid min-w-0 gap-3">
          <p className="text-ink-900">
            {earned.length} rozet kazandın.
            {earned.length > shown.length ? " Üçü burada." : ""}
          </p>
          <ul className="grid min-w-0 gap-3 sm:grid-cols-3">
            {shown.map((badge) => (
              <li
                key={badge.id}
                className="min-w-0 rounded-xl border border-success-700/30 bg-success-50 p-3"
              >
                <p className="font-semibold break-words text-ink-900">
                  {badge.name}{" "}
                  <span className="font-bold text-success-700">
                    {MASCOT_MESSAGES.badgeEarned}
                  </span>
                </p>
                <p className="mt-1 text-sm text-ink-700">{badge.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4">
        <ButtonLink href="/ogrenci/karakter" variant="secondary">
          Tüm rozetler
        </ButtonLink>
      </div>
    </Card>
  );
}
