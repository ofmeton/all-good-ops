// 状態シート:
//   processed : message_id, processed_at … 取り込み済みメール（再取得時のスキップ）
//   sent      : dedup_id, sent_at        … 送信済みアクティビティ（同一 r= の重複メールを1通に抑える）
const PROCESSED_HEADERS = ["message_id", "processed_at"];
const SENT_HEADERS = ["dedup_id", "sent_at"];

function sheetByName(name: string, headers: string[]): GoogleAppsScript.Spreadsheet.Sheet {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("SHEET_ID プロパティ未設定");
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function processedSheet() { return sheetByName("processed", PROCESSED_HEADERS); }
function sentSheet() { return sheetByName("sent", SENT_HEADERS); }

export function isProcessed(messageId: string): boolean {
  const sh = processedSheet();
  if (sh.getLastRow() < 2) return false;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  return rows.some((row) => String(row[0]) === messageId);
}

export function markProcessed(messageId: string): void {
  if (isProcessed(messageId)) return;
  processedSheet().appendRow([messageId, new Date().toISOString()]);
}

export function isSent(dedupId: string): boolean {
  const sh = sentSheet();
  if (sh.getLastRow() < 2) return false;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  return rows.some((row) => String(row[0]) === dedupId);
}

export function markSent(dedupId: string): void {
  if (isSent(dedupId)) return;
  sentSheet().appendRow([dedupId, new Date().toISOString()]);
}
