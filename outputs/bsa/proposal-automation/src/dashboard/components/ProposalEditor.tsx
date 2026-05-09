'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { JobWithProposal } from '@/lib/db';

interface Milestone {
  title: string;
  schedule_date: string;
  amount_exclude_tax: number;
  description: string;
}

interface ProposalOption {
  title: string;
  description: string;
  contract_amount_exclude_tax: number;
}

function safeParseArray<T>(json: string | null): T[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function ProposalEditor({ data }: { data: JobWithProposal }) {
  const router = useRouter();
  // 既存提案が新フィールドを持たない場合は body_md を description_md にフォールバック
  const initialDescription = data.description_md ?? data.body_md ?? '';
  const initialEstimate = data.estimate_md ?? '';
  const initialMilestonesJson = data.milestones_json ?? '';
  const initialOptionsJson = data.options_json ?? '';

  const [description, setDescription] = useState(initialDescription);
  const [estimate, setEstimate] = useState(initialEstimate);
  const [milestonesJson, setMilestonesJson] = useState(initialMilestonesJson);
  const [optionsJson, setOptionsJson] = useState(initialOptionsJson);
  const [productLine, setProductLine] = useState(data.product_line ?? 'L1');
  const [priceIncTax, setPriceIncTax] = useState(data.price ?? 30000);
  const [priceExTax, setPriceExTax] = useState(
    data.price_exclude_tax ?? Math.ceil((data.price ?? 30000) / 1.1)
  );
  const [days, setDays] = useState(data.delivery_days ?? 3);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const milestones = useMemo(
    () => safeParseArray<Milestone>(milestonesJson),
    [milestonesJson]
  );
  const options = useMemo(
    () => safeParseArray<ProposalOption>(optionsJson),
    [optionsJson]
  );
  const milestonesSum = useMemo(
    () => milestones.reduce((s, m) => s + (m.amount_exclude_tax ?? 0), 0),
    [milestones]
  );
  const milestonesParseError = milestonesJson.trim() && milestones.length === 0;
  const optionsParseError = optionsJson.trim() && options.length === 0;

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/proposals/${data.job_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body_md: description, // 互換用に description と同期
          description_md: description,
          estimate_md: estimate || null,
          milestones_json: milestonesJson || null,
          options_json: optionsJson || null,
          product_line: productLine,
          price: priceIncTax,
          price_exclude_tax: priceExTax,
          delivery_days: days,
        }),
      });
      setSavedAt(new Date().toLocaleTimeString('ja-JP'));
    } finally {
      setSaving(false);
    }
  }

  // クリップボードへ書き込み + 即時の視覚フィードバック（alert は使わない）
  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setStatusMsg(`📋 ${label} をコピー`);
    setTimeout(() => setStatusMsg(null), 1800);
  }

  async function copyRegenerationPrompt() {
    const hint = window.prompt('修正の指示を入力してください（例: もっとカジュアルに）') ?? '';
    const text = `BSA-PA: 案件 ${data.job_id} の提案文を生成し直してください。\n\n指示: ${hint}\n\n（提案文は SQLite proposals テーブル job_id=${data.job_id} を upsert で更新）`;
    await navigator.clipboard.writeText(text);
    await fetch('/api/generation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: data.job_id, prompt_hint: hint }),
    });
    setStatusMsg('🤖 Claude 再生成キューに追加');
    setTimeout(() => setStatusMsg(null), 2200);
  }

  // 提案済みフラグを立てて一覧へ戻る（確認ダイアログ無し・誤操作は履歴ページから戻せる）
  async function markSubmittedAndBack() {
    await fetch(`/api/jobs/${data.job_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'submitted', note: 'ランサーズで提案を投下' }),
    });
    router.push('/');
  }

  // 提案不可フラグを立てて一覧へ戻る（ランサーズで提案ボタンが押せない等）
  async function markUnableAndBack() {
    const note = window.prompt('提案不可の理由を入力してください（例: ランサーズ側で提案ボタンが押せなかった）') ?? '';
    if (!note) return;
    await fetch(`/api/jobs/${data.job_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'unable_to_submit', note }),
    });
    router.push('/');
  }

  const [copiedId, setCopiedId] = useState(false);

  async function copyId() {
    await navigator.clipboard.writeText(data.job_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  }

  const isCW = data.platform_prefix === 'CW';

  // ランサーズ提案画面を Playwright で開いて自動入力する（LAN のみ）
  async function fillLancersForm() {
    // 未保存の編集を先に保存
    await save();
    setStatusMsg('🚀 ランサーズ画面を開きます...');
    try {
      const res = await fetch(`/api/proposals/${data.job_id}/fill-form`, {
        method: 'POST',
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; log?: string };
      if (!json.ok) throw new Error(json.error ?? 'unknown error');
      setStatusMsg(`📤 自動入力中。ブラウザを確認してください（log: ${json.log?.split('/').pop()}）`);
      setTimeout(() => setStatusMsg(null), 6000);
    } catch (e) {
      setStatusMsg(`❌ 起動失敗: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(() => setStatusMsg(null), 6000);
    }
  }

  const breakdown = data.fit_score_breakdown
    ? (JSON.parse(data.fit_score_breakdown) as Record<string, number | string>)
    : null;
  const fitScore = data.fit_score ?? 0;

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10 lg:py-12">
      {/* ── マストヘッド ── */}
      <header className="fade-in border-b-2 border-(--color-ink) pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <a href="/" className="text-xs text-(--color-slate) hover:text-(--color-ink)">
            ← 受注台帳に戻る
          </a>
          <button
            onClick={copyId}
            className="mono-tag text-(--color-slate) hover:text-(--color-ink) hover:bg-(--color-paper-soft) px-2 py-0.5 rounded transition-colors"
          >
            {copiedId ? '✓ コピー済' : `📋 ${data.job_id}`}
          </button>
        </div>
        <p className="kicker mt-2">案件レビュー / 提案文編集</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <h1 className="headline text-2xl text-(--color-ink) lg:text-3xl">{data.title}</h1>
          <a
            href={data.detail_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-vermilion shrink-0"
          >
            🔗 {isCW ? 'CrowdWorks' : 'Lancers'} で募集を開く ↗
          </a>
        </div>
        <p className="mt-2 truncate text-[11px] text-(--color-slate)">
          <span className="meta-label mr-2">URL</span>
          <a href={data.detail_url} target="_blank" rel="noreferrer" className="font-mono-id text-(--color-azure) hover:underline">
            {data.detail_url}
          </a>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="tag tag-outline">FIT {fitScore}</span>
          {data.estimated_product_line && (
            <span className="tag tag-outline">推定 {data.estimated_product_line}</span>
          )}
          {data.client_verified ? (
            <span className="tag tag-moss">本人確認済</span>
          ) : (
            <span className="tag tag-outline">本人確認なし</span>
          )}
          <span className="text-(--color-slate)">締切 · {data.deadline ?? '-'}</span>
          <span className="text-(--color-slate)">提案 {data.proposal_count ?? '-'} 件</span>
        </div>
      </header>

      {/* ── 2カラム ── */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        {/* ─ 左: 案件情報 ─ */}
        <aside className="space-y-6">
          <Panel kicker="案件 情報" title="募集要項">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Row label="予算" value={data.budget_text ?? '-'} />
              <Row label="締切" value={data.deadline ?? '-'} />
              <Row label="提案数" value={String(data.proposal_count ?? '-')} />
              <Row label="発注者" value={data.client_name ?? '-'} />
              <Row label="本人確認" value={data.client_verified ? '✅ 済' : '❌ 未'} />
              <Row label="実績" value={`${data.client_history_count ?? '-'} 件`} />
            </dl>
            {breakdown && (
              <div className="mt-4 border-t border-(--color-hairline) pt-3">
                <p className="meta-label mb-2">FIT 内訳</p>
                <div className="grid grid-cols-5 gap-1 text-center">
                  <Score label="価格" value={Number(breakdown.price)} />
                  <Score label="種別" value={Number(breakdown.service)} />
                  <Score label="制約" value={Number(breakdown.constraint)} />
                  <Score label="速度" value={Number(breakdown.speed)} />
                  <Score label="客" value={Number(breakdown.client)} />
                </div>
              </div>
            )}
          </Panel>

          <Panel kicker="案件 本文" title="依頼内容">
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-(--color-ink-soft)">
              {data.description}
            </div>
          </Panel>

          {data.research_notes && (
            <Panel kicker="リサーチ ノート" title="業界 / 競合">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-(--color-ink-soft)">
                {data.research_notes}
              </div>
            </Panel>
          )}
        </aside>

        {/* ─ 右: 編集 ─ */}
        <section className="space-y-6">
          <Panel kicker="提案 設定" title="ライン · 金額 · 納期">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <label className="block">
                <span className="meta-label">商品ライン</span>
                <select value={productLine} onChange={(e) => setProductLine(e.target.value)} className="field field-mono mt-1">
                  <option value="L1">L1 · Single LP</option>
                  <option value="L2">L2 · Corporate 5P</option>
                  <option value="L3">L3 · LP + 広告運用</option>
                  <option value="L4">L4 · 修正 / 改修</option>
                </select>
              </label>
              <label className="block">
                <span className="meta-label">税込総額（円）</span>
                <input type="number" value={priceIncTax} onChange={(e) => setPriceIncTax(Number(e.target.value))} className="field field-mono mt-1" />
              </label>
              <label className="block">
                <span className="meta-label">税抜総額（円）</span>
                <input type="number" value={priceExTax} onChange={(e) => setPriceExTax(Number(e.target.value))} className="field field-mono mt-1" />
              </label>
              <label className="block">
                <span className="meta-label">納期（日）</span>
                <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="field field-mono mt-1" />
              </label>
            </div>
            {isCW ? (
              <p className="mt-3 text-[11px] leading-relaxed text-(--color-slate)">
                CW の提案フォームは <b>税抜き入力</b>。「契約金額（税抜）」欄に <b>{priceExTax.toLocaleString()} 円</b> を入力してください。
              </p>
            ) : (
              <p className="mt-3 text-[11px] leading-relaxed text-(--color-slate)">
                ランサーズの提案画面は <b>税抜き入力</b>（税抜＝ceil(税込÷1.10)）。各マイルストーンの金額は税抜きで登録します。
                <br />
                マイルストーン合計：税抜 {milestonesSum.toLocaleString()} 円
                {milestonesSum > 0 && milestonesSum !== priceExTax && (
                  <span className="ml-2 text-[--color-vermilion]"> ⚠️ 税抜総額 {priceExTax.toLocaleString()} 円と不一致</span>
                )}
              </p>
            )}
          </Panel>

          {isCW ? (
            /* ── CW 用レイアウト ── */
            <>
              {/* CW ① メッセージ欄 */}
              <Panel kicker="① メッセージ欄" title="提案文（CW メッセージ欄に貼り付け）">
                <p className="mb-2 text-[11px] text-(--color-slate)">
                  CW 提案フォームの <b>「メッセージ」</b> textarea に貼り付け。推奨 500〜800 字。
                </p>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-(--color-slate)">{description.length} 字</span>
                  <button onClick={() => copyToClipboard(description, 'メッセージ')} className="btn btn-ghost">📋 コピー</button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field block h-[28rem] w-full font-mono-id text-sm leading-7"
                  placeholder="〇〇様&#10;&#10;ご依頼拝見しました。..."
                />
              </Panel>

              {/* CW ② マイルストーン */}
              <Panel kicker="② マイルストーン（内容 · 金額 · 完了予定日）" title="CW 提案フォームの計画欄">
                <p className="mb-3 text-[11px] text-(--color-slate)">
                  CW フォームの <b>「内容（note）」</b> に description をコピー。<b>「契約金額（税抜）」</b> に金額、<b>「完了予定日」</b> に日付を入力。
                </p>
                {milestonesParseError && (
                  <p className="mb-2 text-xs text-(--color-vermilion)">⚠️ JSON パース失敗</p>
                )}
                {milestones.length > 0 && (
                  <div className="mb-3 grid gap-2">
                    {milestones.map((m, i) => (
                      <CWMilestoneCard key={i} m={m} onCopy={copyToClipboard} />
                    ))}
                  </div>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-(--color-slate)">▼ JSON を直接編集</summary>
                  <textarea
                    value={milestonesJson}
                    onChange={(e) => setMilestonesJson(e.target.value)}
                    className="field mt-2 block h-[10rem] w-full font-mono-id text-xs leading-6"
                    placeholder='[{"title":"LP納品","schedule_date":"2026-05-09","amount_exclude_tax":27273,"description":"構成設計〜実装〜公開まで一括納品"}]'
                  />
                </details>
              </Panel>
            </>
          ) : (
            /* ── LAN 用レイアウト ── */
            <>
              {/* ① 見積もりの詳細欄 */}
              <Panel kicker="① 見積もりの詳細欄" title="工程内訳・スケジュール">
                <p className="mb-2 text-[11px] text-(--color-slate)">
                  ランサーズ提案画面の <b>「見積もりの詳細」</b> 欄に貼り付け。
                </p>
                <div className="mb-2 flex justify-end">
                  <button onClick={() => copyToClipboard(estimate, '見積もりの詳細')} className="btn btn-ghost">📋 コピー</button>
                </div>
                <textarea
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  className="field block h-[18rem] w-full font-mono-id text-sm leading-7"
                  placeholder="## 工程別内訳&#10;- ヒアリング・要件定義（1日・税抜13,000円）&#10;..."
                />
              </Panel>

              {/* ② 自己PR・実績欄 */}
              <Panel kicker="② 自己PR・実績欄" title="メイン提案文">
                <p className="mb-2 text-[11px] text-(--color-slate)">
                  ランサーズ提案画面の <b>「自己PR・実績」</b> 欄に貼り付け。推奨 1,500〜2,000 字。
                </p>
                <div className="mb-2 flex justify-end">
                  <button onClick={() => copyToClipboard(description, 'メイン提案文')} className="btn btn-ghost">📋 コピー</button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field block h-[28rem] w-full font-mono-id text-sm leading-7"
                  placeholder="〇〇様&#10;&#10;ご依頼拝見しました。..."
                />
                <p className="mt-1 text-[11px] text-(--color-slate)">{description.length} 字</p>
              </Panel>

              {/* ③ 計画 */}
              <Panel kicker="③ 計画" title="納品マイルストーン">
                <p className="mb-2 text-[11px] text-(--color-slate)">
                  ランサーズ提案画面の <b>「計画」</b> エリアに 1件ずつ登録（基本は一括＝1件）。
                </p>
                {milestonesParseError && (
                  <p className="mb-2 text-xs text-(--color-vermilion)">⚠️ JSON パース失敗</p>
                )}
                {milestones.length > 0 && (
                  <div className="mb-3 grid gap-2">
                    {milestones.map((m, i) => (
                      <MilestoneCard key={i} m={m} onCopy={copyToClipboard} />
                    ))}
                  </div>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-(--color-slate)">▼ JSON を直接編集</summary>
                  <textarea
                    value={milestonesJson}
                    onChange={(e) => setMilestonesJson(e.target.value)}
                    className="field mt-2 block h-[14rem] w-full font-mono-id text-xs leading-6"
                    placeholder='[{"title":"サイト構築＋公開","schedule_date":"2026-05-09","amount_exclude_tax":136363,"description":"..."}]'
                  />
                </details>
              </Panel>

              {/* ④ 追加オプション */}
              <Panel kicker="④ 追加オプション" title="オプション一覧（最大10件）">
                <p className="mb-2 text-[11px] text-(--color-slate)">
                  ランサーズ提案画面の <b>「追加オプション」</b> エリアに 1件ずつ登録（任意・最大10件）。
                </p>
                {optionsParseError && (
                  <p className="mb-2 text-xs text-(--color-vermilion)">⚠️ JSON パース失敗</p>
                )}
                {options.length > 0 && (
                  <div className="mb-3 grid gap-2">
                    {options.map((o, i) => (
                      <OptionCard key={i} o={o} index={i} onCopy={copyToClipboard} />
                    ))}
                  </div>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-(--color-slate)">▼ JSON を直接編集</summary>
                  <textarea
                    value={optionsJson}
                    onChange={(e) => setOptionsJson(e.target.value)}
                    className="field mt-2 block h-[14rem] w-full font-mono-id text-xs leading-6"
                    placeholder='[{"title":"追加1ページ","description":"...","contract_amount_exclude_tax":8000}]'
                  />
                </details>
              </Panel>
            </>
          )}

          {/* ── アクションバー ── */}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 border border-(--color-ink) bg-(--color-paper) px-4 py-3 shadow-[4px_4px_0_var(--color-ink)]">
            <button onClick={() => router.push('/')} className="btn btn-ghost">
              ← 一覧に戻る
            </button>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? '保存中…' : '💾 保存'}
            </button>
            <button onClick={copyRegenerationPrompt} className="btn btn-ghost">
              🤖 再生成依頼
            </button>
            {!isCW && (
              <button onClick={fillLancersForm} className="btn btn-azure">
                📤 ランサーズに流し込む
              </button>
            )}
            <button onClick={markUnableAndBack} className="btn btn-ghost">
              ⛔ 提案不可
            </button>
            <button onClick={markSubmittedAndBack} className="btn btn-vermilion">
              ✅ 提案済みにして一覧へ
            </button>
            <span className="ml-auto text-xs text-(--color-slate)">
              {statusMsg ?? (savedAt ? `保存済 · ${savedAt}` : '')}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-(--color-hairline) bg-(--color-paper-soft) px-5 py-4">
      <header className="mb-3 border-b border-(--color-hairline) pb-2">
        <p className="kicker">{kicker}</p>
        <h2 className="font-display text-lg font-bold text-(--color-ink)">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="meta-label">{label}</dt>
      <dd className="text-sm font-medium text-(--color-ink)">{value}</dd>
    </>
  );
}

// CW用マイルストーンカード（内容・金額・日付を個別コピー）
function CWMilestoneCard({
  m,
  onCopy,
}: {
  m: Milestone;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="border border-(--color-hairline) bg-(--color-paper) px-3 py-2 text-sm">
      <p className="font-mono-id text-[11px] text-(--color-slate)">
        完了予定日 {m.schedule_date} ／ 契約金額（税抜）{m.amount_exclude_tax?.toLocaleString()} 円
      </p>
      <p className="mt-1 text-[13px] text-(--color-ink)">{m.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => onCopy(m.description, 'マイルストーン 内容（note）')} className="btn btn-ghost text-[11px]">📋 内容（note）</button>
        <button onClick={() => onCopy(String(m.amount_exclude_tax), '契約金額（税抜）')} className="btn btn-ghost text-[11px]">📋 金額（税抜）</button>
        <button onClick={() => onCopy(m.schedule_date, '完了予定日')} className="btn btn-ghost text-[11px]">📋 完了予定日</button>
      </div>
    </div>
  );
}

function MilestoneCard({
  m,
  onCopy,
}: {
  m: Milestone;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="border border-(--color-hairline) bg-(--color-paper) px-3 py-2 text-sm">
      <p className="font-bold">{m.title}</p>
      <p className="mt-0.5 font-mono-id text-[11px] text-(--color-slate)">
        納期 {m.schedule_date} ／ 税抜 {m.amount_exclude_tax?.toLocaleString()} 円
      </p>
      <p className="mt-2 whitespace-pre-wrap text-[13px] text-(--color-ink-soft)">{m.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => onCopy(m.title, '計画 タイトル')} className="btn btn-ghost text-[11px]">📋 タイトル</button>
        <button onClick={() => onCopy(String(m.amount_exclude_tax), '計画 金額（税抜）')} className="btn btn-ghost text-[11px]">📋 金額</button>
        <button onClick={() => onCopy(m.description, '計画 詳細')} className="btn btn-ghost text-[11px]">📋 詳細</button>
      </div>
    </div>
  );
}

function OptionCard({
  o,
  index,
  onCopy,
}: {
  o: ProposalOption;
  index: number;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="border border-(--color-hairline) bg-(--color-paper) px-3 py-2 text-sm">
      <p className="font-bold">{index + 1}. {o.title}</p>
      <p className="mt-0.5 font-mono-id text-[11px] text-(--color-slate)">
        税抜 {o.contract_amount_exclude_tax?.toLocaleString()} 円
      </p>
      <p className="mt-2 whitespace-pre-wrap text-[13px] text-(--color-ink-soft)">{o.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => onCopy(o.title, `オプション${index + 1} タイトル`)} className="btn btn-ghost text-[11px]">📋 タイトル</button>
        <button onClick={() => onCopy(String(o.contract_amount_exclude_tax), `オプション${index + 1} 金額（税抜）`)} className="btn btn-ghost text-[11px]">📋 金額</button>
        <button onClick={() => onCopy(o.description, `オプション${index + 1} 詳細`)} className="btn btn-ghost text-[11px]">📋 詳細</button>
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-(--color-hairline) bg-(--color-paper) px-1 py-2">
      <p className="meta-label text-[0.62rem]">{label}</p>
      <p className="bignum mt-1 text-base text-(--color-ink)">{value}</p>
    </div>
  );
}
