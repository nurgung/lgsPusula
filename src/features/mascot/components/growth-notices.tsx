import { Card } from "@/components/ui/card";
import { dismissReminderAction } from "../actions";
import { MASCOT_MESSAGES } from "../messages";

export function GrowthNotices({
  notices,
}: {
  notices: readonly { id: string; title: string; body: string }[];
}) {
  if (notices.length === 0) return null;
  return (
    <div className="mb-6 grid min-w-0 gap-3">
      {notices.map((notice) => (
        <Card key={notice.id} title={notice.title}>
          <div className="grid min-w-0 gap-3">
            <p className="min-w-0 break-words text-ink-900">{notice.body}</p>
            <p className="text-sm break-words text-ink-700">
              {MASCOT_MESSAGES.noticeInApp}
            </p>
            <form action={dismissReminderAction}>
              <input type="hidden" name="noticeId" value={notice.id} />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-base font-semibold text-ink-900"
              >
                {MASCOT_MESSAGES.noticeDismiss}
              </button>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}
