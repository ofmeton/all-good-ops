// app/page.tsx
import { getTodaysSummary } from '@/lib/db';
import { JobCard } from '@/components/JobCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const jobs = getTodaysSummary();
  const withProposal = jobs.filter((j) => j.proposal_id != null);
  const withoutProposal = jobs.filter((j) => j.proposal_id == null);
  const today = new Date().toISOString().slice(0, 10);

  const buckets = {
    high: withProposal.filter((j) => (j.fit_score ?? 0) >= 80),
    mid: withProposal.filter((j) => (j.fit_score ?? 0) >= 60 && (j.fit_score ?? 0) < 80),
    low: withProposal.filter((j) => (j.fit_score ?? 0) < 60),
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">BSA Proposal Automation</h1>
        <p className="text-sm text-gray-500">{today}</p>
      </header>

      <section className="mb-8 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div><span className="font-semibold">{jobs.length}</span> 件収集</div>
          <div><span className="font-semibold">{withProposal.length}</span> 件提案準備済み</div>
          <div className="text-orange-600">🔥 最優先 <span className="font-semibold">{buckets.high.length}</span> 件</div>
          <div className="text-blue-600">🎯 推奨 <span className="font-semibold">{buckets.mid.length}</span> 件</div>
          <div className="text-gray-600">📋 余裕 <span className="font-semibold">{buckets.low.length}</span> 件</div>
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <a href="/history" className="text-blue-600 hover:underline">📅 履歴を見る</a>
          <a href="/settings" className="text-blue-600 hover:underline">⚙️ 設定</a>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">提案文準備済み ({withProposal.length}件)</h2>
        <div className="space-y-3">
          {withProposal.map((j) => (
            <JobCard key={j.job_id} job={j} kind="proposal" />
          ))}
          {withProposal.length === 0 && (
            <p className="text-sm text-gray-500">本日の提案文はまだ生成されていません。</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">その他の案件 ({withoutProposal.length}件・未生成)</h2>
        <div className="space-y-2">
          {withoutProposal.map((j) => (
            <JobCard key={j.job_id} job={j} kind="candidate" />
          ))}
          {withoutProposal.length === 0 && (
            <p className="text-sm text-gray-500">未生成の案件はありません。</p>
          )}
        </div>
      </section>
    </main>
  );
}
