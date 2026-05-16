import { describe, it, expect, beforeEach } from "vitest";
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
