import { dismissReminderAction } from "../actions";
import { NoticeIcon } from "./notice-icon";
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
          className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2 rounded-card border border-border border-l-4 border-l-brand-600 bg-surface px-3 py-3 shadow-soft"
          aria-labelledby={`duyuru-${notice.id}`}
        >
          <NoticeIcon tone="brand" />
          <div className="min-w-0 flex-1 basis-48">
            <h2
              id={`duyuru-${notice.id}`}
              className="text-helper font-bold break-words text-ink-900"
            >
              {notice.title}
            </h2>
            <p className="min-w-0 text-helper leading-snug break-words text-ink-700">
              {notice.body}
            </p>
            <p className="text-xs leading-snug break-words text-ink-600">
              {NOTICE_CHANNEL}
            </p>
          </div>
          <form action={dismissReminderAction} className="max-sm:basis-full max-sm:pl-12">
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
