# 2026-05-20 ofmeton 発信ピボット設計

**ステータス**: draft（要ユーザーレビュー）
**ブランチ**: `task/260520-publishing-pivot`
**関連**: BSA戦略の完全撤退 / AI自動化代行（上位事業）への布石

---

## 0. Executive Summary

BSA戦略（HP制作受託）を完全撤退し、戦略主軸を「**ofmeton 名義の3媒体発信（note / X / Instagram）→ AI 自動化代行（中小企業向け）への布石**」に切り替える。

- **直近の収益軸**: note 有料記事（500-980円帯、月3〜5本無料 + 月1本有料、KGI: 6ヶ月で月5万円）
- **集客軸**: X（単発投稿で「翻訳役」演出）+ Instagram（カルーセル9枚でビジュアル差別化）
- **上位事業**: AI 自動化代行（仮置き、note 発信からの市場検証で輪郭固め）

新規エージェント 2 体（`content-reviewer` / `visual-designer`）と既存 3 体強化（`brand-publisher` / `writer` / `conversion-designer`）で構成。人間確認は **1日1通の投稿可否承認** に圧縮。

---

## 1. 戦略の前提と背景

### 1.1 現状データ（2026-04-22〜2026-05-20 / BSA 1ヶ月実績）

| 指標 | 実績 | 計画値 | 判定 |
|---|---|---|---|
| 提案投下 | 31件 / 4週 | 60-100件/月 | 大幅未達 |
| 返信 | 1件 / 31件（3.2%） | 5%以上 | 中止判定ライン抵触 |
| 受注 | **0件** | 1-3件/週 | 中止判定ライン抵触 |
| BSA 売上 | **0円** | 12万円/月 想定 | 0% |

BSA 自身が定義した中止判定ライン（返信率2週連続5%未満 / 受注0件2週連続）に、既に抵触している。

### 1.2 武器とのミスマッチ

`proven-track-record.md` の主力は **広告運用（CPA 84%削減）** と **業務自動化（工数 90-98%削減）** の二枚看板。HP制作は付随スキル。BSA は本人の主力武器を活かせない土俵で戦っていた。

### 1.3 並行して動いている案件

- terra-isshiki（葉山民泊 HP）: 個人ネットワーク経由、完走
- minpaku-cleaning（民泊清掃アプリ）: Plan 4 本番デプロイ中、完走
- RICE CREAM 店舗マネージャー: 継続
- 家庭教師（そうま+つかさ）: 継続

→ **HP受託自体はできている、ただし Lancers/Coconala 経由ではなく紹介経由**

### 1.4 ピボット結論

- **撤退**: BSA戦略・BSA-PA・Lancers/Coconala 提案投下
- **継続**: 既存案件完走、紹介経由の受け口（プロフィールは残す）
- **新規主軸**: 3媒体発信 → 上位事業（AI 自動化代行）への布石

---

## 2. 発信戦略

### 2.1 ターゲット読者

**主要ターゲット**（2026-06-13 更新）: 基盤は「AI を仕事・キャリアに活かしたいビジネスパーソン全般」を見据えつつ、**メイン = Claude Code を既にある程度使っていて、有益な活用法を探している層**。
- Claude Code を導入済みで「もっと有益な使い方」を探している実務者・開発者・副業/個人開発層
- そこから広がる、AI を仕事に活かしたい情報感度の高いビジネスパーソン全般

**書き方**: 専門家向けに書かず、難しい言葉を使わず誰でも伝わる平易な言葉で噛み砕く（読み手は専門家でなくて OK）。
**避けるターゲット**: AI / Claude Code に関心が薄い層（刺さらない）。

### 2.2 ofmeton ポジション

> **「エンジニアだけど、難しいことを誰でも伝わる平易な言葉で噛み砕いて届ける実装者」**

