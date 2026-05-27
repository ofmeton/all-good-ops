/**
 * line-flow.test.ts (PR-D Interviewer)
 *
 * Phase 0.5 fallback (IN_MEMORY_FALLBACK=true / LINE_DRY_RUN=true) で完走させる。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createSession,
  finalizeSession,
  nextQuestion,
  recordAnswer,
  sendLineMessage,
} from "./line-flow.ts";
import { parseConsent, pickPattern, renderQuestion } from "./questions.ts";
import type { Answer, InterviewSession, StepName } from "./types.ts";

// ts-jest CommonJS では __dirname がそのまま使える

// Phase 0.5 fallback を強制
beforeAll(() => {
  process.env.IN_MEMORY_FALLBACK = "true";
  process.env.LINE_DRY_RUN = "true";
});

describe("questions", () => {
  test("pickPattern returns expected pattern per step", () => {
    expect(pickPattern("kickoff", 0)).toBe("quick_recap");
    expect(pickPattern("dig_attempt", 0)).toBe("failure_recall");
    expect(pickPattern("dig_attempt", 1)).toBe("tool_drill");
    expect(pickPattern("dig_metrics", 0)).toBe("metrics_quant");
    expect(pickPattern("consent_gate", 0)).toBe("client_redact");
    expect(pickPattern("consent_gate", 1)).toBe("consent_explicit");
    expect(pickPattern("closure", 0)).toBe("details_dig");
  });

  test("renderQuestion injects industry keywords for rice_cream", () => {
    const q = renderQuestion("kickoff", "quick_recap", "rice_cream", "レジ締め自動化");
    expect(q.text).toContain("レジ締め自動化");
    expect(q.text).toMatch(/在庫管理|レジ締め|シフト/);
    expect(q.expects).toBe("free_text");
  });

  test("renderQuestion injects industry keywords for tutoring", () => {
    const q = renderQuestion("kickoff", "quick_recap", "tutoring", "教材作成");
    expect(q.text).toContain("教材作成");
    expect(q.text).toMatch(/授業準備|進捗管理|教材作成/);
  });

  test("parseConsent: granted / denied / ambiguous", () => {
    expect(parseConsent("はい")).toBe("granted");
    expect(parseConsent("OK 公開どうぞ")).toBe("granted");
    expect(parseConsent("いいえ、まだ")).toBe("denied");
    expect(parseConsent("non-public で")).toBe("denied");
    // 曖昧 → denied (フェイルセーフ)
    expect(parseConsent("うーん")).toBe("denied");
    expect(parseConsent("")).toBe("denied");
  });
});

describe("5 step flow (granted)", () => {
  let session: InterviewSession;

  beforeEach(() => {
    session = createSession({
      id: "sess_test_granted_1",
      line_user_id: "U_test",
      industry: "rice_cream",
      topic: "レジ締め自動化",
    });
  });

  test("Step 1 kickoff → question + record advances to dig_attempt", async () => {
    const q1 = await nextQuestion(session);
    expect(q1?.step).toBe("kickoff");
    expect(q1?.pattern_id).toBe("quick_recap");
    expect(q1?.text).toContain("レジ締め自動化");

    await recordAnswer(session, {
      step: "kickoff",
      pattern_id: "quick_recap",
      question_text: q1!.text,
      answer_text: "Claude にレジ締めをお願いした",
      received_at: new Date().toISOString(),
    });
    expect(session.current_step).toBe("dig_attempt");
  });

  test("all 5 steps in order, granted at step 4, finalize at step 5", async () => {
    // step 1 kickoff
    const q1 = await nextQuestion(session);
    await recordAnswer(session, makeAns(q1!.step, q1!.pattern_id, q1!.text, "Claude にレジ締めをお願いした"));
    expect(session.current_step).toBe("dig_attempt");

    // step 2 dig_attempt
    const q2 = await nextQuestion(session);
    await recordAnswer(session, makeAns(q2!.step, q2!.pattern_id, q2!.text, "ChatGPT で列ズレ、Claude に変えて解決"));
    expect(session.current_step).toBe("dig_metrics");

    // step 3 dig_metrics
    const q3 = await nextQuestion(session);
    await recordAnswer(session, makeAns(q3!.step, q3!.pattern_id, q3!.text, "30 分 → 0 分"));
    expect(session.current_step).toBe("consent_gate");

    // step 4-a consent_gate / client_redact
    const q4a = await nextQuestion(session);
    expect(q4a?.pattern_id).toBe("client_redact");
    await recordAnswer(session, makeAns(q4a!.step, q4a!.pattern_id, q4a!.text, "店名は伏せて OK"));
    expect(session.current_step).toBe("consent_gate"); // まだ explicit 未

    // step 4-b consent_gate / consent_explicit (granted)
    const q4b = await nextQuestion(session);
    expect(q4b?.pattern_id).toBe("consent_explicit");
    await recordAnswer(session, makeAns(q4b!.step, q4b!.pattern_id, q4b!.text, "はい、公開してください"));
    expect(session.current_step).toBe("closure");
    expect(session.publication_consent).toBe("granted");

    // step 5 closure
    const q5 = await nextQuestion(session);
    expect(q5?.pattern_id).toBe("details_dig");
    await recordAnswer(session, makeAns(q5!.step, q5!.pattern_id, q5!.text, "2026-06-01"));
    expect(session.finalized).toBe(true);

    // finalize
    const draft = await finalizeSession(session);
    expect(draft.publication_consent).toBe("granted");
    expect(draft.material_id).toBeTruthy();
    expect(draft.scheduled_publish_date).toBe("2026-06-01");
    expect(draft.facts.before_after).toBe("30 分 → 0 分");
  });
});

describe("5 step flow (denied)", () => {
  test("consent_explicit denied → finalize without material_id", async () => {
    const session = createSession({
      id: "sess_test_denied_1",
      line_user_id: "U_test",
      industry: "minpaku",
      topic: "リネン在庫",
    });
    // step 1-3 (free text)
    for (let i = 0; i < 3; i++) {
      const q = await nextQuestion(session);
      await recordAnswer(session, makeAns(q!.step, q!.pattern_id, q!.text, "dummy"));
    }
    expect(session.current_step).toBe("consent_gate");

    // step 4-a client_redact
    const q4a = await nextQuestion(session);
    await recordAnswer(session, makeAns(q4a!.step, q4a!.pattern_id, q4a!.text, "伏せ字 OK"));
    // step 4-b consent_explicit (denied)
    const q4b = await nextQuestion(session);
    await recordAnswer(session, makeAns(q4b!.step, q4b!.pattern_id, q4b!.text, "いいえ、まだやめておきます"));

    // 即 finalize へ
    expect(session.publication_consent).toBe("denied");
    expect(session.finalized).toBe(true);

    const draft = await finalizeSession(session);
    expect(draft.publication_consent).toBe("denied");
    expect(draft.material_id).toBeUndefined();
  });
});

describe("LINE dry-run", () => {
  test("sendLineMessage returns dry_run in fallback mode", async () => {
    const res = await sendLineMessage("U_xxxx", "hello world");
    expect(res.status).toBe("dry_run");
  });
});

describe("fixture-based smoke test", () => {
  test("sample-qa fixture has 5 answers covering full flow", () => {
    const p = join(__dirname, "__fixtures__", "sample-qa.json");
    const raw = readFileSync(p, "utf-8");
    const arr = JSON.parse(raw) as Answer[];
    expect(arr.length).toBe(5);
    const steps = arr.map((a) => a.step);
    expect(steps).toContain("kickoff");
    expect(steps).toContain("dig_attempt");
    expect(steps).toContain("dig_metrics");
    expect(steps).toContain("consent_gate");
    expect(arr[arr.length - 1].pattern_id).toBe("consent_explicit");
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function makeAns(
  step: StepName,
  pattern_id: Answer["pattern_id"],
  question_text: string,
  answer_text: string,
): Answer {
  return {
    step,
    pattern_id,
    question_text,
    answer_text,
    received_at: new Date().toISOString(),
  };
}
