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
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
  running: "bg-blue-50 text-blue-700 border-blue-200",
  skipped: "bg-slate-100 text-slate-600 border-slate-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  idle: "bg-slate-50 text-slate-500 border-slate-200",
};

const TONE_DOT: Record<string, string> = {
  ok: "bg-emerald-500",
  error: "bg-rose-500",
  running: "bg-blue-500",
  skipped: "bg-slate-400",
  warn: "bg-amber-500",
  idle: "bg-slate-300",
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
