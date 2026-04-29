// app/history/page.tsx
import { getDb, getKpiStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface HistoryRow {
  job_id: string;
  title: string;
  status: string;
  fit_score: number | null;
  budget_text: string | null;
  collected_at: string;
  submitted_at: string | null;
  product_line: string | null;
  price: number | null;
}

export default async function History() {
  const db = getDb();
  const jobs = db
    .prepare(
      `SELECT j.job_id, j.title, j.status, j.fit_score, j.budget_text, j.collected_at,
              p.submitted_at, p.product_line, p.price
       FROM jobs j LEFT JOIN proposals p ON p.job_id = j.job_id
       ORDER BY j.collected_at DESC LIMIT 200`
    )
    .all() as HistoryRow[];
  const kpi = getKpiStats();

  const statusLabel: Record<string, string> = {
    collected: '🔵 収集済',
    proposing: '🟡 準備中',
    submitted: '✅ 投下済',
    replied: '💬 返信中',
    won: '🏆 受注',
    lost: '❌ 失注',
  };

  const rateClass =
    kpi.conversionRate >= 0.01 ? 'text-green-600' : 'text-gray-600';

  return (
    <main className="container mx-auto p-6">
      <a href="/" className="text-sm text-blue-600">
        ← 戻る
      </a>
      <h1 className="mt-2 text-xl font-bold">履歴・受注管理</h1>

      <section className="my-6 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">📊 受注率（過去30日）</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            提案投下: <span className="text-lg font-bold">{kpi.submitted}</span>
          </div>
          <div>
            返信あり: <span className="text-lg font-bold">{kpi.replied}</span>
          </div>
          <div>
            受注: <span className="text-lg font-bold">{kpi.won}</span>
          </div>
          <div className={rateClass}>
            受注率:{' '}
            <span className="text-lg font-bold">
              {(kpi.conversionRate * 100).toFixed(1)}%
            </span>
            {kpi.conversionRate >= 0.01 ? ' 🎯 KPI達成' : ' (KPI 1%目標)'}
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">タイトル</th>
              <th className="p-2 text-left">予算</th>
              <th className="p-2 text-left">fit</th>
              <th className="p-2 text-left">商品ライン</th>
              <th className="p-2 text-left">投下</th>
              <th className="p-2 text-left">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.job_id} className="border-t hover:bg-gray-50">
                <td className="p-2 font-mono text-xs">
                  <a
                    href={`/proposals/${j.job_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {j.job_id}
                  </a>
                </td>
                <td className="max-w-xs truncate p-2">{j.title}</td>
                <td className="p-2">{j.budget_text ?? '-'}</td>
                <td className="p-2">{j.fit_score ?? '-'}</td>
                <td className="p-2">{j.product_line ?? '-'}</td>
                <td className="p-2">{j.submitted_at ? '✅' : '-'}</td>
                <td className="p-2">{statusLabel[j.status] ?? j.status}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  履歴がまだありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
