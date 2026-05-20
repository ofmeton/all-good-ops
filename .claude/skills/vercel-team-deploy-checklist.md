# Vercel team プロジェクト デプロイ前チェックリスト

## 概要

Vercel **team / Pro** プロジェクト（`team_*` で始まる ID）に GitHub 連携経由で push する前に通すチェックリスト。**認可外 git author email の commit は silent ERROR でビルド前に reject される** という既知トラップを回避する。

- **誰が**: rapid-hp-operator / system-engineer / ai-radar
- **いつ**: portfolio / mokumoku-koubou-lp / ai-radar など team プロジェクトに git push する前
- **何のために**: ビルドログ空のまま 0 秒 ERROR で時間を溶かさないため

## 適用対象 / 不適用

- ✅ 適用: Vercel team / Pro プロジェクト
- ❌ 不適用: 個人 Hobby プロジェクト（author 制限なし）、ローカル `vercel deploy` CLI（直接 token 認証）

## チェックリスト（push 前 30 秒）

### 1. リポジトリの Vercel project ID を特定

`.vercel/project.json` または Vercel ダッシュボードから:
- portfolio → `prj_PUeZ66YPslyJeWLxrBBY9MxoDcId`
- mokumoku-koubou-lp → `prj_0WpcaV9fDjV09mcqat8AGd8Rxun2`
- ai-radar → `prj_R28P8O7CfoPb5GA4ipLgkjlHDmjn`

team_id: `team_Le012XqeShXuAuHdkQuyPGRO`

### 2. 過去成功 deploy の author email を確認（MCP 経由）

```
mcp__plugin_vercel_vercel__list_deployments
  projectId: <prj_xxx>
  teamId: team_Le012XqeShXuAuHdkQuyPGRO
```

最新 `state: "READY"` のエントリから `meta.githubCommitAuthorEmail` を読む。

**実績パターン（2026-04-28 時点で確認済）**:
- すべての team プロジェクト → `work.ofmeton@gmail.com`

### 3. 現在の git config を確認

```sh
git config user.email
```

### 4. 不一致なら commit ごとに author 指定

git config を上書きせず、コミット単位で明示:

```sh
git -c user.email='work.ofmeton@gmail.com' -c user.name='ofmeton' \
    commit -m "..."
```

または、リポジトリローカル設定（global は触らない）:

```sh
cd <repo>
git config user.email 'work.ofmeton@gmail.com'
git config user.name 'ofmeton'
```

### 5. push 後のヘルスチェック

push 直後、60〜90 秒以内に再度 `list_deployments` を呼んで `state` 確認:

- `READY` → OK
- `ERROR` で `buildingAt == ready`（0 秒で死ぬ）→ author email 不一致を疑う
- `ERROR` でビルドログがある → 通常のビルド失敗、ログを `get_deployment_build_logs` で取得して原因特定

## トラブルシュート

### 症状: ビルドログ空のまま即 ERROR

```sh
# 1. list_deployments で creator.email を見る
# 2. git log -1 --format='%ae' で最新 commit の author email を見る
# 3. 不一致なら author 修正で空 commit 再 push:
git -c user.email='work.ofmeton@gmail.com' -c user.name='ofmeton' \
    commit --allow-empty -m "redeploy: trigger Vercel rebuild with correct author"
git push
```

### 症状: ビルドログがあって失敗

通常の build error。`get_deployment_build_logs` で確認し、ローカル `npm run build` で再現させて修正。

## デプロイ後の URL 共有可否（team SSO 注意）

team / Pro プロジェクトでは **Deployment Protection (Vercel Authentication)
がデフォルト ON**。発行された production URL
（例: `site-XXX-org.vercel.app`）は **チームメンバー以外開けない**
（外部から開くと Vercel ログイン画面にリダイレクトされる）。

クライアントへ共有する前に「そのまま渡せるか」を必ず判定:

| 状況 | クライアントに URL 渡せる? |
|---|---|
| Deployment Protection: All Deployments (default) | ❌ Vercel ログイン要求 |
| Deployment Protection: Only Preview Deployments | ✅ Production URL は public |
| Deployment Protection: Disabled | ✅ どの URL も public |
| カスタムドメイン設定済 (例: terra-hayama.com) | ✅ 設定次第（通常 public） |

deploy 完了報告時に「Production URL を共有可能か」を必ず明示する。
クライアント共有目的であれば、デプロイ前 or 直後に Vercel ダッシュボード →
Project Settings → Deployment Protection で「Only Preview Deployments」
or 「Disabled」に変更が必要 (これはユーザー手動操作、CLI/MCP からは
できない場合がある)。

## 関連リソース

- memory: `feedback_vercel_git_author_authorization.md`（理由・経緯の詳細）
- memory: `feedback_vercel_subproject_cwd.md`（monorepo 下で cwd 間違いを防ぐ）
- skill: `lp-optimization-playbook.md`（軽量化を絡めた連続 commit push 時に併用）
- CLAUDE.md MCP セクション: Vercel MCP `deploy_to_vercel` は人間確認必須ルール

## 絶対にやらないこと

1. **認可外 author で push しっぱなしで放置** → ERROR が積み上がり deploy 履歴が汚れる
2. **`--amend` で過去 commit の author を書き換えて force push** → 共有ブランチでは履歴破壊。空 commit redeploy で対処
3. **global の git config user.email を変更** → 他リポジトリにも影響。リポジトリローカルか `-c` フラグで対処
