/**
 * scheduled-publish の実行トレース記録。
 *
 * scheduled-publish (chrome-devtools 予約投稿) は Worker の外 (人 + Claude セッション) で
 * 動くため、他工程のように queue consumer が run_trace を書けない。そこで予約登録後に
 * このヘルパーを呼び、xad.run / xad.run_trace に「予約セッション」を1 run + N trace で
 * 記録する。これで観測ダッシュボードの scheduled-publish ノードで実行の中身
 * (どの draft を / いつの予約に / どの識別子で 登録したか) が見えるようになる。
 *
 * 他工程と同じ trace-store (insertRun/insertTrace) を使い、fail-open を踏襲。
 */
import { insertRun, insertTrace } from "./trace-store.js";

export interface ScheduledReservation {
  /** post_drafts.id */
  draftId: string;
  /** 予約公開時刻 (ISO / timestamptz 文字列) */
  scheduledFor: string;
  /** X 予約投稿の識別子 (post_drafts.scheduled_post_id) */
  scheduledPostId?: string;
  /** 写真添付の DL 解決結果 (media-fetch の uploaded/skipped 件数)。観測・再試行用。 */
  attachmentsResolved?: { uploaded: number; skipped: number };
}

export interface RecordScheduledPublishDeps {
  insertRun: typeof insertRun;
  insertTrace: typeof insertTrace;
  now: () => Date;
  newRunId: () => string;
}

const defaultDeps: RecordScheduledPublishDeps = {
  insertRun,
  insertTrace,
  now: () => new Date(),
  newRunId: () => crypto.randomUUID(),
};

/**
 * 予約登録セッションを 1 run (job=scheduled-publish, trigger=manual) + 予約 1 件ごとの
 * stage trace (stageId=scheduled-publish, outcome=scheduled) として記録する。
 * @returns 作成した runId
 */
export async function recordScheduledPublish(
  reservations: ScheduledReservation[],
  deps: Partial<RecordScheduledPublishDeps> = {},
): Promise<string> {
  const d = { ...defaultDeps, ...deps };
  const now = d.now();
  const runId = d.newRunId();
  // Asia/Tokyo の YYYY-MM-DD (他 run と同じく JST 基準)
  const date = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  await d.insertRun({
    id: runId,
    job: "scheduled-publish",
    trigger: "manual",
    date,
    status: "ok",
    attempt: 1,
  });

  for (const r of reservations) {
    await d.insertTrace({
      runId,
      stageId: "scheduled-publish",
      status: "ok",
      outcome: "scheduled",
      startedAt: now,
      input: { draftId: r.draftId },
      output: {
        scheduledFor: r.scheduledFor,
        scheduledPostId: r.scheduledPostId ?? null,
        attachmentsResolved: r.attachmentsResolved ?? null,
      },
    });
  }

  return runId;
}
