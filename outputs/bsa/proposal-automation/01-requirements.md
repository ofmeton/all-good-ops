# BSA 受注自動化システム — 要件定義書

> 作成日: 2026-04-28
> プロジェクト名: BSA Proposal Automation (BSA-PA)
> 目的: BSA 戦略 (2026-04-22〜08-22) における提案投下フローを半自動化し、1件あたりの所要時間を 2時間→5分 に短縮する
> SSOT 参照: `wiki/business/bsa/pricing-catalog.md` / `outputs/bsa/proposal-templates.md` / `outputs/bsa/watcher-design.md`

---

## 0. 背景

BSA 戦略は 4ヶ月タイムボックスで Lancers / Coconala / CrowdWorks に提案投下を続けるブートストラップ戦略。Week1 計画では毎朝の手動巡回 + 提案文カスタマイズで 1案件あたり約 2時間を要し、3件/日が上限。これを 50件巡回 + 上位10件の提案文準備まで自動化し、人間は最終確認とフォーム入力のみを行う体制に切り替える。

既存資産:
- `outputs/bsa/watcher-design.md` — 案件収集の MVP 設計（提案自動生成・自動送信は非目的）
- `outputs/bsa/proposal-templates.md` — 提案文テンプレ T1-T5
- `wiki/business/bsa/pricing-catalog.md` — 商品ライン L1/L2/L3/L4 の価格・納期 SSOT

本システムは watcher-design.md を**参考・拡張**し、提案文生成までを自動化対象に含めるよう方針を上書きする（自動送信は引き続き非目的）。

---

## 1. 最上位ゴール (KPI)

| 指標 | 現状 | Phase 1 完了後の目標 |
|---|---|---|
| 1案件あたりの提案準備時間 | 2時間 | 5分 |
| 1週間あたりの提案投下数 | 2件 | 20件 |
| 受注率 | 0% | 1% |

達成期限: BSA 戦略 Week 4 終了時 (2026-05-20 目安)。

---

## 2. スコープ

### 2.1 含むもの (Phase 1)

- Lancers の 3 検索 URL（`/work/search/web/lp` / `/work/search/web/website` / `/work/search/ad`）から案件情報を自動収集
- fit_score による上位10件の自動抽出
- 上位10件の業界・競合リサーチ（WebFetch + Exa MCP + Playwright）
- 提案文の自動生成（テンプレ + 案件固有部分のハイブリッド）
- 商品ライン (L1/L2/L3/L4) の自動推定 + 案件規模に応じた金額・納期のカスタマイズ
- 完成した提案文のダッシュボード表示・編集
- 提案文のクリップボードコピー
- Claude in Chrome 拡張による応募フォーム自動入力（送信ボタンは人間が押す）
- 提案ステータス管理 (collected / proposing / submitted / replied / won / lost)
- 過去案件の履歴蓄積と受注率の集計
- 1日1回のデスクトップアイコンによる手動実行
- 完了通知 (macOS + Gmail)

### 2.2 含まないもの (Phase 1 非目的)

- 提案・応募の**自動送信**（規約遵守・誤送信防止のため、最終クリックは常に人間）
- CrowdWorks / Coconala / その他媒体の収集（Phase 2 以降。ただしアーキは複数媒体対応を前提に設計する）
- スマートフォン・外出先からのダッシュボードアクセス
- スリープ中の自動実行（手動ダブルクリック前提）
- クラウドホスティング（ローカル完結）
- 複数アカウント対応
- 顧客（クライアント）との会話・メッセージ管理（client-manager に委譲）
- 受注後の納品管理（rapid-hp-operator / system-engineer に委譲）

---

## 3. 機能要件

### 3.1 案件収集 (collector)

**FR-1.0** プラットフォーム別アダプタパターンで実装し、新規媒体（CrowdWorks / Coconala / その他）を追加する際にコア処理を変更せずアダプタファイル1本追加で対応できる構造とする

**FR-1.1** Phase 1 では Lancers の 3 検索 URL を Playwright headed + ステルス設定で巡回し、各 URL から最大 17 件、合計約 50 件/日の案件情報を取得する

**FR-1.2** 取得項目:
- 案件タイトル、案件詳細 URL、案件本文（全文）
- 予算テキスト、予算下限/上限（数値化）
- 応募締切、現在の提案数
- 発注者名、本人確認の有無、発注者の発注実績数
- サービスカテゴリ (lp / website / ad)
- 掲載日時、収集日時

