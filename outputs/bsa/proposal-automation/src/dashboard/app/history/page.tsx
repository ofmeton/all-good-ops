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

const statusMeta: Record<
  string,
  { label: string; tone: 'ink' | 'amber' | 'azure' | 'moss' | 'vermilion' }
> = {
  collected: { label: '収集済', tone: 'ink' },
  proposing: { label: '準備中', tone: 'amber' },
  submitted: { label: '投下済', tone: 'azure' },
  replied: { label: '返信中', tone: 'azure' },
  won: { label: '受注 🏆', tone: 'moss' },
  lost: { label: '失注', tone: 'vermilion' },
};

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

  const ratePct = (kpi.conversionRate * 100).toFixed(1);
  const isKpiHit = kpi.conversionRate >= 0.01;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10 lg:py-12">
      {/* ── ヘッダ ── */}
      <header className="fade-in border-b-2 border-(--color-ink) pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <a href="/" className="text-xs text-(--color-slate) hover:text-(--color-ink)">
            ← 受注台帳に戻る
          </a>
          <p className="kicker">過去 30 日 / 200 件まで</p>
        </div>
        <h1 className="masthead mt-2 text-4xl text-(--color-ink) lg:text-5xl">受 注 履 歴</h1>
        <p className="font-display mt-2 text-sm text-(--color-ink-soft)">
          KGI 1.0% 受注率の達成度と全件履歴
        </p>
      </header>

      {/* ── KPI 受注率パネル ── */}
      <section className="fade-in-d1 mt-6 grid grid-cols-1 gap-0 border border-(--color-ink) bg-(--color-paper-soft) sm:grid-cols-4">
        <KpiCell label="提案 投下" value={kpi.submitted} unit="件" />
        <KpiCell label="返信 あり" value={kpi.replied} unit="件" />
        <KpiCell label="受注" value={kpi.won} unit="件" tone="moss" />
        <div className={`relative flex flex-col items-start justify-center px-6 py-5 ${isKpiHit ? 'bg-(--color-moss)' : 'bg-(--color-paper)'}`}>
          <p className={`meta-label ${isKpiHit ? 'text-(--color-paper)' : 'text-(--color-slate)'}`}>
            受注率 / KGI 1.0%
          </p>
          <p className={`bignum mt-1 text-4xl ${isKpiHit ? 'text-(--color-paper)' : 'text-(--color-ink)'}`}>
            {ratePct}%
          </p>
          <p className={`mt-1 text-xs ${isKpiHit ? 'text-(--color-paper)' : 'text-(--color-slate)'}`}>
            {isKpiHit ? '🎯 達成' : 'KGI 1.0% 目標'}
          </p>
        </div>
      </section>

      {/* ── 履歴テーブル ── */}
      <section className="fade-in-d2 mt-12">
        <div className="border-b border-(--color-ink) pb-3">
          <p className="kicker">— 全件 履歴 —</p>
          <h2 className="headline mt-1 text-2xl text-(--color-ink) lg:text-3xl">案件 タイムライン</h2>
        </div>

        <div className="mt-6 overflow-x-auto border border-(--color-hairline) bg-(--color-paper-soft)">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-ink) bg-(--color-paper)">
                <Th>ID</Th>
                <Th className="w-2/5">タイトル</Th>
                <Th className="text-right">予算</Th>
                <Th className="text-center">FIT</Th>
                <Th className="text-center">ライン</Th>
                <Th className="text-right">提案 金額</Th>
                <Th className="text-center">投下</Th>
                <Th className="text-center">ステータス</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => {
                const status = statusMeta[j.status] ?? { label: j.status, tone: 'ink' as const };
                return (
                  <tr
                    key={j.job_id}
                    className={`border-b border-(--color-hairline) transition-colors hover:bg-(--color-paper) ${i % 2 === 1 ? 'bg-[rgba(0,0,0,0.015)]' : ''}`}
                  >
                    <Td>
                      <a
                        href={`/proposals/${j.job_id}`}
                        className="mono-tag text-(--color-azure) underline-offset-4 hover:underline"
                      >
                        {j.job_id}
                      </a>
                    </Td>
                    <Td className="max-w-md truncate font-display">{j.title}</Td>
                    <Td className="text-right font-mono-id text-xs">{j.budget_text ?? '—'}</Td>
                    <Td className="text-center font-mono-id font-semibold">
                      {j.fit_score ?? '—'}
                    </Td>
                    <Td className="text-center font-mono-id font-semibold">
                      {j.product_line ?? '—'}
                    </Td>
                    <Td className="text-right font-mono-id">
                      {j.price ? `${j.price.toLocaleString()} 円` : '—'}
                    </Td>
                    <Td className="text-center">{j.submitted_at ? '✅' : '—'}</Td>
                    <Td className="text-center">
                      <span
                        className={`tag tag-outline ${
                          status.tone === 'moss'
                            ? 'border-(--color-moss) text-(--color-moss)'
                            : status.tone === 'vermilion'
                            ? 'border-(--color-vermilion) text-(--color-vermilion)'
                            : status.tone === 'azure'
                            ? 'border-(--color-azure) text-(--color-azure)'
                            : status.tone === 'amber'
                            ? 'border-(--color-amber) text-(--color-amber)'
                            : ''
                        }`}
                      >
                        {status.label}
                      </span>
                    </Td>
                  </tr>
                );
              })}
              {jobs.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-(--color-slate)"
                  >
                    履歴がまだありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function KpiCell({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: number;
  unit: string;
  tone?: 'moss';
}) {
  const color = tone === 'moss' ? 'text-(--color-moss)' : 'text-(--color-ink)';
  return (
    <div className="border-r border-(--color-hairline) px-6 py-5 last:border-r-0">
      <p className="meta-label">{label}</p>
      <p className={`bignum mt-1 text-3xl ${color}`}>
        {value}
        <span className="ml-1 text-base font-medium tracking-tight text-(--color-slate)">{unit}</span>
      </p>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 text-left text-[0.7rem] font-bold uppercase tracking-wider text-(--color-slate) ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-(--color-ink) ${className}`}>{children}</td>;
}
