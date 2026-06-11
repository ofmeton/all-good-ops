---
name: x-optimizer-apply-code
description: X発信システム optimizer の accepted 提案（tier-config/tier-prompt）を apply-code runner で自動コード適用する。coding agent 編集→allowlist/test/review ゲート→squash merge→deploy(ma:bootstrap/wrangler)→DB記録→LINE通知まで1コマンド。ユーザーが「提案を適用して」「accepted を反映して」「apply-code 回して」「提案をコードに落として」等と依頼したとき起動する。tier-T(DB数値)は worker 側 optimizer-apply job（runner が enqueue も発火する）。
---

# x-optimizer-apply-code — accepted 提案の自動コード適用

## 実行

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system
npm run apply-code                      # 既定: cap 3 件
npm run apply-code -- --dry-run         # merge せずゲートまで検証
npm run apply-code -- --id <uuid>       # 1 件だけ
npm run apply-code -- --rollback <uuid> # applied_code の可逆復元
```

## 前提（実行前に確認）

- main repo が `main` ブランチ・クリーンであること（runner は deploy 時に main を pull する）
- `claude` / `gh` / `wrangler whoami` / `ant` がログイン済み
- creds は `apps/x-account-system/.env.local`（main repo 側）

## 挙動の要点

- 人間ゲートは dashboard `/proposals` の accept のみ。runner は accepted ∧ tier∈{config,prompt} だけ処理
- 安全境界: allowlist 7 SSOT ファイル＋ma:render 成果物＋同 dir テストのみ編集可。逸脱・死守トークン・test/tsc 赤・review REJECT（修正1回後）は draft PR 保留＋LINE 人間送り
- deploy 失敗は merge 済み未反映＝🚨 LINE が来る。手動で `npm run ma:bootstrap` / `npm run worker:deploy`
- 結果（PR URL・outcome）は LINE と stdout の JSON で報告

## 終了後の報告

実行結果 JSON を要約し、applied / pr_pending / blocked / errors と各 PR URL をユーザーへ報告する。pr_pending がある場合は draft PR の人間レビューを促す。
