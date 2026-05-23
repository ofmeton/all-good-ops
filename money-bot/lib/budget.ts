import { getSupabase, hasSupabase } from "./supabase";

export type KpiChannel = "note" | "x" | "instagram" | "stock" | "kdp";

export interface KpiRecord {
  date: string;
  channel: KpiChannel;
  posts?: number;
  views?: number;
  likes?: number;
  revenue?: number;
  cost?: number;
  notes?: string;
}

export class BudgetExceededError extends Error {
  override readonly name = "BudgetExceededError";
  constructor(public readonly costJpy: number, public readonly limitJpy: number) {
    super(`monthly cost ${costJpy} JPY exceeded budget ${limitJpy} JPY`);
  }
}

export class KillSwitchError extends Error {
  override readonly name = "KillSwitchError";
  constructor() {
    super("MONEY_BOT_KILL_SWITCH=1");
  }
}

export async function recordKpi(record: KpiRecord): Promise<void> {
  "use step";
  if (!hasSupabase()) {
    console.warn("[budget] supabase not configured, skipping kpi", record);
    return;
  }
  const supabase = getSupabase();
  const row = {
    date: record.date,
    channel: record.channel,
    posts: record.posts ?? 0,
    views: record.views ?? 0,
    likes: record.likes ?? 0,
    revenue: record.revenue ?? 0,
    cost: record.cost ?? 0,
    notes: record.notes ?? null,
  };
  const { error } = await supabase
    .from("kpi_daily")
    .upsert(row, { onConflict: "date,channel" });
  if (error) throw new Error(`kpi_daily upsert failed: ${error.message}`);
}

export async function checkBudgetOrAbort(): Promise<void> {
  "use step";
  if (process.env.MONEY_BOT_KILL_SWITCH === "1") {
    throw new KillSwitchError();
  }
  const limit = Number(process.env.MONEY_BOT_MONTHLY_BUDGET_JPY ?? "10000");
  if (!Number.isFinite(limit) || limit <= 0) return;

  if (!hasSupabase()) return;
  const supabase = getSupabase();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const startIso = monthStart.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("kpi_daily")
    .select("cost")
    .gte("date", startIso);
  if (error) return;
  const spent = (data ?? []).reduce(
    (acc: number, row: { cost: number | string | null }) => acc + Number(row.cost ?? 0),
    0,
  );
  if (spent > limit) {
    throw new BudgetExceededError(spent, limit);
  }
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
