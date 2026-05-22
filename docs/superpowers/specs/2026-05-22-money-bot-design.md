---
date: 2026-05-22
status: draft
type: implementation-spec
parent:
  - docs/superpowers/specs/2026-05-20-publishing-pivot-design.md
  - docs/superpowers/specs/2026-05-21-summer-income-bridge-design.md
---

# 2026-05-22 Money-Bot Design — 24時間自律エージェントで月1万円稼ぐ

## 1. 背景・ユーザー要求 (2026-05-22)

- 24時間稼働
- 月予算 1万円 / 月収目標 1万円
- 自律エージェントが「自分で考えて自分で調べて自分で実行して自分で評価して分析して改善してゴール達成」
- 人間承認は最小限、人間介入なしがベスト
- 収入タイミングは考慮不要（失業手当との衝突を無視）
- **note × SNS発信を主軸 / KDP + Stock を補助**

## 2. 既存戦略との位置づけ

親 spec:
- `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md` (発信ピボット)
- `docs/superpowers/specs/2026-05-21-summer-income-bridge-design.md` (夏のキャッシュブリッジ)

本 spec は両者の **補助エンジン (月1万円規模)** として並走。
- 規模: 月1万円 ≠ 短期 Web 案件の月5-10万円 → 別エンジン
- 人間時間: 自律目標 → 「時間優先」方針と整合
- 内容: 発信ピボット戦略の **自動化レイヤー**（既存エージェント・wiki/publishing を再利用）

## 3. プラットフォーム規約調査結果 (2026-05-22)

調査詳細は `outputs/research/2026-05-22-platform-policy-research.md` 参照。要旨:

| プラットフォーム | 自動化レベル | 月予算インパクト | 月収貢献ポテンシャル | 規約リスク |
|---|---|---|---|---|
| **note** | API なし → ブラウザ自動化 or 手動 publish | ¥0 | ¥5,000-30,000 | ブラウザ自動化はグレー |
| **X** | Free $0で月450ツイート / Basic $200/月 | $0 or NG | 月15投稿/日まで OK | 課金で予算超過 |
| **Instagram** | Graph API で 24h/100投稿 (月最大3,000) | ¥0 | (誘導専用、直接収益なし) | AI 明示義務なし、レート遵守必須 |
| **KDP** | API なし手動 + 月販売数1-3冊→25冊上限 | ¥0 | ¥0-3,000（立ち上げ期） | 2024-09 改定: AI 明示必須・違反で永久停止 |
| **Adobe Stock** | 手動アップロード | ¥0 | ¥3,000-15,000 | 「Gen AI 受入」明記、ただし著作権帰属に注意 |
| **PIXTA** | AI 生成品 **完全禁止** | N/A | **使用不可** | 規約違反で出品停止 |

### 重要な構想インパクト

1. **X 完全自動投稿は経済合理性なし**: $200/月 課金で予算超過、Free Tier は月450制限
2. **note 公式 API 不在**: 「完全自動 publish」は規約グレーのブラウザ自動化に依存
3. **PIXTA 使用不可**: 補助チャネルから除外
4. **KDP は立ち上げ期に月販売数制限がきつい**: Phase 2 以降に保留

## 4. 自動化レベルの選択肢（3プラン併記）

### Plan-A: 完全自律（規約グレー突破）
- note: ブラウザ自動化（Playwright）で publish
- X: ブラウザ自動化（高ban リスク）
- Instagram: Graph API 自動投稿
- KDP / Stock: 手動アップロード（自動化不可）
- **リスク**: アカウント永久停止（特に X）、ofmeton ブランド毀損
- **人間時間**: ~5h/月（KDP・Stock 手動分）
- **推奨度**: ★☆☆

### Plan-B: 半自律（規約遵守・人間最終確定）★推奨
- note: Claude が記事完成 + 図解生成 → 人間が publish ボタンクリック (30秒/日)
- X: Claude が投稿文 + 画像生成 → 人間がポスト (30秒/日)
- Instagram: Graph API 自動投稿（完全自動）
- Adobe Stock: 生成 100% Claude / upload 人間 (週1まとめて30分)
- KDP: Phase 2 保留
- **リスク**: 低（全プラットフォーム規約遵守）
- **人間時間**: 月 30-60分（日次クリック + 週次アップロード）
- **推奨度**: ★★★

### Plan-C: 規約遵守完全自動（X Free Tier 縛り）
- note: 利用不可（人間 publish 必須）
- X: Free Tier 月450投稿（≈月15投稿/日上限）→ note 不在で誘導先なし
- Instagram: Graph API 自動投稿
- Adobe Stock: 手動アップロード不可（自動化不可で運用断念）
- **問題**: note・Stock を捨てると主収益源喪失 → 月1万円達成困難
- **推奨度**: ★☆☆

### 推奨 Plan-B の理由

