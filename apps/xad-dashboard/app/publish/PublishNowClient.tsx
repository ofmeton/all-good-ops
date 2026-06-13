"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PublishStock, HandoffPayload } from "@/lib/publish-queries";

type Msg = { text: string; type: "info" | "error" | "success" } | null;

/** thread draft の各ツイートを trim→空除去して正規化（投稿時の正＝thread_bodies）。 */
function threadPartsFromTweets(tweets: string[] | null): string[] {
  return Array.isArray(tweets)
    ? tweets
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];
}

/** thread draft の各ツイートを trim→空除去して正規化（投稿時の正＝thread_bodies）。 */
function threadParts(d: PublishStock): string[] {
  return Array.isArray(d.thread_bodies)
    ? d.thread_bodies
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];
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
  // 要件6: 本文の全文展開トグル（行ごと line-clamp ↔ whitespace-pre-wrap 全文）。
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // 要件3: 破棄ダイアログ（対象 id + 理由任意）。
  const [discardId, setDiscardId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  // 要件2: handoff を経由せず「投稿済みにする」。X で投稿済みかを人間に再確認させてから確定。
  const handleMarkPublished = useCallback(
    (id: string) => {
      if (!window.confirm("Xで投稿済みか確認しましたか?\n\n「OK」で published_at を確定します（取り消し不可）。")) {
        return;
      }
      void confirmPublished(id);
    },
    [confirmPublished],
  );

  // 要件3: 破棄（論理破棄・復元可）。理由任意 → /api/drafts/discard。
  const handleDiscard = useCallback(
    async (id: string, reason: string) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch("/api/drafts/discard", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: [id], reason: reason.trim() || undefined }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setMsg({ text: `破棄失敗: ${json.error ?? res.status}`, type: "error" });
          return;
        }
        if (json.discarded === 0) {
          setMsg({ text: "対象は破棄できませんでした（公開済み/予約済み/別状態の可能性）", type: "info" });
        } else {
          setMsg({ text: "破棄しました（元素材は再利用可・復元可）", type: "success" });
          setStock((prev) => prev.filter((d) => d.id !== id));
          if (activeId === id) {
            setActiveId(null);
            setHandoff(null);
          }
        }
        setDiscardId(null);
        router.refresh();
      } catch (e) {
        setMsg({ text: `通信エラー: ${(e as Error).message}`, type: "error" });
      } finally {
        setBusy(false);
      }
    },
    [activeId, router],
  );

  return (
    <div className="min-h-screen bg-white/[0.03]">
      {/* ── Header ── */}
      <div className="bg-surface border-b border-white/10 px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">今すぐ投稿</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              承認済みストックを 1 件選び、chrome 半自動（通常コンポーザ）で投稿 → 投稿後に「投稿済み」を確定します。
              手動で「投稿済みにする」「破棄」も各行から可能です。
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
                  ? "bg-rose-400/10 text-rose-300 border border-rose-400/30"
                  : msg.type === "success"
                    ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                    : "bg-white/5 text-slate-300",
              ].join(" ")}
            >
              {msg.text}
            </span>
          </div>
        )}
        {/* ポリシー明示バナー */}
        <div className="max-w-3xl mx-auto mt-2">
          <span className="inline-block text-[11px] px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/30">
            X API 直投はしません。実投稿は chrome 半自動（source=本人クライアント維持）。本画面は対象整形と投稿後記録のみ。
          </span>
        </div>
      </div>

      {/* ── List ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {stock.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-slate-300 text-4xl mb-3 select-none">○</div>
            <p className="text-slate-400 text-sm">今すぐ投稿できる承認済みストックはありません。</p>
            <button
              onClick={() => router.refresh()}
              className="mt-3 text-xs text-blue-300 hover:underline"
            >
              再読み込み
            </button>
          </div>
        ) : (
          stock.map((d) => {
            const summary = mediaSummary(d);
            const isActive = activeId === d.id;
            const parts = threadParts(d);
            const isThread = parts.length > 1;
            const isExpanded = expanded.has(d.id);
            return (
              <div
                key={d.id}
                className={[
                  "bg-surface border rounded-lg p-4",
                  isActive ? "border-blue-400/40 ring-1 ring-blue-400/20" : "border-white/10",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* 要件6: 3 行 line-clamp ↔ 全文(whitespace-pre-wrap)トグル。
                        thread draft は番号付きで全文表示する。 */}
                    {isThread ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(d.id)}
                        className="w-full text-left"
                        aria-expanded={isExpanded}
                      >
                        <div
                          className={[
                            "text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap space-y-1.5",
                            isExpanded ? "" : "line-clamp-3",
                          ].join(" ")}
                        >
                          {parts.map((t, i) => (
                            <p key={i}>
                              <span className="text-slate-400 tabular-nums mr-1">{i + 1}/{parts.length}</span>
                              {t}
                            </p>
                          ))}
                        </div>
                        <span className="mt-1 inline-block text-[11px] text-blue-300">
                          {isExpanded ? "▲ 閉じる" : "▼ 全文を表示"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleExpand(d.id)}
                        className="w-full text-left"
                        aria-expanded={isExpanded}
                      >
                        <p
                          className={[
                            "text-sm text-slate-300 leading-relaxed break-words",
                            isExpanded ? "whitespace-pre-wrap" : "line-clamp-3",
                          ].join(" ")}
                        >
                          {d.body}
                        </p>
                        <span className="mt-1 inline-block text-[11px] text-blue-300">
                          {isExpanded ? "▲ 閉じる" : "▼ 全文を表示"}
                        </span>
                      </button>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {isThread && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-400/10 text-indigo-300 border border-indigo-400/30">
                          🧵 スレッド{parts.length}本
                        </span>
                      )}
                      {d.fmat && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                          {d.fmat}
                        </span>
                      )}
                      {d.risk_level === "high" && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-400/10 text-rose-300 border border-rose-400/30">
                          risk=high
                        </span>
                      )}
                      {summary && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                          {summary}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-stretch gap-1.5">
                    <button
                      onClick={() => openHandoff(d.id)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-40"
                    >
                      今すぐ投稿
                    </button>
                    {/* 要件2: handoff を経由しない「投稿済みにする」（window.confirm 起点）。 */}
                    <button
                      onClick={() => handleMarkPublished(d.id)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-400/10 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/15 disabled:opacity-40"
                    >
                      投稿済みにする
                    </button>
                    {/* 要件3: 破棄（rose 系・確認ダイアログ＋理由任意）。 */}
                    <button
                      onClick={() => setDiscardId(d.id)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-400/10 text-rose-300 border border-rose-400/30 hover:bg-rose-400/15 disabled:opacity-40"
                    >
                      破棄
                    </button>
                  </div>
                </div>

                {/* ── 破棄ダイアログ（対象行のみ）── */}
                {discardId === d.id && (
                  <DiscardDialog
                    busy={busy}
                    onConfirm={(reason) => handleDiscard(d.id, reason)}
                    onCancel={() => setDiscardId(null)}
                  />
                )}

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
  // 要件7: thread_bodies が 2 本以上ならスレッド投稿として個別コピー＋スレッド手順に分岐。
  const tweets = threadPartsFromTweets(handoff.tweets);
  const isThread = tweets.length > 1;
  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
      {/* 本文 */}
      {isThread ? (
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-300">
            スレッド本文（{tweets.length} 本）— ツイートごとに個別コピーして 1 本ずつ投稿
          </span>
          {tweets.map((t, i) => {
            const label = `tweet-${i}`;
            return (
              <div key={i}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-medium text-indigo-300 tabular-nums">
                    {i + 1}/{tweets.length} 本目（{[...t].length} 字）
                  </span>
                  <button
                    onClick={() => onCopy(label, t)}
                    className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-300 hover:bg-white/15"
                  >
                    {copied === label ? COPY_OK : "このツイートをコピー"}
                  </button>
                </div>
                <pre className="text-xs text-slate-300 bg-white/[0.03] border border-white/10 rounded-lg p-2.5 whitespace-pre-wrap break-words font-sans">
                  {t}
                </pre>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-slate-300">
              投稿本文（{handoff.charCount} 字）
            </span>
            <button
              onClick={() => onCopy("body", handoff.body)}
              className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-300 hover:bg-white/15"
            >
              {copied === "body" ? COPY_OK : "本文をコピー"}
            </button>
          </div>
          <pre className="text-xs text-slate-300 bg-white/[0.03] border border-white/10 rounded-lg p-2.5 whitespace-pre-wrap break-words font-sans">
            {handoff.body}
          </pre>
        </div>
      )}

      {/* メディア */}
      {(handoff.photos.length > 0 || handoff.hasVideoDeepLink) && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-300">メディア</span>
          {handoff.photos.length > 0 && (
            <div className="text-xs text-slate-300 bg-white/5 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span>写真 {handoff.photos.length} 枚（DL→ネイティブ添付）</span>
                <button
                  onClick={() => onCopy("dl", dlCmd)}
                  className="text-xs px-2 py-0.5 rounded bg-surface text-slate-300 border border-white/10 hover:bg-white/5"
                >
                  {copied === "dl" ? COPY_OK : "DL コマンド"}
                </button>
              </div>
              <code className="block text-[11px] text-slate-400 break-all">{dlCmd}</code>
            </div>
          )}
          {handoff.hasVideoDeepLink && (
            <div className="text-xs text-slate-300 bg-white/5 rounded-lg p-2.5">
              動画/GIF は本文の deep-link（{handoff.videoDeepLinkHint ?? "/video/1"}）で展開されます。upload 不要・本文をそのまま投稿。
            </div>
          )}
        </div>
      )}

      {/* chrome 手順 */}
      <div className="text-xs text-slate-300 bg-white/5 rounded-lg p-2.5 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">chrome 半自動 手順（通常コンポーザ・予約UI不使用）</span>
          <button
            onClick={() => onCopy("plan", planCmd)}
            className="text-xs px-2 py-0.5 rounded bg-surface text-slate-300 border border-white/10 hover:bg-white/5"
          >
            {copied === "plan" ? COPY_OK : "plan コマンド"}
          </button>
        </div>
        {isThread ? (
          <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
            <li>x.com/compose/post を開く（通常コンポーザ・予約UIは使わない）</li>
            <li>1 本目を type_text で入力（写真がある場合は先に DL→添付）</li>
            <li>「ポストを追加」（+）で空エディタを増やし、2 本目以降を 1 本ずつ貼る（計 {tweets.length} 本）</li>
            <li>「すべてポストする」でスレッド一括投稿（source=本人クライアント維持）</li>
            <li>投稿完了したら下の「投稿済みにする」で published_at 確定</li>
          </ol>
        ) : (
          <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
            <li>x.com/compose/post を開く（通常コンポーザ・予約UIは使わない）</li>
            <li>本文を type_text で入力（写真がある場合は先に DL→添付）</li>
            <li>「ポストする」で即時投稿（source=本人クライアント維持）</li>
            <li>投稿完了したら下の「投稿済みにする」で published_at 確定</li>
          </ol>
        )}
      </div>

      {/* 確定 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-400/10 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/15 disabled:opacity-40"
        >
          投稿済みにする
        </button>
        <button
          onClick={onClose}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-slate-300 hover:bg-white/15 disabled:opacity-40"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

/** 破棄ダイアログ（要件3）: 理由任意（2000 字）＋確認。論理破棄・復元可の注意を明示。 */
function DiscardDialog({
  busy,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const tooLong = reason.trim().length > 2000;
  return (
    <div className="mt-4 pt-4 border-t border-rose-400/30 space-y-2.5">
      <p className="text-xs font-medium text-rose-300">このストックを破棄しますか?</p>
      <p className="text-[11px] text-slate-400">
        論理破棄（復元可）です。元素材は再利用可（再キュレ/再執筆の対象に戻ります）。
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="破棄理由（任意）"
        rows={2}
        className="w-full text-xs rounded-lg border border-white/10 p-2 focus:outline-none focus:ring-1 focus:ring-rose-400/40 resize-y"
      />
      {tooLong && (
        <p className="text-[11px] text-rose-300">理由が長すぎます（{reason.trim().length}/2000字）</p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onConfirm(reason)}
          disabled={busy || tooLong}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500 hover:bg-rose-400 text-white disabled:opacity-40"
        >
          破棄する
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-slate-300 hover:bg-white/15 disabled:opacity-40"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
