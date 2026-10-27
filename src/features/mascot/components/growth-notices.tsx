import { dismissReminderAction } from "../actions";
import { MASCOT_MESSAGES } from "../messages";

/** Shorter than `noticeInApp`, with the same two facts: in-app only, no phone push. */
const NOTICE_CHANNEL = "Yalnızca uygulama içi. Telefon bildirimi yok.";

export function GrowthNotices({
  notices,
}: {
  notices: readonly { id: string; title: string; body: string }[];
}) {
  if (notices.length === 0) return null;
  return (
    <div className="mb-2 grid min-w-0 gap-2 sm:mb-3">
      {notices.map((notice) => (
        <section
          key={notice.id}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-canvas px-3 py-2 max-sm:py-1"
          aria-labelledby={`duyuru-${notice.id}`}
        >
          {/* Narrow screens keep the title beside Gizle and let the sentences use the full row. */}
          <div className="min-w-0 max-sm:contents">
            <h2
              id={`duyuru-${notice.id}`}
              className="text-sm font-bold break-words text-ink-900 max-sm:self-center"
            >
              {notice.title}
            </h2>
            <p className="min-w-0 text-sm leading-snug break-words text-ink-900 max-sm:col-span-2">
              {notice.body}
            </p>
            <p className="text-xs leading-snug break-words text-ink-600 max-sm:col-span-2">
              {NOTICE_CHANNEL}
            </p>
          </div>
          <form action={dismissReminderAction} className="max-sm:col-start-2 max-sm:row-start-1">
            <input type="hidden" name="noticeId" value={notice.id} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink-900"
            >
              {MASCOT_MESSAGES.noticeDismiss}
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
