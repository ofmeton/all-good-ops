import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface SessionRow {
  platform_prefix: string;
  cookie_path: string;
  logged_in_at: string | null;
  last_validated_at: string | null;
  valid: number;
}

interface PlatformRow {
  prefix: string;
  name: string;
  search_urls: string;
  enabled: number;
}

export default async function Settings() {
  const db = getDb();

  const session =
    (db
      .prepare("SELECT * FROM sessions WHERE platform_prefix = 'LAN'")
      .get() as SessionRow | undefined) ?? null;

  const exaCount = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM exa_usage WHERE called_at >= datetime('now', 'start of month')`
      )
      .get() as { c: number }
  ).c;

  const platforms = db.prepare('SELECT * FROM platforms').all() as PlatformRow[];

  const exaPct = Math.min(100, (exaCount / 1000) * 100);
  const exaWarning = exaCount >= 800;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 lg:px-10 lg:py-12">
      {/* ── ヘッダ ── */}
      <header className="fade-in border-b-2 border-(--color-ink) pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <a href="/" className="text-xs text-(--color-slate) hover:text-(--color-ink)">
            ← 受注台帳に戻る
          </a>
          <p className="kicker">編集部 控室</p>
        </div>
        <h1 className="masthead mt-2 text-4xl text-(--color-ink) lg:text-5xl">設 定</h1>
        <p className="font-display mt-2 text-sm text-(--color-ink-soft)">
          接続状態・媒体・配信枠
        </p>
      </header>

      {/* ── Lancers 接続 ── */}
      <Panel kicker="プラットフォーム 接続" title="Lancers">
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <Dt>状態</Dt>
          <Dd>
            {session?.valid ? (
              <span className="tag tag-moss">✅ 有効</span>
            ) : (
              <span className="tag tag-outline border-(--color-vermilion) text-(--color-vermilion)">
                ❌ 無効
              </span>
            )}
          </Dd>
          <Dt>最終ログイン</Dt>
          <Dd className="font-mono-id text-xs">{session?.logged_in_at ?? '—'}</Dd>
          <Dt>最終検証</Dt>
          <Dd className="font-mono-id text-xs">{session?.last_validated_at ?? '—'}</Dd>
          <Dt>Cookie</Dt>
          <Dd className="font-mono-id text-[11px] break-all text-(--color-slate)">
            {session?.cookie_path ?? '—'}
          </Dd>
        </dl>
        <p className="mt-4 border-l-2 border-(--color-hairline) pl-3 text-xs text-(--color-slate)">
          再ログインが必要なら、ターミナルで{' '}
          <code className="bg-(--color-paper) px-1.5 py-0.5 font-mono-id text-(--color-ink)">
            scripts/relogin.sh
          </code>{' '}
          を実行
        </p>
      </Panel>

      {/* ── 媒体 ── */}
      <Panel kicker="検索 対象" title="媒体一覧">
        <div className="space-y-4">
          {platforms.map((p) => {
            let urls: string[] = [];
            try {
              urls = JSON.parse(p.search_urls) as string[];
            } catch {
              urls = [];
            }
            return (
              <div key={p.prefix} className="border border-(--color-hairline) bg-(--color-paper) px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="mono-tag bg-(--color-ink) px-2 py-1 text-(--color-paper)">
                    {p.prefix}
                  </span>
                  <span className="font-display text-base font-bold text-(--color-ink)">
                    {p.name}
                  </span>
                  <span className="ml-auto text-xs">
                    {p.enabled ? (
                      <span className="text-(--color-moss)">有効</span>
                    ) : (
                      <span className="text-(--color-slate)">無効</span>
                    )}
                  </span>
                </div>
                <ul className="mt-2 space-y-0.5 pl-3 text-[11px] text-(--color-slate)">
                  {urls.map((u) => (
                    <li key={u} className="truncate font-mono-id">
                      → {u.replace('https://www.lancers.jp', '')}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── Exa 利用状況 ── */}
      <Panel kicker="API 利用" title="Exa 検索 (今月)">
        <div className="flex items-baseline gap-3">
          <span className="bignum text-4xl text-(--color-ink)">{exaCount}</span>
          <span className="text-sm text-(--color-slate)">/ 1,000 検索</span>
        </div>
        <div className="mt-3 h-2 border border-(--color-ink) bg-(--color-paper)">
          <div
            className={`h-full ${exaWarning ? 'bg-(--color-vermilion)' : 'bg-(--color-azure)'}`}
            style={{ width: `${exaPct}%` }}
          />
        </div>
        {exaWarning && (
          <p className="mt-2 text-xs text-(--color-vermilion)">
            ⚠️ 80% に到達しました。1,000 到達で自動停止します。
          </p>
        )}
      </Panel>

      {/* ── Phase 2 ── */}
      <Panel kicker="Phase 2 予定" title="fit_score 配点 調整" muted>
        <div className="text-sm text-(--color-slate)">
          🔒 fit_score 5 軸（価格・サービス・制約・速度・クライアント）の配点調整 UI は Phase 2 で実装予定。
        </div>
      </Panel>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Panel
   ────────────────────────────────────────────────────────────────── */
function Panel({
  kicker,
  title,
  children,
  muted,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className={`fade-in-d1 mt-8 border ${muted ? 'border-dashed border-(--color-hairline)' : 'border-(--color-hairline)'} bg-(--color-paper-soft) px-5 py-4`}
    >
      <header className="mb-3 border-b border-(--color-hairline) pb-2">
        <p className="kicker">{kicker}</p>
        <h2 className="font-display text-lg font-bold text-(--color-ink)">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="meta-label self-center">{children}</dt>;
}

function Dd({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <dd className={`text-(--color-ink) ${className}`}>{children}</dd>;
}
