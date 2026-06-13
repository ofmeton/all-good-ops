/** run / trace の status・outcome を契約のセマンティック写像へ正規化してバッジ化する。
 *  ok/success→emerald, error→rose, running→blue, skipped→slate, warn→amber, 不明→slate。 */
export function statusTone(
  status: string | null | undefined,
  outcome?: string | null,
): "ok" | "error" | "running" | "skipped" | "warn" | "idle" {
  const s = (status ?? "").toLowerCase();
  const o = (outcome ?? "").toLowerCase();
  if (o === "rejected") return "error";
  if (o === "warned") return "warn";
  if (["error", "failed", "fail"].includes(s)) return "error";
  if (["ok", "success", "completed", "done"].includes(s)) return "ok";
  if (["running", "in_progress", "pending", "queued"].includes(s)) return "running";
  if (["skipped", "cancelled", "canceled"].includes(s)) return "skipped";
  if (!s) return "idle";
  return "warn";
}

const TONE_CLASS: Record<string, string> = {
  ok: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  error: "bg-rose-400/10 text-rose-300 border-rose-400/30",
  running: "bg-blue-400/10 text-blue-300 border-blue-400/30",
  skipped: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  warn: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  idle: "bg-slate-500/10 text-slate-400 border-slate-500/25",
};

const TONE_DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  error: "bg-rose-400",
  running: "bg-blue-400 shadow-glow-primary animate-pulse-glow",
  skipped: "bg-slate-500",
  warn: "bg-amber-400",
  idle: "bg-slate-600",
};

export function StatusBadge({
  status,
  outcome,
}: {
  status: string | null | undefined;
  outcome?: string | null;
}) {
  const tone = statusTone(status, outcome);
  const label = [status ?? "—", outcome ? `/${outcome}` : ""].join("");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      {label}
    </span>
  );
}
