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
      <main className="container mx-auto p-6">
        <a href="/" className="text-sm text-blue-600">
          ← トップに戻る
        </a>
        <h1 className="mt-2 text-xl font-bold">提案文未生成</h1>
        <p className="mt-2 text-sm text-gray-600">この案件の提案文はまだ生成されていません。</p>
      </main>
    );
  }
  return <ProposalEditor data={data} />;
}
