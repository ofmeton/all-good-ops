import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { pushLineMessage } from "@/lib/line";
import { sendMail } from "@/lib/email";
import {
  logNotification,
  hasSentToday,
  type NotificationKind,
} from "@/lib/db/notifications";

export type NotifyRecipient = {
  line_user_id: string | null;
  email: string | null;
  // 冪等性・ログのための安定キー（例: "staff:<uuid>" / "admin:<uuid>" / "owner:<uuid>"）
  key: string;
};

export type NotifyMessage = { subject: string; text: string };

// LINE で送る kind を絞る（LINE 無料枠 200通/月 維持のため）。
// request_created のみ LINE 対象（依頼作成 → 担当スタッフへの即時通知。
// 納品先業務で「調整時間」がボトルネックのため即時性を投資する）。
// 他は line_user_id があってもメールに直行する。
const LINE_ENABLED_KINDS = new Set<NotificationKind>(["request_created"]);

// 1名に LINE→Email の優先順で送信。LINE 失敗時はメールにフォールバックする。
// kind が LINE 対象外 (LINE_ENABLED_KINDS 外) のときは LINE をスキップして即メール。
// dedupeToday=true なら同 kind+recipient.key の status='sent' が当日内にあれば skipped で記録する。
async function notifyOne(
  kind: NotificationKind,
  recipient: NotifyRecipient,
  message: NotifyMessage,
  payload: Record<string, unknown>,
  dedupeToday: boolean,
): Promise<void> {
  if (dedupeToday && (await hasSentToday(kind, recipient.key))) {
    await logNotification({
      channel: recipient.line_user_id ? "line" : "email",
      recipient: recipient.key,
      kind,
      payload: { ...payload, skipped_reason: "duplicate_today" },
      status: "skipped",
    });
    return;
  }

  if (recipient.line_user_id && LINE_ENABLED_KINDS.has(kind)) {
    try {
      await pushLineMessage(
        recipient.line_user_id,
        `${message.subject}\n${message.text}`,
      );
      await logNotification({
        channel: "line",
        recipient: recipient.key,
        kind,
        payload,
        status: "sent",
      });
      return;
    } catch (e) {
      await logNotification({
        channel: "line",
        recipient: recipient.key,
        kind,
        payload: { ...payload, error: (e as Error).message },
        status: "failed",
      });
      // メールにフォールバック
    }
  }

  if (recipient.email) {
    try {
      await sendMail(recipient.email, message.subject, message.text);
      await logNotification({
        channel: "email",
        recipient: recipient.key,
        kind,
        payload,
        status: "sent",
      });
      return;
    } catch (e) {
      await logNotification({
        channel: "email",
        recipient: recipient.key,
        kind,
        payload: { ...payload, error: (e as Error).message },
        status: "failed",
      });
      return;
    }
  }

  // LINE も email も未登録
  await logNotification({
    channel: "email",
    recipient: recipient.key,
    kind,
    payload: { ...payload, skipped_reason: "no_contact" },
    status: "skipped",
  });
}

// 複数受信者に並行送信。1人の失敗が他に波及しない（Promise.allSettled）。
export async function notify(
  kind: NotificationKind,
  recipients: NotifyRecipient[],
  message: NotifyMessage,
  payload: Record<string, unknown> = {},
  opts: { dedupeToday?: boolean } = {},
): Promise<void> {
  await Promise.allSettled(
    recipients.map((r) =>
      notifyOne(kind, r, message, payload, opts.dedupeToday ?? false),
    ),
  );
}

// ---- 受信者解決ヘルパー ----

// 指定された staff ID 群を受信者形式で取得。
export async function resolveStaffRecipients(
  staffIds: string[],
): Promise<NotifyRecipient[]> {
  if (staffIds.length === 0) return [];
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff")
    .select("id, line_user_id, email")
    .in("id", staffIds);
  if (error) throw error;
  return (data ?? []).map((s) => ({
    line_user_id: s.line_user_id,
    email: s.email,
    key: `staff:${s.id}`,
  }));
}

// 全管理者を受信者形式で取得（管理者は LINE 不使用、email のみ）。
export async function resolveAllAdmins(): Promise<NotifyRecipient[]> {
  const db = createServiceClient();
  const { data, error } = await db.from("admins").select("id, email");
  if (error) throw error;
  return (data ?? []).map((a) => ({
    line_user_id: null,
    email: a.email,
    key: `admin:${a.id}`,
  }));
}

// 物件のオーナーを受信者形式で取得（オーナーは LINE/Email 両方あり得る）。
export async function resolveOwnerForProperty(
  propertyId: string,
): Promise<NotifyRecipient | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("properties")
    .select("owner_id, owners(id, line_user_id, email)")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  const owner = (data?.owners as unknown) as
    | { id: string; line_user_id: string | null; email: string | null }
    | null;
  if (!owner) return null;
  return {
    line_user_id: owner.line_user_id,
    email: owner.email,
    key: `owner:${owner.id}`,
  };
}

// 物件の担当スタッフ全員を受信者形式で取得。
export async function resolveStaffForProperty(
  propertyId: string,
): Promise<NotifyRecipient[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff_assignments")
    .select("staff:staff_id(id, line_user_id, email)")
    .eq("property_id", propertyId);
  if (error) throw error;
  return (data ?? [])
    .map(
      (row) =>
        row.staff as unknown as {
          id: string;
          line_user_id: string | null;
          email: string | null;
        } | null,
    )
    .filter(
      (s): s is { id: string; line_user_id: string | null; email: string | null } =>
        s !== null,
    )
    .map((s) => ({
      line_user_id: s.line_user_id,
      email: s.email,
      key: `staff:${s.id}`,
    }));
}
