import { parseReservationMail } from "../core/parse";
import { mergeIntoBucket } from "../core/aggregate";
import { formatSummary, formatRawFallback } from "../core/format";
import { loadBucket, saveBucket, listPending, markSent, markFailed, incrAttempt, markProcessed } from "./sheetStore";
import { fetchUnprocessed } from "./gmail";
import { pushLine } from "./line";

const GRACE_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function pollInbox(): void {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return; // 多重起動防止
  try {
    try {
      ingest();
    } catch (e) {
      console.error("ingest failed", e);
    }
    try {
      flush();
    } catch (e) {
      console.error("flush failed", e);
    }
  } finally {
    lock.releaseLock();
  }
}

function ingest(): void {
  for (const mail of fetchUnprocessed()) {
    try {
      const parsed = parseReservationMail(mail);
      if (!parsed) {
        // パース失敗: 生メールをそのままLINEへ。成功時のみ処理済み記録
        const ok = pushLine(formatRawFallback(mail.subject, mail.body));
        if (ok) markProcessed(mail.messageId);
        continue;
      }
      const merged = mergeIntoBucket(loadBucket(parsed.reservationKey), parsed);
      saveBucket(merged);
      markProcessed(mail.messageId); // 取り込み済み（バケットに保全されたので記録OK）
    } catch (e) {
      console.error(`mail ingest failed: ${mail.messageId}`, e);
    }
  }
}

function flush(): void {
  const now = Date.now();
  for (const b of listPending()) {
    if (now - new Date(b.firstSeenAt).getTime() < GRACE_MS) continue;
    const ok = pushLine(formatSummary(b));
    if (ok) {
      markSent(b.reservationKey, new Date().toISOString());
    } else {
      const attempts = incrAttempt(b.reservationKey);
      if (attempts >= MAX_ATTEMPTS) {
        const escalated = pushLine(formatRawFallback("送信失敗が継続（要手動）", JSON.stringify(b, null, 2)));
        if (escalated) markFailed(b.reservationKey);
      }
    }
  }
}

export function setupTrigger(): void {
  ScriptApp.getProjectTriggers().forEach(t => {
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
