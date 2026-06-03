// src/env-bridge.ts
// nodejs_compat の native process.env populate を補完する defense-in-depth。
// 注意: worker entry の fetch/scheduled 冒頭で呼ぶ。lib の top-level read には間に合わない
// （その対策は該当 lib を lazy getter 化する別タスク）。
export function bridgeEnv(env: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === "string" && process.env[k] == null) process.env[k] = v;
  }
  process.env.SUPABASE_SCHEMA ??= "xad";
}
