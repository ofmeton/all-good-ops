'use client';

import { useState } from 'react';
import type { JobWithProposal } from '@/lib/db';

export function ProposalEditor({ data }: { data: JobWithProposal }) {
  const [bodyMd, setBodyMd] = useState(data.body_md ?? '');
  const [productLine, setProductLine] = useState(data.product_line ?? 'L1');
  const [price, setPrice] = useState(data.price ?? 30000);
  const [days, setDays] = useState(data.delivery_days ?? 3);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/proposals/${data.job_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body_md: bodyMd,
          product_line: productLine,
          price,
          delivery_days: days,
        }),
      });
      setSavedAt(new Date().toLocaleTimeString('ja-JP'));
    } finally {
      setSaving(false);
    }
  }

  async function copyForChromeFill() {
    const prompt = `Lancers の応募ページ ( ${data.detail_url} ) を開き、以下の内容でフォームに入力してください。送信ボタンは押さないでください。

金額: ${price.toLocaleString()} 円
納期: ${days} 日

提案文:

${bodyMd}`;
    await navigator.clipboard.writeText(prompt);
    alert('Claude in Chrome 用プロンプトをコピーしました。Chrome で Claude 拡張に貼り付けてください。');
  }

  async function copyRegenerationPrompt() {
    const hint = window.prompt('修正の指示を入力してください（例: もっとカジュアルに）') ?? '';
    const text = `BSA-PA: 案件 ${data.job_id} の提案文を生成し直してください。

指示: ${hint}

（提案文は SQLite proposals テーブル job_id=${data.job_id} を upsert で更新）`;
    await navigator.clipboard.writeText(text);
    await fetch('/api/generation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: data.job_id, prompt_hint: hint }),
    });
    alert('Claude Code 用プロンプトをコピー & キューに追加しました。');
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
          <p className="mono-tag text-(--color-slate)">{data.job_id}</p>
        </div>
        <p className="kicker mt-2">案件レビュー / 提案文編集</p>
        <h1 className="headline mt-1 text-2xl text-(--color-ink) lg:text-3xl">{data.title}</h1>
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
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="meta-label">商品ライン</span>
                <select
                  value={productLine}
                  onChange={(e) => setProductLine(e.target.value)}
                  className="field field-mono mt-1"
                >
                  <option value="L1">L1 · Single LP</option>
                  <option value="L2">L2 · Corporate 5P</option>
                  <option value="L3">L3 · LP + 広告運用</option>
                  <option value="L4">L4 · 修正 / 改修</option>
                </select>
              </label>
              <label className="block">
                <span className="meta-label">金額 (円)</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="field field-mono mt-1"
                />
              </label>
              <label className="block">
                <span className="meta-label">納期 (日)</span>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="field field-mono mt-1"
                />
              </label>
            </div>
          </Panel>

          <Panel kicker="提案 本文" title="Markdown 編集">
            <textarea
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              className="field block h-[34rem] w-full font-mono-id text-sm leading-7"
              placeholder="〇〇様&#10;&#10;ご依頼拝見しました。..."
            />
          </Panel>

          {/* ── アクションバー ── */}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 border border-(--color-ink) bg-(--color-paper) px-4 py-3 shadow-[4px_4px_0_var(--color-ink)]">
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? '保存中…' : '💾 保存'}
            </button>
            <button onClick={copyRegenerationPrompt} className="btn btn-ghost">
              🤖 Claude に再生成依頼
            </button>
            <button onClick={copyForChromeFill} className="btn btn-vermilion">
              📥 Chrome でフォーム入力
            </button>
            {savedAt && (
              <span className="ml-auto text-xs text-(--color-slate)">
                保存済 · {savedAt}
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Panel - 紙面の枠囲み
   ────────────────────────────────────────────────────────────────── */
function Panel({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
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

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-(--color-hairline) bg-(--color-paper) px-1 py-2">
      <p className="meta-label text-[0.62rem]">{label}</p>
      <p className="bignum mt-1 text-base text-(--color-ink)">{value}</p>
    </div>
  );
}
