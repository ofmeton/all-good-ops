import type { RawMail } from "../core/types";
import { isProcessed } from "./sheetStore";

function prop(k: string): string {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error(k + " プロパティ未設定");
  return v;
}

export function fetchUnprocessed(): RawMail[] {
  const query = prop("GMAIL_QUERY"); // 例: 'from:roopt subject:アクティビティ予約 newer_than:7d'
  const threads = GmailApp.search(query, 0, 50);
  const out: RawMail[] = [];
  for (const t of threads) {
    for (const m of t.getMessages()) {
      if (isProcessed(m.getId())) continue;
      out.push({
        messageId: m.getId(),
        subject: m.getSubject(),
        body: m.getPlainBody(),
        receivedAt: m.getDate().toISOString(),
      });
    }
  }
  return out;
}
