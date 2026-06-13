---
type: concept
created: 2026-05-20
updated: 2026-06-13
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md, outputs/research/2026-06-13-viral-writing-and-thread-study.md]
related: [[by-media/x]], [[by-media/note]], [[by-media/instagram]], [[by-theme/before-after]], [[by-theme/hook-patterns]]
tags: [publishing, buzz-patterns, ofmeton]
status: active
---

# Buzz Patterns — 媒体横断バズパターン SSOT

> spec §3「リサーチ要点」を seed としてここに集約。以降は raw/publishing/inspirations/ からの ingest で育てる。

## パターン 1: 数字 + 業務名のフック

業務時間短縮や効率化の「数字」を 1 行目に置く。

例:
- 「請求書作成、3時間 → 5分にした」
- 「行政書士の見積書作成を Claude で 70% 圧縮した」

採用率: 高（X / Instagram カルーセル 1 枚目）

### 観測 [2026-05-20]

出典: [[inspirations/note-2026-05-20-smartround-cowork-cases]]
「チケット整理 1 時間以上 → 20 分」のように Before-After を分単位で数値化するほどフックが効く。抽象的な「効率化」では弱い。

### 観測 [2026-05-20] — 断言型フック

出典: [[inspirations/note-2026-05-20-kajiken-claudecode-everyone]]
「2026年、もはや全員が使うべき」という年号 + 断言型フックは数字なしでも強い。「もはや〜」「いまや〜」等の時代感フックはフォロワー獲得より前の段階（知名度獲得期）に有効。
「チケット整理 1 時間以上 → 20 分」のように Before-After を分単位で数値化するほどフックが効く。抽象的な「効率化」では弱い。

## パターン 2: Before-After 画像（左右 or 上下）

実物のスクショ・成果物の Before-After を画像で見せる。

要件:
- スクショは 8px 角丸 + ドロップシャドウ
- 矢印 or 「→」記号で視線誘導
- 数字（時間 / 文字数 / 工数）を必ず添える

採用媒体: X（1200×675）/ Instagram（1080×1350、カルーセル 1 枚目）

## パターン 2.5: X スレッド 3 ツイート完結型

「3 件 1 セット」でスレッドを完結させる型。各ツイートに明確な役割を割り当てる。

| 投稿 | 役割 |
|---|---|
| 1 本目 | フック（数字 + 業務名 / 結論先出し） |
| 2 本目 | 中身（具体プロンプト or Before-After） |
| 3 本目 | CTA（note リンク or 続き誘導） |

採用媒体: X スレッド

### 観測 [2026-05-20]

出典: [[inspirations/note-2026-05-20-uravation-claude-x-viral]]
Claude Code + プロンプト 7 選の形式で紹介。note 記事 1 本 → X 3 ツイート × 2-3 セットへの圧縮ワークフローとセットで設計すると効率的。

### 観測 [2026-06-13] — 6アカ競合のスレッド運用

出典: [2026-06-13 viral writing and thread study](../../outputs/research/2026-06-13-viral-writing-and-thread-study.md)

3ツイート完結型は量産向き。2026-06-08 の広域分布では MakeAI_CEO の thread 平均は 6.7 parts だが、2026-06-13 の top-by-faves full thread sample では MakeAI_CEO max 3、Gencoin8 max 4。上位 engagement では長い chain より `hook → 具体/手順1-2本 → まとめCTA` の tight 2-4 parts を優先する。

CTA は 1本目で「全部解説する↓」として続きを読ませ、途中は価値提供に集中し、最終投稿で保存/noteリンク/次の行動を置く。

## パターン 3: プロンプト集型（コピペで即使える）

「コピペで使える Claude プロンプト 5 選」のような型。

要件:
- 即時実用性（読了後そのまま試せる）
- 各プロンプトに「想定アウトプット」を 1 行付ける
- 5-10 個のセット感

採用媒体: note / Instagram カルーセル / X スレッド

## パターン 4: 失敗談先行型

「最初こうやって失敗した → こう変えたら動いた」の構造。

要件:
- 失敗の具体性（コード or プロンプトの実物）
- 失敗 → 変更 → 改善後の 3 段構成
- 「同じ失敗を読者がしなくて済む」効用

採用媒体: note 本文 / X スレッド

## パターン 5: 業務 × ツール名の組み合わせ

「freee MCP + Claude で月次〆を自動化」のような、業務 × 具体ツール名の組み合わせ。

