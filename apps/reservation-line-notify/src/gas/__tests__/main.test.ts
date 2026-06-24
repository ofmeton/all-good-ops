import { describe, it, expect, beforeEach, vi } from "vitest";
import { SAMPLE_ICE, SAMPLE_ICE_DUP, SAMPLE_NOSAGYO, SAMPLE_SANSAKU } from "../../core/__tests__/fixtures";
import type { RawMail } from "../../core/types";

vi.mock("../gmail");
vi.mock("../line");
vi.mock("../sheetStore");

import { ingest } from "../main";
import * as gmail from "../gmail";
import * as line from "../line";
import * as store from "../sheetStore";

let sent: Set<string>;
let processed: Set<string>;
let pushCalls: string[];
let pushReturn: boolean;

beforeEach(() => {
  sent = new Set();
  processed = new Set();
  pushCalls = [];
  pushReturn = true;

  vi.mocked(store.isProcessed).mockImplementation((m: string) => processed.has(m));
  vi.mocked(store.markProcessed).mockImplementation((m: string) => { processed.add(m); });
  vi.mocked(store.isSent).mockImplementation((d: string) => sent.has(d));
  vi.mocked(store.markSent).mockImplementation((d: string) => { sent.add(d); });
  vi.mocked(line.pushLine).mockImplementation((t: string) => {
    pushCalls.push(t);
    return pushReturn;
  });
});

function setMails(mails: RawMail[]) {
  vi.mocked(gmail.fetchUnprocessed).mockReturnValue(mails);
}

describe("ingest — アクティビティ1件=LINE1通・即時・同一r=は1通", () => {
  it("異なるアクティビティ3メール → 3通 push", () => {
    setMails([SAMPLE_ICE, SAMPLE_NOSAGYO, SAMPLE_SANSAKU]);
    ingest();
    expect(pushCalls.length).toBe(3);
    expect(sent.size).toBe(3);
    expect(processed.size).toBe(3);
  });

  it("同一 r= の重複メール2通 → 1通だけ push（冪等排除）", () => {
    setMails([SAMPLE_ICE, SAMPLE_ICE_DUP]);
    ingest();
    expect(pushCalls.length).toBe(1);
    expect(sent.size).toBe(1);
    // 重複メールも取り込み済みにはする（再取得でループしない）
    expect(processed.size).toBe(2);
  });

  it("parse 失敗メール → 生本文 fallback を1通 push", () => {
    const bad: RawMail = {
      messageId: "msg-bad-1",
      subject: "雑なメール",
      body: "マーカーを含まない本文",
      receivedAt: "2026-06-17T21:24:10+09:00",
    };
    setMails([bad]);
    ingest();
    expect(pushCalls.length).toBe(1);
    expect(pushCalls[0]).toContain("自動整形できませんでした");
    expect(processed.has("msg-bad-1")).toBe(true);
  });

  it("push 失敗 → 送信済み/処理済みにしない（次回再試行）", () => {
    pushReturn = false;
    setMails([SAMPLE_ICE]);
    ingest();
    expect(sent.size).toBe(0);
    expect(processed.has("msg-ice-1")).toBe(false);
    expect(pushCalls.length).toBe(1);
  });
});