差別化の根拠:
- 多くの AI tips 系発信者は **プロンプト紹介止まり** → ofmeton は実装の裏側（落とし穴・運用上の注意・コード公開）まで語れる
- proven-track-record の業務自動化実績（工数90-98%削減）を **当事者の実体験** として語れる
- 「業務名 × 短縮時間 × ツール名」のテンプレで、誰でも伝わる平易な言葉に噛み砕く

### 2.3 3媒体の役割分担

| 媒体 | 主役割 | コンテンツ形式 | KPI |
|---|---|---|---|
| **X** | 拡散・認知獲得・note 送客 | 単発投稿（Before-After画像+数値見出し） | フォロワー / RT / note 流入数 |
| **Instagram** | ブランド構築・保存型認知・note + プロフ送客 | カルーセル9枚 / リール補助 | フォロワー / 保存 / プロフィール遷移 |
| **note** | 収益化・深掘りコンテンツ・上位事業のリード | 無料3-5本/月 + 有料1本/月 | 売上 / メンバーシップ登録 |

連動性:
```
X 単発投稿（Before-After 1枚）
    ↓
「↓全文と業種別アレンジは note」
    ↓
note 無料/有料記事
    ↓
プロフィール → 上位事業（AI自動化代行）への問い合わせ
```

Instagram 経由:
```
カルーセル9枚（実装スクショ多用）
    ↓
9枚目で「プロフィールから note へ」
    ↓
プロフィール URL = note トップ
```

### 2.4 コンテンツ4本柱 × 3媒体マトリクス

| 媒体 | Claude活用事例 | 制作事例 | tips | 開発事例 |
|---|---|---|---|---|
| **X** | Before-After 単発（業務×短縮時間） | 制作物スクショ + 学び1行 | プロンプト全公開 | 実装デモ短尺動画 |
| **Instagram** | 業務効率化9枚カルーセル | 案件解体9枚カルーセル | プロンプト集N選 | コード公開カルーセル |
| **note** | 月1有料：チェックリスト/テンプレ集 | 月1無料：制作プロセス丸公開 | 月2-3無料：tips記事 | 月1無料：開発体験記 |

### 2.5 ターゲット業務 30 リスト（X / Instagram 訴求の起点）

非エンジニア向けの具体的業務名で SEO 流入と共感獲得を両取り:

- 行政書士: 見積書・契約書チェック / 顧客対応定型文 / 業務マニュアル化
- 社労士: 就業規則の整合チェック / 顧客企業向け資料生成
- 税理士: 月次レポート文章 / 顧客向け節税案文章化
- 中小工務店: 見積書作成 / 提案資料下書き / 写真キャプション
- 飲食店経営者: メニュー説明文 / SNS投稿文 / レビュー返信
- コンサル: 企画書下書き / 議事録要約 / リサーチレポート要約
- 編集職: 校正 / 要約 / リライト
- 広報: プレスリリース下書き / SNS文章
- EC運営: 商品説明文 / メルマガ文章 / 顧客対応FAQ
- 不動産: 物件説明文 / 顧客対応文章
（以下、運用しながら topic-seeds.json に追加）

### 2.6 収益化モデル

**Phase 1（2026-05〜2026-07）: 立ち上げ**
- 単発有料記事のみ
- 価格: 1本目 500円（お試し）、2本目以降 980円
- 月本数: 有料1本/月、無料3-5本/月
- 月収目標: 1-3万円（初動）

**Phase 2（2026-08〜2026-10）: メンバーシップ開設**
- 単発有料記事継続
- メンバーシップ: 月額 980円〜1,980円（プロンプト集アクセス + 月1限定記事 + Discord/Slack 簡易相談）
- 月収目標: 3-5万円

**Phase 3（2026-11〜）: 上位事業（AI自動化代行）連動**
- note 読者からの個別問い合わせ受け口
- AI 自動化スポット案件: 10-30万円/件
- 月額顧問: 5-15万円/月
- 月収目標: 10万円+（note 単体 5万円 + 案件単発 5-10万円）

### 2.7 KPI

