"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalDraft, Attachment } from "@/lib/drafts-logic";
import type { TemplateOption } from "@/lib/curation-formats";
import { splitThread, joinThread } from "@/lib/thread-logic";
import { DraftCard } from "./DraftCard";
import { RevisionDialog } from "./RevisionDialog";

type Msg = { text: string; type: "info" | "error" | "success" } | null;

export function ApprovalClient({
  initialDrafts,
  templateOptions,
}: {
  initialDrafts: ApprovalDraft[];
  templateOptions: TemplateOption[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ApprovalDraft[]>(initialDrafts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  // 修正依頼ダイアログ対象（要件4+5）。null=閉じている。
  const [reviseTarget, setReviseTarget] = useState<ApprovalDraft | null>(null);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const decide = useCallback(
    async (id: string, action: "approve" | "reject", attachments?: Attachment[], reason?: string) => {
      setBusyId(id);
      setMsg(null);
      try {
        const res = await fetch("/api/drafts/approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ids: [id],
            action,
            // 承認かつ写真添付があるときだけ送る（後方互換）
            ...(action === "approve" && attachments && attachments.length > 0
              ? { attachments }
              : {}),
            // 理由が入力されていればそのまま送る（Stage 2B）
            ...(reason ? { reason } : {}),
          }),
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
        // 保存された添付枚数を surface（メディア欠落を承認段階で検知しやすく）
        const savedAtt = typeof body.attachments === "number" ? body.attachments : 0;
        setMsg({
          text:
            action === "approve"
              ? savedAtt > 0
                ? `承認しました（予約待ちストックへ・写真${savedAtt}枚添付予定）`
                : "承認しました（予約待ちストックへ）"
              : "却下しました",
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
    async (id: string, body: string, isThread: boolean): Promise<boolean> => {
      setBusyId(id);
      setMsg(null);
      try {
        const res = await fetch("/api/drafts/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, body, ...(isThread ? { isThread: true } : {}) }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setMsg({ text: `保存失敗: ${json.error ?? json.warning ?? res.status}`, type: "error" });
          return false;
        }
        // thread draft はサーバが正規化した body を反映し、thread_bodies も再分割で更新。
        const savedBody = typeof json.body === "string" ? json.body : body;
        const nextThreadBodies = isThread ? splitThread(savedBody) : null;
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  body: isThread ? joinThread(nextThreadBodies as string[]) : savedBody,
                  thread_bodies: nextThreadBodies,
                }
              : d,
          ),
        );
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

  const requestRevision = useCallback(
    async (
      id: string,
      args: { instruction: string; desiredFmat?: string; templateId?: string },
    ) => {
      setBusyId(id);
      setMsg(null);
      try {
        const res = await fetch("/api/drafts/revise", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, ...args }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setMsg({ text: `修正依頼に失敗: ${json.error ?? res.status}`, type: "error" });
          return;
        }
        setReviseTarget(null);
        if (json.updated === 0) {
          setMsg({ text: "対象は既に処理済みでした", type: "info" });
          removeDraft(id);
          return;
        }
        // enqueue 失敗時は warning を surface（遷移は成立済・後で自動再生成）。
        setMsg({
          text: json.warning
            ? `修正依頼を受理しました（${json.warning}）`
            : "修正依頼を送信しました（再生成を起動・点検後に承認待ちへ戻ります）",
          type: json.warning ? "info" : "success",
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-14 z-20">
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
              onApprove={(attachments, reason) => decide(d.id, "approve", attachments, reason)}
              onReject={(reason) => decide(d.id, "reject", undefined, reason)}
              onSave={(body, isThread) => saveBody(d.id, body, isThread)}
              onRequestRevision={() => setReviseTarget(d)}
            />
          ))
        )}
      </div>

      {reviseTarget && (
        <RevisionDialog
          draft={reviseTarget}
          templateOptions={templateOptions}
          busy={busyId === reviseTarget.id}
          onSubmit={(args) => requestRevision(reviseTarget.id, args)}
          onClose={() => setReviseTarget(null)}
        />
      )}
    </div>
  );
}
