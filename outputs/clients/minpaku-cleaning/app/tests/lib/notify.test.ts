import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// 外部 IO は完全モック
vi.mock("@/lib/line", () => ({ pushLineMessage: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendMail: vi.fn() }));

import { notify } from "@/lib/notify";
import { pushLineMessage } from "@/lib/line";
import { sendMail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();
const pushLineMock = pushLineMessage as unknown as Mock;
const sendMailMock = sendMail as unknown as Mock;

beforeEach(async () => {
  await resetDb();
  await db.from("notifications_log").delete().not("id", "is", null);
  pushLineMock.mockReset();
  sendMailMock.mockReset();
});

describe("notify", () => {
  it("kind が request_created（LINE 対象）かつ line_user_id があれば LINE で送信する", async () => {
    pushLineMock.mockResolvedValue(undefined);
    await notify(
      "request_created",
      [{ line_user_id: "U1", email: "x@example.com", key: "staff:s1" }],
      { subject: "新規依頼", text: "..." },
      { requestId: "r1" },
    );
    expect(pushLineMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).not.toHaveBeenCalled();
    const { data: logs } = await db.from("notifications_log").select("*");
    expect(logs).toHaveLength(1);
    expect(logs![0].channel).toBe("line");
    expect(logs![0].status).toBe("sent");
  });

  it("kind が LINE 対象外（reminder）なら line_user_id があってもメール直行", async () => {
    sendMailMock.mockResolvedValue(undefined);
    await notify(
      "reminder",
      [{ line_user_id: "U1", email: "x@example.com", key: "staff:s1" }],
      { subject: "明日の予定", text: "..." },
      {},
    );
    expect(pushLineMock).not.toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const { data: logs } = await db.from("notifications_log").select("*");
    expect(logs).toHaveLength(1);
    expect(logs![0].channel).toBe("email");
    expect(logs![0].status).toBe("sent");
  });

  it("request_created で LINE 失敗時はメールにフォールバックする", async () => {
    pushLineMock.mockRejectedValue(new Error("LINE rate limit"));
    sendMailMock.mockResolvedValue(undefined);
    await notify(
      "request_created",
      [{ line_user_id: "U1", email: "x@example.com", key: "staff:s1" }],
      { subject: "S", text: "T" },
      {},
    );
    expect(pushLineMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const { data: logs } = await db
      .from("notifications_log").select("*").order("sent_at", { ascending: true });
    expect(logs).toHaveLength(2);
    expect(logs![0].status).toBe("failed");
    expect(logs![0].channel).toBe("line");
    expect(logs![1].status).toBe("sent");
    expect(logs![1].channel).toBe("email");
  });

  it("LINE も email も無ければ skipped を記録する", async () => {
    await notify(
      "request_created",
      [{ line_user_id: null, email: null, key: "staff:s1" }],
      { subject: "S", text: "T" },
      {},
    );
    expect(pushLineMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
    const { data: logs } = await db.from("notifications_log").select("*");
    expect(logs).toHaveLength(1);
    expect(logs![0].status).toBe("skipped");
  });

  it("dedupeToday=true は同日内の同 kind+recipient 重複を抑制する", async () => {
    sendMailMock.mockResolvedValue(undefined);
    // dedupe テストは LINE 対象外の reminder（=メール経路）で行う
    await notify(
      "reminder",
      [{ line_user_id: null, email: "x@example.com", key: "staff:s1" }],
      { subject: "明日の予定", text: "..." },
      {},
      { dedupeToday: true },
    );
    await notify(
      "reminder",
      [{ line_user_id: null, email: "x@example.com", key: "staff:s1" }],
      { subject: "明日の予定", text: "..." },
      {},
      { dedupeToday: true },
    );
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const { data: logs } = await db
      .from("notifications_log").select("status").order("sent_at", { ascending: true });
    expect(logs?.map((l) => l.status)).toEqual(["sent", "skipped"]);
  });

  it("複数受信者を並行に処理する（request_created で1人 LINE 失敗が他に影響しない）", async () => {
    pushLineMock
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValueOnce(undefined);
    sendMailMock.mockResolvedValue(undefined);
    await notify(
      "request_created",
      [
        { line_user_id: "U1", email: "a@example.com", key: "staff:1" },
        { line_user_id: "U2", email: "b@example.com", key: "staff:2" },
      ],
      { subject: "S", text: "T" },
      {},
    );
    // 1人目: LINE失敗→email成功（ログ2件）、2人目: LINE成功（ログ1件）= 計3件
    const { data: logs } = await db.from("notifications_log").select("*");
    expect(logs).toHaveLength(3);
    const sent = logs!.filter((l) => l.status === "sent");
    expect(sent).toHaveLength(2);
  });
});
