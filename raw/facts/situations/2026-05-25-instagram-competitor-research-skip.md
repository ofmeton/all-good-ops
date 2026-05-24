---
date: 2026-05-25
category: situations
source: session
---

# Instagram 競合調査スキップの判断 (v9.2)

## 状況

v9.2 起草で Instagram カルーセル章を詰める必要があったが、active な競合調査をスキップして transfer learning ベースで起草することを決定。

## スキップの根拠

1. **publishing research T2-4** で「Instagram カルーセル形式の AI 業務自動化」は **完全空白** と既に確認 (上位 X 10 アカ × 直近 90 日 928 tweets の分析結果)
2. **WebFetch の制約**: note 競合調査でも instagram.com の SPA / 動的ロード問題で取得が限定的だった (Web fetch 失敗例多数)
3. **ofmeton の先行者利得**: AI 業務自動化 × Instagram カルーセルの日本人プレイヤーが居ない = 競合のいる空白を埋めるのが ofmeton 戦略の優位
4. **既存資産の活用**: visual-designer skill (撤廃済) の `visual-design-system.md` 知見 (Noto Sans Heavy / 4 色 / 媒体別比率 / 文字サイズ最小値 32px) が transfer 可能
5. **コスト**: WebFetch を 10 アカに走らせても得られる情報は薄く、Anthropic API トークンの無駄遣いになる

## 代替: transfer learning ベース

- X 競合の Hook 類型・タイトル付け方を Instagram カルーセル 1 枚目 (Hook 役) に転用
- note の構成パターン 5 系統 (まとめ / 段階 / ツール比較 / 専門職×AI / シリーズ実践記) を Instagram の縦切り型カルーセルに転用
- visual-designer の設計ルール (4 色 / Noto Sans Heavy / 1080×1080 / 余白 8-10%) を引き継ぎ
- 私の knowledge から一般的なカルーセル best practice を反映

## 後続タスク (v9.x 以降に持ち越し)

- ofmeton が Instagram で実投稿を開始した後 (Phase 1 中盤)、Instagram Insights API で自アカウント実績データを取得
- 自アカウントデータが溜まった時点で Optimizer Phase 1 が初の数値分析を実施 → カルーセル構成パターンの A/B テストへ
- Phase 0 完了時に再度 Instagram 競合調査を試みる (国内に AI 業務自動化系の Instagram プレイヤーが現れた場合)