**FR-1.3** 同一案件の重複は detail_url の UNIQUE 制約で除外し、初回掲載日時を保持

**FR-1.4** 収集完了後、jobs テーブルに upsert する

### 3.2 fit_score 計算 (scorer)

**FR-2.1** 以下の配点で 0-100 点を算出:

| 軸 | 配点 | ロジック |
|---|---|---|
| 価格帯 | 30 | 1万未満=0 / 1-3万=25 / 3-30万=30 / 30-50万=20 / 50万以上=15 / 不明=10 |
| サービス種別 | 25 | LP=25 / 広告運用=25 / コーポ=15 / 修正改修=10 / その他=5 |
| 制約条件 | 15 | 認定ランサー限定= -30 (除外) / 実績10件以上必須= -10 / 個人OK= +15 / なし= 10 |
| 速度要求 | 10 | 1週間以内=10 / 2-3週間=7 / 1ヶ月以上=3 / 期限なし=5 |
| クライアント評価 | 20 | 本人確認済み + 実績10件以上=20 / 本人確認のみ=10 / 本人確認なし= -10 / 初投稿= -10 / 不明=5 |

**FR-2.2** 各軸の内訳を `fit_score_breakdown` (JSON) に記録し、後で配点見直しできるようにする

**FR-2.3** 配点ロジックは設定ファイル化し、UI からの調整を Phase 2 で可能にする

### 3.3 提案文生成 (generator)

**FR-3.1** fit_score 上位10件を対象に、以下を生成:
- 提案文本文 (Markdown)
- 推奨商品ライン (L1/L2/L3/L4)
- 推奨金額（pricing-catalog.md の基準値からカスタマイズ）
- 推奨納期（同上）
- リサーチノート（参照した発注者サイト・業界トレンド・競合 LP の要点）

**FR-3.2** Claude Code CLI ヘッドレス実行 (`claude -p`) で生成し、サブスク内利用とすることで追加コストを発生させない

**FR-3.3** 生成プロンプトは以下を含める:
- 案件タイトル・本文・予算・締切・発注者情報
- リサーチ結果のサマリ
- 該当する提案テンプレ (T1-T5)
- BSA 表記ルール（工藤陸名義・「AI活用」のみ・固有名詞 NG）
- 出力フォーマット指定 (JSON)

**FR-3.4** 生成完了したら proposals テーブルに保存し、jobs テーブルの status を `proposing` に更新

**FR-3.5** 残り40件は提案文未生成のまま jobs テーブルに保持し、後から追加生成依頼を受け付け可能にする

### 3.4 リサーチ (researcher)

**FR-4.1** 上位10件の各案件について、以下のリサーチを実行:
- 発注者の会社名・サイト URL が抽出できれば WebFetch で会社サイトを取得（300字要約）
- 業界キーワードで Exa MCP の web_search を実行し、競合 LP・業界トレンド上位3件を取得
- リサーチ結果は `research_notes` フィールドに JSON で保存

**FR-4.2** リサーチコスト上限:
- WebFetch: 無料・回数制限なし
- Exa MCP: 月 1000 検索の無料枠以内（提案 3件/日 × 30日 × 5検索 = 450/月で余裕）
- 月800検索（80%）到達時に macOS 通知 + Gmail で警告
- 月1000検索の上限到達時は処理を即停止し、人間判断を仰ぐ（自動でスキップして提案文を作らない）

### 3.5 ダッシュボード (dashboard)

**FR-5.1** ローカル Next.js (`npm run dev` で `localhost:3000`) として動作

**FR-5.2** 画面構成:
- `/` : 当日サマリ（収集件数、提案準備件数、上位10件の提案カード、その他40件のリスト）
- `/proposals/[job_id]` : 提案文編集（左: 案件情報、右: 提案文エディタ + 商品ライン/金額/納期）
- `/history` : 全期間の案件一覧、ステータス・期間フィルタ、受注率集計
- `/settings` : 通知設定、クッキー期限表示、fit_score 配点調整

**FR-5.3** 各案件カードに以下のアクション:
- 上位10件: 提案文プレビュー / 編集 / コピー / Claude in Chrome でフォーム入力 / ステータス更新 / ID コピー
- 残り40件: 案件URL / fit_score 表示 / 「提案文生成を依頼」ボタン / ID コピー

**FR-5.4** 提案文編集画面では:
- Markdown エディタで自由編集可
- 商品ライン (L1-L4) のドロップダウン選択
- 金額・納期の数値入力
- 「Claude に再生成依頼」ボタン → 案件 ID をクリップボードにコピー（O1=B 採用）
- 編集内容は即座に proposal_revisions テーブルに履歴保存

