'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// history page から submitted/replied 案件のステータス振り分けを行う最小UI。
// 受注は ProposalEditor 側のモーダルに任せるため、ここでは「→詳細へ」リンクで誘導。
export function HistoryRowActions({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (status !== 'submitted' && status !== 'replied') {
    return <span className="text-(--color-slate)">—</span>;
  }

  async function transition(next: 'replied' | 'lost' | 'expired', note: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, note }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {status === 'submitted' && (
        <button
          onClick={() => transition('replied', '先方から返信あり')}
          disabled={busy}
          className="btn btn-ghost text-[11px]"
          title="返信あり"
        >
          📩
        </button>
      )}
      <a href={`/proposals/${jobId}`} className="btn btn-ghost text-[11px]" title="受注は詳細画面で">
        🏆
      </a>
      <button
        onClick={() => transition('lost', '見送り通知')}
        disabled={busy}
        className="btn btn-ghost text-[11px]"
        title="見送り"
      >
        ❌
      </button>
      <button
        onClick={() => transition('expired', '無反応のまま期限切れ')}
        disabled={busy}
        className="btn btn-ghost text-[11px]"
        title="期限切れ"
      >
        ⏰
      </button>
    </div>
  );
}
