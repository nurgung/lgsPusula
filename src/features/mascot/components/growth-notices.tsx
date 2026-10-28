import { dismissReminderAction } from "../actions";
import { MASCOT_MESSAGES } from "../messages";

/** Shorter than `noticeInApp`, with the same two facts: in-app only, no phone push. */
const NOTICE_CHANNEL = "Yalnızca uygulama içi. Telefon bildirimi yok.";

const dismissClassName =
  "inline-flex min-h-touch min-w-touch items-center justify-center rounded-control border border-border bg-surface px-3 py-2 text-helper font-semibold text-ink-900 hover:bg-surface-muted";

/**
 * Compact strips — lighter than the coach card so they do not compete for attention.
 */
export function GrowthNotices({
  notices,
}: {
  notices: readonly { id: string; title: string; body: string }[];
}) {
  if (notices.length === 0) return null;
  return (
    <div className="grid min-w-0 gap-2" data-growth-notices="">
      {notices.map((notice) => (
        <section
          key={notice.id}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-control border border-border border-l-4 border-l-brand-200 bg-surface-muted px-3 py-2"
          aria-labelledby={`duyuru-${notice.id}`}
        >
          <div className="min-w-0 max-sm:contents">
            <h2
              id={`duyuru-${notice.id}`}
              className="text-helper font-bold break-words text-ink-900 max-sm:self-center"
            >
              {notice.title}
            </h2>
            <p className="min-w-0 text-helper leading-snug break-words text-ink-700 max-sm:col-span-2">
              {notice.body}
            </p>
            <p className="text-xs leading-snug break-words text-ink-600 max-sm:col-span-2">
              {NOTICE_CHANNEL}
            </p>
          </div>
          <form action={dismissReminderAction} className="max-sm:col-start-2 max-sm:row-start-1">
            <input type="hidden" name="noticeId" value={notice.id} />
            <button type="submit" className={dismissClassName}>
              {MASCOT_MESSAGES.noticeDismiss}
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
