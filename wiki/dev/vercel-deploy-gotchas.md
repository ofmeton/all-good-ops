---
type: concept
created: 2026-06-07
updated: 2026-06-07
related: [[dev/standards]], [[dev/external-api-ops]], [[self/engineering-principles]]
tags: [vercel, deploy, env, cron, cli, dev]
status: active
---

# Vercel デプロイ ハマり集

Vercel への deploy / env 投入 / cron 設定で繰り返し踏むハマりを 1 本に束ねた正本。
標準の deploy 手順は `skill:vercel-headless-deploy` / `skill:vercel-team-deploy-checklist` / `skill:vercel-env-bulk-add` が正本。本ページは落とし穴カタログ。

## 1. env 投入は REST API 直接（CLI agent mode の破壊的 bug）

Vercel CLI 54.x は Claude Code agent 経由実行を `isAgent=true` で検知し non-interactive に切替、その状態で `vercel env add KEY production` を叩くと **空文字 `""` が投入される**。`--value` も `printf | stdin` も `< file` も無視され、CLI は「Added Environment Variable」と成功風に返す。

→ **Claude Code セッションから env 変更は REST API を直接叩く。CLI は使わない。**

```bash
# token 取得 (macOS)
TOKEN=$(python3 -c "import json; d=json.load(open('/Users/rikukudo/Library/Application Support/com.vercel.cli/auth.json')); print(d.get('token',''))")
PROJECT_ID="prj_..."; TEAM_ID="team_..."

# 既存 entry 一覧 (id / key / target / value-len)
curl -sS "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); [print(e['id'], e['key'], e['target'], 'val-len:', len(e.get('value','') or '')) for e in d.get('envs', [])]"

# 平文 POST (空にならない最確実な手段)
PAYLOAD=$(KEY_VALUE="$YOUR_VALUE" python3 -c "import json,os; print(json.dumps({'key':'YOUR_KEY','value':os.environ['KEY_VALUE'],'target':['production'],'type':'encrypted'}))")
curl -sS -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD"
```

罠ポイント:
- `vercel env pull` で `len=0` に見えても encrypted で復号できないだけかも。判定は REST API の `value` field length（encrypted base64 が 1000+ chars あれば実値入り、0 なら空）
- **delete する前に必ず GET で value-len 確認**（1000+ あれば消さない）
- Python heredoc で env var を subprocess に渡す時は `KEY_VALUE="$VAR" python3 -c '...'` で明示的に渡す（`source .env.local` だけでは subshell に引き継がれない場合あり）
- 症状検知: 「env を投入したはずなのに deploy 後の動作が mock fallback / 401」→ REST API で value-len を見る

教訓: 2026-05-23 money-bot で twitterapi.io 401 を何時間も追った事故。バルク投入は `skill:vercel-env-bulk-add`。

## 2. `vercel link` の env pull プロンプトは無条件 No

`vercel link` 後の `? Would you like to pull environment variables now?` に **yes と答えると `.env.local` が development env（多くは空）で上書きされる**。Supabase URL や API keys が消える。

- **env pull プロンプトは無条件で `n`**
- `vercel env pull` を使う時は必ず `--environment=production` を明示（デフォルトは development = 空が多い）
- ただし production を pull しても **sensitive 扱いの env vars は空文字列で返る**（CRON_SECRET / SERVICE_ROLE_KEY 等）。全部は揃わない
- env pull 直後に sanity check:
  ```bash
  grep -E "^(SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET|RESEND_API_KEY)=" .env.local | sed 's/=".*"$/="<set>"/'
  ```
  空なら Dashboard から手動補完
- `.env.local` は main repo 側に作る（worktree discard で消える） → `mem:feedback_envlocal_main_repo_first`

教訓: 2026-05-17 link 時 env pull yes → `.env.local` の 4 vars 消失 → production pull で機密キー 4 本が空文字列 → build 失敗。

## 3. deploy が走らない時の切り分け順序（webhook を疑う前に）

push しても deploy 履歴に出ない時、**webhook 切り分けに先に走ってはならない**。build 開始前に失敗していて Active deployments にフィルタ非表示なだけのことが多い。

1. **第一手: Deployments タブを「All Statuses」or「Failed」でフィルタ**（デフォルトは Ready のみ表示）。Failed が並べば build error → Build Logs 確認
2. **第二手: `vercel.json` と plan の整合性確認**（cron / timeout / build minutes。下記 §4）
3. **第三手: GitHub Webhook 連携確認**（GitHub App 連携時は repo Settings → Webhooks に出ないのが正常。GitHub Settings → Installations → Vercel を見る）
4. **第四手（最終）: `npx vercel@latest --prod`**（webhook も deploy hook も介さない別経路。副作用大なので慎重に。link 時 env pull は必ず no）