### 3.6 フォーム入力連携 (form-filler)

**FR-6.1** ダッシュボードの「Claude in Chrome でフォーム入力」ボタン押下時:
- 案件の応募ページ URL を新しいタブで開く
- Claude in Chrome 拡張に提案文・金額・納期を渡す
- 拡張が応募フォームの該当フィールドに値を流し込む
- 送信ボタンは押さず、人間の最終確認を待つ

**FR-6.2** 送信成功後、人間が手動で「入力済みにする」ボタンを押し、ステータスを `submitted` に更新

### 3.7 追加生成依頼 (regeneration)

**FR-7.1** 残り40件の案件カードの「提案文生成を依頼」ボタン押下時:
- 案件 ID + 任意の指示メモがクリップボードにコピーされる
- 「Claude Code に貼って依頼してください」とトースト表示
- 利用者は別途 Claude Code を起動して案件 ID と共に依頼を送る
- 秘書（または system-engineer）が SQLite を直接更新して proposal を生成・保存

**FR-7.2** 既存の上位10件の提案文修正も同じフロー

### 3.8 ステータス管理 (status)

**FR-8.1** 案件のステータス遷移:
```
collected → proposing → submitted → (replied) → won / lost
```

**FR-8.2** `submitted`: 人間が「入力済みにする」を押した時に手動更新
**FR-8.3** `replied`: クライアントから返信があった時に手動更新
**FR-8.4** `won` / `lost`: 受注確定 / 失注確定時に手動更新（30日経過で自動 lost も検討、Phase 2）

**FR-8.5** ステータス変更履歴は jobs テーブルとは別の status_history テーブルに記録（受注率分析用）

### 3.9 通知 (notifier)

**FR-9.1** 朝の収集 + 提案生成完了時:
- macOS 通知（terminal-notifier）: 「📥 BSA 収集完了 / 50件収集 / 上位10件の提案文準備済み / 🔥 最優先 N件 / 🎯 推奨 N件 / 📋 余裕 N件」
- Gmail 送信（既存 Gmail MCP 経由）: Subject `[BSA] YYYY-MM-DD 朝の収集レポート (10件提案準備完了)`、Body に上位10件のタイトル/予算/fit_score/推定商品ライン/ダッシュボード URL

**FR-9.2** エラー停止時:
- macOS 通知: 「❌ BSA 収集失敗 - {エラー要約}」
- Gmail 送信: Subject `[BSA] YYYY-MM-DD 収集エラー`、Body に詳細スタックトレース + 復旧手順

**FR-9.3** Lancers クッキー期限切れ検知時:
- macOS 通知: 「🔑 Lancers に再ログインしてください」
- Playwright headed で Lancers ログインページを自動的に開く

### 3.10 実行起点 (entrypoint)

**FR-10.1** デスクトップに配置された `.command` ファイル（または `.app`）のダブルクリックで実行を開始する

**FR-10.2** 実行内容:
1. クッキー有効性チェック → NG なら通知 + 停止
2. collector による収集
3. scorer による fit_score 計算
4. 上位10件の researcher + generator 実行
5. generation_requests キュー処理
6. notifier による完了通知
7. Next.js dev server をバックグラウンド起動（既起動なら何もしない）
8. ブラウザで `http://localhost:3000` を開く

**FR-10.3** あなたが普段使っている Chrome は触らない（Playwright が別の Chromium プロセスで動く）

---

## 4. 非機能要件

### 4.1 パフォーマンス

| 項目 | 目標 |
|---|---|
| 50件収集の所要時間 | 5分以内 |
| 上位10件の提案文生成（並列） | 10分以内 |
| 全体（ダブルクリック → ダッシュボード起動） | 20分以内 |
| ダッシュボードの初期表示 | 2秒以内 |
| 提案文編集の保存レスポンス | 500ms以内 |

### 4.2 セキュリティ

| 項目 | 要件 |
|---|---|
| Lancers ログイン情報 | macOS Keychain 保存 (K1=a)、コードに平文で書かない |
| Cookie 保存先 | OS のユーザーディレクトリ配下、git ignore |
| SQLite ファイル | git ignore（個人情報含むため）|
| 環境変数 | `.env` を使う場合は git ignore + サンプル `.env.example` のみコミット |
| ダッシュボード | localhost のみバインド、外部からアクセス不可 |

