import { parseReservationMail } from "../core/parse";
import { formatSingle, formatRawFallback } from "../core/format";
import { markProcessed, isSent, markSent } from "./sheetStore";
import { fetchUnprocessed } from "./gmail";
import { pushLine } from "./line";

export function pollInbox(): void {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return; // 多重起動防止
  try {
    ingest();
  } catch (e) {
    console.error("ingest failed", e);
  } finally {
    lock.releaseLock();
  }
}

// アクティビティ（メール）1件 = LINE 1通。検知次第その場で即送信し、集約・グレースは行わない。
// 同一 r=（dedup_id）の重複メールは送信済み記録で1通に抑える。
export function ingest(): void {
  for (const mail of fetchUnprocessed()) {
    try {
      const parsed = parseReservationMail(mail);
      if (parsed && isSent(parsed.activity.dedupId)) {
        // 同一 r= の重複メール: 既に送信済みなので push せず取り込みのみ記録
        markProcessed(mail.messageId);
        continue;
      }
      const text = parsed ? formatSingle(parsed) : formatRawFallback(mail.subject, mail.body);
      const ok = pushLine(text);
      if (ok) {
        if (parsed) markSent(parsed.activity.dedupId);
        markProcessed(mail.messageId);
      }
    } catch (e) {
      console.error(`mail handle failed: ${mail.messageId}`, e);
    }
  }
}

export function setupTrigger(): void {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === "pollInbox") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("pollInbox").timeBased().everyMinutes(1).create();
}

// LINEグループ招待後、Webhookで一度だけ groupId を確認するための補助
export function doPost(e: any): void {
  console.log(JSON.stringify(e));
}

// esbuild バンドル後、GAS から呼べるよう globalThis に露出
(globalThis as any).pollInbox = pollInbox;
(globalThis as any).setupTrigger = setupTrigger;
(globalThis as any).doPost = doPost;
