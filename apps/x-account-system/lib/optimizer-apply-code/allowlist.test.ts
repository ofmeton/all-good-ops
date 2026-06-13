import {
  PROMPT_SSOT_FILES, CONFIG_SSOT_FILES, ALLOWED_SSOT_FILES,
  isFileAllowed, checkDiffAllowed, hasDeathGuardTokens,
  needsMaBootstrap, needsWranglerDeploy,
} from "./allowlist.ts";

describe("allowlist 構成", () => {
  it("SSOT は 7 ファイル（prompt4 + config3）", () => {
    expect(PROMPT_SSOT_FILES).toHaveLength(4);
    expect(CONFIG_SSOT_FILES).toHaveLength(3);
    expect(ALLOWED_SSOT_FILES).toHaveLength(7);
  });
  it("guards.ts / bootstrap-core.ts / editor / migrations は不許可", () => {
    for (const f of [
      "apps/x-account-system/lib/optimizer/guards.ts",
      "apps/x-account-system/lib/ma/bootstrap-core.ts",
      "apps/x-account-system/lib/editor/pipeline.ts",
      "apps/x-account-system/migrations/0025_x.sql",
      "apps/x-account-system/src/worker.ts",
    ]) expect(isFileAllowed(f)).toBe(false);
  });
  it("SSOT 7ファイル・render成果物・同dirテストは許可", () => {
    expect(isFileAllowed("apps/x-account-system/lib/curation/compose-prompts.ts")).toBe(true);
    expect(isFileAllowed("apps/x-account-system/agents/writer.system.md")).toBe(true);
    expect(isFileAllowed("apps/x-account-system/lib/check/check-prompts.test.ts")).toBe(true);
  });
  it("同dirでも .test.ts 以外の別ファイルは不許可", () => {
    expect(isFileAllowed("apps/x-account-system/lib/curation/compose.ts")).toBe(false);
  });
});

describe("checkDiffAllowed", () => {
  it("全許可なら ok", () => {
    expect(checkDiffAllowed([
      "apps/x-account-system/lib/ingest/collector-config.ts",
      "apps/x-account-system/lib/ingest/collector-config.test.ts",
    ]).ok).toBe(true);
  });
  it("1 ファイルでも逸脱したら fail（部分 merge しない）", () => {
    const r = checkDiffAllowed([
      "apps/x-account-system/lib/ingest/collector-config.ts",
      "apps/x-account-system/lib/optimizer/guards.ts",
    ]);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["apps/x-account-system/lib/optimizer/guards.ts"]);
  });
  it("空 diff は fail", () => {
    const r = checkDiffAllowed([]);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["<empty diff>"]);
  });
});

describe("hasDeathGuardTokens（変更行のみ検査）", () => {
  it("追加行に FORBIDDEN_PHRASES / SAFETY_GUARDRAILS / GUARD_RULES があれば true", () => {
    expect(hasDeathGuardTokens("+ import { FORBIDDEN_PHRASES } from './x'")).toBe(true);
    expect(hasDeathGuardTokens("- const a = SAFETY_GUARDRAILS")).toBe(true);
    expect(hasDeathGuardTokens("+const r = GUARD_RULES.find(x)")).toBe(true);
  });
  it("コンテキスト行（先頭スペース）や diff ヘッダは対象外", () => {
    expect(hasDeathGuardTokens(" const a = GUARD_RULES // 既存行")).toBe(false);
    expect(hasDeathGuardTokens("+++ b/lib/optimizer/GUARD_RULES.ts")).toBe(false);
  });
  it("無関係な変更行は false", () => {
    expect(hasDeathGuardTokens("+ watchlist: [...old, 'new_source'],")).toBe(false);
  });
});

describe("deploy 分岐判定", () => {
  it("prompt ファイル変更 → ma:bootstrap 要", () => {
    expect(needsMaBootstrap(["apps/x-account-system/lib/check/check-prompts.ts"])).toBe(true);
    expect(needsMaBootstrap(["apps/x-account-system/lib/check/check-config.ts"])).toBe(false);
  });
  it("config ファイル変更 → wrangler 要", () => {
    expect(needsWranglerDeploy(["apps/x-account-system/lib/check/check-config.ts"])).toBe(true);
    expect(needsWranglerDeploy(["apps/x-account-system/lib/check/check-prompts.ts"])).toBe(false);
  });
});
