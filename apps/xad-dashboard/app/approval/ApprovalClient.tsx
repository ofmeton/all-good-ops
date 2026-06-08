"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalDraft } from "@/lib/drafts-logic";
import { DraftCard } from "./DraftCard";

type Msg = { text: string; type: "info" | "error" | "success" } | null;

export function ApprovalClient({ initialDrafts }: { initialDrafts: ApprovalDraft[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ApprovalDraft[]>(initialDrafts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const decide = useCallback(
    async (id: string, action: "approve" | "reject") => {
      setBusyId(id);
      setMsg(null);
      try {
        const res = await fetch("/api/drafts/approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: [id], action }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
          setMsg({ text: `失敗: ${body.error ?? res.status}`, type: "error" });
          return;
        }
        if (body.updated === 0) {
          setMsg({ text: "対象は既に処理済みでした", type: "info" });
          removeDraft(id);
          return;
        }
        setMsg({
          text: action === "approve" ? "承認しました（予約待ちストックへ）" : "却下しました",
          type: "success",
        });
        removeDraft(id);
        router.refresh();
      } catch (e) {
        setMsg({ text: `通信エラー: ${(e as Error).message}`, type: "error" });
      } finally {
        setBusyId(null);
      }
    },
    [removeDraft, router],
  );

  const saveBody = useCallback(
    async (id: string, body: string): Promise<boolean> => {
      setBusyId(id);
      setMsg(null);
      try {
        const res = await fetch("/api/drafts/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, body }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setMsg({ text: `保存失敗: ${json.error ?? json.warning ?? res.status}`, type: "error" });
          return false;
        }
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, body } : d)));
        setMsg({ text: "本文を保存しました", type: "success" });
        return true;
      } catch (e) {
        setMsg({ text: `通信エラー: ${(e as Error).message}`, type: "error" });
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">投稿承認</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              本文を直接編集して承認。承認すると予約待ちストックに入ります。
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
            承認待ち {drafts.length.toLocaleString()} 件
          </span>
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
        {drafts.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-slate-300 text-4xl mb-3 select-none">○</div>
            <p className="text-slate-500 text-sm">承認待ちの投稿はありません。</p>
            <button
              onClick={() => router.refresh()}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              再読み込み
            </button>
          </div>
        ) : (
          drafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              busy={busyId === d.id}
              onApprove={() => decide(d.id, "approve")}
              onReject={() => decide(d.id, "reject")}
              onSave={(body) => saveBody(d.id, body)}
            />
          ))
        )}
      </div>
    </div>
  );
}
