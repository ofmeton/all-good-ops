import { getTodaysSummary } from '@/lib/db';
import { JobCard } from '@/components/JobCard';

export const dynamic = 'force-dynamic';

function formatDateJP(d: Date): { ymd: string; weekday: string; en: string } {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const enWeekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return {
    ymd: `${y}年 ${m}月 ${day}日`,
    weekday: weekdays[d.getDay()],
    en: `${enWeekdays[d.getDay()]} · ${String(m).padStart(2, '0')}.${String(day).padStart(2, '0')}.${y}`,
  };
}

export default async function Home() {
  const jobs = getTodaysSummary();
  const withProposal = jobs.filter((j) => j.proposal_id != null);
  const withoutProposal = jobs.filter((j) => j.proposal_id == null);
  const today = formatDateJP(new Date());

  const buckets = {
    high: withProposal.filter((j) => (j.fit_score ?? 0) >= 80),
    mid: withProposal.filter((j) => (j.fit_score ?? 0) >= 60 && (j.fit_score ?? 0) < 80),
    low: withProposal.filter((j) => (j.fit_score ?? 0) < 60),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10 lg:py-12">
      {/* ─── マストヘッド ─────────────────────────────────────────── */}
      <header className="fade-in border-b-2 border-(--color-ink) pb-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="kicker">第 1 号 · BSA 受注台帳</p>
          <p className="mono-tag text-(--color-slate)">{today.en}</p>
        </div>
        <h1 className="masthead mt-2 text-5xl tracking-tight text-(--color-ink) lg:text-6xl">
          受 注 台 帳
        </h1>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <p className="font-display text-base text-(--color-ink-soft)">
            {today.ymd}
            <span className="ml-2 inline-block bg-(--color-ink) px-2 py-0.5 text-xs text-(--color-paper)">
              {today.weekday}曜
            </span>
          </p>
          <nav className="flex items-center gap-3 text-xs">
            <a href="/history" className="border-b border-transparent pb-0.5 text-(--color-ink) transition hover:border-(--color-ink)">履歴</a>
            <span className="text-(--color-hairline)">·</span>
            <a href="/settings" className="border-b border-transparent pb-0.5 text-(--color-ink) transition hover:border-(--color-ink)">設定</a>
          </nav>
        </div>
      </header>

      {/* ─── 概況リボン ─────────────────────────────────────────── */}
      <section className="fade-in-d1 mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border border-(--color-ink) bg-(--color-paper-soft) px-6 py-5 sm:grid-cols-4">
        <Stat label="本日 収集" value={jobs.length} unit="件" />
        <Stat label="提案文 準備済" value={withProposal.length} unit="件" tone="moss" />
        <Stat label="🔥 最優先" value={buckets.high.length} unit="件" tone="vermilion" />
        <Stat label="🎯 推奨 / 余裕" value={`${buckets.mid.length} / ${buckets.low.length}`} unit="件" tone="azure" />
      </section>

      {/* ─── 提案文準備済み ─────────────────────────────────────── */}
      <section className="fade-in-d2 mt-12">
        <SectionHeader
          kicker="提案文 準備済"
          title="本日の提案候補"
          subtitle={`${withProposal.length} 件 / 編集後にフォーム送信`}
        />
        {withProposal.length > 0 ? (
          <div className="mt-6 grid gap-5">
            {withProposal.map((j) => (
              <JobCard key={j.job_id} job={j} kind="proposal" />
            ))}
          </div>
        ) : (
          <EmptyNote text="本日の提案文はまだ生成されていません。" />
        )}
      </section>

      {/* ─── 未生成案件 ────────────────────────────────────────── */}
      <section className="fade-in-d3 mt-12">
        <SectionHeader
          kicker="その他案件"
          title="生成待ちの引き出し"
          subtitle={`${withoutProposal.length} 件 / 必要なら追加生成を依頼`}
        />
        {withoutProposal.length > 0 ? (
          <div className="mt-6 grid gap-3">
            {withoutProposal.map((j) => (
              <JobCard key={j.job_id} job={j} kind="candidate" />
            ))}
          </div>
        ) : (
          <EmptyNote text="未生成の案件はありません。" />
        )}
      </section>

      {/* ─── フッター ────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-(--color-hairline) pt-6 pb-2">
        <div className="flex items-baseline justify-between gap-4 text-xs text-(--color-slate)">
          <p className="font-display tracking-wider">BSA Proposal Automation · 工藤陸 編集部</p>
          <p className="mono-tag">localhost:3000</p>
        </div>
      </footer>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Subcomponents
   ────────────────────────────────────────────────────────────────── */

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: number | string;
  unit?: string;
  tone?: 'vermilion' | 'moss' | 'azure';
}) {
  const toneColor =
    tone === 'vermilion'
      ? 'text-(--color-vermilion)'
      : tone === 'moss'
      ? 'text-(--color-moss)'
      : tone === 'azure'
      ? 'text-(--color-azure)'
      : 'text-(--color-ink)';
  return (
    <div className="border-l-2 border-(--color-hairline) pl-4">
      <p className="meta-label">{label}</p>
      <p className={`bignum mt-1 text-3xl ${toneColor}`}>
        {value}
        {unit && <span className="ml-1 text-base font-medium tracking-tight">{unit}</span>}
      </p>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-(--color-ink) pb-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="kicker">— {kicker} —</p>
        {subtitle && <p className="text-xs text-(--color-slate)">{subtitle}</p>}
      </div>
      <h2 className="headline mt-1 text-2xl text-(--color-ink) lg:text-3xl">{title}</h2>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="mt-4 border border-dashed border-(--color-hairline) bg-(--color-paper-soft) px-4 py-6 text-center text-sm text-(--color-slate)">
      {text}
    </div>
  );
}
