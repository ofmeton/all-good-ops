import { notFound } from 'next/navigation';
import { getJobWithProposal } from '@/lib/db';
import { ProposalEditor } from '@/components/ProposalEditor';

export const dynamic = 'force-dynamic';

export default async function ProposalEditPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const data = getJobWithProposal(jobId);
  if (!data) notFound();
  if (!data.proposal_id) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <a href="/" className="text-xs text-(--color-slate) hover:text-(--color-ink)">
          ← 受注台帳に戻る
        </a>
        <header className="mt-4 border-b-2 border-(--color-ink) pb-4">
          <p className="kicker">提案文 未生成</p>
          <h1 className="masthead mt-2 text-3xl text-(--color-ink)">提案文 はまだ書かれていません</h1>
        </header>
        <p className="mt-6 leading-relaxed text-(--color-ink-soft)">
          この案件 (<span className="mono-tag">{jobId}</span>) の提案文はまだ生成されていません。<br />
          トップに戻り「➕ 生成依頼」を押すと、次回の収集サイクル時に自動で生成されます。
        </p>
      </main>
    );
  }
  return <ProposalEditor data={data} />;
}