### 4.3 規約遵守

| 項目 | 要件 |
|---|---|
| Lancers 利用規約 | 自動化禁止条項を技術調査で確認、リスクある場合は設計を見直し |
| 自動送信 | 一切しない（人間が必ず最後にクリック） |
| アクセス頻度 | 案件詳細ページ取得は 1リクエスト/秒以下、人間の閲覧速度を超えない |
| User-Agent | Playwright デフォルトを上書きし、一般的な Chrome の UA を使用 |
| ステルス設定 | playwright-stealth または同等のライブラリで自動化検出を回避 |

### 4.4 信頼性

| 項目 | 要件 |
|---|---|
| 失敗時の挙動 | 即停止 + 通知（リトライしない） |
| エラー時のデータ整合性 | トランザクション境界を明確化、中途半端なデータを残さない |
| クッキー期限切れ | 自動検知して再ログイン促す |
| サイト構造変更 | セレクタ変更で壊れた場合は明示的に通知 |
| ログ | 全実行を runs テーブルに記録、失敗詳細を error_message に保存 |

### 4.5 保守性

| 項目 | 要件 |
|---|---|
| モジュール分割 | collector / scorer / generator / researcher / notifier / dashboard を独立 |
| 言語選択 | collector + scorer = Python (Playwright)、generator + dashboard = TypeScript (Node.js) |
| データアクセス層 | shared/db.{py,ts} で統一スキーマ操作 |
| テスト | 各モジュールの主要ロジックに最低限のユニットテスト |

---

## 5. 制約条件

### 5.1 コスト制約 (C3 由来)

- **追加課金は一切発生させない**
- 利用可能なリソース: Anthropic Pro/Max サブスク、Exa MCP 無料枠 (1000検索/月)、WebFetch (無料)、Vercel free tier、Supabase free tier
- Firecrawl は使わない（メモリ feedback_firecrawl_policy 準拠）
- 1案件あたりのコスト目標: 0円（サブスク内利用のみ）

### 5.2 環境制約

- 実行環境: Mac ローカル (macOS Darwin 25.3.0)
- 実行タイミング: 手動（デスクトップアイコンのダブルクリック）
- スリープ中は実行されない（許容）
- インターネット接続必須

### 5.3 名義・表記制約 (BSA ルール)

- 工藤陸（本名）名義での発信
- 「AI活用」のみ使用、「Claude」「Opus」「Anthropic」等の固有名詞は外部露出物に一切使わない
- SLA: 納期超過時は料金20%返金 または 翌日以内に無料修正

### 5.4 商品ライン (pricing-catalog.md SSOT)

- L1: Rapid Single LP / 30,000円基準 / 72時間基準
- L2: Rapid Corporate 5P / 80,000円基準 / 7日基準
- L3: Rapid LP + 広告運用初月 / 100,000円基準 / 96時間基準
- L4: Express 修正・改修 / 10,000-30,000円基準 / 24時間対応

→ 案件ごとに上記基準からカスタマイズ可、最終値は人間が確認

---

## 6. データ要件

### 6.1 主要エンティティ

```
jobs (案件マスタ)
  ├─ proposals (提案文、1:1)
  │   └─ proposal_revisions (改版履歴、1:N)
  ├─ status_history (ステータス遷移履歴、1:N)
  └─ generation_requests (追加生成依頼キュー、0:N)

runs (実行ログ)
sessions (Lancers クッキー保存)
```

詳細スキーマは `03-design.md` で確定。

### 6.2 ID 体系 (N4=a)

- 案件 ID: `{PREFIX}-YYYYMMDD-NNN` 形式（例: `LAN-20260428-001`）
  - `PREFIX` = プラットフォーム識別子（3文字）
    - `LAN` = Lancers
    - `CRW` = CrowdWorks (Phase 2)
    - `COC` = Coconala (Phase 2)
    - 将来追加媒体は3文字 prefix で命名規約を統一（例: ココナラ→COC、Workship→WSP、Wantedly→WNT 等）
  - `YYYYMMDD` = 収集日
  - `NNN` = その日の連番（fit_score 順ではなく収集順）
- platforms マスタテーブルで prefix ↔ プラットフォーム名 ↔ 検索URL一覧 を管理し、コード上の hardcode を避ける

### 6.3 保管期間

- jobs / proposals / proposal_revisions / status_history: **永続保存**（受注率計測のため、KPI 1% 達成度を追う）
- runs: 直近90日のみ保持
- generation_requests: status=done から30日後に削除

