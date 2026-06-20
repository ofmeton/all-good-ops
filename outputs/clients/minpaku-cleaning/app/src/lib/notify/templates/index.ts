import type { NotificationKind } from "@/lib/db/notifications";
import type { NotifyMessage } from "@/lib/notify";

type TemplateContext = {
  propertyName?: string | null;
  checkinDate?: string | null;
  checkoutDate?: string | null;
  guestCount?: number | null;
  previousGuestCount?: number | null;
  cleanDate?: string | null;
  staffName?: string | null;
  responseUrl?: string | null;
  shiftUrl?: string | null;
  adminUrl?: string | null;
  scheduleBlock?: string | null;
  reason?: string | null;
  items?: string | null;
};

function dateRange(ctx: TemplateContext): string {
  if (!ctx.checkinDate || !ctx.checkoutDate) return "対象予約";
  return `${ctx.checkinDate}〜${ctx.checkoutDate}`;
}

function appendLines(lines: Array<string | null | undefined>): string {
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export function buildNotificationMessage(
  kind: NotificationKind,
  ctx: TemplateContext = {},
): NotifyMessage {
  const property = ctx.propertyName ?? "物件";
  const schedule = ctx.scheduleBlock ? `\n\n今月・来月の予定\n${ctx.scheduleBlock}` : "";

  switch (kind) {
    case "request_created":
      return {
        subject: "新しい清掃依頼があります",
        text: appendLines([
          `${property} の清掃依頼です。`,
          `${dateRange(ctx)} ${ctx.guestCount ?? "?"}名`,
          ctx.responseUrl ? `回答: ${ctx.responseUrl}` : null,
          schedule,
        ]),
      };
    case "clean_confirmed":
      return {
        subject: "清掃担当が確定しました",
        text: appendLines([
          `${property} の清掃担当が確定しました。`,
          ctx.cleanDate ? `清掃日: ${ctx.cleanDate}` : null,
          `${dateRange(ctx)} ${ctx.guestCount ?? "?"}名`,
          ctx.staffName ? `担当: ${ctx.staffName}` : null,
          ctx.shiftUrl ? `シフト: ${ctx.shiftUrl}` : null,
        ]),
      };
    case "clean_passed_over":
      return {
        subject: "別の方に清掃担当が確定しました",
        text: appendLines([
          `${property} の清掃は別の方に確定しました。`,
          ctx.cleanDate ? `確定清掃日: ${ctx.cleanDate}` : null,
          ctx.shiftUrl ? `シフト: ${ctx.shiftUrl}` : null,
        ]),
      };
    case "request_changed":
      return {
        subject: "清掃依頼の人数が変更されました",
        text: appendLines([
          `${property} の清掃依頼が変更されました。`,
          `${dateRange(ctx)} ${ctx.previousGuestCount ?? "?"}名→${ctx.guestCount ?? "?"}名`,
          ctx.responseUrl ? `回答: ${ctx.responseUrl}` : null,
          ctx.shiftUrl ? `シフト: ${ctx.shiftUrl}` : null,
          schedule,
        ]),
      };
    case "request_cancelled":
      return {
        subject: "清掃依頼がキャンセルされました",
        text: appendLines([
          `${property} の清掃依頼がキャンセルされました。`,
          `${dateRange(ctx)} ${ctx.guestCount ?? "?"}名`,
          ctx.shiftUrl ? `シフト: ${ctx.shiftUrl}` : null,
          schedule,
        ]),
      };
    case "new_reservation_alert":
      return {
        subject: "確定済み清掃日より前に新しい予約があります",
        text: appendLines([
          `${property} で、確定済み清掃日より前の新規予約を検知しました。`,
          `${dateRange(ctx)} ${ctx.guestCount ?? "?"}名`,
          ctx.cleanDate ? `現在の清掃予定日: ${ctx.cleanDate}` : null,
          ctx.adminUrl ? `管理画面: ${ctx.adminUrl}` : null,
        ]),
      };
    case "unassigned_alert":
      return {
        subject: "未割当の清掃依頼があります",
        text: appendLines([
          `${property} の依頼（${dateRange(ctx)}）が未確定です。`,
          ctx.reason ? `理由: ${ctx.reason}` : null,
          ctx.adminUrl ? `管理画面: ${ctx.adminUrl}` : null,
        ]),
      };
    case "report_submitted":
      return {
        subject: "完了報告が提出されました",
        text: "スタッフから清掃の完了報告が提出されました。管理画面で内容をご確認ください。",
      };
    case "request_confirmed":
      return {
        subject: "清掃が完了しました",
        text: "管理者により清掃の確認が完了しました。詳細はオーナーURLからご覧ください。",
      };
    case "supply_requested":
      return {
        subject: "備品補充の依頼があります",
        text: `スタッフから備品補充の依頼がありました: ${ctx.items ?? ""}`,
      };
    case "reminder":
      return {
        subject: "明日の清掃リマインド",
        text: `${property} の清掃リマインドです（${dateRange(ctx)}）。`,
      };
  }
}
