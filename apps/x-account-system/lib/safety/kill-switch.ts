/**
 * kill-switch (PR-D)
 *
 * LINE webhook で `!stop` を受信したら 48 時間全停止。`!resume` で即時復帰。
 * 48h 経過で自動復帰。
 *
 * 状態は Supabase `safety_state` テーブル (scope='global') で管理する想定。
 * Phase 0.5 fallback では in-memory Map。
 *
 * publishing_enabled=false の時、Publisher 系は send 直前にこの flag を check して abort。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const STOP_CMD = "!stop";
const RESUME_CMD = "!resume";
const DEFAULT_HOURS = 48;

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (
    !_supabase &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: process.env.SUPABASE_SCHEMA || "public" } },
    );
  }
  return _supabase;
}

// In-memory fallback state
const inMemoryState: {
  publishing_enabled: boolean;
  resume_at: string | null;
  triggered_by: string | null;
  updated_at: string;
} = {
  publishing_enabled: true,
  resume_at: null,
  triggered_by: null,
  updated_at: new Date().toISOString(),
};

export interface KillSwitchState {
  publishing_enabled: boolean;
  /** ISO timestamp で自動復帰時刻. null = 永続停止 or 既に有効. */
  resume_at: string | null;
  triggered_by: string | null;
  updated_at: string;
}

export async function getKillSwitchState(): Promise<KillSwitchState> {
  const sb = getSupabase();
  if (!sb) {
    // 自動復帰判定 (in-memory)
    if (
      inMemoryState.resume_at &&
      new Date(inMemoryState.resume_at).getTime() <= Date.now()
    ) {
      inMemoryState.publishing_enabled = true;
      inMemoryState.resume_at = null;
    }
    return { ...inMemoryState };
  }
  const { data, error } = await sb
    .from("safety_state")
    .select("publishing_enabled, resume_at, triggered_by, updated_at")
    .eq("scope", "global")
    .maybeSingle();
  if (error || !data) {
    return {
      publishing_enabled: true,
      resume_at: null,
      triggered_by: null,
      updated_at: new Date().toISOString(),
    };
  }
  // auto-resume check
  if (
    data.resume_at &&
    new Date(data.resume_at).getTime() <= Date.now()
  ) {
    await resumeKillSwitch("auto_after_48h");
    return await getKillSwitchState();
  }
  return data as KillSwitchState;
}

/**
 * LINE webhook 等から呼ばれる: 命令 `!stop` / `!resume` を解釈して state 更新。
 * @returns 状態変化があれば diff、変化なければ undefined
 */
export async function handleLineCommand(
  text: string,
  fromUser: string,
): Promise<{
  command: "stop" | "resume" | "noop";
  state: KillSwitchState;
}> {
  const t = text.trim().toLowerCase();
  if (t === STOP_CMD) {
    await triggerKillSwitch(fromUser, DEFAULT_HOURS);
    return { command: "stop", state: await getKillSwitchState() };
  }
  if (t === RESUME_CMD) {
    await resumeKillSwitch(fromUser);
    return { command: "resume", state: await getKillSwitchState() };
  }
  return { command: "noop", state: await getKillSwitchState() };
}

/**
 * publishing_enabled=false に設定し、`hours` 後に自動復帰を仕込む。
 */
export async function triggerKillSwitch(
  triggeredBy: string,
  hours: number = DEFAULT_HOURS,
): Promise<KillSwitchState> {
  const now = new Date();
  const resumeAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  const next: KillSwitchState = {
    publishing_enabled: false,
    resume_at: resumeAt,
    triggered_by: triggeredBy,
    updated_at: now.toISOString(),
  };

  const sb = getSupabase();
  if (!sb) {
    Object.assign(inMemoryState, next);
    return { ...inMemoryState };
  }
  await sb.from("safety_state").upsert(
    {
      scope: "global",
      ...next,
    },
    { onConflict: "scope" },
  );
  return next;
}

/**
 * publishing_enabled=true に戻す (手動 or auto)。
 */
export async function resumeKillSwitch(by: string): Promise<KillSwitchState> {
  const now = new Date();
  const next: KillSwitchState = {
    publishing_enabled: true,
    resume_at: null,
    triggered_by: by,
    updated_at: now.toISOString(),
  };
  const sb = getSupabase();
  if (!sb) {
    Object.assign(inMemoryState, next);
    return { ...inMemoryState };
  }
  await sb.from("safety_state").upsert(
    { scope: "global", ...next },
    { onConflict: "scope" },
  );
  return next;
}

/**
 * Publisher 系が send 直前に呼ぶ guard。
 * publishing_enabled=false なら例外を throw。
 */
export async function assertPublishingEnabled(): Promise<void> {
  const state = await getKillSwitchState();
  if (!state.publishing_enabled) {
    throw new Error(
      `[kill-switch] publishing disabled until ${state.resume_at ?? "manual_resume"} (by ${state.triggered_by ?? "?"})`,
    );
  }
}

/** test 用 reset */
export function __resetKillSwitchInMemory(): void {
  inMemoryState.publishing_enabled = true;
  inMemoryState.resume_at = null;
  inMemoryState.triggered_by = null;
  inMemoryState.updated_at = new Date().toISOString();
}
