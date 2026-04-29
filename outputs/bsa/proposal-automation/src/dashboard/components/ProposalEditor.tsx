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
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  async function copyForChromeFill() {
    const prompt = `Lancers の応募ページ ( ${data.detail_url} ) を開き、以下の内容でフォームに入力してください。送信ボタンは押さないでください。\n\n金額: ${price.toLocaleString()} 円\n納期: ${days} 日\n\n提案文:\n\n${bodyMd}`;
    await navigator.clipboard.writeText(prompt);
    alert('Claude in Chrome 用プロンプトをコピーしました。Chrome で Claude 拡張に貼り付けてください。');
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
    alert('Claude Code 用プロンプトをコピー & キューに追加しました。');
  }

  const breakdown = data.fit_score_breakdown
    ? (JSON.parse(data.fit_score_breakdown) as Record<string, number | string>)
    : null;

  return (
    <main className="container mx-auto grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <section>
        <a href="/" className="text-sm text-blue-600">
          ← 戻る
        </a>
        <h1 className="mt-2 text-xl font-bold">{data.title}</h1>
        <div className="mt-1 font-mono text-xs text-gray-500">{data.job_id}</div>

        <div className="mt-4 rounded-lg border bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold">案件情報</h2>
          <dl className="grid grid-cols-2 gap-y-1">
            <dt className="text-gray-500">予算</dt>
            <dd>{data.budget_text ?? '-'}</dd>
            <dt className="text-gray-500">締切</dt>
            <dd>{data.deadline ?? '-'}</dd>
            <dt className="text-gray-500">提案数</dt>
            <dd>{data.proposal_count ?? '-'}</dd>
            <dt className="text-gray-500">発注者</dt>
            <dd>{data.client_name ?? '-'}</dd>
            <dt className="text-gray-500">本人確認</dt>
            <dd>{data.client_verified ? '✅' : '❌'}</dd>
            <dt className="text-gray-500">実績</dt>
            <dd>{data.client_history_count ?? '-'} 件</dd>
            <dt className="text-gray-500">fit_score</dt>
            <dd className="font-semibold">{data.fit_score}</dd>
          </dl>
          {breakdown && (
            <div className="mt-3 text-xs text-gray-600">
              内訳: 価格 {breakdown.price} / サービス {breakdown.service} / 制約 {breakdown.constraint} / 速度 {breakdown.speed} / クライアント {breakdown.client}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg border bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold">案件本文</h2>
          <div className="whitespace-pre-wrap text-gray-700">{data.description}</div>
        </div>

        {data.research_notes && (
          <div className="mt-4 rounded-lg border bg-white p-4 text-sm">
            <h2 className="mb-2 font-semibold">リサーチノート</h2>
            <div className="whitespace-pre-wrap text-gray-700">{data.research_notes}</div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">提案内容</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <label>
              商品ライン
              <select
                value={productLine}
                onChange={(e) => setProductLine(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              >
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="L4">L4</option>
              </select>
            </label>
            <label>
              金額(円)
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label>
              納期(日)
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">提案文 (Markdown)</h2>
          <textarea
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            className="h-96 w-full rounded border p-3 font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '💾 保存'}
          </button>
          <button onClick={copyRegenerationPrompt} className="rounded border px-4 py-2 hover:bg-gray-50">
            🤖 Claude に再生成依頼
          </button>
          <button
            onClick={copyForChromeFill}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            📥 Claude in Chrome でフォーム入力
          </button>
          {savedAt && <span className="ml-auto self-center text-xs text-gray-500">保存済 {savedAt}</span>}
        </div>
      </section>
    </main>
  );
}
