import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  logNotification,
  hasSentToday,
  type NotificationChannel,
  type NotificationStatus,
} from "@/lib/db/notifications";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();

beforeEach(async () => {
  await resetDb();
  await db.from("notifications_log").delete().not("id", "is", null);
});

describe("notifications_log データアクセス", () => {
  it("logNotification は status='sent' で行を作成する", async () => {
    const row = await logNotification({
      channel: "email",
      recipient: "a@example.com",
      kind: "request_created",
      payload: { requestId: "req-1" },
      status: "sent",
    });
    expect(row.id).toBeTruthy();
    expect(row.status).toBe("sent");
  });

  it("logNotification は status='failed' でも記録する", async () => {
    const row = await logNotification({
      channel: "line",
      recipient: "U123",
      kind: "request_created",
      payload: { error: "rate_limit" },
      status: "failed",
    });
    expect(row.status).toBe("failed");
  });

  it("hasSentToday は同日内の sent を true にする", async () => {
    await logNotification({
      channel: "email",
      recipient: "a@example.com",
      kind: "reminder",
      payload: { date: "2026-06-01" },
      status: "sent",
    });
    expect(await hasSentToday("reminder", "a@example.com")).toBe(true);
  });

  it("hasSentToday は status='failed' は重複扱いにしない", async () => {
    await logNotification({
      channel: "email",
      recipient: "a@example.com",
      kind: "reminder",
      payload: {},
      status: "failed",
    });
    expect(await hasSentToday("reminder", "a@example.com")).toBe(false);
  });

  it("hasSentToday は別 recipient は別カウント", async () => {
    await logNotification({
      channel: "email",
      recipient: "a@example.com",
      kind: "reminder",
      payload: {},
      status: "sent",
    });
    expect(await hasSentToday("reminder", "b@example.com")).toBe(false);
  });
});

// Vercel サーバは UTC 稼働。JST 00:00〜09:00（= UTC 前日 15:00〜24:00）の間に
// 当日の境界判定を UTC で行うと「JST では今日」のログを取りこぼし、冪等性が壊れる。
describe("hasSentToday の JST 日付境界（ランタイム TZ 非依存）", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("JST 当日早朝に送信済みのログ（UTC では前日）を同日と判定する", async () => {
    await resetDb();
    await db.from("notifications_log").delete().not("id", "is", null);

    // 現在時刻を 2026-06-06 12:00 JST（= 03:00 UTC）に固定
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-06T03:00:00Z"));

    // JST 2026-06-06 05:00（= 2026-06-05 20:00 UTC）に送信済み = JST では「今日」
    await db.from("notifications_log").insert({
      channel: "email",
      recipient: "tz@example.com",
      kind: "reminder",
      payload: { date: "2026-06-06" },
      status: "sent",
      sent_at: "2026-06-05T20:00:00Z",
    });

    expect(await hasSentToday("reminder", "tz@example.com")).toBe(true);
  });
});