- 「人間介入なし」目標は **API 不在で物理的に不可能**（note 公式 API なし、Stock も同様）
- ただし「Claude が考えて準備 → 人間が30秒承認」は限りなく完全自律に近い
- 規約違反リスクなし → 既存 ofmeton ブランドを守れる
- 月¥8,000-45,000 の収益範囲を狙える
- 月予算1万円内に収まる（X 課金不要）

## 5. 構成（Plan-B 採用前提）

### 5.1 主軸 cron pipeline (1日1サイクル)

```
05:00 JST: AI 動向シグナル収集 (ai-radar DB 直近24h を抽出)
06:00 JST: トピック選定 (wiki/publishing/by-theme/ と紐づけ・重複除外)
07:00 JST: 記事ドラフト生成 (writer エージェント / non-engineer-translation + SCQA)
08:00 JST: 図解 + ヘッダー画像生成 (visual-designer / gpt-image-2)
09:00 JST: rubric review (content-reviewer 7軸チェック)
10:00 JST: X 投稿文 + Instagram カルーセル生成
10:30 JST: 人間レビュー Slack 通知 (Plan-B では publish 承認待ち)
[人間 publish] note / X
12:00 JST: Instagram 自動投稿 (Graph API)
[Adobe Stock 週1まとめて手動アップロード]
23:00 JST: KPI 集計 (Supabase に publish 記録・view数・likes・売上)
```

### 5.2 投稿頻度

| 媒体 | 頻度 | 内容 |
|---|---|---|
| note 無料 | 月10本 (約3日に1本) | Claude 活用事例 / tips / 開発事例 |
| note 有料 | 月1-2本 (¥500-980) | プロンプト集 / 業務テンプレ集 |
| note メンバーシップ | 継続課金 ¥500/月 | (Phase 2 で検討) |
| X | 月30投稿 (日1本ペース) | Before-After + 数値見出し、note 誘導 |
| Instagram | 月15投稿 (2日に1本) | カルーセル 9枚構成、note + プロフィール誘導 |
| Adobe Stock | 月200枚生成・100枚採択投稿 | テーマ batch 生成、週1アップロード |

### 5.3 売上想定

| チャネル | 月収レンジ | 達成確度 (3ヶ月目) |
|---|---|---|
| note 有料 | ¥5,000-30,000 | 60% (有料1-2本 × 10-30人) |
| note メンバーシップ | ¥0-5,000 | 20% (10人 × ¥500) |
| Adobe Stock | ¥3,000-15,000 | 50% (採択100枚 × 月3DL × ¥100) |
| **合計** | **¥8,000-50,000** | **3ヶ月目: 70% / 初月: 20%** |

## 6. 実行環境

### 6.1 インフラ
- Vercel cron (無料枠) — 1日1サイクルの自動実行
- Supabase (無料枠) — KPI ログ / publish 履歴 / A/B テストデータ / 人間承認キュー
- Resend / Gmail MCP — 人間承認 Slack 通知 / エラー通知

### 6.2 既存資産流用 (ゼロからの立ち上げではない)
- **エージェント**: brand-publisher / writer / visual-designer / content-reviewer
- **wiki**: wiki/publishing/buzz-patterns.md / by-media/ / by-theme/
- **raw**: raw/publishing/inspirations/
- **スキル**: scqa-writing-framework / non-engineer-translation / content-quality-rubric / visual-design-system / multi-platform-publishing / note-revenue-playbook
- **アカウント**: ofmeton (X / Instagram / note 既存)

### 6.3 新規構築
- `/pipeline/daily-publish-prep` (Vercel function): 1日1サイクル
- `/pipeline/instagram-publisher` (Vercel function): Instagram 自動投稿のみ
- `/pipeline/stock-batch-gen` (Vercel function): 週次 batch 生成
- `/dashboard/money-bot` (Vercel page): KPI 可視化（ai-radar 流用）
- `/approval-queue` (Vercel page): note / X publish 承認 UI（モバイル対応）

## 7. 予算 1万円内訳

| 項目 | 月額 |
|---|---|
| Claude API (記事執筆 + レビュー + SNS生成) | ¥5,000 |
| gpt-image-2 (note 図解 + IG カルーセル + Stock) | ¥4,000 |
| Vercel / Supabase / Resend | ¥0 (無料枠) |
| 余裕 (A/B テスト原資) | ¥1,000 |
| **合計** | **¥10,000** |

予算超過時は **kill switch** で自動停止（Vercel function で月初リセット）。

X API は採用しない（$200/月で予算超過のため）。

## 8. 人間介入の最小化

### 8.1 初期セットアップ（1日集中 / 4-5h）
- Instagram Graph API 設定 (2-3h) — Facebook Business Manager 経由
- Adobe Stock コントリビューター登録 (30min)
- Supabase / Vercel 設定 (1h)
- 承認 UI 起動・モバイルアクセス確認 (30min)

### 8.2 日次運用（30-60秒 / 日）
- Slack/モバイル通知 → 承認 UI で note + X を Y/N 確認
- Y なら Claude が publish 実行（API ある分は完全自動）

