---
name: prod-lib-diag
description: "本番 env の実 secret でローカル tsx から lib 関数を直接実行し、queue/cron 経路の本番バグ調査・特定 idea/draft の再生成を行う診断ハーネス。wrangler tail が不安定な時、テスト緑でも本番で壊れる時、「この draftID 生成し直して」依頼時に使う。"
---

# prod-lib-diag — 本番 env で lib 関数をローカル実行する診断/再生成ハーネス

## 概要

Cloudflare Workers の queue consumer / cron は `wrangler tail` がイベントを安定取得できず、エラー特定に失敗しがち。そこで **該当 lib 関数を本番 env（`.env.local` の実 secret）でローカル tsx 直接実行**して、(a) 失敗のスタックトレースを即得る (b) 特定 idea/draft を再生成して LINE に再送する。

- **誰が**: dev-automation/system-engineer or メインセッション
- **いつ**: queue/cron 経路の本番バグ調査 / 特定 core_idea・draft の再生成 / 本番経路の end-to-end 検証（テスト緑でも本番で壊れる時）
- **何のために**: tail に頼らず実エラーを掴む。fallback/mock では再現しない本番経路（実 DB / 実 LLM）を直接叩く

連結原則: wiki `self/engineering-principles.md` 原則2（テスト緑≠本番、end-to-end 実走）。memory [[feedback-prod-lib-local-diag]]。

> **対象の存在確認（空振り防止）**: smoke/再生成の対象は **lib が読む実 WHERE 条件**で eligible 数を先に確認する（status カラムだけで判断しない）。例: compose は `selection_status='queued'` だけでなく `composed_at IS NULL` かつ `compose_claimed_at IS NULL` も効くため、status=queued だけ見て実行すると processed:0 で空振りする（2026-06-09）。

## トリガー（自然文例）
- 「この draftID 生成し直して」「core_idea を再生成して LINE に流して」
- 「cron の◯◯ジョブが失敗してる、原因見て」「投稿が出ない/失敗する原因」
- queue consumer のログが tail で取れない時

## 標準ハーネス雛形

worktree（origin/main 派生、`scripts/wt-new.sh`）の `apps/x-account-system` 配下に一時 `scripts/<name>.ts` を作り、`npx tsx scripts/<name>.ts` で実行 → **実行後に必ず削除**。

```ts
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
// 診断対象の lib を import（拡張子 .ts。例）
import { draftForX } from "../lib/writer/writer-x.ts";
import { runEditor } from "../lib/editor/pipeline.ts";
import { toCoreIdea, buildEditorInput, fetchSourceMaterialTexts, persistDraft, pushApproval } from "../src/jobs/post-job.ts";

// 1) main repo の .env.local を process.env に流し込む（worktree discard で消えないため main 側）
const envf = "/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local";
for (const l of readFileSync(envf, "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.SUPABASE_SCHEMA ??= "xad";

// 2) Supabase client（lib が読む schema に合わせる）
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "xad" } });
const env = {} as never; // lib は env.X || process.env.X の fallback を持つので空でよいことが多い

(async () => {
  try {
    // 3) 対象を load → lib を直接 await（try/catch でスタックを出す）
    const { data } = await sb.from("core_ideas").select("*").eq("id", "<idea-id>").maybeSingle();
    const idea = toCoreIdea(data as never);
    const draft = await draftForX(idea);
    const src = await fetchSourceMaterialTexts(env, idea.sourceMaterialIds);
    const out = await runEditor(buildEditorInput(idea, draft.body, crypto.randomUUID(), src));
    // 再生成して LINE に流す場合（slot を分けて既存と競合させない）:
    const dbId = crypto.randomUUID();
    await persistDraft(env, { id: dbId, idea, draft, out, slot: "manual-diag", date: new Date(Date.now()+9*3600e3).toISOString().slice(0,10) });
    if (out.decision === "approved") await pushApproval(env, dbId, draft.body, out, idea.fmat);
    console.log("OK", out.decision, dbId);
  } catch (e) {
    console.error("THREW\n", e instanceof Error ? e.stack : e);
  }
})();
```

## 手順
1. worktree を作る（`scripts/wt-new.sh <topic>`）。`npm install` 済を確認。
2. `scripts/<name>.ts` に上の雛形を当て込み、診断対象の lib・id を埋める。
3. `npx tsx scripts/<name>.ts` で実行。エラー時はスタックの最深 lib 行を見る。
4. 原因を直す → テスト緑 → PR → deploy → 同じ雛形で再実行して解消確認。
5. **一時スクリプトを削除**（`rm -f scripts/<name>.ts`）。worktree は `wt-done.sh`。

## 副作用の注意（必読）
- **本番 DB / 実 LLM / 実 LINE / 実 X に当たる**。読み取り診断は安全だが、persist/push/publish は実副作用。
- 投稿系を流す時は **slot を `manual-xxx` で分ける**（標準スロット占有・(scheduled_date,slot) 競合を避ける）。
- LINE push は実際にユーザーに届く。検証で大量送信しない。
- X 投稿（publishToX）は実投稿。検証では呼ばない or dryRun。月キャップ消費に注意。
- idea を dequeue する系は status を消費するので、検証後は status を戻す。

## やらないこと
1. 一時スクリプトを残す（毎回削除）
2. publishToX を検証で安易に呼ぶ（実投稿）
3. 標準 slot（morning/noon/evening）を診断で占有する
4. fallback（IN_MEMORY_FALLBACK=true）で実行して「本番経路を確認した」と誤認する — 本診断の目的は本番経路なので flag は立てない
