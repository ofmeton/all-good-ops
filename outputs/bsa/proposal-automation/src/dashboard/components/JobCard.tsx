'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { JobWithProposal } from '@/lib/db';

export function JobCard({
  job,
  kind,
}: {
  job: JobWithProposal;
  kind: 'proposal' | 'candidate';
}) {
  const router = useRouter();
  const [copied, setCopied] = useState<null | 'id'>(null);

  const fitScore = job.fit_score ?? 0;
  const fitTone =
    fitScore >= 80
      ? { tone: 'vermilion' as const, label: '🔥 最優先' }
      : fitScore >= 60
      ? { tone: 'azure' as const, label: '🎯 推奨' }
      : { tone: 'amber' as const, label: '📋 余裕' };

  const isCW = job.platform_prefix === 'CW';
  const platformLabel = isCW ? 'CrowdWorks ↗' : 'Lancers ↗';

  async function copyId(e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(job.job_id);
    setCopied('id');
    setTimeout(() => setCopied(null), 1500);
  }

  async function copyRegenerationPrompt(e: React.MouseEvent) {
    e.stopPropagation();
    const prompt = `BSA-PA: 案件 ${job.job_id} の提案文を生成してください。

案件タイトル: ${job.title}

（必要があれば指示を追記）`;
    await navigator.clipboard.writeText(prompt);
    await fetch('/api/generation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.job_id }),
    });
    alert('プロンプトをクリップボードにコピー & キューに追加しました。Claude Code に貼って依頼してください。');
  }

  async function markSubmitted(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('「入力済み」にしますか？')) return;
    await fetch(`/api/jobs/${job.job_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'submitted' }),
    });
    location.reload();
  }

  async function markUnable(e: React.MouseEvent) {
    e.stopPropagation();
    const note = window.prompt('提案不可の理由を入力してください');
    if (!note) return;
    await fetch(`/api/jobs/${job.job_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'unable_to_submit', note }),
    });
    location.reload();
  }

  /* ── 候補（未生成）カード ─────────────────────────────────────── */
  if (kind === 'candidate') {
    return (
      <article
        className="card relative grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 hover:bg-(--color-paper-soft)"
        onClick={() => router.push(`/proposals/${job.job_id}`)}
      >
        <span className="mono-tag bg-(--color-paper) px-2 py-1 text-(--color-ink) ring-1 ring-(--color-hairline)">
          {job.job_id}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold text-(--color-ink)">{job.title}</h3>
          <p className="meta-label mt-0.5 truncate">
            予算 {job.budget_text ?? '-'} · fit {fitScore}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyRegenerationPrompt} className="btn btn-ghost text-xs">
            ➕ 生成依頼
          </button>
          <a
            href={job.detail_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {platformLabel}
          </a>
          <button onClick={copyId} className="btn btn-ghost text-xs">
            {copied === 'id' ? '✓' : '📋 ID'}
          </button>
        </div>
      </article>
    );
  }

  /* ── 提案文準備済みカード ──────────────────────────────────── */
  const submitted =
    job.status === 'submitted' ||
    job.status === 'replied' ||
    job.status === 'won' ||
    job.status === 'lost';

  const isPriority = fitScore >= 80;

  const previewText = job.description_md ?? job.body_md;

  const statusBadge = submitted ? (
    <span className="tag tag-moss">投下済 · {job.status}</span>
  ) : (
    <span className="tag tag-outline border-(--color-vermilion) text-(--color-vermilion)">未送信</span>
  );

  const toneBadge = (
    <span
      className={`tag ${
        fitTone.tone === 'vermilion'
          ? 'tag-vermilion'
          : fitTone.tone === 'azure'
          ? 'tag-azure'
          : 'tag-amber'
      }`}
    >
      {fitTone.label}
    </span>
  );

  return (
    <article
      className={`card relative cursor-pointer ${isPriority ? 'is-priority priority-bar' : ''} px-6 py-5 hover:bg-(--color-paper-soft)`}
      onClick={() => router.push(`/proposals/${job.job_id}`)}
    >
      {/* ── 上段: メタ情報 ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="mono-tag bg-(--color-paper) px-2 py-1 ring-1 ring-(--color-hairline)">
            {job.job_id}
          </span>
          {toneBadge}
          {statusBadge}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="meta-label">FIT</span>
          <span className="bignum text-2xl text-(--color-ink)">{fitScore}</span>
          <span className="meta-label">/ 100</span>
        </div>
      </div>

      {/* ── タイトル ── */}
      <h3 className="headline mt-3 text-xl text-(--color-ink) lg:text-2xl">
        {job.title}
      </h3>

      {/* ── 本文プレビュー ── */}
      {previewText && (
        <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-relaxed text-(--color-ink-soft)">
          {previewText.slice(0, 160)}…
        </p>
      )}

      {/* ── 数値帯 ── */}
      <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-2 border-t border-(--color-hairline) pt-3">
        <Cell label="商品ライン" value={job.product_line ?? '-'} mono />
        <Cell
          label="提案 金額"
          value={job.price ? `${job.price.toLocaleString()} 円` : '-'}
        />
        <Cell label="納期" value={job.delivery_days ? `${job.delivery_days} 日` : '-'} />
        <Cell label="案件 予算" value={job.budget_text ?? '-'} small />
        <Cell label="締切" value={job.deadline ?? '-'} small />
        <Cell label="発注者" value={job.client_name ?? '-'} small />
      </dl>

      {/* ── アクション ── */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-(--color-hairline) pt-4">
        <a
          href={job.detail_url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
          onClick={(e) => e.stopPropagation()}
        >
          {platformLabel}
        </a>
        <button onClick={copyId} className="btn btn-ghost">
          {copied === 'id' ? '✓' : '📋 ID'}
        </button>
        <span className="ml-auto" />
        {!submitted && (
          <>
            <button onClick={markUnable} className="btn btn-ghost">
              ⛔ 提案不可
            </button>
            <button onClick={markSubmitted} className="btn btn-moss">
              ✅ 入力済みにする
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Cell — 数値帯の1セル
   ────────────────────────────────────────────────────────────────── */
function Cell({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <dt className="meta-label">{label}</dt>
      <dd
        className={`mt-0.5 text-(--color-ink) ${mono ? 'font-mono-id text-sm font-semibold' : ''} ${
          small ? 'text-xs' : 'text-sm font-semibold'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