### 8.3 週次運用（30分 / 週）
- Adobe Stock に生成画像を手動アップロード（API なし）
- KPI ダッシュボード確認、推奨アクション Y/N

### 8.4 月次運用（1h / 月）
- 全体 ROI レビュー
- A/B テスト結果評価
- 撤退ライン判定

## 9. KPI と評価ループ

### 9.1 KPI（Supabase で日次記録）
- 投稿数: note / X / Instagram / Stock
- view数 / likes / RT / コメント
- note 売上 / Stock DL数 / 売上
- 粗利 = 売上 − コスト
- 自動化率 = 自動投稿数 / 全投稿数
- アカウントヘルス: warning / shadowban 件数

### 9.2 評価ループ
- **日次**: cron 完了レポート（成功/失敗ログ）
- **週次**: パフォーマンス低い投稿パターンを停止、A/B テスト結果から新パターン投入
- **月次**: 全体 ROI 評価、戦略 pivot 検討

### 9.3 自律改善（Claude が主体）
- A/B テスト原資 ¥1,000/月 で見出し・画像・タイトル変更
- 結果を Supabase に記録、Claude が次サイクルに反映
- 月次レポートで「効いた構成」を Claude が分析・提案

## 10. リスクと撤退ライン

### 10.1 リスク

| リスク | 兆候 | 対応 |
|---|---|---|
| ofmeton ブランド毀損 | content-reviewer rubric F評価が増加 | 即停止、人間レビューに戻す |
| note アカウント警告 | note からの警告メール / view 急減 | 投稿頻度減 + 人間 review 復活 |
| Instagram shadowban | エンゲージメント急減 | 投稿頻度減 + ハッシュタグ見直し |
| KDP / Stock 審査落ち増加 | 採択率 30% 以下 | テーマ・タグ戦略見直し |
| 月予算超過 | コスト > ¥10,000 | kill switch 発動・即停止 |

### 10.2 撤退ライン

- **2026-08末（3ヶ月目）月¥3,000未達** → 戦略 pivot
- **既存 ofmeton ブランド毀損が観測** → 即停止
- **2チャネル以上で ban / shadowban** → 即停止
- **月予算超過 2ヶ月連続** → 即停止

## 11. 着手手順

### Phase 0: 規約調査・計画書確定 (2026-05-22) ← 現在
- ✅ 規約調査完了
- ✅ 計画書ドラフト完成
- ⏳ ユーザーレビュー・承認

### Phase 1: 基盤構築 (2026-05-23 〜 2026-05-29)
- system-engineer に依頼
- Supabase スキーマ設計 (publish キュー / KPI / A/B テスト)
- Vercel cron 設定
- Instagram Graph API 認証 (Facebook Business Manager 経由)
- 承認 UI 構築 (Vercel + Supabase)
- KPI ダッシュボード (ai-radar 流用)

### Phase 2: 自動運用開始 (2026-05-30 〜)
- 1日1サイクル稼働
- 週次レビュー開始
- A/B テスト開始

### Phase 3: 拡張・最適化 (2026-07 〜)
- KDP pipeline 追加 (月販売数制限を観察しながら)
- ココナラ Phase 2 検討
- note メンバーシップ立ち上げ

### Phase 4: 撤退判断 (2026-08末)
- 月¥3,000 未達なら戦略 pivot
- 達成なら維持・拡張

## 12. 関連ドキュメント

### 親 spec
- `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`
- `docs/superpowers/specs/2026-05-21-summer-income-bridge-design.md`

### 既存エージェント
- `.claude/agents/business-ops/brand-publisher.md`
- `.claude/agents/learning-creative/writer.md`
- `.claude/agents/visual-designer.md`
- `.claude/agents/content-reviewer.md`
- `.claude/agents/dev-automation/system-engineer.md`

### 既存スキル
- `.claude/skills/scqa-writing-framework.md`
- `.claude/skills/non-engineer-translation.md`
- `.claude/skills/content-quality-rubric.md`
- `.claude/skills/visual-design-system.md`
- `.claude/skills/multi-platform-publishing.md`
- `.claude/skills/note-revenue-playbook.md`
- `.claude/skills/publishing-wiki-ingest.md`

### Memory
- `memory/project_unemployment_benefits.md`
- `memory/feedback_image_approval_gate.md`
- `memory/feedback_external_api_cost_check.md`
- `memory/project_current_streams.md`

## 13. ユーザー判断が必要な箇所

1. **Plan-A / Plan-B / Plan-C どれを採用するか** (推奨 Plan-B)
2. **Instagram Graph API 設定の Facebook Business Manager 経由を許容するか**（プライバシー上の懸念があれば代替案検討）
3. **承認 UI のモバイル設計**: Slack 通知 + URL クリックで承認画面が開く形でよいか
4. **撤退ライン¥3,000 / 3ヶ月**: もっと厳しく / 緩くするか
