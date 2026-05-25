---
date: 2026-05-24
category: situations
source: session
---

# x-account-design v9 ユーザーレビュー反映 (v9.0.1)

ユーザーが v9 起草に対して 4 点のレビューを返し、修正反映済み。

## 1. 素材レイヤーに Anthropic 公式 / RSS / market_signal を追加 (撤退から方針転換)

これまでの「ai-radar 撤廃・再実装不要、素材レイヤー 2 系統のみ」を撤回。

新方針:
- ai-radar のコード自体は撤廃のまま
- 機能 (Anthropic 公式 / RSS / market_signal 取得) は v9 内で **新規実装** (Cloudflare Workers + Supabase 上で再構築)
- 素材レイヤーは 5 系統に拡張: (a) twitterapi.io (b) Claude Code 履歴系 (c) Anthropic 公式 (d) RSS (e) market_signal

## 2. 画像生成モデル: gpt-image-1 で起こす、gpt-image-2 は API 公開時に切替検討

- 公式 docs (`platform.openai.com/docs/models`) は WebFetch 403 で取れず
- 既知情報 (2026-01 cutoff) で gpt-image-2 は ChatGPT 内蔵モデル、API 未公開
- v9 では **gpt-image-1 で起こす**、実装着手時に gpt-image-2 API 公開状況を再確認

## 3. note の構成・文字数・媒体連動・トーンは競合調査ベースで「改善施策の引き出し」を持つ

- 初期設計から競合調査の結果を反映 (publishing research REPORT.md + 残 55 アカ Phase 0)
- 構成 / 価格 / ティーザー / 投稿時間 / トーン 全て競合調査ベース
- Optimizer が weekly で新 type を提案
- v9.1 で詰めるべき項目に「note 専用の刺さる型カタログ・価格×CVR テーブル・ティーザー境界設計テンプレ」を追加

## 4. Optimizer の改善対象に「全エージェント定義 / フロー / レイヤー構造」を含める (そもそもから疑う視点)

- Optimizer は数値パラメータの微調整だけでなく、設計骨子そのものを継続的に疑う
- 「そもそも論 weekly レビュー」を §4.8 に新規追加: エージェント分割の妥当性 / レイヤー間 IF の摩擦 / 北極星指標の妥当性 / 媒体の取捨選択 / データソースの妥当性 を weekly 観測
- ただし **骨組み変更 (エージェント定義 / フロー / レイヤー構造 / 6+1 ルールの追加廃止 / 北極星指標変更 / スタック変更) は承認必須** (5 番目の承認 gate として §5.1 に追加)

承認 gate は 4 種 → 5 種に拡張。

## v9 のバージョン

修正反映後を **v9.0.1** とみなす。本格的な v9.1 は Phase 0 完了時に起こす (Style Guide v1 と一緒、note 詳述含む)。
