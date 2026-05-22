# Vercel env 一括投入

## 概要

`.env.local` から Vercel project の Environment Variables (production / preview / development) へ **stdin 経由で一括投入** する。シェル履歴に値が残らない安全な方式。

- **誰が**: system-engineer / メインセッション
- **いつ**: project セットアップ完了後、複数の env を Vercel に投入する必要がある時
- **何のために**: 対話的 `vercel env add` を 1 つずつ手動入力する手間を排除 + 値漏洩防止

## トリガー（自然文例）

- 「.env.local の値を Vercel に投入して」
- 「Vercel env を一括設定」
- 「env を全部 production に push」

## 前提

- Vercel CLI v50+ install 済 (`npm i -g vercel`)
- `vercel login` 済
- `vercel link` 済 (対象 project に link されている)
- `.env.local` がコメント `#` と `KEY=VALUE` 形式で記述されている
- ターゲット project 側で同名 env が **未投入** (重複だとエラー)

## 標準手順

### Step 1: 投入対象 KEY を確定

`.env.local` から実投入する KEY をリストアップ。値が空の行は skip 対象。

### Step 2: 一括投入スクリプト実行

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/<project>

KEYS_TO_ADD=(
  "KEY1"
  "KEY2"
  "KEY3"
)

for KEY in "${KEYS_TO_ADD[@]}"; do
  VALUE=$(grep "^${KEY}=" .env.local | head -1 | sed "s/^${KEY}=//")
  if [ -z "$VALUE" ]; then
    echo "⚠️  $KEY: empty, skip"
    continue
  fi
  echo "▶ Adding $KEY (length: ${#VALUE} chars)..."
  printf '%s' "$VALUE" | vercel env add "$KEY" production 2>&1 | tail -3
  echo "---"
done
```

### Step 3: 投入確認

```bash
vercel env ls production 2>&1 | grep -E "(Production|<KEY1>|<KEY2>)" | head -20
```

各 env が **Encrypted** で **Production** 環境に表示されていれば成功。

## 安全ガード

1. **stdin 経由必須** — `printf '%s' "$VALUE" | vercel env add` で値を渡す
   - ❌ `vercel env add KEY production "$VALUE"` (history に残る)
   - ✅ `printf '%s' "$VALUE" | vercel env add KEY production`
2. **値の確認は文字数だけ** — `${#VALUE} chars` で長さ妥当性を出力、値そのものは echo しない
3. **既存 env がある場合の挙動** — Vercel CLI は「Already exists」エラーを返す。事前に `vercel env ls` で確認するか、エラーをそのまま継続させる (skip 扱い)

## environments 指定

- `production` のみ: 本番 cron / deploy で必要
- `preview` も: PR ごとの preview deploy で必要なら追加
- `development` も: `vercel dev` ローカル開発で `.env.local` の代わりに使うなら

money-bot のような cron 駆動 workflow は production だけで OK。preview/development は実装着手時に判断。

## 既存 env の更新（上書き）

CLI には「上書き」フラグが無いので:
```bash
vercel env rm KEY production   # 削除
printf '%s' "$NEW_VALUE" | vercel env add KEY production  # 再投入
```

## 関連

- memory: `feedback_env_paste_verification.md`
- memory: `feedback_credential_disclosure_warning.md`
- Vercel CLI docs: https://vercel.com/docs/cli/env
