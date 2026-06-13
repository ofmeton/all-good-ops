/** Stage 4-B2 安全境界。allowlist 外への変更が 1 ファイルでもあれば無条件 fail（部分 merge しない）。 */

export const PROMPT_SSOT_FILES = [
  "apps/x-account-system/lib/curation/compose-prompts.ts",
  "apps/x-account-system/lib/check/check-prompts.ts",
  "apps/x-account-system/lib/ingest/collector-prompts.ts",
  "apps/x-account-system/lib/optimizer-analyst/prompts.ts",
] as const;

export const CONFIG_SSOT_FILES = [
  "apps/x-account-system/lib/curation/compose-config.ts",
  "apps/x-account-system/lib/ingest/collector-config.ts",
  "apps/x-account-system/lib/check/check-config.ts",
] as const;

export const ALLOWED_SSOT_FILES = [...PROMPT_SSOT_FILES, ...CONFIG_SSOT_FILES] as const;

/** ma:render の決定的成果物（runner 自身が生成・commit する） */
export const ARTIFACT_PREFIX = "apps/x-account-system/agents/";

const ALLOWED_TEST_DIRS = [...new Set(
  ALLOWED_SSOT_FILES.map((f) => f.slice(0, f.lastIndexOf("/") + 1)),
)];

export function isFileAllowed(file: string): boolean {
  if ((ALLOWED_SSOT_FILES as readonly string[]).includes(file)) return true;
  if (file.startsWith(ARTIFACT_PREFIX)) return true;
  return file.endsWith(".test.ts") && ALLOWED_TEST_DIRS.some((d) => file.startsWith(d));
}

export function checkDiffAllowed(files: string[]): { ok: boolean; violations: string[] } {
  if (files.length === 0) return { ok: false, violations: ["<empty diff>"] };
  const violations = files.filter((f) => !isFileAllowed(f));
  return { ok: violations.length === 0, violations };
}

/** 🔒 識別子（コードの死守シンボル）。一次防御は allowlist、これは二重ベルト。 */
const DEATH_GUARD_TOKEN_RE = /FORBIDDEN_PHRASES|SAFETY_GUARDRAILS|GUARD_RULES|DEATH_GUARD/;

/** diff の変更行（+/-、ヘッダ除く）のみ検査。 */
export function hasDeathGuardTokens(diffText: string): boolean {
  return diffText.split("\n").some(
    (l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l) && DEATH_GUARD_TOKEN_RE.test(l),
  );
}

export function needsMaBootstrap(files: string[]): boolean {
  return files.some((f) => (PROMPT_SSOT_FILES as readonly string[]).includes(f));
}

export function needsWranglerDeploy(files: string[]): boolean {
  return files.some((f) => (CONFIG_SSOT_FILES as readonly string[]).includes(f));
}
