import type { Bucket } from "../core/types";

const HEADERS = [
  "reservation_key", "first_seen_at", "customer_json", "stay_json",
  "activities_json", "dashboard_url", "message_ids", "status", "attempts", "sent_at",
];
const PROCESSED_HEADERS = ["message_id", "processed_at"];

function sheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("SHEET_ID プロパティ未設定");
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName("state");
  if (!sh) {
    sh = ss.insertSheet("state");
    sh.appendRow(HEADERS);
  }
  return sh;
}

function processedSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("SHEET_ID プロパティ未設定");
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName("processed");
  if (!sh) {
    sh = ss.insertSheet("processed");
    sh.appendRow(PROCESSED_HEADERS);
  }
  return sh;
}

function rowToBucket(row: any[]): Bucket {
  return {
    reservationKey: String(row[0]),
    firstSeenAt: String(row[1]),
    customer: JSON.parse(row[2] || "{}"),
    stay: JSON.parse(row[3] || "{}"),
    activities: JSON.parse(row[4] || "[]"),
    dashboardUrl: String(row[5] || ""),
    messageIds: String(row[6] || "").split(",").filter(Boolean),
  };
}

function bucketToRow(b: Bucket, status: string, attempts: number, sentAt: string): any[] {
  return [
    b.reservationKey, b.firstSeenAt, JSON.stringify(b.customer), JSON.stringify(b.stay),
    JSON.stringify(b.activities), b.dashboardUrl, b.messageIds.join(","),
    status, attempts, sentAt,
  ];
}

function findRowIndex(sh: GoogleAppsScript.Spreadsheet.Sheet, key: string): number {
  if (sh.getLastRow() < 2) return -1;
  const keys = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < keys.length; i++) if (String(keys[i][0]) === key) return i + 2;
  return -1;
}

export function loadBucket(key: string): Bucket | null {
  const sh = sheet();
  const r = findRowIndex(sh, key);
  if (r < 0) return null;
  return rowToBucket(sh.getRange(r, 1, 1, HEADERS.length).getValues()[0]);
}

export function saveBucket(b: Bucket): void {
  const sh = sheet();
  const r = findRowIndex(sh, b.reservationKey);
  if (r < 0) {
    sh.appendRow(bucketToRow(b, "pending", 0, ""));
  } else {
    const cur = sh.getRange(r, 1, 1, HEADERS.length).getValues()[0];
    const status = String(cur[7]) === "sent" ? "sent" : "pending";
    sh.getRange(r, 1, 1, HEADERS.length).setValues([bucketToRow(b, status, Number(cur[8] || 0), String(cur[9] || ""))]);
  }
}

export function listPending(): Bucket[] {
  const sh = sheet();
  const n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  const rows = sh.getRange(2, 1, n, HEADERS.length).getValues();
  return rows.filter(r => String(r[7]) === "pending").map(rowToBucket);
}

export function markSent(key: string, sentAtIso: string): void {
  const sh = sheet();
  const r = findRowIndex(sh, key);
  if (r < 0) return;
  sh.getRange(r, 8).setValue("sent");
  sh.getRange(r, 10).setValue(sentAtIso);
}

export function markFailed(key: string): void {
  const sh = sheet();
  const r = findRowIndex(sh, key);
  if (r >= 0) sh.getRange(r, 8).setValue("failed");
}

export function incrAttempt(key: string): number {
  const sh = sheet();
  const r = findRowIndex(sh, key);
  if (r < 0) return 0;
  const n = Number(sh.getRange(r, 9).getValue() || 0) + 1;
  sh.getRange(r, 9).setValue(n);
  return n;
}

export function isProcessed(messageId: string): boolean {
  const sh = processedSheet();
  if (sh.getLastRow() < 2) return false;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  return rows.some(row => String(row[0]) === messageId);
}

export function markProcessed(messageId: string): void {
  if (isProcessed(messageId)) return;
  processedSheet().appendRow([messageId, new Date().toISOString()]);
}
