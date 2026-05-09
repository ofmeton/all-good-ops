# Digital Marketing / Ad Ops キャッチアップ資料 設計書

- 作成日: 2026-04-25
- 対象者: 工藤陸（内部資料）
- 対象期間: 2023年10月〜2026年4月（約2.5年）
- 最終成果物: `deck.pptx`（16:9, 総約250ページ）

## 1. 目的

2023-09 に現場を離れた工藤陸が、2.5年のブランクを埋めて以下を同時に達成する:

1. 副業で広告運用代行を再開できる実務キャッチアップ
2. BSA L3（HP制作+広告運用初月セット）の商品力強化
3. 業界俯瞰の知識アップデート
4. AI×広告運用の事例ストック

## 2. スコープ

### 対象媒体（9媒体）
Google Ads / Meta / YouTube / Yahoo! / TikTok / LINE / X / LinkedIn / Amazon Ads

### 対象テーマ
- 市況・業界構造の変化
- 媒体別アップデート
- 計測・データ基盤の再編
- AI活用事例（生成・運用・予測・Agent）
- 鉄板運用メソッド 2026年版
- BSA L3 実装ガイド

### 対象外
- 実名クライアント情報
- NDA 抵触情報
- 未公開情報・推測の断定記述（「※要確認」で明記）

## 3. 章構成（総約250p）

| Part | タイトル | p数 |
|---|---|---|
| 1 | エグゼクティブサマリー | 10 |
| 2 | 市況・業界構造の変化 | 20 |
| 3 | 媒体別キャッチアップ | 110 |
| 4 | 計測・データ基盤の激変 | 25 |
| 5 | AI活用事例集 | 40 |
| 6 | 鉄板運用メソッド 2026年版 | 15 |
| 7 | BSA L3 実装ガイド | 10 |
| 8 | 付録 | 15 |

## 4. スタイル指針

- 16:9 ワイドスクリーン
- 1ページ=1論点（タイトル + 3-5箇条書き + 図解or表）
- 密度: 1p 200-400文字 + 視覚要素
- 配色: 白背景 + ネイビー(#0F2A4F) + アクセント橙(#E87722)
- 日本語フォント: Hiragino Sans / Meiryo / Yu Gothic（システム依存）
- 図解:
  - 構造・フロー → mermaid / SVG自作
  - 比較 → PPTXテーブル
  - 概念伝達困難 → Codex gpt-image-2 生成
  - 数値根拠 → ネット画像引用（出典明記）

## 5. 情報源ポリシー

- 一次ソース優先（媒体公式・公的統計・主要調査会社）
- 日本語ソース: 電通「日本の広告費」、CARTA、日経XTREND、ITmedia
- 英語ソース: Search Engine Land, Marketing Land, AdAge, Think with Google, Meta Business
- 推測・断定不可な情報は「※要確認」明記

## 6. 成果物配置

```
outputs/documents/marketing-catchup-2023-2026/
├── SPEC.md                    本設計書
├── deck.pptx                  最終成果物
├── draft/
│   ├── part-01.md             Part単位の原稿
│   ├── part-02.md
│   └── ...
├── assets/
│   ├── images/                生成画像・引用画像
│   └── diagrams/              mermaid / svg
├── scripts/
│   └── build_deck.py          python-pptx組み立てスクリプト
└── sources.md                 出典一覧
```

## 7. 実行フロー

| Phase | 担当 | 成果物 |
|---|---|---|
| 1. リサーチ | researcher | 章ごとのソース・キーファクト |
| 2. 原稿執筆 | writer | Part単位 markdown |
| 3. 図解作成 | system-engineer | mermaid/svg/画像 |
| 4. PPTX生成 | system-engineer | deck.pptx |
| 5. レビュー | presentation-reviewer | 品質チェック |
| 6. 最終化 | 秘書 | 配置・引き渡し |

## 8. パイロット

Part 1 (10p) を先行作成。ユーザーがスタイル・密度・トーンをレビュー後、Part 2-8 を進める。

## 9. 承認済み前提

- 配置場所: `outputs/documents/marketing-catchup-2023-2026/`
- 情報鮮度ポリシー: 2026-04-25 時点の確証情報のみ、推測は「※要確認」
- 実行方式: secretary 経由で researcher → writer → system-engineer → presentation-reviewer
