"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PublishStock, HandoffPayload } from "@/lib/publish-queries";

type Msg = { text: string; type: "info" | "error" | "success" } | null;

/** 本文先頭プレビュー（1 行化・60 字）。 */
function preview(body: string, n = 60): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return [...oneLine].length > n ? `${[...oneLine].slice(0, n).join("")}…` : oneLine;
}

/** 写真 upload intent 数＋本文の動画 deep-link 有無をバッジ文字列に。 */
function mediaSummary(d: PublishStock): string {
  const photos = Array.isArray(d.attachments)
    ? d.attachments.filter((a) => a?.mediaType === "photo").length
    : 0;
  const hasVideo = /\/video\/1\b/.test(d.body ?? "");
  const parts: string[] = [];
  if (photos > 0) parts.push(`写真${photos}`);
  if (hasVideo) parts.push("動画");
  return parts.join(" / ");
}

const COPY_OK = "コピーしました";

export function PublishNowClient({ initialStock }: { initialStock: PublishStock[] }) {
  const router = useRouter();
  const [stock, setStock] = useState<PublishStock[]>(initialStock);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffPayload | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setMsg({ text: COPY_OK, type: "info" });
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setMsg({ text: "コピーに失敗しました（手動で選択してください）", type: "error" });
    }
  }, []);

  // 「今すぐ投稿」: handoff payload を取得して投稿手順を開く（実投稿は chrome 半自動）。
  const openHandoff = useCallback(async (id: string) => {
    setBusy(true);
    setMsg(null);
    setActiveId(id);
    setHandoff(null);
    try {
      const res = await fetch("/api/publish/now", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, mode: "handoff" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg({ text: `失敗: ${json.error ?? res.status}`, type: "error" });
        setActiveId(null);
        return;
      }
      setHandoff(json.payload as HandoffPayload);
    } catch (e) {
      setMsg({ text: `通信エラー: ${(e as Error).message}`, type: "error" });
      setActiveId(null);
    } finally {
      setBusy(false);
    }
  }, []);

  // 「投稿済みにする」: chrome で投稿完了後に published_at を確定（冪等・二重押下 no-op）。
  const confirmPublished = useCallback(
    async (id: string) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch("/api/publish/now", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, mode: "confirm" }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setMsg({ text: `確定失敗: ${json.error ?? res.status}`, type: "error" });
          return;
        }
        if (json.updated === 0) {
          setMsg({ text: "対象は既に投稿済みでした（冪等 no-op）", type: "info" });
        } else {
          setMsg({ text: "投稿済みにしました（published_at 確定）", type: "success" });
        }
        setStock((prev) => prev.filter((d) => d.id !== id));
        setActiveId(null);
        setHandoff(null);
        router.refresh();
      } catch (e) {
        setMsg({ text: `通信エラー: ${(e as Error).message}`, type: "error" });
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">今すぐ投稿</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              承認済みストックを 1 件選び、chrome 半自動（通常コンポーザ）で投稿 → 投稿後に「投稿済み」を確定します。
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
            ストック {stock.length.toLocaleString()} 件
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
        {/* ポリシー明示バナー */}
        <div className="max-w-3xl mx-auto mt-2">
          <span className="inline-block text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            X API 直投はしません。実投稿は chrome 半自動（source=本人クライアント維持）。本画面は対象整形と投稿後記録のみ。
          </span>
        </div>
      </div>

      {/* ── List ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {stock.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-slate-300 text-4xl mb-3 select-none">○</div>
            <p className="text-slate-500 text-sm">今すぐ投稿できる承認済みストックはありません。</p>
            <button
              onClick={() => router.refresh()}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              再読み込み
            </button>
          </div>
        ) : (
          stock.map((d) => {
            const summary = mediaSummary(d);
            const isActive = activeId === d.id;
            return (
              <div
                key={d.id}
                className={[
                  "bg-white border rounded-lg p-4",
                  isActive ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed break-words">
                      {preview(d.body)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {d.fmat && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {d.fmat}
                        </span>
                      )}
                      {d.risk_level === "high" && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          risk=high
                        </span>
                      )}
                      {summary && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {summary}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openHandoff(d.id)}
                    disabled={busy}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                  >
                    今すぐ投稿
                  </button>
                </div>

                {/* ── ハンドオフ手順（選択中のみ）── */}
                {isActive && handoff && (
                  <HandoffPanel
                    handoff={handoff}
                    busy={busy}
                    copied={copied}
                    onCopy={copy}
                    onConfirm={() => confirmPublished(d.id)}
                    onClose={() => {
                      setActiveId(null);
                      setHandoff(null);
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** ハンドオフ手順パネル: 本文コピー・写真 DL・chrome 手順・published_at 確定。 */
function HandoffPanel({
  handoff,
  busy,
  copied,
  onCopy,
  onConfirm,
  onClose,
}: {
  handoff: HandoffPayload;
  busy: boolean;
  copied: string | null;
  onCopy: (label: string, text: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dlCmd = `cd apps/x-account-system && npx tsx scripts/fetch-draft-media.ts ${handoff.draftId}`;
  const planCmd = `cd apps/x-account-system && npx tsx scripts/publish-now.ts --id ${handoff.draftId}`;
  return (
    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
      {/* 本文 */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-slate-600">
            投稿本文（{handoff.charCount} 字）
          </span>
          <button
            onClick={() => onCopy("body", handoff.body)}
            className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            {copied === "body" ? COPY_OK : "本文をコピー"}
          </button>
        </div>
        <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 whitespace-pre-wrap break-words font-sans">
          {handoff.body}
        </pre>
      </div>

      {/* メディア */}
      {(handoff.photos.length > 0 || handoff.hasVideoDeepLink) && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-600">メディア</span>
          {handoff.photos.length > 0 && (
            <div className="text-xs text-slate-600 bg-slate-100 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span>写真 {handoff.photos.length} 枚（DL→ネイティブ添付）</span>
                <button
                  onClick={() => onCopy("dl", dlCmd)}
                  className="text-xs px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  {copied === "dl" ? COPY_OK : "DL コマンド"}
                </button>
              </div>
              <code className="block text-[11px] text-slate-500 break-all">{dlCmd}</code>
            </div>
          )}
          {handoff.hasVideoDeepLink && (
            <div className="text-xs text-slate-600 bg-slate-100 rounded-lg p-2.5">
              動画/GIF は本文の deep-link（{handoff.videoDeepLinkHint ?? "/video/1"}）で展開されます。upload 不要・本文をそのまま投稿。
            </div>
          )}
        </div>
      )}

      {/* chrome 手順 */}
      <div className="text-xs text-slate-600 bg-slate-100 rounded-lg p-2.5 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">chrome 半自動 手順（通常コンポーザ・予約UI不使用）</span>
          <button
            onClick={() => onCopy("plan", planCmd)}
            className="text-xs px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          >
            {copied === "plan" ? COPY_OK : "plan コマンド"}
          </button>
        </div>
        <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
          <li>x.com/compose/post を開く（通常コンポーザ・予約UIは使わない）</li>
          <li>本文を type_text で入力（写真がある場合は先に DL→添付）</li>
          <li>「ポストする」で即時投稿（source=本人クライアント維持）</li>
          <li>投稿完了したら下の「投稿済みにする」で published_at 確定</li>
        </ol>
      </div>

      {/* 確定 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40"
        >
          投稿済みにする
        </button>
        <button
          onClick={onClose}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
