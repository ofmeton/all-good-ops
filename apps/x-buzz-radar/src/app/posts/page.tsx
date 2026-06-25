import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  if (!supabaseAdmin) {
    return (
      <main>
        <h1>投稿管理</h1>
        <div className="card">
          <p>⚠️ Supabase が未設定です。</p>
        </div>
      </main>
    );
  }

  const { data: drafts } = await supabaseAdmin
    .from("enrichment_drafts")
    .select("*, buzz:x_buzz_tweets(author_screen_name, body, tweet_id)")
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: posts } = await supabaseAdmin
    .from("our_posts")
    .select(
      "post_id, platform, post_url, posted_at, is_paid, snapshots:post_engagement_snapshots(hours_since_post, likes, retweets, comments, views, source)",
    )
    .order("posted_at", { ascending: false })
    .limit(20);

  return (
    <main>
      <h1>投稿管理</h1>

      <h2>未投稿の draft ({drafts?.length ?? 0})</h2>
      <p className="muted">
        各 draft の payload を見て投稿先にコピペ。投稿後は post_id と post_url を{" "}
        <code>POST /api/post-record</code> に送信してください。
      </p>
      {(drafts ?? []).map((d) => (
        <div key={d.draft_id} className="card">
          <div>
            <strong>{d.platform}</strong> · variant{" "}
            {String(d.variant_id).slice(0, 8)}… · from @
            {(d.buzz as { author_screen_name?: string } | null)?.author_screen_name ?? "?"}
          </div>
          <details>
            <summary>payload</summary>
            <pre>{JSON.stringify(d.payload, null, 2)}</pre>
          </details>
        </div>
      ))}

      <h2 style={{ marginTop: "2rem" }}>投稿済 ({posts?.length ?? 0})</h2>
      <p className="muted">note の view count は手入力 (<code>POST /api/manual-engagement</code>)</p>
      {(posts ?? []).map((p) => (
        <div key={p.post_id} className="card">
          <div>
            <strong>{p.platform}</strong> · post_id={p.post_id.slice(0, 12)}… ·
            posted_at={new Date(p.posted_at as string).toLocaleString("ja-JP")}
            {p.is_paid && (
              <span style={{ marginLeft: "0.5rem", color: "#b91c1c" }}>有料</span>
            )}
          </div>
          {p.post_url && (
            <div>
              <a href={p.post_url} target="_blank" rel="noopener noreferrer">
                {p.post_url}
              </a>
            </div>
          )}
          <details>
            <summary>snapshots ({(p.snapshots as unknown[] | null)?.length ?? 0})</summary>
            <pre>{JSON.stringify(p.snapshots, null, 2)}</pre>
          </details>
        </div>
      ))}
    </main>
  );
}
