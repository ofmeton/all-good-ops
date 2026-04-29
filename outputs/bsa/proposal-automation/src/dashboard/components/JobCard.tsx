'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { JobWithProposal } from '@/lib/db';

export function JobCard({
  job,
  kind,
}: {
  job: JobWithProposal;
  kind: 'proposal' | 'candidate';
}) {
  const [copied, setCopied] = useState(false);
  const fitClass =
    (job.fit_score ?? 0) >= 80
      ? 'text-orange-600'
      : (job.fit_score ?? 0) >= 60
      ? 'text-blue-600'
      : 'text-gray-600';

  async function copyId() {
    await navigator.clipboard.writeText(job.job_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyRegenerationPrompt() {
    const prompt = `BSA-PA: 案件 ${job.job_id} の提案文を生成してください。\n\n案件タイトル: ${job.title}\n\n（必要があれば指示を追記）`;
    await navigator.clipboard.writeText(prompt);
    await fetch('/api/generation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.job_id }),
    });
    alert('プロンプトをクリップボードにコピー & キューに追加しました。Claude Code に貼って依頼してください。');
  }

  async function copyProposal() {
    if (!job.body_md) return;
    await navigator.clipboard.writeText(job.body_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function markSubmitted() {
    if (!confirm('「入力済み」にしますか？')) return;
    await fetch(`/api/jobs/${job.job_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'submitted' }),
    });
    location.reload();
  }

  if (kind === 'candidate') {
    return (
      <div className="rounded-lg border bg-gray-50 p-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-gray-500">{job.job_id}</span>
          <span className={fitClass}>fit: {job.fit_score ?? '-'}</span>
          <span className="ml-auto"></span>
          <a
            href={job.detail_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            案件URL ↗
          </a>
          <button
            onClick={copyRegenerationPrompt}
            className="rounded bg-blue-50 px-2 py-1 text-xs hover:bg-blue-100"
          >
            ➕ 提案文生成を依頼
          </button>
          <button
            onClick={copyId}
            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
          >
            {copied ? '✓' : '📋 ID'}
          </button>
        </div>
        <div className="mt-1 truncate">{job.title}</div>
        <div className="mt-1 text-xs text-gray-500">予算: {job.budget_text ?? '-'}</div>
      </div>
    );
  }

  // proposal kind
  const submitted =
    job.status === 'submitted' ||
    job.status === 'replied' ||
    job.status === 'won' ||
    job.status === 'lost';

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-mono text-gray-500">{job.job_id}</span>
        <span className={`${fitClass} font-semibold`}>fit: {job.fit_score ?? '-'}</span>
        <span className="rounded bg-gray-100 px-2 py-0.5">{job.estimated_product_line ?? '-'}</span>
        {submitted ? (
          <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">{job.status}</span>
        ) : (
          <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-700">🆕 未送信</span>
        )}
      </div>
      <h3 className="mb-1 font-semibold">{job.title}</h3>
      <div className="mb-3 text-sm text-gray-600">
        予算: {job.budget_text ?? '-'} / 提案: {job.product_line} {job.price?.toLocaleString()}円 / {job.delivery_days}日
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href={`/proposals/${job.job_id}`}
          className="rounded bg-blue-100 px-3 py-1 hover:bg-blue-200"
        >
          📝 提案文を見る・編集
        </Link>
        <a
          href={job.detail_url}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200"
        >
          🔗 案件URL
        </a>
        <button onClick={copyProposal} className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">
          📋 提案文コピー
        </button>
        <button onClick={copyId} className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">
          {copied ? '✓' : '📋 ID'}
        </button>
        {!submitted && (
          <button
            onClick={markSubmitted}
            className="rounded bg-green-100 px-3 py-1 text-green-700 hover:bg-green-200"
          >
            ✅ 入力済みにする
          </button>
        )}
      </div>
    </div>
  );
}
