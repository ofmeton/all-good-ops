import "server-only";
import { createServiceClient } from "@/lib/supabase-server";

export type NotificationChannel = "line" | "email";
export type NotificationStatus = "queued" | "sent" | "failed" | "skipped";

export type NotificationKind =
  | "request_created"     // 依頼作成 → スタッフ
  | "report_submitted"    // 完了報告 → 管理者
  | "request_confirmed"   // 確認完了 → オーナー
  | "supply_requested"    // 備品補充 → 管理者・オーナー
  | "reminder"            // 前日17:00 リマインド → スタッフ
  | "unassigned_alert";   // 24h 未割当 → 管理者・オーナー

export type LogNotificationInput = {
  channel: NotificationChannel;
  recipient: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  status: NotificationStatus;
};

export type NotificationLog = {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  kind: string;
  payload: Record<string, unknown> | null;
  status: NotificationStatus;
  sent_at: string;
};

// 通知ログを1行記録する。送信成功・失敗・スキップいずれも記録する。
export async function logNotification(
  input: LogNotificationInput,
): Promise<NotificationLog> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("notifications_log")
    .insert({
      channel: input.channel,
      recipient: input.recipient,
      kind: input.kind,
      payload: input.payload,
      status: input.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data as NotificationLog;
}

// 同一 kind+recipient で当日中に status='sent' のログがあるか。
// 冪等性: Cron 系の繰り返し送信（リマインド・アラート）の重複を防ぐ。
export async function hasSentToday(
  kind: NotificationKind,
  recipient: string,
): Promise<boolean> {
  const db = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await db
    .from("notifications_log")
    .select("id")
    .eq("kind", kind)
    .eq("recipient", recipient)
    .eq("status", "sent")
    .gte("sent_at", today.toISOString())
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