禁忌: Failed フィルタも見ず「webhook が壊れた」と早合点しない。Disconnect/Reconnect は最終手段。CLI deploy 路線に入ったら根本原因判明時に白紙に戻すか継続するか判断（`mem:feedback_root_cause_pivot_discipline`）。

教訓: 2026-05-17「webhook 詰まり」と判断し迂回し続けたが、実は `vercel.json` cron が Hobby plan 違反で即 reject されていただけ。60 分浪費。

## 4. Hobby plan は cron 1 日 1 回まで

Vercel Hobby（個人 Free）は **Cron Jobs を 1 日 1 回（daily）まで**に制限。`0 * * * *`（毎時）や `0 9,17 * * *`（1 日 2 回）は build 時に reject:

```
Error: Hobby accounts are limited to daily cron jobs.
```

- `vercel.json` の `crons[].schedule` を編集・追加する時は **plan 確認を必須化**（Hobby: `0 H * * *` 1 つだけ / Pro: 制限なし）
- 毎時/毎分が要るが Hobby の代替案: GitHub Actions Cron（無料・任意頻度）/ Supabase pg_cron / cron-job.org / 暫定 daily に下げて OPS_GUIDE 注記
- Pro 移行コスト: $20/seat/月
- 禁忌: Hobby で複数 cron を入れる際、毎時系を 1 つでも混ぜると**全 cron が deploy 拒否**される

## 5. team / Pro project は git author email の認可が必須

Vercel team / Pro project に GitHub 連携 push する時、**コミットの git author email が team 登録メンバーの email と一致しないと、ビルドログ空のまま 0 秒で ERROR**（silent reject）。

- **初 push 前に必須**: 過去成功 deploy の `meta.githubCommitAuthorEmail`（MCP `list_deployments` の最新 READY）を確認 → `git config user.email` と一致させる
  ```sh
  git -c user.email='<vercel-account-email>' -c user.name='<name>' commit -m "..."
  ```
- 症状の見分け: `state: ERROR` だがビルドログ空（0 秒）/ ローカル `npm run build` は成功 / commit は main に乗っているのに deploy が走らない or 即死
- **Hobby plan では発生しない**（team / Pro 固有）
- 恒久回避: リポジトリごとに `.git/config` で `user.email` を設定（global は触らない）
- 明示エラーパターンもある: `The deployment was blocked because the commit email ... could not be matched to a GitHub account.` → これは **GitHub の "Verified Emails" 未登録**が原因。https://github.com/settings/emails で全 email を add + verify
- 既知の team project と author email: portfolio (`prj_PUeZ66YPslyJeWLxrBBY9MxoDcId`) → `work.ofmeton@gmail.com` / mokumoku-koubou-lp (`prj_0WpcaV9fDjV09mcqat8AGd8Rxun2`) → 同 / minpaku-cleaning (`prj_hbHZqk4SpKeZ8YI8S8zKQh34rf3h`) → `off.me.ton@gmail.com`
- 詳細チェックリスト: `skill:vercel-team-deploy-checklist`

教訓: 2026-04-26 portfolio で `off.me.ton@gmail.com` 署名 push → 両 commit がビルドログ空で ERROR → `work.ofmeton@gmail.com` 署名で一発 READY。検出に 10 分以上浪費。

## 6. monorepo では deploy 前に cwd と project スコープを verify

`outputs/clients/*/site` のような monorepo で `npx vercel --prod` する前に、**`pwd && cat .vercel/project.json`** で project スコープを verify する。

- deploy コマンド前に必ず `cd <site dir>` を明示してから `npx vercel`
- `.vercel/project.json` の `projectName` を読み上げてから deploy
- 絶対パスで `cd /Users/.../site && npx vercel ...` の 1 行で書く

教訓: 2026-05-20 terra-isshiki deploy で repo root から `vercel` を叩き、ルートにリンクされた別 project（minpaku-cleaning）が deploy 対象になりかけた。各サブプロジェクトに独立した `.vercel/project.json` が存在しうる。

> 補足（CLI で deploy する場合）: `vercel --prod` 単体はプロジェクト全体を upload しようとして 100MB エラーになりうる。`vercel build --prod` + `vercel deploy --prebuilt --prod` で `.vercel/output/` だけ upload する。
