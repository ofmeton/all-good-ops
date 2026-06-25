import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!supabaseAdmin) {
    return (
      <main>
        <h1>x-buzz-radar</h1>
        <div className="card">
          <p>
            ⚠️ Supabase が未設定です。<code>.env.local</code> に{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> と{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> を設定してください。
          </p>
        </div>
      </main>
    );
  }

  const { data, error } = await supabaseAdmin
    .from("x_buzz_tweets")
    .select("*")
    .eq("status", "pending_review")
    .order("claude_relevance", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main>
        <h1>x-buzz-radar — error</h1>
        <div className="card">
          <pre>{error.message}</pre>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>x-buzz-radar — pending review ({data?.length ?? 0})</h1>
      {(data ?? []).map((t) => {
        const score = (t.claude_relevance as number | null) ?? 0;
        const cls =
          score >= 80 ? "score-high" : score >= 60 ? "score-mid" : "score-low";
        return (
          <div key={t.id} className="card">
            <div>
              <span className={`score ${cls}`}>{score}</span>{" "}
              <strong>@{t.author_screen_name}</strong>
              {" · "}
              {t.likes} likes / {t.retweets} RT
              {" · "}
              <span className="muted">
                {t.buzz_pattern ?? "?"} / {t.category ?? "?"}
              </span>
            </div>
            <p style={{ margin: "0.5rem 0", whiteSpace: "pre-wrap" }}>
              {t.body}
            </p>
            <div>
              <Link href={`/adopt/${t.id}`}>
                <button>review</button>
              </Link>
              <a
                href={`https://twitter.com/${t.author_screen_name}/status/${t.tweet_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="secondary">原文 X で開く</button>
              </a>
            </div>
          </div>
        );
      })}
    </main>
  );
}
