// app/settings/page.tsx
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

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <a href="/" className="text-sm text-blue-600">
        ← 戻る
      </a>
      <h1 className="mt-2 text-xl font-bold">設定</h1>

      <section className="my-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Lancers 接続</h2>
        <dl className="space-y-1 text-sm">
          <div>状態: {session?.valid ? '✅ 有効' : '❌ 無効'}</div>
          <div>最終ログイン: {session?.logged_in_at ?? '-'}</div>
          <div>最終検証: {session?.last_validated_at ?? '-'}</div>
          <div className="font-mono text-xs text-gray-500">
            Cookie: {session?.cookie_path ?? '-'}
          </div>
        </dl>
        <p className="mt-3 text-xs text-gray-500">
          再ログインが必要な場合は、ターミナルで{' '}
          <code className="rounded bg-gray-100 px-1">scripts/relogin.sh</code>{' '}
          を実行してください。
        </p>
      </section>

      <section className="my-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">媒体</h2>
        {platforms.map((p) => {
          let urls: string[] = [];
          try {
            urls = JSON.parse(p.search_urls) as string[];
          } catch {
            urls = [];
          }
          return (
            <div key={p.prefix} className="mb-2">
              <span className="font-mono">{p.prefix}</span> — {p.name} (
              {p.enabled ? '有効' : '無効'})
              <ul className="ml-6 list-disc text-xs text-gray-600">
                {urls.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          );
        })}
        {platforms.length === 0 && (
          <p className="text-sm text-gray-500">媒体が登録されていません。</p>
        )}
      </section>

      <section className="my-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Exa API 利用状況（今月）</h2>
        <div className="text-sm">{exaCount} / 1000 検索</div>
        <div className="mt-1 h-2 rounded bg-gray-200">
          <div
            className={`h-2 rounded ${exaCount >= 800 ? 'bg-orange-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, (exaCount / 1000) * 100)}%` }}
          />
        </div>
        {exaCount >= 800 && (
          <p className="mt-2 text-xs text-orange-600">⚠️ 80% に到達しています</p>
        )}
      </section>

      <section className="my-6 rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
        <h2 className="font-semibold">fit_score 配点調整</h2>
        <p className="mt-1">🔒 Phase 2 で実装予定</p>
      </section>
    </main>
  );
}
