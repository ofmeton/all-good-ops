"use client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toPlanRows, type PlanRow, type ScheduleStock } from "@/lib/schedule-logic";
import { ScheduleDraftRow } from "./ScheduleDraftRow";

type Msg = { text: string; type: "info" | "error" | "success" } | null;

/** plan 行配列 → { draftId: scheduledForISO } の割当 map（stock に在る draft のみ）。 */
function planToAssignments(plan: PlanRow[], stockIds: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of plan) {
    if (stockIds.has(p.draftId)) out[p.draftId] = p.scheduledForISO;
  }
  return out;
}

export function ScheduleClient({
  initialStock,
  initialPlan,
}: {
  initialStock: ScheduleStock[];
  initialPlan: PlanRow[];
}) {
  const router = useRouter();
  // now は mount 時に固定（候補スロット算出を 1 セッション内で安定させる）
  const [nowMs] = useState(() => Date.now());
  const [stock, setStock] = useState<ScheduleStock[]>(initialStock);
  const [includeToday, setIncludeToday] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const stockIds = useMemo(() => new Set(stock.map((s) => s.id)), [stock]);
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    planToAssignments(initialPlan, new Set(initialStock.map((s) => s.id))),
  );

  // 他 draft に既に割当てられた slot 一覧（SlotPicker の重複除外に渡す）
  const usedISO = useMemo(() => Object.values(assignments).filter(Boolean), [assignments]);
  const assignedCount = useMemo(
    () => Object.entries(assignments).filter(([id, iso]) => iso && stockIds.has(id)).length,
    [assignments, stockIds],
  );

  // 再プラン（当日トグル変更 / 明示ボタン）。Worker /admin/plan-slots を叩き直す。
  const replan = useCallback(
    async (today: boolean) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch("/api/schedule/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ includeToday: today }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
          setMsg({ text: `スロット提案に失敗: ${body.error ?? res.status}`, type: "error" });
          return;
        }
        const plan = toPlanRows(body.plan);
        setAssignments(planToAssignments(plan, stockIds));
        setMsg({
          text:
            plan.length > 0
              ? `${plan.length} 件にスロットを割当てました${today ? "（当日含む）" : ""}`
              : "割当可能な空きスロットがありませんでした（在庫は据置）",
          type: plan.length > 0 ? "success" : "info",
        });
      } catch (e) {
        setMsg({ text: `通信エラー: ${(e as Error).message}`, type: "error" });
      } finally {
        setBusy(false);
      }
    },
    [stockIds],
  );

  const toggleToday = useCallback(() => {
    const next = !includeToday;
    setIncludeToday(next);
    void replan(next);
  }, [includeToday, replan]);

  const setSlot = useCallback((draftId: string, iso: string | undefined) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (iso) next[draftId] = iso;
      else delete next[draftId];
      return next;
    });
  }, []);

  // 予約を確定（人間ゲート）。割当済みのみ送信。冪等 no-op も surface。
  const confirm = useCallback(async () => {
    const marks = Object.entries(assignments)
      .filter(([id, iso]) => iso && stockIds.has(id))
      .map(([draftId, scheduledFor]) => ({ draftId, scheduledFor }));
    if (marks.length === 0) {
      setMsg({ text: "確定する予約がありません（スロットを割当ててください）", type: "info" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/schedule/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marks }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setMsg({ text: `確定失敗: ${body.error ?? res.status}`, type: "error" });
        return;
      }
      const applied = typeof body.applied === "number" ? body.applied : 0;
      const noop = typeof body.noop === "number" ? body.noop : 0;
      // 確定対象（applied / 既予約 noop どちらも）を在庫から除去
      const doneIds = new Set(marks.map((m) => m.draftId));
      setStock((prev) => prev.filter((s) => !doneIds.has(s.id)));
      setAssignments((prev) => {
        const next = { ...prev };
        for (const id of doneIds) delete next[id];
        return next;
      });
      setMsg({
        text:
          noop > 0
            ? `予約を確定しました（新規 ${applied} 件 / 既に予約済み ${noop} 件）`
            : `予約を確定しました（${applied} 件）`,
        type: "success",
      });
      router.refresh();
    } catch (e) {
      setMsg({ text: `通信エラー: ${(e as Error).message}`, type: "error" });
    } finally {
      setBusy(false);
    }
  }, [assignments, stockIds, router]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
              スケジュール / スロット割当
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              承認済みストックをピーク帯へ割当 → 「予約を確定」で予約登録します。
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
            在庫 {stock.length.toLocaleString()} 件 / 割当 {assignedCount.toLocaleString()} 件
          </span>
        </div>

        {/* controls */}
        <div className="max-w-3xl mx-auto mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={includeToday}
              disabled={busy}
              onChange={toggleToday}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            当日も割当（same-day・現在より後のピーク帯のみ）
          </label>
          <button
            onClick={() => replan(includeToday)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            スロットを再提案
          </button>
          <button
            onClick={confirm}
            disabled={busy || assignedCount === 0}
            className="ml-auto px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            予約を確定{assignedCount > 0 ? `（${assignedCount}）` : ""}
          </button>
        </div>

        {msg && (
          <div className="max-w-3xl mx-auto mt-2">
            <span
              className={[
                "inline-block text-xs px-2.5 py-1 rounded-full font-medium",
                msg.type === "error"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : msg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {msg.text}
            </span>
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {stock.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-slate-300 text-4xl mb-3 select-none">○</div>
            <p className="text-slate-500 text-sm">承認済み（未予約）のストックはありません。</p>
            <button
              onClick={() => router.refresh()}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              再読み込み
            </button>
          </div>
        ) : (
          stock.map((s) => (
            <ScheduleDraftRow
              key={s.id}
              stock={s}
              value={assignments[s.id]}
              includeToday={includeToday}
              nowMs={nowMs}
              usedISO={usedISO}
              disabled={busy}
              onChange={(iso) => setSlot(s.id, iso)}
            />
          ))
        )}
      </div>
    </div>
  );
}