| Phase | 期間 | note 月売上 | フォロワー (X) | フォロワー (IG) | note 月本数 |
|---|---|---|---|---|---|
| Phase 1 終了 | 2026-07末 | 3万円 | 500 | 300 | 累計15本 |
| Phase 2 終了 | 2026-10末 | 5万円 | 2,000 | 1,000 | 累計30本 |
| Phase 3 中間 | 2027-02末 | 10万円相当 | 5,000 | 3,000 | 累計60本 |

---

## 3. リサーチ要点

### 3.1 note（勝ちパターン）

1. **タイトル**: 「数値 + ベネフィット」が支配的。「ChatGPTで仕事が10倍速」「AI活用108選」型
2. **構成**: 共感→価値→行動 / 失敗談→試行3手→残った1手→テンプレ配布
3. **価格帯**: 500-980円が主戦場。1,280-1,980円はテンプレ・チェックリスト同梱時のみ正当化
4. **ティーザー**: 無料=「なるほど」、有料=「これで動ける」が境目
5. **画像**: スクショ多用 + 番号付き手順。テキストオンリーは伸びない
6. **避ける**: AI感全開の総論、抽象論のみ、「いかがでしょうか」調

### 3.2 X（勝ちパターン）

1. **フック**: 【超時短】【完全自動化】等の **【】記号 + 強ワード** + 数値先出し
2. **形式**: 単発投稿+画像/動画が主流（スレッドはサブ）
3. **画像**: Before-After + 数値 が最強。スクショ+赤枠アノテーション
4. **テーマ強度**: プロンプト全公開 > 業務自動化 Before-After > Cursor/Claude Code 実装デモ
5. **ポジション**: 「エンジニアだけど非エンジニア向けに翻訳」が伸びやすい
6. **送客**: 「↓全文と業種別アレンジは note」が控えめCTAの定石
7. **避ける**: AI感の強い文体、絵文字過多、「神プロンプト」誇大煽り、AI使用の隠蔽
8. **現実値**: 日本AI系で 1万RT級は希少、**3桁後半〜4桁前半が現実的目標**

### 3.3 Instagram（勝ちパターン）

1. **形式**: カルーセル8-10枚が主軸（保存率15%超でリーチが伸びる）
2. **カバー（1枚目）**: 巨大数字+強ワード+単色背景（黒/紺/朱赤）+ 太いゴシック
3. **本編**: 9枚構成（フック→展開6枚→まとめ→CTA）、スクショは枠線+ドロップシャドウで浮かせる
4. **テーマ**: プロンプト集N選 > 業務効率化 tips > AI実装事例
5. **差別化**: ofmeton は「実装の裏側まで見せる」ポジション（多くは表面のプロンプト紹介止まり）
6. **デザインシステム**: Noto Sans Heavy / 背景3色（黒・濃紺・朱赤）/ アクセント黄色のみ。Figma 自作テンプレ推奨
7. **送客**: プロフィール URL = note トップ。投稿9枚目で「プロフィールから note へ」明示
8. **避ける**: 文字過多（1スライド20字超でNG）、Canva デフォルト感、AI 生成サムネ（指6本など）、紫×ピンク×水色グラデ

詳細リサーチログ: `outputs/research/2026-05-20-publishing-research.md`（後続タスクで作成）

---

## 4. 自律運用フロー

### 4.1 週次プロセス

```
[月曜 / 自動] brand-publisher が週次の topic-seeds から3媒体の投稿を計画
   ↓ 計画書: 7本（X 5本 / Instagram 2本 / note 1本）
[火-木 / 自動] writer が記事/X投稿/カルーセルテキストを生成
   ↓
[木-金 / 自動] visual-designer が画像生成（Codex MCP gpt-image-2 + Figma テンプレ）
   ↓
[金 / 自動] content-reviewer が rubric チェック（NG なら writer / visual-designer に差し戻し）
   ↓
[土 / 半自動] brand-publisher が承認可否サマリを生成 → ユーザー LINE/Slack 通知
   ↓
[土曜夕 / ユーザー手] 1日1回、まとめて承認ボタン押下
   ↓
[日-翌週土 / 自動] brand-publisher が予約投稿実行
```