要件:
- 業務名は読者が自分事化できる粒度（中小工務店の見積書、行政書士の事業計画書 等）
- ツール名は固有名詞で具体（"AI" でなく "Claude" "freee MCP"）

採用媒体: 全媒体

### 観測 [2026-05-20]

出典: [[inspirations/note-2026-05-20-smartround-cowork-cases]]
「CS × Cowork」「経理 × Linear」のように職種名 + ツール固有名詞の組み合わせが読者の自分事化を促進。業種ごとに3-5事例をまとめる note 記事の型として有効。

## パターン 5.5: 1行目の温度を型で選ぶ

出典: [2026-06-13 viral writing and thread study](../../outputs/research/2026-06-13-viral-writing-and-thread-study.md)

6アカウント 775 original posts の補助分類では、`【】` 等の記号フックが 447 件（57.7%）で最多。ただし MakeAI_CEO / nobel_824 の拡散系は bracket_hook が 1.6% / 1.5% と低く、口語リアクションや逆張りで止めている。

使い分け:
- 信頼・保存: `【保存版】【最新】` + 事例/出典。ClaudeCode_UT 型。
- 感情・認知: `ガチで革命起きた` / `断言する`。MakeAI_CEO 型。
- 議論・拡散: `まじ？` + 前提を覆すニュース。nobel_824 型。事実確認必須。
- 誘導・保存: 金額/特典/手順数字 + 損失回避。Gencoin8 型。実在のお得情報がある時だけ。

## パターン 6: 視覚デザインのフォントワーク

太字（Noto Sans Heavy 等）+ アクセント色（黄色 #FFD400）の見出しで視線を奪う。

要件:
- 背景: 黒 #0A0A0A or 濃紺 #0B1B3A or 朱赤 #C23A2C
- フォント: Noto Sans Heavy
- アクセント: 黄色 #FFD400（ハイライト・矢印・強調のみ）

採用媒体: Instagram カルーセル / X サムネ

---

## パターン 7: Few-Shot 自己学習ループ

自分の過去の成功投稿を Few-Shot（3-4 件）としてシステムプロンプトに組み込み、Claude に自分のスタイルを再現させる。

要件:
- 成功投稿（いいね・RT・保存数が基準を超えたもの）を別アーカイブに保存
- Claude に渡す時は「これが私のトーンの例です」として 3-4 件提示
- 出力形式: 見出し → 説明 → 活用例 → 誘導の 4 段構成を指定

採用タイミング: X 投稿が 10 件以上貯まってから（データ不足段階では Few-Shot の質が低い）

### 観測 [2026-05-20] — チャエン事例

出典: [[inspirations/meta-2026-05-20-chaen-buzz-5steps]]
17 万フォロワーのチャエンが実践。大量データの高速処理 → 勝ちパターン再現のサイクルを Claude + Few-Shot で構築。

### 観測 [2026-05-20] — uravation 事例（同方向で確度↑）

出典: [[inspirations/note-2026-05-20-uravation-claude-x-viral]]
過去の自分の X 投稿を全部 Claude Code に渡してシステムプロンプト化する手法。2 件の独立した ingest で同方向のパターンが確認された → パターンとしての確度が上がった。ofmeton 名義の投稿が 10 件以上貯まってから実装推奨。

---

## 異論セクション

> 既存パターンと矛盾する観測が来たら、ここに「## 異論」サブセクションを追加して両論併記する（SCHEMA 準拠で消さない）。

## 異論 [2026-05-20]: 【】記号フックは有効か？

出典: [[inspirations/meta-2026-05-20-chaen-buzz-5steps]]

**チャエン側の主張（ingest 素材より）**:
「【速報】【朗報】【必見】【超朗報】の括弧見出し」は X での高エンゲージメントフックとして実績がある。17 万フォロワー運用の成功パターンとして提示。

**既存方針との矛盾**:
`hook-patterns.md` の媒体別優先パターン（X 1st choice: 数字 + 業務）には【】記号は明記されているが、`content-quality-rubric.md` の「AI 感ゼロチェック NG 表現リスト」と衝突する可能性がある。AI 生成コンテンツに多用される記号として読者の「AI っぽい」認識を引き起こすリスクがある。

**現在の判断**: 使用保留（両論併記）。月次 lint レビューでユーザーが採否判断。rubric 更新提案あり。
