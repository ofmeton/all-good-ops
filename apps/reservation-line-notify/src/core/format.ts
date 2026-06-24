import type { ParsedReservation } from "./types";

function yen(n: number | null): string {
  return n == null ? "¥-" : "¥" + n.toLocaleString("en-US");
}

// アクティビティ1件 = LINE 1通。予約を集約せず単独で整形する。
export function formatSingle(p: ParsedReservation): string {
  const a = p.activity;
  const lines: string[] = [];
  lines.push("🏡 新しいアクティビティ予約（要承認）");
  lines.push("");
  lines.push(`🎯 ${a.name}`);
  lines.push(`🗓 ${a.date}${a.time ? " " + a.time : ""}`);
  if (p.participants) lines.push(`👥 ${p.participants}`);
  lines.push(`💴 ${yen(a.fee)}`);
  if (p.stay.facility) lines.push(`🏠 ${p.stay.facility}`);
  if (p.customer.name) lines.push(`👤 ${p.customer.name} 様`);
  lines.push("");
  lines.push("✅ 承認/NG はこちら:");
  lines.push(p.approvalUrl || p.dashboardUrl);
  return lines.join("\n");
}

export function formatRawFallback(subject: string, body: string): string {
  return [
    "⚠️ 予約通知メールを自動整形できませんでした（要手動確認）",
    "",
    `件名: ${subject}`,
    "",
    body,
  ].join("\n");
}