### 4.2 人間確認のタイミング

| イベント | 確認方法 | 頻度 |
|---|---|---|
| 投稿可否承認 | LINE/Slack に「サマリ + 画像3-5枚 + 承認ボタン」1日1通 | 1日1回 |
| 価格変更（500円→980円等） | 個別確認 | 月1回 |
| メンバーシップ価格設定 | 熟議プロセス | Phase 2 開始時 |
| 上位事業の個別問い合わせ対応 | 個別対応 | 都度 |
| 月次パフォーマンスレビュー | レポート確認 | 月1回 |

### 4.3 エスカレーション条件

- 月収目標の50%以下が2ヶ月連続 → 戦略再考の熟議
- 1記事の content-reviewer rubric NG が3回連続 → writer プロンプトの根本見直し
- X / Instagram フォロワー数が30日連続停滞 → 媒体戦略の見直し
- 不適切投稿（炎上リスク）の指摘を受けた → 即時取り下げ + 振り返り

---

## 5. 体制設計

### 5.1 新規エージェント

#### `content-reviewer` （新規・横断）

**役割**: 全コンテンツ（X / Instagram / note）の品質をrubricでチェック。レビュー専任。

**rubric（必須チェック項目）**:
1. **AI感ゼロチェック**:
   - NG表現リスト: 「〜について解説します」「重要なポイントは3つあります」「結論から言うと」「いかがでしょうか」「ご興味があれば」「〜と言えるでしょう」「ぜひお試しください」
   - 機械検出 → NG 表現が1つでも出たら差し戻し
2. **画像リッチ度**:
   - note: 1スクロール（≈600px）あたり最低1枚
   - Instagram: カルーセル全枚に視覚要素必須（テキストオンリー枚NG）
   - X: 投稿に画像/動画なし → NG（テキストのみ単発はリプ用に留める）
3. **専門用語密度**:
   - 「LLM」「RAG」「Embedding」「API」「LoRA」「Fine-tuning」等の専門用語が非注釈で5回以上出たら NG
   - 出る場合は「（〜のことです）」で短く注釈を加える
4. **構造**:
   - SCQA（Situation→Complication→Question→Answer）準拠
   - 「読者の困りごと→失敗例→疑問→解決策」が冒頭500字以内に揃う
5. **バズ要素**:
   - フック1行目に「数字 / Before-After / 結論先出し / 【】記号 / 問いかけ」のいずれかが入っているか
6. **ターゲット明示**:
   - 業務名+対象職種（行政書士の見積書、中小工務店の提案資料等）が冒頭500字に出るか
7. **AI 使用透明性**:
   - AI を使った箇所と手修正した箇所が明示されているか（「ここは Claude 生成、ここは加筆」）

**参照スキル / wiki**: `scqa-writing-framework.md`（既存）+ 新設 `content-quality-rubric.md` + `wiki/publishing/buzz-patterns.md` + `wiki/publishing/by-media/*`（§7 参照）

#### `visual-designer` （新規・横断）

**役割**: note図解 / Instagramカルーセル / Xサムネを一貫設計。デザインシステム遵守。

**デザインシステム**:
- フォント: Noto Sans Heavy
- 背景3色: 黒 #0A0A0A / 濃紺 #0B1B3A / 朱赤 #C23A2C
- アクセント色: 黄色 #FFD400（ハイライト・矢印・強調のみ）
- スクショ装飾: 8px角丸 + ドロップシャドウ
- カルーセル比率: 1080×1350px（縦長）
- X画像比率: 1200×675px or 1080×1080px（正方形）

**生成手順**:
1. Codex MCP の gpt-image-2 で素材生成（または Figma テンプレ）
2. Figma で配置調整（テンプレ化済みファイル使用）
3. 書き出し: PNG / WebP

**参照スキル / wiki**: 新設 `visual-design-system.md` + 既存 `frontend-design` + `wiki/publishing/by-theme/visual-templates.md`

