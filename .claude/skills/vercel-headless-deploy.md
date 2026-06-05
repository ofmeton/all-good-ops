# Vercel headless デプロイ（CLI token + REST）

## 概要

agent セッションから Vercel に**新規プロジェクトをローカル `vercel deploy` で立てて公開**する時の定型手順。GitHub 連携ではなくローカルファイルを直接デプロイするケース（モノレポ内の単体 Next.js アプリ等）。

- **誰が**: system-engineer / メインセッション
- **いつ**: `apps/<app>/` のような単体アプリを Vercel に headless で初公開する時
- **何のために**: ① `vercel env add` の agent-mode 空文字 bug ② team プロジェクトの SSO 保護デフォルト ON、の2大トラップで時間を溶かさない

## 不適用

- GitHub 連携 push deploy → `vercel-team-deploy-checklist`（author email トラップ系）
- 既存プロジェクトの env 一括更新のみ → `vercel-env-bulk-add`

## 前提値の取得

```bash
TOKEN=$(python3 -c "import json; print(json.load(open('/Users/rikukudo/Library/Application Support/com.vercel.cli/auth.json')).get('token',''))")
# team id（個人Hobbyなら不要）
curl -sS "https://api.vercel.com/v2/teams" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import json,sys;[print(t['id'],t['slug']) for t in json.load(sys.stdin).get('teams',[])]"
TEAM=team_xxxxx
```

## 手順

### 1. プロジェクト作成（REST）+ ローカル link

```bash
cd apps/<app>
PID=$(curl -sS -X POST "https://api.vercel.com/v10/projects?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"<app>","framework":"nextjs"}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('id') or d.get('error'))")
mkdir -p .vercel && printf '{"projectId":"%s","orgId":"%s"}' "$PID" "$TEAM" > .vercel/project.json
```

### 2. env は REST 直叩き（CLI env add は使わない）

⚠️ `vercel env add` は agent mode で**空文字を投入する破壊的 bug**（[[feedback-vercel-cli-agent-env-bug]]）。必ず REST POST + value-len 検証。

```bash
post_env() { K="$1"; V="$2";
  PAYLOAD=$(KV="$V" KK="$K" python3 -c "import json,os;print(json.dumps({'key':os.environ['KK'],'value':os.environ['KV'],'target':['production','preview'],'type':'encrypted'}))")
  curl -sS -X POST "https://api.vercel.com/v10/projects/$PID/env?teamId=$TEAM" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD" >/dev/null; }
post_env SUPABASE_URL "$URL"; post_env SUPABASE_SERVICE_ROLE_KEY "$KEY"   # 等
# 検証: encrypted value-len が実値(1000+)か。0 は空(=bug)
curl -sS "https://api.vercel.com/v10/projects/$PID/env?teamId=$TEAM" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import json,sys;[print(e['key'],'len:',len(e.get('value','') or '')) for e in json.load(sys.stdin).get('envs',[])]"
```

### 3. SSO 保護を無効化（team プロジェクトはデフォ ON）

team 新規プロジェクトは Deployment Protection（Vercel Authentication）がデフォルト ON で、**自前 Basic 認証より手前で 401** になる。自前認証で公開するなら無効化:

```bash
curl -sS -X PATCH "https://api.vercel.com/v9/projects/$PID?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"ssoProtection":null}'
```

### 4. deploy（CLI は OK。env-add だけが bug）

```bash
npx vercel deploy --prod --yes --token "$TOKEN"
```

### 5. スモーク

```bash
URL=https://<app>-<team-slug>.vercel.app
curl -s -o /dev/null -w "%{http_code}\n" "$URL/"                       # 自前認証あり→401期待
curl -s -o /dev/null -w "%{http_code}\n" -u "$U:$P" "$URL/"            # →200期待
```
- 401 のままなら SSO 保護が残っている（手順3未適用）か Basic 認証ロジックを疑う。

## 認証 middleware（Next 16）

Basic 認証は `proxy.ts`（Next16 規約、default export）で。`middleware.ts` は deprecated 警告。詳細: `nextjs-supabase-site-gotchas` / [[feedback-nextjs-scaffold-light-theme]]。

## 関連

- [[feedback-vercel-cli-agent-env-bug]] — env add 破壊的 bug の根拠
- [[reference-vercel-new-project-deploy]] — 本スキルの memory ポインタ
- スキル `vercel-team-deploy-checklist`（GitHub-push系）/ `vercel-env-bulk-add`
