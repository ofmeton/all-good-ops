import type { RawMail, ParsedReservation, Activity } from "./types";

const MARKER = "アクティビティ予約が入りました";

export function extractField(body: string, label: string): string {
  // 例: "■ アクティビティ: 棚田..." の値部分を取る
  const re = new RegExp("■\\s*" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*(.*)");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

export function parseFee(raw: string): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[,，]/g, "").match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

export function extractReservationKey(body: string): string | null {
  const full = extractDedupId(body);
  if (!full) return null;
  return full.split("_")[0] || null;
}

export function extractDedupId(body: string): string | null {
  // 承認URL（dashboard=1 を含まない方）の r= を取る
  const m = body.match(/[?&]r=([^&\s]+)/);
  if (!m) return null;
  // %20 などをデコードし、空白を除去して正規化
  let v: string;
  try { v = decodeURIComponent(m[1]); } catch { v = m[1]; }
  return v.replace(/\s+/g, "").trim();
}

function extractDashboardUrl(body: string): string {
  const m = body.match(/https:\/\/\S*dashboard=1\S*/);
  return m ? m[0] : "";
}

export function parseReservationMail(mail: RawMail): ParsedReservation | null {
  const body = mail.body;
  if (!body.includes(MARKER)) return null;

  const reservationKey = extractReservationKey(body);
  const dedupId = extractDedupId(body);
  const name = extractField(body, "アクティビティ");
  if (!name) return null; // 予約メール形だがアクティビティ不明＝パース失敗扱い

  // reservationKey 取得不能時は補助キーへフォールバック（氏名+メール+宿泊開始日）
  const custName = extractField(body, "氏名");
  const email = extractField(body, "メールアドレス");
  const period = extractField(body, "宿泊期間");
  const fallbackKey = [custName, email, period.split("〜")[0].trim()].join("|");

  const activity: Activity = {
    dedupId: dedupId ?? `${fallbackKey}|${name}`,
    name,
    date: extractField(body, "日付"),
    time: extractField(body, "開催時間"),
    fee: parseFee(extractField(body, "料金")),
  };

  return {
    reservationKey: reservationKey ?? fallbackKey,
    customer: { name: custName, phone: extractField(body, "電話"), email },
    stay: {
      facility: extractField(body, "宿泊施設"),
      period,
      headcount: extractField(body, "宿泊人数"),
    },
    activity,
    dashboardUrl: extractDashboardUrl(body),
    messageId: mail.messageId,
    receivedAt: mail.receivedAt,
  };
}
