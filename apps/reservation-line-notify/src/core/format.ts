import type { Bucket } from "./types";

function yen(n: number | null): string {
  return n == null ? "¥-" : "¥" + n.toLocaleString("en-US");
}

export function formatSummary(b: Bucket): string {
  const lines: string[] = [];
  lines.push("🏡 新しいアクティビティ予約（要承認）");
  lines.push("");
  lines.push(`👤 ${b.customer.name} 様 / ${b.stay.headcount}（宿泊人数）`);
  lines.push(`🏠 ${b.stay.facility}`);
  lines.push(`🗓 宿泊 ${b.stay.period}`);
  lines.push("");
  lines.push(`🎯 リクエストされた体験（${b.activities.length}件）`);
  for (const a of b.activities) {
    lines.push(` ・${a.name}  ${a.date} ${a.time}  ${yen(a.fee)}`);
  }
  const total = b.activities.reduce((s, a) => s + (a.fee ?? 0), 0);
  lines.push(`💴 合計 ${yen(total)}（料金記載分のみ）`);
  lines.push("");
  lines.push("✅ 承認/NG・予約一覧:");
  lines.push(b.dashboardUrl);
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