### 5.2 既存エージェントの強化

#### `brand-publisher`（business-ops）

- **拡張内容**: 3媒体（note/X/Instagram）統括ストラテジスト化
- **追加責務**: 週次プランニング / 投稿スケジューリング / 月次レビュー / wiki ingest セッション初動チェック
- **参照スキル / wiki**: 既存 `publishing-playbook.md` + 新設 `multi-platform-publishing.md` + `publishing-wiki-ingest.md` + `wiki/publishing/buzz-patterns.md` + `wiki/publishing/by-media/*` + `wiki/publishing/by-theme/*`

#### `writer`（learning-creative）

- **拡張内容**: 「非エンジニア向け Claude 活用記事」テンプレ特化
- **追加責務**: SCQA + 失敗談先行型の構造で記事生成
- **参照スキル / wiki**: 既存 `scqa-writing-framework.md` + 新設 `non-engineer-translation.md` + `wiki/publishing/by-theme/hook-patterns.md`

#### `conversion-designer`（横断）

- **拡張内容**: note 有料記事の「売り場ページ」（タイトル + サムネ + 序盤無料部分）の CVR 強化
- **追加責務**: 無料 → 有料の境目設計（「なるほど」→「これで動ける」）

### 5.3 廃止 / 凍結エージェント

- `rapid-hp-operator`: **凍結**（status: archived、削除はしない）
- `ad-ops-specialist`: **役割転換**（広告運用代行 → note 記事「広告運用事例」素材提供係）
- `freelance-scout`: **凍結**（紹介経由はあるので残すが、新規案件スキャンは停止）

### 5.4 新規スキル一覧

| スキル | 用途 |
|---|---|
| `content-quality-rubric.md` | content-reviewer の rubric SSOT |
| `visual-design-system.md` | visual-designer のデザインシステム SSOT |
| `multi-platform-publishing.md` | 3媒体役割分担・連動運用手順 |
| `non-engineer-translation.md` | 非エンジニア向け翻訳の言語ルール（業務用語・避けるカタカナ等） |
| `note-revenue-playbook.md` | note 売れる記事の構成テンプレ・価格設計・ティーザー設計 |
| `publishing-wiki-ingest.md` | `raw/publishing/inspirations/` → `wiki/publishing/` への半自動 ingest フロー（§7 参照） |

---

## 6. BSA 撤退計画

### 6.1 撤退対象