---

## 7. 人間確認ルール

### 7.1 確認必須

| 操作 | 確認方法 |
|---|---|
| 提案文の応募フォーム送信 | 人間がフォームを目視確認した上でクリック |
| 提案文の SQLite 自動更新 (Claude Code 経由) | **N5=a で確認不要を選択**、ただし proposal_revisions に履歴を残し復元可能 |
| 商品ライン・金額・納期の最終決定 | ダッシュボードで人間が確認・調整可、初期値は Claude 推定 |

### 7.2 確認不要 (自動化対象)

- 案件収集
- fit_score 計算
- 上位10件の自動選定
- 提案文の自動生成（生成は自動、送信は手動）
- ステータス更新（人間がボタン押下時のみ更新）

---

## 8. リスクと未確定事項 (技術調査で詰める)

| # | リスク・不明点 | 影響度 | 調査タスク | 対応 |
|---|---|---|---|---|
| R1 | Claude Code CLI ヘッドレス実行 (`claude -p`) の安定動作 | 🔴 高 | `claude -p` の構文・並列実行・MCP 利用可否を検証 | 動作しない場合は提案文生成を手動 (O1=B) のみに退避 |
| R2 | Lancers 利用規約の自動化制限 | 🔴 高 | 規約原文を確認、判例・実態調査 | NG なら閲覧頻度を人間操作と区別不能なレベルまで下げる |
| R3 | Playwright + クッキー使い回しの長期安定性 | 🟡 中 | 1ヶ月運用テスト、Lancers の検知ロジック調査 | 期限切れ検知 + 再ログイン誘導で対応 |
| R4 | Claude in Chrome 拡張による Lancers 応募フォーム操作の可否 | 🟡 中 | プロトタイプで検証 | 不可なら手動コピペにフォールバック |
| R5 | macOS `.command` ファイルから Python / Node.js を順次実行する方法 | 🟢 低 | shell ラッパー実装 | 標準的な手法で対応可 |
| R6 | Exa MCP の Claude Code CLI ヘッドレスからの呼び出し可否 | 🟡 中 | テスト | 不可なら researcher は WebFetch のみで運用 |
| R7 | 上位10件並列生成の所要時間とサブスク制限 | 🟡 中 | 5並列・10並列の挙動検証 | レート制限に当たれば直列に切り替え |

---

## 9. 段階的リリース計画

### Phase 1 (今回スコープ、3-5日)
- 機能要件 FR-1 〜 FR-10 のうち Lancers 単独対応版
- ダッシュボード 4画面のうち `/` と `/proposals/[job_id]` を最小機能で実装
- `/history` と `/settings` は最低限のスケルトンのみ

### Phase 2 (Phase 1 完了後)
- CrowdWorks / Coconala の収集対応
- ダッシュボードからの直接プロンプト送信 (Claude Code CLI ヘッドレス連携)
- fit_score 配点調整 UI
- 30日無応答案件の自動 lost 化
- スマホアクセス（Vercel + Supabase 移行検討）

### Phase 3 (受注実績10件超えた後)
- 受注パターン分析による fit_score の機械学習チューニング
- 提案文 A/B テスト機能
- 多アカウント対応

---

## 10. 成功定義

Phase 1 が成功したと言える条件:

1. デスクトップアイコンをダブルクリックして 20分以内に上位10件の提案文がダッシュボードで確認できる
2. 1案件あたりの提案準備時間が 2時間 → 5分に短縮されている
3. 1週間あたりの提案投下数が 2件 → 20件に到達できる体制になっている
4. 連続2週間エラーなく稼働する
5. 提案投下した10件以上のうち、最低1件以上の受注に至る (受注率 1%)

---

## 11. 関連資料

- BSA 戦略: `outputs/bsa/wk1-action-plan.md`、`outputs/bsa/90day-action-plan.md`
- 商品ライン SSOT: `wiki/business/bsa/pricing-catalog.md`
- 提案テンプレ: `outputs/bsa/proposal-templates.md`
- 既存ウォッチャー設計: `outputs/bsa/watcher-design.md`（参考、本要件で上書き）
- 担当エージェント: `.claude/agents/business-ops/rapid-hp-operator.md`、`.claude/agents/business-ops/freelance-scout.md`、`.claude/agents/dev-automation/system-engineer.md`
- 関連 CLAUDE.md セクション: 「BSA 戦略」「人間確認ルール」「外部スポーク 委譲ルール」