| 対象 | 扱い |
|---|---|
| BSA-PA 自動収集・自動入力 | **即時停止**（kill-switch 有効化、cron 停止） |
| Lancers / Coconala / CrowdWorks 提案投下 | **全停止**（プロフィールは残す） |
| `rapid-hp-operator` agent | **凍結**（status: archived） |
| `freelance-scout` agent | **凍結**（紹介経由の受け口は残す） |
| wiki/business/bsa/* | **archive 化**（status: archived） |
| `CLAUDE.md` BSA セクション・ルーティング | **書き換え**（発信系セクションに置換） |
| MEMORY.md の BSA系ポインタ | **archive 状態にマーク** |

### 6.2 残すもの

| 対象 | 理由 |
|---|---|
| portfolio リポジトリ | 役割転換（HP受託の窓 → 案件事例集 / note 記事の作例集） |
| proven-track-record.md | note 記事素材の SSOT |
| pricing-catalog.md | アーカイブ（参考資料として残す） |
| 進行中個人案件（terra / minpaku） | 完走 |

### 6.3 実行手順（Phase 1-5）

**Phase 1: BSA-PA 即時停止（所要：10分）**
- 環境変数 `BSA_PA_NO_AUTO_SUBMIT=1` を恒久化
- crontab から BSA-PA 関連エントリ削除
- 確認: 次回スキャンが走らないこと

**Phase 2: ドキュメント書き換え（所要：1-2時間）**
- `CLAUDE.md` の BSA セクション・ルーティング表を発信系に書き換え
- `wiki/business/bsa/overview.md` の status を archived に
- 撤退理由を `wiki/business/bsa/archive-notice.md` に記録

**Phase 3: エージェント凍結（所要：30分）**
- `rapid-hp-operator.md` の frontmatter に `status: archived` 追加
- `freelance-scout.md` の役割を「紹介経由の受け口管理」に変更
- `ad-ops-specialist.md` の役割を「note 記事素材提供係」に変更

**Phase 4: 新規エージェント・スキル・wiki 連携作成（所要：5-8時間）**
- `content-reviewer.md` 作成
- `visual-designer.md` 作成
- `brand-publisher.md` 拡張
- 新規スキル6本作成（§5.4 参照）
- `wiki/publishing/` クラスタ初期化（index / log / buzz-patterns / by-media / by-theme の雛形作成、本 spec の §3 リサーチ要点を初期 seed として注入）
- `raw/publishing/inspirations/` ディレクトリ作成 + README.md（投入ガイド 5 行）
- `wiki/SCHEMA.md` 例外規定追記（§7.7、ユーザー承認別ステップ）

**Phase 5: 進行中案件の完走（並行）**
- terra-isshiki / minpaku-cleaning は通常運用で継続
- 完走後、portfolio リポに事例として組み込み

各 Phase は **別 task ブランチで分割実装**。本セッションでは「設計」までで完結。実装は writing-plans skill で計画化して進める。

---

## 7. wiki 連携設計（バズ投稿の双方向参照ループ）

### 7.1 狙い

ユーザーと Claude の間に「学習速度の高い双方向ループ」を作る:

- **ユーザー → Claude**: ユーザーが見つけたバズ投稿・参考にしたい投稿を 5 秒で raw に投げ込めば、Claude が wiki に整理して以降の発信に反映する
- **Claude → ユーザー**: Claude が「今、何を参考にして判断しているか」が wiki から一覧可能。判断根拠の透明化
- **ループ効果**: 新発見のバズパターンが「次のセッションの content-reviewer rubric」「次の writer 出力」に最短で反映される

### 7.2 raw 側の置き場

```
raw/publishing/inspirations/
  └─ <media>-<YYYY-MM-DD>-<slug>.md
       例:
       - x-20260520-chaen-bazz-prompt-thread.md
       - note-20260520-keito-claude-tips.md
       - instagram-20260521-abe-carousel-fontwork.md
       - meta-20260522-fladdict-fukuya-comment.md  （媒体不問の知見メモ）
```

**中身の自由度**:
- URL 1 行だけでも OK
- 本文を貼り付けても OK
- スクショ + 自分の気づきメモでも OK
- 「これ参考にして」の一言だけでも OK

ユーザーは思いついた時に **5 秒** で投げ込める設計を最優先。フォーマット縛りは弱く設定し、ingest 側で吸収する。

### 7.3 wiki 側のクラスタ構成（新設 `wiki/publishing/`）

```
wiki/publishing/
  ├─ index.md                         全体目次（LLM 用カタログ）
  ├─ log.md                           ingest / lint 履歴（時系列 append-only）
  ├─ buzz-patterns.md                 媒体横断のパターン SSOT（lint で育てる）
  ├─ by-media/
  │   ├─ x.md                         X 特化の学び
  │   ├─ note.md                      note 特化の学び
  │   └─ instagram.md                 Instagram 特化の学び
  ├─ by-theme/
  │   ├─ before-after.md              Before-After 型の学び
  │   ├─ prompt-collection.md         プロンプト集型の学び
  │   ├─ hook-patterns.md             フック1行目パターン集
  │   └─ visual-templates.md          視覚デザインの参考集
  └─ inspirations/
      └─ <id>.md                      個別 inspiration ページ（type: source）
```

frontmatter は SCHEMA 準拠で `identity: ofmeton` 固定。

### 7.4 ingest フロー（半自動化）

**SCHEMA の標準フローからの差分**: 標準は「ユーザー指示 → ingest」だが、`raw/publishing/inspirations/` に限り **セッション開始時の自動チェック + 一括確認** を導入。これは SCHEMA への例外規定追記が必要（§7.7 参照）。

```
[セッション開始時 / 自動]
   秘書 or brand-publisher が raw/publishing/inspirations/ をスキャン
   wiki/publishing/log.md と突合 → 未取込ファイル N 件抽出
        ↓
[未取込あり / ユーザー通知]
   「未 ingest が N 件あります（一覧）。まとめて取り込みますか？」
        ↓ ユーザー Y
[一括 ingest 実行]
   各 raw ファイルについて:
     1. URL のみなら WebFetch で本文取得
     2. wiki/publishing/inspirations/<id>.md を source 型で新規作成
     3. buzz-patterns.md / by-media / by-theme に学びを反映:
        - 既存パターンと一致 → 該当ページに「## 観測 [YYYY-MM-DD]」セクション追加
        - 新規パターン → 新規概念ページ作成
        - 既存パターンと矛盾 → 「## 異論」セクションで両論併記（SCHEMA 準拠で消さない）
     4. index.md にエントリ追加
     5. log.md に「## [YYYY-MM-DD] ingest | <title>」append
   1 ingest = 1 commit（rollback 容易）
        ↓
[完了報告]
   「N 件取り込みました。buzz-patterns.md に新パターン M 件追加 / 既存 K 件更新」
```

**ユーザー操作**: raw に投げ込むだけ + セッション開始時の Y 押下だけ。実質ゼロ手間。

### 7.5 content-reviewer / brand-publisher の参照ルール

| エージェント | 必読 wiki ページ | 用途 |
|---|---|---|
| `content-reviewer` | `wiki/publishing/buzz-patterns.md` + `by-media/*` | rubric の根拠。新発見パターンを rubric に組み込む判断 |
| `brand-publisher` | 上記 + `by-theme/*` + `inspirations/` 直近 N 件 | 週次プランニングの題材選定、競合動向把握 |
| `writer` | `wiki/publishing/by-theme/hook-patterns.md` 等 | 記事執筆時のテンプレ参照 |
| `visual-designer` | `wiki/publishing/by-theme/visual-templates.md` | カルーセル・サムネ設計時の参考 |

rubric 自体は **buzz-patterns.md の蓄積に応じて自動更新候補が生まれる**。content-reviewer が「新規パターン追加 → rubric に組み込む？」をユーザーに月次提案する設計。

### 7.6 双方向の可視性

**Claude が何を見ているかの可視化**:
- ユーザーは Obsidian の `wiki/publishing/` クラスタを開けば、今 Claude が参考にしている全パターンが見える
- `wiki/publishing/log.md` で「いつ何を取り込んだか」が一覧
- `buzz-patterns.md` で「現行ベストプラクティス」が SSOT として一望
- グラフビューで cluster 全体の関係性も見える

**ユーザーが投げ込んだものの所在**:
- `raw/publishing/inspirations/` は immutable で残り続ける（投入元のスナップショット）
- wiki 側は LLM が整理したサマリ（要点抽出）
- 突き合わせて「自分が何を投げて、Claude がどう咀嚼したか」が比較可能

### 7.7 SCHEMA 例外規定（人間確認必須）

`wiki/SCHEMA.md` §ingest プロトコル に以下例外規定の追記が必要:

> **例外: `raw/publishing/inspirations/` 配下の自動 ingest**
>
> このディレクトリに限り、ユーザーの明示指示なしにセッション開始時の自動スキャン + 一括確認による ingest を許可する。
> ただし以下を遵守:
> - 一括取り込み実行前にユーザー Y/N 確認を必ず取る
> - 既存ページとの矛盾検出時は「## 異論」併記で SCHEMA 標準フローを維持
> - 1 ingest = 1 commit を厳守
> - 自動スキャンで取り込み済み判定は `wiki/publishing/log.md` を SSOT とする

SCHEMA 改定は人間承認必須事項のため、本 spec 承認後の Phase 4 内で **別ステップとしてユーザー承認** を取って実施。

### 7.8 オープン論点（wiki 連携）

- ingest 時の「学びの抽出粒度」をどこまで自動化するか（人間判断が要る部分の境界）
- `by-media` と `by-theme` の重複情報の整理方針（どちらが正本か）
- inspiration が 100 件超えた時の二次的な整理（クラスタリング・要約再生成）
- 失われた情報（削除されたツイート等）への対応（WebFetch 不可時の扱い）

---

## 8. 実装ロードマップ（暫定）

### 今週（2026-05-20〜26）
- 本 spec のユーザーレビュー
- writing-plans skill で詳細実装計画作成
- Phase 1（BSA-PA 停止）実行

### 来週（2026-05-27〜06-02）
- Phase 2（ドキュメント書き換え）
- Phase 3（エージェント凍結 / 役割転換）
- Phase 4 着手（content-reviewer / visual-designer 設計）

### 06-03〜06-09
- Phase 4 完了（新規エージェント・スキル）
- 初回投稿の試運転（X 3本 / Instagram 1本 / note 1本）

### 06-10〜06-30
- 運用開始（週次プロセス）
- 初月の数字を見て微調整

### 2026-07末
- Phase 1 KPI 評価（月収3万円達成？フォロワー目標？）
- 結果次第で Phase 2（メンバーシップ開設）へ移行判断

---

## 9. オープン論点（後で決める）

1. **note アカウント名**: 「ofmeton」そのまま使うか、別名（「ofmeton@AI活用」等）
2. **Instagram アカウント名**: 同上
3. **X アカウント名**: ofmeton 既存 or 新規分離
4. **デザインシステムの最終確定**: 黒/濃紺/朱赤 + 黄色 でいいか、ユーザー好みを確認
5. **メンバーシップの仕様**: Discord か Slack か、月1限定記事の中身、相談頻度
6. **AI 自動化代行の輪郭**: Phase 2 終了時の熟議で確定
7. **記事執筆時の AI 透明性表現の標準形**: 「ここは Claude 生成、ここは加筆」の具体表記
8. **投稿頻度の現実値**: 週7本（X5 / IG2 / note 1月1有料 + 月3-5無料）は維持可能か、運用しながら調整

---

## 10. 採否判定基準

本 spec のレビューでユーザーが判断すべき項目:

- [ ] ピボット全体方針（BSA撤退 + 発信主軸）に同意するか
- [ ] 3媒体役割分担（X 拡散 / IG ブランド / note 収益）に同意するか
- [ ] Phase 1〜3 の KPI 設定に同意するか（月収目標が現実的か）
- [ ] 新規エージェント 2 体（content-reviewer / visual-designer）の必要性に同意するか
- [ ] レビュー rubric の7項目に同意するか（追加・削除あるか）
- [ ] 自律運用フローの「1日1通の承認」モデルに同意するか
- [ ] 撤退手順 Phase 1-5 の段取りに同意するか
- [ ] **wiki 連携設計**（§7、raw/publishing/inspirations → wiki/publishing/ 双方向参照ループ + 半自動 ingest）に同意するか
- [ ] **SCHEMA 例外規定**（§7.7、`raw/publishing/inspirations/` 配下の自動 ingest 許可）を Phase 4 で別途承認することに同意するか
- [ ] オープン論点 1-8 を、本 spec 確定後に個別に決めることに同意するか

---

## 11. 関連ファイル

- `CLAUDE.md`（書き換え対象）
- `wiki/business/bsa/overview.md`（archive 対象）
- `proven-track-record.md`（記事素材として転用）
- `.claude/agents/business-ops/rapid-hp-operator.md`（凍結対象）
- `.claude/agents/business-ops/brand-publisher.md`（拡張対象）

---

**最終更新**: 2026-05-20（draft v1.0）
**次のステップ**: ユーザーレビュー → writing-plans skill で実装計画作成
