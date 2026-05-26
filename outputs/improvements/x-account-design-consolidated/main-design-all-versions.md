# x-account-design メイン設計書 統合完全版 (v9〜v10.3 全 7 バージョン省略なし)

> 統合日: 2026-05-27 / 統合者: Claude (sub-agent dispatch) / Source: outputs/improvements/x-account-design-v9.md ほか 6 ファイル
> 現行 SSOT: **v10.3 (2026-05-26 全レビュー指摘オールクリア版)**

---

## 0. このドキュメントについて

### 0.1 統合方針 4 ルール

1. **省略なし**: 全 7 バージョンの全節を保持。最新版 (v10.3) で削除された節も `Status: Deprecated in vX (理由: ...)` と注記して**原文を残す** (§3 Deprecated 節)
2. **バージョン来歴ヘッダー**: 各主要節の冒頭に 1 行 `*Version History*: v9 導入 → v10 改訂 → v10.3 確定` 形式で記載
3. **現行 SSOT 明示**: 最新確定値には `**Current (v10.3)**` マーカー、過去値は `(v9: X, v10: Y, v10.3: Z)` で履歴併記
4. **数値・分類・範囲は原値保持**: range を下限のみに縮退させない / 単一値に丸めない / classification 軸が変わったら旧軸も保持。silent reduction 厳禁

### 0.2 元バージョン一覧

| version | file | 行数 | 日付 |
|---|---|---:|---|
| v9 | x-account-design-v9.md | 1,177 | 2026-05-24 |
| v9.1 | x-account-design-v9-1.md | 539 | 2026-05-25 |
| v9.2 | x-account-design-v9-2.md | 459 | 2026-05-25 |
| v10 | x-account-design-v10.md | 1,183 | 2026-05-25 |
| v10.1 | x-account-design-v10-1.md | 645 | 2026-05-25 |
| v10.2 | x-account-design-v10-2.md | 586 | 2026-05-25 |
| v10.3 | x-account-design-v10-3.md | 1,001 | 2026-05-26 |
| **合計** | — | **5,590** | — |

### 0.3 現行 SSOT

**v10.3** が最新確定版 (new main 設計書)。実装着手時は v10.3 を読めば十分。v9.x / v10 / v10.1 / v10.2 は履歴として残置。
v10.3 で「全レビュー指摘 50+ 件オールクリア」を宣言済。残置観点は Phase 1 実証で検証する E-46〜E-52 の 7 件のみ。

---

## 1. 元バージョン進化年表

| version | 日付 | 主要変更 | 行数 |
|---|---|---|---:|
| v8 (前提) | 〜2026-05-23 | 旧 4 媒体 (X/Threads/IG/Shorts)、All MA 採用、初月モニタリング | 898 |
| **v9** | 2026-05-24 | クロスレビュー + B-1〜B-3 実測反映、3 媒体集約 (X/IG/note)、ターゲット非エンジニア経営者確定、MA 全部入り (¥357 実測)、既存資産全撤廃、Contextual Thompson Sampling、集客導線 3 パターン Optimizer 対象化、§10 法務章新設、Phase 0 期間短縮 + Week 1 投稿開始 | 1,177 |
| **v9.1** | 2026-05-25 | note 章を競合調査ベースで詳述 (構成 5 系統 / タイトル 4 要素 / 価格 × CVR / ティーザー / SEO / メンバーシップ) | 539 (差分) |
| **v9.2** | 2026-05-25 | X / Instagram 章を競合調査ベースで詳述 (X fmat 比率 / Hook 新類型 3 / 1 日 5 投稿タイムテーブル / IG カルーセル 5 テンプレ / デザインシステム) | 459 (差分) |
| **v10** | 2026-05-25 | v9 + v9.1 + v9.2 統合完全版。new main 設計書 | 1,183 |
| **v10.1** | 2026-05-25 | Phase 0 競合調査 (M-1〜M-14) 反映。月別業種フォーカス導入、Hook Phase 1 主軸 3 + テスト枠 4、Editor 6+4 ルール、集客導線 Phase 1 単純化 (A 単独)、Style Guide v1 確定 | 645 |
| **v10.2** | 2026-05-25 | Codex MCP cross-review 重大 5 件 (CR-1〜CR-5) inline patch。バックアップアカウント削除、公開許諾 gate、コスト再算定 (¥9,154 expected)、OAuth PKCE gate、primary_hook + devices 再分類 | 586 |
| **v10.3** | 2026-05-26 | 全レビュー指摘オールクリア (Codex 13 件 + Codex 後悔予測 R-16〜R-25 + Claude self-review 27 件)。顧客素材方針変更 (許諾済前提 + 投稿文固有名詞 NG)、業法ガード新章、note 販売 compliance 新章、Visualizer PSM 廃止 → ランダム + switchback、士業 target を industry_sop の sub-segment へ格下げ、4 排他軸 (translation 10% / paraphrase 20% / opinion 30% / first_hand 40%)、海外X cron 週次→日次格上げ、failure_story の比率 KPI 撤回 → 月 ≤ 4 上限 (C-13 fail-rate threshold 反転) | 1,001 |

---

## 2. 統合本文

### 2.1 背景と発信戦略

*Version History*: v9 導入 → v10 で構造維持 → v10.1 で月別業種フォーカス + non_engineer_rate Phase 別追加 → v10.3 で 4 大課題 (C1-C4) 明示 + JTBD 検証 + 業法独占順ローテーション + 士業の格下げ確定

#### 2.1.1 発信主体のプロファイル (v9〜v10.3 通底、変更なし)

- **名義**: ofmeton (個人ブランド、X / Instagram / note の 3 媒体で統一)
- 29 歳フリーランス、葉山 (神奈川) 在住
- Python/Java/GAS/VBA 等の自動化実装経験
- Claude Code + MCP で建設業向け HP 制作、民泊清掃 SaaS 開発を実運用中
- 月¥260,000 の生活費確保が当面の収入目標
- ADHD/ASD 特性、INFJ-T (準備期間が長引くとモチベ枯渇しやすい)

#### 2.1.2 発信の戦略目的

| 層 | 目的 |
|---|---|
| **表向き** | 「非エンジニア経営者でも Claude で業務が仕組み化できる」事例発信でフォロワー獲得 |
| **本来** | 「業務仕組み化の翻訳者」ポジション確立 → note 販売 + AI 自動化代行 (CLAUDE.md KGI 2) のリード経路化 |

**CLAUDE.md KPI (Phase 3 = 2027-02 末) との整合** (v9〜v10.3 通底):
- note 月売上 10 万円相当
- X 5,000 フォロワー
- IG 3,000 フォロワー

**Current (v10.1〜10.3)**: 「業務仕組み化の翻訳者」ポジションは Phase 0 §3.4 で「業種横断翻訳者 (税理士 + 製造 + 教育 + 小売 + 士業)」と限定詳述。業種特化勢 (畠山謙人 = 税理士特化 / shigyou_ai_com = 士業特化) との棲み分けはこの "横断" 軸で取る。

**v10.1 で追加 (R-3 後悔予測リスクヘッジ)**: 「業種横断が結果としてどの業種にも刺さらない」リスクへの対応として、**月ごとに 1-2 業種フォーカス** 運用を導入。

**v10.1 初期ローテーション (業種フォーカス)**:
```
2026-07 (Phase 1 month-1):  税理士 + 経理 AI
2026-08:                    社労士 + 給与計算 AI
2026-09:                    士業横断 (行政書士 / 司法書士)
2026-10 (Phase 2):          製造業 / 小売業
2026-11:                    教育 / 塾
2026-12:                    法務 / 契約 AI
2027-01:                    AI 委託フロー
2027-02:                    総まとめ / Year-end
```

**Current (v10.3 改訂、業法独占薄い順から開始)**:
士業は主軸ターゲットから外し industry_sop の 1 業種セグメントとして扱う ([Style Guide 統合版](./style-guide-all-versions.md) §2.6 Target 定義 (= 旧 v1.2 §1.1 士業格下げ統合済) 参照)。§10.9 業法ガードのリスクが薄い業種からスタートして、Phase 2 後半に業種拡張する:
```
2026-07 (Phase 1 month-1):  経理 / 業務効率化横断 (業法独占薄、JTBD 検証フェーズ)
2026-08 (Phase 1 month-2):  製造業 / 小売業 (具体 SOP)
2026-09 (Phase 1 month-3):  教育 / 塾 (家庭教師事業から派生、本人事業)
2026-10 (Phase 2 start):    AI 委託フロー / 単価設計 (C2 + C3 移行)
2026-11:                    税理士 + 経理 (§10.9 業法ガード強化済、畠山謙人と棲み分け検証)
2026-12:                    社労士 + 給与計算
2027-01:                    行政書士 / 司法書士
2027-02 (Phase 3 末):       総まとめ / Year-end + 弁護士事例 (慎重)
```

業法独占キーワード (§2.10.9) を含む業種は **Phase 2 後半 (2026-11) から** 段階的に投入。Phase 1 (2026-07〜09) で「業務横断 + 製造 + 教育」のデータを蓄積し、業法独占外でも qualified_lead 獲得可能性を実証する。

#### 2.1.3 真の北極星指標: PCR + url_link_clicks (+ business outcome by v10.3)

*Version History*: v9 導入 (PCR + url_link_clicks 主軸、dwell_time 削除) → v10 維持 → v10.3 で売上 attribution 追加

**理由 (v9)**: note 販売リンク / AI 自動化代行問合せ導線は全てプロフィール経由。プロフ訪問されることが収益直結。url_link_clicks は note 送客の直接指標。

**v9 / v10 の優先順位**:

| 順 | 指標 | 取得経路 |
|---|---|---|
| 1 | **PCR** (`user_profile_clicks ÷ impressions`) | X API v2 `non_public_metrics` (OAuth 2.0 PKCE 必須) |
| 2 | **url_link_clicks** | 同上 (note 送客 link クリック) |
| 3 | quote_count (DM 共有 / 引用 RT の代理) | public_metrics |
| 4 | bookmark_count | public_metrics |
| 5 | reply_count (深度別は別途集計) | public_metrics |
| 6 | like_count (観賞用、判断に使わない) | public_metrics |

**削除 (v9)**: dwell_time (X API v2 に存在しない、B-2 確認済)。

**Current (v10.3)** business outcome 指標を追加:

| 順 | 指標 | 取得経路 | フェーズ |
|---|---|---|---|
| 1 | **PCR** (`user_profile_clicks ÷ impressions`) | X API non_public_metrics | Phase 1〜 |
| 2 | **url_link_clicks** | X API non_public_metrics | Phase 1〜 |
| 3 | **utm_attribution** (X → note 訪問) | utm_source=x_post + Supabase | Phase 1〜 |
| 4 | **paid_article_purchase** | note Sales API / 手動 import | Phase 1〜 |
| 5 | **consultation_request** | LINE 公式アカウント Webhook + form | Phase 1〜 |
| 6 | **qualified_lead** | 個別相談 → 受注に至った件数 | Phase 1〜 |
| 7 | quote_count / bookmark_count / reply_count | X public_metrics | Phase 1〜 |

PCR は **クリック前指標**、qualified_lead は **収益直結指標**。Optimizer は両方を観察。

#### 2.1.4 コンテンツバランスの初期方針

*Version History*: v9 導入 (翻案 5 : 実体験 3) → v10 維持 → v10.1 で 4 排他化 (翻案 4 : 実体験 4 : 業種別 SOP 2 + non_engineer_rate Phase 別) → v10.3 で 4 排他確定 (translation 10 / paraphrase 20 / opinion 30 / first_hand 40)

**CLAUDE.md コンテンツ 4 本柱** (v9〜v10.3 通底):

1. **Claude 活用事例** (業務 × 短縮時間 × ツール名) — 主軸 60%
2. **制作事例** (portfolio リポ作例集連動) — 20%
3. **tips** (プロンプト集、業務効率化) — 10%
4. **開発事例** (実装の裏側、コード公開) — 10%

**v9 / v10 設定: Phase 1 (初期 2-3 ヶ月) 翻案 5 : 実体験 3**
- 反応を見て「日本の非エンジニア経営者で何が刺さるか」を学習

**自動切替トリガ (v9, v10)**: PCR 平均が 3 週連続 0.3% 超 + 上位投稿パターンが 3 類型以上特定できた時点で **実体験 6 : 翻案 4** に切替。

**v10.1 改訂 (M-1, M-2 反映)**:

| 比率カテゴリ | v10 | v10.1 | 根拠 |
|---|---|---|---|
| 翻案 | 5 | **4** | 国内 10 アカ実体験言及がほぼゼロ = 差別化レバー化 |
| 実体験 | 3 | **4** | 同上、F-5 / F-6 (Phase 0 Report) |
| 業種別 SOP | 0 (内包) | **2** | M-3 (業種フォーカス) を実体化 |
| 業務仕組み化テーマ率 | (定義なし) | **≥50-60%** | Phase 0 Report F-4 (国内 14% に対して上方) |

**v10.1 切替・継続条件**:
```
切替: PCR 平均 ≥ 0.3% × 3 週連続 + 上位投稿パターン 3 類型以上特定
    → 翻案 4 : 実体験 4 : 業種別 SOP 2 → 翻案 3 : 実体験 5 : 業種別 SOP 2

継続条件 (Phase 1 全期間):
- non_engineer_rate ≥ 0.30  ← M-7 の Editor +4 ルールで担保
- fail_rate ≥ 0.15          ← M-7 の Editor +3 ルールで担保
- business_organization_theme_rate ≥ 0.50  ← Writer プロンプト固定
```

**Current (v10.3) — 4 排他軸**: Style Guide v1.3 確定により、軸 1 (排他、4 区分) = **translation 10% / paraphrase 20% / opinion 30% / first_hand 40%**。industry_sop は軸 1 でなく軸 2 (Hook 類型) の 1 種 (= 月 20% 目標、軸 1 first_hand と相性 ◎) に格上げ。failure_story は **比率 KPI 撤回 → verified ≤ 4/月 上限 (供給制約由来)** に統一 (C-13 fail-rate threshold 反転)。

**v10.3 改訂 — non_engineer_rate Phase 別段階運用** (B-3):
```
Phase 1 Week 1-4 (慣らし):  non_engineer_rate ≥ 0.20
Phase 1 Month 2-3:          non_engineer_rate ≥ 0.30
Phase 2 以降:               0.30-0.40 で推移、自アカ実績で最適化
```
過剰に "非エンジニア向け" を強調するとエンジニア層の信頼を失うリスク (B-3 既出)。Phase 1 後半に 30% へ段階的に上げる。

#### 2.1.5 4 大課題明示 + JTBD 検証 (v10.3 新規、D-1 + R-22)

| 課題 ID | ターゲット課題 | ofmeton の解決軸 |
|---|---|---|
| **C1** | "AI で何ができるか分からない" | 業種別事例 (T1-1) で証拠提示 |
| **C2** | "自社業務に AI が組み込めるか判断できない" | 委託フローと要件定義 (T1-2) |
| **C3** | "AI 導入の見積りが妥当か分からない" | 階段単価 + ROI 開示 (T1-3) |
| **C4** | "AI を入れて失敗するのが怖い" | 失敗談先行 (T1-4) |

**Phase 1 主軸 = C1 + C4** (証拠 + 安心感)、**Phase 2-3 で C2 + C3** (購入導線への接続)。

**R-22 リスクヘッジ: JTBD ベース検証**:
```
Phase 1 中盤 (Month 2):
  非エンジニア経営者 5-10 人への課題インタビュー実施 (LINE / Zoom / DM)
  既購入支援サービスの把握
  共通課題 (JTBD) を 3 つに絞る

Phase 2 移行判定 (§8.3):
  "同一課題の相談が 2 業種以上から合計 3 件発生" を継続条件にする
  PCR ではなく business outcome を gate に
```

### 2.2 ターゲット定義 (非エンジニア経営者、業種フォーカス、士業の格下げ)

*Version History*: v9 導入 (非エンジニア経営者 = 中小企業経営者・士業・コンサル) → v10.1 改訂 (月別業種フォーカス導入、税理士〜AI 委託の年間ローテーション) → v10.3 改訂 (業法独占薄い順から開始、士業 primary → industry_sop sub-segment へ格下げ、cs:s3-62 由来)

**Current (v10.3) ターゲット定義**:

- **メインターゲット**: AI を活用したい非エンジニア経営者 (中小事業者・士業・コンサル含む)
- **ポジション**: 「業種横断翻訳者 (税理士 + 製造 + 教育 + 小売 + 士業)」 (v10.1 §1.2 で限定詳述)
- **棲み分け**: 業種特化勢 (畠山謙人 = 税理士特化 / shigyou_ai_com = 士業特化) との差は **"業種横断"** 軸で取る
- **士業の扱い**: v10.3 で primary target から外し、`industry_sop` の 1 業種セグメントとして扱う ([Style Guide 統合版](./style-guide-all-versions.md) §2.6 Target 定義 (= 旧 v1.2 §1.1 士業格下げ統合済) SSOT)

**v10.3 月別業種フォーカス順** (業法独占薄い順から開始):

```
2026-07 (Phase 1 month-1):  経理 / 業務効率化横断 (業法独占薄、JTBD 検証フェーズ)
2026-08 (Phase 1 month-2):  製造業 / 小売業 (具体 SOP)
2026-09 (Phase 1 month-3):  教育 / 塾 (家庭教師事業から派生、本人事業)
2026-10 (Phase 2 start):    AI 委託フロー / 単価設計 (C2 + C3 移行)
2026-11:                    税理士 + 経理 (§10.9 業法ガード強化済、畠山謙人と棲み分け検証)
2026-12:                    社労士 + 給与計算
2027-01:                    行政書士 / 司法書士
2027-02 (Phase 3 末):       総まとめ / Year-end + 弁護士事例 (慎重)
```

**v10.1 当時の月別業種フォーカス順** (履歴、業法薄い順ではなかった。v10.3 で逆順化):

```
2026-07 (Phase 1 month-1):  税理士 + 経理 AI
2026-08:                    社労士 + 給与計算 AI
2026-09:                    士業横断 (行政書士 / 司法書士)
2026-10 (Phase 2):          製造業 / 小売業
2026-11:                    教育 / 塾
2026-12:                    法務 / 契約 AI
2027-01:                    AI 委託フロー
2027-02:                    総まとめ / Year-end
```

`業法独占キーワード` (§10.9) を含む業種は **Phase 2 後半 (2026-11) から** 段階的に投入する (v10.3 改訂)。Phase 1 (2026-07〜09) で「業務横断 + 製造 + 教育」のデータを蓄積し、業法独占外でも qualified_lead 獲得可能性を実証する。

---

### 2.3 媒体ポートフォリオ (X / Instagram / note 役割分担)

*Version History*: v8 (旧 4 媒体 X/Threads/IG/Shorts) → v9 確定 (Threads/Shorts を次フェーズ持ち越し、X/IG/note の 3 媒体に集約) → v10 統合 → v10.3 + Style Guide v1.4 で頻度 SSOT を v1.4 に委譲 (X = 30/月、IG = 月 12、note = 4-6/月、v9.2 §2.5 の X 5 投稿/日 timetable は §3.8 history)

**Current (v10.3) 3 媒体ポートフォリオ**:

| プラットフォーム | 頻度 | ローンチ Phase | 役割 |
|---|---|---|---|
| **X (X Premium Basic 加入)** | **1 投稿/日 = 30 本/月** ([Style Guide 統合版](./style-guide-all-versions.md) §4.5 投稿頻度の変遷 / §2.14 v1.4 差分まとめ SSOT / cs:p3-592d 正設計) | Phase 1 (X 単独 launch) | 拡散・認知 → note 送客 |
| **Instagram** | **カルーセル週 2 + リール週 1 = 月 12 本** ([Style Guide 統合版](./style-guide-all-versions.md) §4.5 投稿頻度の変遷 / §2.14 v1.4 差分まとめ SSOT / cs:p3-592d 正設計、当初 v9.2 §2.5 「カルーセル週 2-3 + リール週 1 = 月 8-12」を v1.4 で月 12 に確定) | Phase 1 (IG launch 独立 gate、C-7) | ブランド構築・保存型認知 → note + プロフ送客 |
| **note** | **無料 3-5 本/月 + 有料 1 本/月 = 4-6 本/月** (500-1480 円、v10.1 階段単価 L2、[Style Guide 統合版](./style-guide-all-versions.md) §4.5 投稿頻度の変遷 / §2.14 v1.4 差分まとめ SSOT) | Phase 1 | 収益化・深掘り → 上位事業へのリード |
| ~~Threads~~ | ~~2-3 本/日~~ | 次フェーズ持ち越し (v9 で凍結) | — |
| ~~YouTube Shorts~~ | ~~1 本/日~~ | 次フェーズ持ち越し (v9 で凍結) | — |

**派生原則** (v9 §2.3 / v10 §4.3.1):
- クロスポストではない。同じ核アイデアから各プラットフォーム向けに **派生生成** (Writer プラットフォーム別プロンプト切替)
- core_idea 1 個 × 適性スコア ≥ 0.6 のプラットフォームのみ生成

**v9 当時の表現** (履歴): 「X 5 本/日 + Instagram 1 本/日 + note 無料 3-5 本/月 + 有料 1 本/月 (500-980円)」。価格上限は v10.1 で 1480 円まで拡張 (§2.7 参照)。

---

### 2.4 コンテンツ戦略 (4 排他軸 + Hook 16 種類)

*Version History*: v9 導入 (CLAUDE.md コンテンツ 4 本柱 + 翻案 5 : 実体験 3) → v10.1 改訂 (翻案 4 : 実体験 4 : 業種別 SOP 2) → v10.2 (CR-5 で Hook 配分を「未検証仮説」扱い) → v10.3 改訂 (Style Guide v1.3 SSOT 化、4 排他軸 translation 10 / paraphrase 20 / opinion 30 / first_hand 40 へ、failure_story 比率 KPI 撤回 → 月 ≤ 4 上限へ)

**CLAUDE.md コンテンツ 4 本柱** (v9 から不変):
1. **Claude 活用事例** (業務 × 短縮時間 × ツール名) — 主軸 60%
2. **制作事例** (portfolio リポ作例集連動) — 20%
3. **tips** (プロンプト集、業務効率化) — 10%
4. **開発事例** (実装の裏側、コード公開) — 10%

**Current (v10.3) 軸 1 (排他、4 区分)** — Style Guide v1.3 §2.1 SSOT:

```
translation    10%   元情報を構造そのまま要約・翻訳
paraphrase     20%   構造変えて翻案 (固有名詞 + 数字差し替え)
opinion        30%   所感・批評・「リリース → 意味 → 課題」型
first_hand     40%   本人の実体験 (Claude Code / Git / 案件メモ由来)
```

**Current (v10.3) 軸 2 (Hook 類型、排他)** — Style Guide v1.3 §2.1:

```
failure_story            月 ≤ 4 投稿 上限 (verified のみ、比率 KPI 撤回)
industry_sop             20%  業種別 SOP (士業含む、軸 1 から軸 2 へ格上げ)
non_engineer_translation 20%
before_after             15%
number_first             10%
insight_thread           10%
tool_review              10%
その他 (8 種 mix)         15%
```

**軸 3 (複数 OK、devices)**: number / before_after / conclusion_first / empathy / contrarian / question / meta / warning / 自己卑下 / 比較 / 経験談 / 【】カッコ / emoji 起点 等 13 devices (v10.2 §4.7.1)。

**16 種類 Hook 一覧** (v10 §4.7 / Style Guide v1.3 起源):
1. 数字インパクト型 / 2. 失敗談先行型 / 3. Before-After 数字型 / 4. 問いかけ型 / 5. 逆張り型 / 6. 共感型 / 7. メタ言及型 / 8. 結論先出型 / 9. 警告型 / 10. 比較型 / 11. 自己卑下型 / 12. 経験談導入型 / 13. industry_sop / 14. non_engineer_translation / 15. tool_review / 16. insight_thread

**Phase 1 主軸 3 + テスト枠 5 + 休眠 5** (v10.1 §4.7 / v10.2 §4.7.3 / v10.3 §4.7.2):

| Phase | 主軸 (60-65%) | テスト枠 (30-35%) | 休眠 (5-10%) |
|---|---|---|---|
| **Phase 1** Month 1-3 | failure_story / business_repro / critique 数字 | empathy / contrarian / question / meta / warning (5 種) | 結論先出 / 経験談導入基本 / 共感基本 / 比較 / 自己卑下 |
| **Phase 2** Month 4-7 | + 主軸 3 維持 | + テスト枠から 2-3 類型復活 = 9-10 類型 | 残り |
| **Phase 3** Month 8+ | 全 13 類型 + 新類型認定 (HDBSCAN) | — | — |

**v10.1 当時の Phase 1 比率** (履歴、failure_story を 25-30% で主軸固定していた):

```
数字インパクト型               25-30% (主軸)
失敗談先行型 (= 経験談 5 + Before-After 強化)  25-30% (主軸)
Before-After 数字型            15-20% (主軸)
問いかけ型                     5-10% (テスト枠)
逆張り型                       5-10% (テスト枠)
共感型                         5-10% (テスト枠)
メタ言及型                     5% (テスト枠)
結論先出 / 警告 / 比較 / 自己卑下 / 経験談導入 / 共感 (基本) / メタ言及 (基本)   合算 5-10%
```

v10.2 CR-5 で「Phase 1 中はあくまで観察、配分固定は Month 3 以降の Style Guide v2 で」と改訂 → Writer プロンプトには「primary_hook を毎回 4 種からランダム選択」を指示。Optimizer Phase 1 (weekly Sonnet) で primary_hook × 成果クロス集計を残し、Month 3 末で人手判定。

**継続条件 (Phase 1 全期間、v10.1)** — v10.3 でも基本維持、ただし fail_rate KPI は撤回:

```
v10.1 当時:
- non_engineer_rate ≥ 0.30
- fail_rate ≥ 0.15
- business_organization_theme_rate ≥ 0.50

v10.3 改訂:
- non_engineer_rate Phase 別段階運用 (Phase 1 W1-4 ≥ 0.20 / M2-3 ≥ 0.30 / Phase 2+ 0.30-0.40)
- fail_rate ≥ 0.15 は **撤回**、verified_failure_story 月 ≤ 4 本上限 (C-13)
- business_organization_theme_rate ≥ 0.50 維持
```

---

### 2.5 KPI 設計 (PCR / url_link_clicks / business outcome 3 段)

*Version History*: v9 導入 (PCR + url_link_clicks + dwell_time、dwell_time は B-2 で削除) → v10 (PCR + url_link_clicks 主軸) → v10.2 (qualified_consultation / paid_revenue / impressions / profile_clicks 等 business outcome KPI 追加、Codex 8-1) → v10.3 (utm_attribution + qualified_lead の 3 段化、C-10 売上 attribution 追加)

**Current (v10.3) 北極星指標 7 段** — §1.3 SSOT:

| 順 | 指標 | 取得経路 | フェーズ |
|---|---|---|---|
| 1 | **PCR** (`user_profile_clicks ÷ impressions`) | X API non_public_metrics (OAuth 2.0 PKCE 必須) | Phase 1〜 |
| 2 | **url_link_clicks** | X API non_public_metrics | Phase 1〜 |
| 3 | **utm_attribution** (X → note 訪問) | utm_source=x_post + Supabase | Phase 1〜 |
| 4 | **paid_article_purchase** | note Sales API / 手動 import | Phase 1〜 |
| 5 | **consultation_request** | LINE 公式アカウント Webhook + form | Phase 1〜 |
| 6 | **qualified_lead** | 個別相談 → 受注に至った件数 | Phase 1〜 |
| 7 | quote_count / bookmark_count / reply_count | X public_metrics | Phase 1〜 |

PCR は **クリック前指標**、qualified_lead は **収益直結指標**。Optimizer は両方を観察。

**v9 当時の指標表** (履歴):

```
1 PCR (user_profile_clicks ÷ impressions)  X API non_public_metrics
2 url_link_clicks                          同上 (note 送客 link クリック)
3 quote_count (DM 共有 / 引用 RT の代理)    public_metrics
4 bookmark_count                           public_metrics
5 reply_count (深度別は別途集計)            public_metrics
6 like_count (観賞用、判断に使わない)        public_metrics
削除: dwell_time (X API v2 に存在しない、B-2 確認済)
```

**Phase 1 KPI (CLAUDE.md と整合)** — v9 / v10.2 / v10.3 で逐次拡張:

| KPI | Phase 1 目標 (v9) | v10.2 追加 | v10.3 追加 (Current) |
|---|---|---|---|
| note 月売上 | 3 万円 | — | ¥30,000 (paid_revenue ≥) |
| X フォロワー | 500 | — | 500 |
| IG フォロワー | 300 | — | 300 |
| **qualified_consultation** | — | **≥ 3 件/月** | ≥ 3 件/月 |
| **paid_revenue** | — | **≥ ¥30,000/月** | ≥ ¥30,000/月 |
| **impressions** | — | **≥ 20,000/月** | ≥ 20,000/月 |
| **profile_clicks** | — | **≥ 60 件/月** | ≥ 60 件/月 |
| **transfer_learning_ingest_count** | — | — | **≥ 12/月 (週 3 × 4)** (v10.3 新規) |

**Phase 2 KPI** (v9 §8): note 月売上 5 万円 / X 2,000 フォロワー / IG 1,000 フォロワー / qualified_lead ≥ 5 件/月 (v10.3 追加)。

**Phase 3 KPI** (v9 §8、CLAUDE.md SSOT): note 月売上 10 万円相当 / X 5,000 フォロワー / IG 3,000 フォロワー。

---

### 2.6 投稿フロー / 自動化 (Editor 6+4 ルール、Optimizer、Visualizer 廃止)

*Version History*: v9 (Editor 6+1 ルール、Visualizer 3 モード + PSM 自動切替) → v10.1 (Editor 6+4 ルール、+3 失敗談スロット / +4 読者像 1 行明示 を追加) → v10.2 (Editor 6+5、+5 公開許諾 + DLP redaction、CR-2) → v10.3 (Editor 6+5、+3 改訂 = primary_hook='failure_story' 限定 + verified、+5 改訂 = DLP redaction + 固有名詞 mask に一本化、Visualizer PSM 廃止 → ランダム + switchback)

**Current (v10.3) Editor 6+5 ルール** — §4.6.1 SSOT:

| # | ルール | 判定方法 |
|---|---|---|
| 1 | 業務仕組み化テーマに繋がるか | LLM judge |
| 2 | 実体験要素 1 行 (実体験スロット必須) | 正規表現 + LLM judge |
| 3 | 「対象は意見、敵は作らない」 | LLM judge |
| 4 | 対立構図フィルタ | ハードコード禁止フレーズリスト |
| 5 | 直近 2 週で類似投稿なし | cos 類似度 |
| 6 | 結論の断定性 | LLM judge |
| +1 | Hook 強度 ≥ 0.4 | HookAnalyzer.score |
| +2 | ステマ表記 (アフィリエイト / 自社販売リンク含む投稿は明示) | 正規表現 + LLM judge |
| **+3 (改訂、C-13 + A-3)** | **失敗談 hook (primary_hook='failure_story') の投稿のみ実体験ソース ID 必須 + 公開許諾済 + verified_failure_story** | Hook 分類器の出力 + Supabase RLS |
| +4 | 読者像 1 行明示 (v10.1) | 正規表現 + LLM judge |
| **+5 (改訂、CR-2 + 方針変更)** | **DLP redaction 通過、固有名詞 (氏名 / 社名 / 案件名) が draft text に含まれない** | DLP 正規表現 + LLM judge |

**v9 当時の Editor 6+1 ルール** (履歴、Deprecated 節 §3 に原文保持):
- v9 では 6 + Hook 強度 ≥ 0.4 のみ。+2/+3/+4/+5 は後続バージョンで段階追加。

**Visualizer モード切替** (v10.3 全面差し替え):

```
v9 当時: PSM (Propensity Score Matching) で ai-only / self-only の effect 推定、自動切替は承認制
v10.2 中間: PSM 適用前提を満たさない (10 対 10 件で 3 共変量 = pair 不足、Codex 13-1)
v10.3 確定 (Current): PSM 廃止
  Phase 1: 各 core idea を ai-only / self-only / hybrid にランダム割当 (1/3 ずつ)
           または週単位 switchback (1 週目 ai-only、2 週目 self-only、...)
  Phase 1 観察 KPI (5 つ):
    1. profile_actions
    2. minutes_ofmeton (撮影 / 編集時間)
    3. publish_delay_hours
    4. asset_failure_rate
    5. cost_per_publish
  Phase 2 移行判定 (AND):
    - 30 日サンプル各モード ≥ 10 件
    - 5 KPI で明確な差 (95% 信頼区間)
    - minutes_ofmeton が月 2 時間未満で他 KPI 上回る場合のみ "self-only" 推奨可
```

**Optimizer 3 フェーズサイクル** (v9 §4.8 / v10.2 §4.8 維持):

- **Phase 1: 数値分析** (週次・Sonnet 4.6) — フォーマット × Hook 類型 × 内容類型 × 時間帯 × 集客導線 × (PCR / url_link_clicks / bookmark 率 / インプ) のクロス集計、Mann-Whitney U / Kruskal-Wallis、主成分分析
- **Phase 2: 仮説検証** (週次・Opus 4.7、extended thinking 有効化) — ファクト統合 → 仮説 3 個生成 → 反例検索 → A/B/C ランク付け
- **Phase 3: 施策立案 + 自動反映** (週次・Sonnet 4.6) — 仮説ごとに設定変更案、変更幅キャップ調整、ロールバック条件明示

**v10.2 改訂 (Codex 11-1)**: Phase 1 着手 Month 1-2 は Opus weekly の出力を「異常検知 / 運用詰まり / 追加計測の提案」のみに縮退。Month 3 以降に構造改善提案を再開。採用は四半期決定。

**v10.3 §4.8.3 多重比較制御 (R-24)**:
```
Phase 1 の変更可能変数:
  一度に 1 変数 (Hook / format / time / route / image_mode / 業種 から 1 つ)
  事前登録した 2 群比較のみ
  28 日窓 + 人間承認

週次は記述統計のみ、設定反映は月次 Style Guide v 更新で:
  - 28 日窓のサンプル数 ≥ 80
  - Mann-Whitney U で p < 0.05
  - effect size (Cliff's delta) > 0.3
  - human reviewer 同意
```

**1 トピックの 3 媒体展開フロー + 運用負担見積り (v10.3 §4.3.5)**:

| 内訳 | 時間/月 | 自動/人間 |
|---|---|---|
| Writer 自動生成 (240 投稿 × ~30 秒、MA) | 2 時間 | 自動 |
| Editor 自動判定 (240 × ~10 秒、MA) | 40 分 | 自動 |
| **人間承認 Phase 1 (240 投稿 × ~2 分)** | **8 時間** | **人間** |
| 人間承認 Phase 2 以降 (異常時のみ) | 1-2 時間 | 人間 |
| インタビュー応答 (LINE 5-10 ターン × 60 セッション + 週次まとめ) | 4-6 時間 | 人間 |
| **Phase 1 合計** | **12-14 時間/月** | — |

Phase 1 着手前 gate: 「1 日 25-30 分 × 30 日 = 12.5-15 時間/月」予算確保。

---

### 2.7 価格・商品設計 (note 有料 500-1480 円)

*Version History*: v9 (500-980 円、L1-L5 階段単価未確定) → v9.1 (価格 × CVR テーブル詳述、500/980/980-1480 円シリーズ) → v10.1 階段単価 5 段階確定 (L1-L5、Phase 0 Report §6.4) → v10.3 (Visualizer PSM 廃止 → ランダム + switchback で価格テスト、PSM 関連は §3 Deprecated)

**Current (v10.3) ofmeton 階段単価 5 段階** — v10.1 §0.3 SSOT:

| Layer | 商品 | 価格 |
|---|---|---|
| **L1** | note 無料記事 (3-5 本/月) | ¥0 |
| **L2** | note 有料記事 | **500 / 980 / 1480 円** (3 段、v10.3 確定) |
| **L3** | 個別相談 | 5,000-10,000 円 |
| **L4** | 小型代行 | 50,000-150,000 円 |
| **L5** | 大型代行 | 300,000 円+ |

**v9.1 §4.1 価格 3 段階の使い分け** (L2 内訳の SSOT、v10 まで継承):

```
500 円  単発 tips (1 トピック完結、4,000-6,000 字)
980 円  深掘り事例 (1 業務改善ストーリー、6,000-8,000 字)
980-1480 円  シリーズ・まとめ (3-5 記事の連動 or 業種別 SOP カタログ)
```

**v9.1 §4.3 月間配分の想定** (Phase 1 note 有料 1 本/月の内訳):

- 隔月で価格帯ローテーション (奇数月: 500 / 偶数月: 980 / 四半期に 1 度: 1480)
- 価格 × CVR は Optimizer 改善対象 (v9.1 §5.4 ティーザー境界設計の A/B テスト)

**v10.1 §4.3.4.1 構成パターン (Phase 1 = 3 系統)**:

| Phase 1 採用 | 比率 |
|---|---|
| まとめ型 | 40% |
| 専門職×AI 型 (業種別 SOP) | 40% |
| シリーズ実践記型 | 20% |

| Phase 2 追加 | タイミング |
|---|---|
| 段階型 | Phase 2 開始時 |
| ツール比較型 | Phase 2 月 1 本ペース |

**マガジン構造 (Phase 1)** — v10.1 §4.3.4.5、Phase 1 は 1-2 並走に絞る:

| マガジン | Phase | 価格戦略 |
|---|---|---|
| 「非エンジニア経営者の Claude 翻訳実装術」(本流) | Phase 1 から | 月額 ¥980 (Phase 2 開始時) |
| 「ofmeton 実践記」(シリーズ) | Phase 1 から | 個別 ¥300 or マガジン購読 ¥980/月 |
| 「業種別 Claude SOP カタログ」(まとめ) | Phase 2 から | 個別 ¥980 / マガジン買切 ¥4,980 |

**ティーザー境界設計** — v10.1 §4.3.4.4 改訂 (R-4 反映):

```
無料部分 (700-1,200 字):  ← v10 は 800-1,500 字
1. リード (100-200 字)
2. 問題提起 (300-500 字)  ← v10 は 400-600
3. 無料軽量版 (200-400 字) 固定 ← R-4 で書く負担軽減
4. 有料部分への期待値 (100-200 字)
```

---

### 2.8 集客導線 (A/B/C 3 パターン)

*Version History*: v9 §4.8 導入 (3 パターン A/B/C 同時運用、URL 付き比率を Thompson Sampling で最適化) → v10.1 §4.8 §4.8.2 (R-5 反映で Phase 1 = A 単独 + 夕方 1 投稿だけ B (URL 付き)、C は Phase 2 で導入) → v10.3 §4.8.2 (AND 条件明示)

**Current (v10.3) 3 パターン定義** — v9 §4.8 SSOT:

| パターン | 内容 | Optimizer 改善指標 |
|---|---|---|
| **A. プロフィール常時 note リンク + X 投稿は URL 無し** | URL 課金 ($0.20/req) 回避、PCR でプロフ送客 | PCR、プロフ訪問 → note クリック率 |
| **B. たまに送客ツイート (URL 付き) + 引用 RT 派生** | 送客ツイート 1 本 → 引用派生 3-5 本で再露出 | url_link_clicks、引用派生の cascade ratio |
| **C. 投稿末尾「→ プロフィール参照」CTA** | URL なしでプロフ誘導、PCR ブースト | CTA 付き投稿の PCR vs 無し PCR の差分 |

**Phase 1 単純化 (v10.1 R-5 + v10.3)**:

```
Phase 1 (Week 1 - 月 3):
  - 朝 7:00 / 昼 12:00 / 夕 17:30 / 夜 21:00 = 集客導線 A 単独 (URL なし)
  - 夕 17:00 = 集客導線 B (URL 付き、note 送客)
  - 集客導線 C は Phase 2 で導入
```

**Phase 1 → Phase 2 集客導線 B/C 導入 (AND、v10.3 §4.8.2)**:

```
- 直近 3 週連続で週次 PCR ≥ 0.3%
- 直近 30 日の平均 PCR ≥ 0.4%
- 直近 28 日 impressions ≥ 20,000
- 直近 28 日 profile_clicks ≥ 60
両方満たす + qualified_lead 月 ≥ 3 件で Phase 2 移行承認 (§5.1 媒体追加扱い)
```

**v10.1 §4.8 URL 位置 × タイムテーブル**:

```
朝 7:00  X: 失敗談先行型 (短文、Hook=「実は私も」型 or 「数字」型)
         集客導線 A、URL なし
昼 12:00 X: ROI Before-After (短文 / 中文、Hook=「Before-After 数字」型)
         集客導線 A、URL なし or 末尾
夕 17:00 X: note 送客告知 (短文 + URL)
         集客導線 B、URL 末尾 ($0.200/req)
夕 17:30 X: 17:00 ツイート引用 RT + 補足
         集客導線 B 派生、URL なし
夜 21:00 X: 17:00 ツイート引用 RT + 別角度
         集客導線 C (末尾「→ プロフィール参照」)、URL なし
```

---

### 2.9 法務 / コンプライアンス (公開許諾 gate / 業法ガード / note 販売 compliance)

*Version History*: v9 法務章新設 (ステマ規制 / 翻案ルール / VOICEVOX クレジット / AI 生成画像表記 / Secrets rotation) → v10.2 (CR-1 バックアップアカウント削除、CR-2 公開許諾 gate Schema 追加、Editor +5) → v10.3 (§10.7 顧客素材方針変更 = 許諾済前提全投入 + 投稿文固有名詞 NG / §10.8 note 販売 compliance 新章 / §10.9 業法ガード新章 / §10.2 規則ベース翻訳判定 R-15)

**Current (v10.3) §10 章構成**:

- §10.1 ステマ規制
- §10.2 翻案ルール + 規則ベース翻訳判定 (R-15)
- §10.3 X / Meta 自動投稿規約 (バックアップアカウント削除済)
- §10.4 VOICEVOX クレジット表記
- §10.5 AI 生成画像の表記
- §10.6 Secrets rotation 戦略
- §10.7 個人情報・公開許諾ガード (CR-2 + 方針変更 2026-05-26)
- §10.8 note 販売 compliance (新章 v10.3)
- §10.9 業法ガード (新章 v10.3)

**§10.2 X 短文翻案の 3 条件 (v10.3 規則ベース判定 R-15)**:

```
X 短文投稿 (< 200 字) の翻案 vs 翻訳判定 (規則ベース):
  「翻案」を満たすには 3 条件すべて:
    1. 文体・構造を変える (列挙型 → ストーリー型 等)
    2. 固有名詞 (会社名・サービス名・人名) を変える or 削除
    3. 数字を ofmeton の実例数字に差し替える

  上記 3 つすべてを満たさない場合は "翻訳" 扱い:
    → 出典 URL + 元 author 明示 が必須 (§10.1 ステマ規制と整合)

cos 類似度ベースは廃止 (X 短文では信頼性低い)、規則ベースを Writer プロンプトに固定
```

**§10.7 顧客素材方針 (v10.3 改訂)**:

- v10.2 §10.7.4 は撤回: ~~"Phase 1 では顧客素材は投入禁止、本人事業のみ"~~ → **基本許諾済前提で投入 OK**
- **投稿文には固有名詞 (氏名 / 社名 / 案件名) は出さない** が新ルール
- Editor +5 ルールで draft の固有名詞を必ず reject
- `materials_store.publication_consent` のデフォルト:
  - **本人事業 4 種** (RICE CREAM / 家庭教師 / portfolio / all-good-ops): `'granted'` 自動付与
  - **案件 client 由来** (terra-isshiki / minpaku-cleaning 含む): `'granted'` (基本許諾済前提、ofmeton 確認済)
  - 監査用に `consent_obtained_from` / `consent_obtained_at` を入力推奨 (mandatory ではない)
  - `client_impacted_flag` は記録するが、それ自体で Writer pool 除外しない

**§10.8 note 販売 compliance (v10.3 新章)**:

```
§10.8.1 特商法表記 (R-21):
販売開始前 gate (Phase 1 初回 note 有料公開前):
  ☐ 特商法表記ページを note プロフィール / 自社サイトに用意
  ☐ 提供内容 / 価格 / 解約・返品 / 連絡方法 / 個別相談の提供条件 / 問い合わせ対応時間
  ☐ 返金方針を明文化
人間タスク: HUMAN_TASKS H-12

§10.8.2 機械学習データ提供設定 (R-25):
note は公開コンテンツを ML 学習データとして第三者に提供できる旨を規約で定めている。
note 設定で「ML 学習データ提供」設定確認 → ofmeton は default OFF を推奨

§10.8.3 UTM 設計:
note 商品ごとに専用 CTA + 相談フォーム識別子
- utm_source=x_post_<id> / utm_medium=x / utm_campaign=<campaign_name>
- 商品別 paid_article_purchase, consultation_request, qualified_lead を business_outcomes に記録
```

---

### 2.10 業法ガード (税理士法 / 弁護士法 / 司法書士法 等の独占範囲)

*Version History*: v10.3 で新章 §10.9 (Claude self-review F-2 由来)

**Current (v10.3) §10.9 業法ガード** — Claude self-review F-2 SSOT:

ofmeton が「税理士業務」「社労士業務」「行政書士業務」「司法書士業務」「弁護士業務」を語る時の業法独占範囲ガード。

**§10.9.1 禁止**:
- 個別の税務 / 労務 / 法務相談に AI で回答する内容
- 業務独占資格を必要とする業務に AI を「代替」する内容
- 例: 「税理士の代わりに AI で確定申告できます」「弁護士無しで AI 訴訟可能」等

**§10.9.2 許可**:
- 業務効率化ツール (見積書生成 / OCR / データ整理等) の解説
- 各士業者本人が自分の業務に AI を使う事例の紹介 (本人取材ベース)
- "業務独占の範囲外" の業務効率化 (経理データ集計 / 給与計算 RPA 等)

**§10.9.3 Editor +5 ルールに統合 (高リスク扱い、R-11)**:

```
business_law_keywords:
  ["税務相談", "労務相談", "法務相談", "訴訟", "登記",
   "確定申告 (代行)", "労務管理 (代理)", "契約書 (作成)"]

post_drafts.business_law_risk_flag = true if any keyword present
→ §4.6.4 高リスク承認モードで 1 件ずつ承認
→ Editor +5 ルールで「ofmeton が本人代わりに語る構造」をチェック (LLM judge)
```

これにより、§1.2 月別業種フォーカス順 (業法独占薄い順から開始) と整合: Phase 1 (2026-07〜09) は業法独占外 (経理 / 製造 / 教育) で、Phase 2 後半 (2026-11) から税理士 + 社労士、Phase 3 末で弁護士事例 (慎重)。

---

### 2.11 Phase 1〜3 進行計画 (CLAUDE.md KPI と整合)

*Version History*: v9 (Phase 0 = 2-3 週間 Foundation + 人間承認つき 1 本/日) → v10.1 (Phase 0 = 完了済 2026-05-25 として位置付け) → v10.2 (Phase 0 残作業 5 件明記、CR-4 OAuth PKCE 等) → v10.3 (Phase 1 着手前 gate / Phase 1 IG launch 独立 gate C-7 / Phase 1 KPI に売上 attribution / Phase 1 運用負担見積)

**Current (v10.3) Phase 0 状態**:

```
✅ Week 0 (本セッション群): Phase 0 競合調査 + Style Guide v1 確定
✅ Phase 0 v2 (2026-05-26): 62 アカ + 24 アカ × 50+9 項目 やり直し (詳細 §6)
☐ Phase 1 着手前 gate:
  ☐ H-1〜H-5 (X / Supabase / API key / Cloudflare / LINE) 完了
  ☐ OAuth PKCE test 4 項目 ✅ (v10.2 CR-4)
  ☐ 月予算 expected ≤ ¥10,000 確認
  ☐ verified_failure_story 4 本以上の在庫確保
```

**Phase 1 IG launch 独立 gate (v10.3 C-7)** — X launch とは別:

```
- H-6 (Meta App Review、instagram_content_publish 承認)
- IG Business アカウント + FB ページ連携
- 60 日 token refresh 動作確認
- テスト投稿 1 件成功

X launch 中 IG 投稿停止が default、Phase 1 中盤に IG launch 切替判断
```

**Phase 1 (X + note ローンチ、IG は独立 gate) ~ 2026-07 末** — KPI は §2.5 と整合。

**Phase 2 (拡張、~ 2026-10 末) + 業種特化 / 横断 / アグリゲーター選択 (v10.3 R-12)**:

```
Option A: 業種横断を継続 (Phase 1 で qualified_lead が 2 業種以上から取れた場合)
Option B: 業種特化 (1 つの業種に絞る) — 例: "税理士特化" → 畠山謙人と直接対決
Option C: 横断だが "失敗談アグリゲーター" として独占 — テーマで差別化

Phase 1 終了時に Optimizer + 人間判断で A/B/C を選択
```

Phase 2 KPI: note 月売上 5 万円 + メンバーシップ起ち上げ検討 / X 2,000 フォロワー / IG 1,000 フォロワー / qualified_lead ≥ 5 件/月。

**Phase 3 (~ 2027-02 末)** — CLAUDE.md SSOT:

- note 月売上 10 万円相当
- X 5,000 フォロワー
- IG 3,000 フォロワー
- Threads / Shorts の実装着手はこの Phase 中に判断 (v9 §8)

---

### 2.12 リスクヘッジ (Codex R-16〜R-25 / Claude self-review 27 件)

*Version History*: v9 §11 (E-1〜E-27) → v10 (v9.1 E-28〜E-33 + v9.2 E-34〜E-38 追加) → v10.1 (R-1〜R-15 後悔予測導入、M-1〜M-14) → v10.2 (CR-1〜CR-5 Codex 重大 5 件 + E-39〜E-41) → v10.3 (Codex R-16〜R-25 既反映 4 + 新規 6 + Claude self-review 27 件すべてオールクリア)

**Current (v10.3) クロスレビュー観点 — 全 50 件オールクリア宣言** — §11 SSOT:

v10.3 で「全レビュー指摘 50+ 件オールクリア」を宣言済。残置観点は Phase 1 実証で検証する E-46〜E-52 の 7 件のみ。

**Phase 1 実証で検証する 7 件 (E-46〜E-52)**:

| # | 論点 | 検証フェーズ |
|---|---|---|
| E-46 | 6+5 Editor ルール (DLP + 業法 + 失敗談上限) の運用速度 (1 件処理 < 10 秒目標) | Phase 1 Week 1-2 |
| E-47 | verified_failure_story 月 4 本上限の継続供給可能性 | Phase 1 Month 1-3 |
| E-48 | UTM attribution の cross-platform 推定精度 | Phase 1 Month 2 |
| E-49 | Visualizer ランダム + switchback の 5 KPI 差検出力 | Phase 1 Month 3 |
| E-50 | 月別業種フォーカス (§1.2) が JTBD 検証で具体的 lead 獲得に繋がるか | Phase 1 Month 2-3 |
| E-51 | C-9 auto-post gate (重大誤り 0 / 規約差戻し 0 / 承認滞留 p95 < 24h / OAuth 正常) の達成可能性 | Phase 1 Month 4 |
| E-52 | Optimizer Phase 2 (Opus weekly + thinking) の本番コスト ¥702/月 ±30% に収まるか | Phase 1 Month 1 |

**安全装置 (v9 §5.3 / v10.2 §3.3.4)**:

- **変更幅キャップ**: スコア重み 1 回 30% / クエリ min_faves ±200 / 時間スロット ±60 分
- **異常検知ロールバック**: 反映後 7 日間モニタ、PCR -30% / インプ -50% で自動ロールバック
- **キルスイッチ**: LINE `!stop` で全自動反映 48 時間停止 + 自動投稿停止
- **brownout mode**: 費用上限 ¥10,000 到達時、投稿停止 + 計測継続 + 通知継続 + バックアップ継続
- **MA Session 即 archive**: 全 MA session 終了時に retrieve → archive を強制 (v9 B-3 発見、idle 課金リーク防止)

---

## 3. Deprecated 節 (v9 で導入され v10.X で削除/置換された節の原文保持)

このセクションは、最新版 (v10.3) で削除または置換された節を **原文保持** で残す。設計判断の理由を将来追跡可能にするため (cs:s2-68 silent reduction 防止)。

### 3.1 [元 v9 §1.3] dwell_time 指標

- Status: **Deprecated in v9** (理由: X API v2 に存在しない、B-2 確認済)
- 原文 (v9 §1.3 末尾):
  > **削除**: dwell_time (X API v2 に存在しない、B-2 確認済)。
- 元 v8 では北極星指標 1 位候補だったが、v9 で「X API v2 で取得できない」ことが B-2 検証で判明し、PCR + url_link_clicks を主軸とする構成に置換。

### 3.2 [元 v8〜v9 設計参考素材] 既存資産扱い (BSA / haguri / x-buzz-radar 連携)

- Status: **Deprecated in v9** (理由: 全撤廃方針、CLAUDE.md 2026-05-20 BSA 撤退と整合)
- 原文 (v9 §3.4 採用判断より抜粋):
  > **MA 全部入り (仮)** を採用。  
  > 用途: Interviewer / 選別 / Writer / Visualizer / Editor / Hook Analyzer / Optimizer Phase 1-3  
  > **既存 x-buzz-radar の Vercel + Server Action 設計は v9 で完全撤廃、MA + Cloudflare Workers に再構築**  
  > ロジック (Supabase スキーマ 8 テーブル / 選別プロンプト / 媒体派生プロンプト / 2 軸自己改善ループ) は **設計参考素材**として活用  
  >  
  > **ai-radar のコード・機能とも撤廃・再実装不要**。公式情報は twitterapi.io で取得できる範囲で間接カバー
- BSA / haguri persona / x-buzz-radar / ai-radar は v9 で全撤廃方針 (CLAUDE.md ofmeton 名義 3 媒体ピボットと整合)。

### 3.3 [元 v10 §10.3] バックアップアカウント運用

- Status: **Deprecated in v10.2** (理由: CR-1 Codex 重大 — X Automation Rules の duplicate-account 禁止に違反)
- 原文 (v10 §10.3 抜粋):
  > X 公式 Automation Rules:  
  > - 1 日 5 本は基本 OK、連続投稿の間隔 30 分以上  
  > - 同じ文面の繰り返し禁止  
  > - **バックアップアカウントを 1 つ作成、ban 時の保険**  
  > - 当日内の引用 RT chain は cos 類似度 ≤ 0.5 必須
- v10.2 で削除、代替として owned channel fallback (note メール購読 50 件 / 所有ドメイン blog / 同意済み LINE 連絡先 30 件) を Phase 1 で確保する設計に置換。

### 3.4 [元 v10〜v10.2 §4.4] Visualizer PSM (Price Sensitivity Meter / Propensity Score Matching)

- Status: **Deprecated in v10.3** (理由: Phase 1 サンプル数不足 + 撮影負荷を目的変数に含めない、Codex 13-1)
- 原文 (v9 §4.4 モード自動切替判定):
  ```
  入力: 過去 30 日の投稿データ
  process:
    ai_only_posts = filter(images_were_ai_generated)
    self_only_posts = filter(images_were_user_captured)

    if len(ai_only_posts) < 10 or len(self_only_posts) < 10:
      return current_mode  # サンプル不足

    # 準実験 (Propensity Score Matching)
    # テーマ・時間帯・フォーマットが近いペアを作って画像条件の効果を推定
    matched_pairs = psm_match(ai_only_posts, self_only_posts, covariates=[theme, hour, format])
    effect_estimate = mean(pcr_diff) over matched_pairs

    # 段階 rollout (自動切替やめて、人間判断材料として提示)
    if abs(effect_estimate) > significance_threshold:
      proposed_mode = best_mode_from_psm
      # 7 日 50% rollout → 14 日 100% (PCR -20% で自動巻き戻し)
    else:
      proposed_mode = current_mode
  ```
- v10.3 で全面差し替え: ランダム割当 + 週単位 switchback + 5 KPI 観察 (§2.6 参照)

### 3.5 [元 v9〜v10.2] failure_story 比率 KPI (fail_rate ≥ 15%)

- Status: **Deprecated in v10.3** (理由: C-13 fail-rate threshold 反転、月 ≤ 4 上限へ変更。Phase 1 で「fail_rate ≥ 15%」を強制すると架空の失敗談 + ブランド負荷リスク)
- 原文 (v10.1 §4.6 Editor +3):
  ```
  失敗談スロット必須化 (`fail_rate ≥ 15%`):
  - LLM が架空の失敗談を生成するリスクを抑えるため、
  - 失敗談記述には **実体験ソース ID (Claude Code 履歴 / Git commit / 案件メモ / 音声メモ ID)** を Editor で必須化
  - 実体験ソース ID 不在の失敗談記述は架空とみなして reject
  ```
- v10.3 改訂後:
  ```
  verified_failure_story 供給上限 (Phase 1):
    月 ≤ 4 本 (週 1 本ペース)
    各 failure_story は publication_consent='granted' + redaction_reviewed + client_impacted_flag=false 等を満たす
    Phase 1 月 4 本以下を確保できなければ、Hook 配分で failure_story を下方に自動修正
  ```

### 3.6 [元 v10〜v10.2 §1.2 / §1.4] 士業 primary target

- Status: **Demoted in v10.3** (理由: cs:s3-62 ユーザー指摘で industry_sop の sub-segment へ格下げ)
- 原文 (v9 §1.2 / v10.1 §1.2 から):
  > ターゲットは「**AI を活用したい非エンジニア (中小事業者・士業・コンサル) 経営者**」。  
  > 業種特化勢 (畠山謙人 = 税理士特化 / shigyou_ai_com = 士業特化) との棲み分けはこの "横断" 軸で取る。
- v10.3 改訂後: 士業 (税理士 / 社労士 / 行政書士 / 司法書士 / 弁護士) は primary target から外し、`industry_sop` Hook 類型 (= 月 20% 目標、軸 1 first_hand と相性 ◎) の 1 業種セグメントとして扱う。[Style Guide 統合版](./style-guide-all-versions.md) §2.6 Target 定義 (= 旧 v1.2 §1.1 士業格下げ統合済) SSOT。

### 3.7 [元 v10〜v10.X] 海外X cron 週次

- Status: **Deprecated in v10.3** (理由: cs:p3-fd8c 日次化、publishing_lag 1-6h と整合)
- 原文 (v10.3 §3.1.1 改訂前):
  ```
  毎週月曜 09:00 JST cron:
    1. twitterapi.io advanced_search で:
       - 海外 17 アカ (transfer learning 元、Phase 0 Report A 章)
       - 国内業種別 7 アカ (Phase 0 Report B 章)
       × 過去 7 日の上位投稿 (各 5-10 件) を取得
  ```
- v10.3 改訂後: 海外X cron を **日次化** (publishing_lag translation 1-6h / paraphrase 6-12h / opinion 24-48h と整合)。

### 3.8 投稿頻度の縮退と復元 (Style Guide v1.3 → v1.4 の経緯)

- Status: **一時的に縮退 (Style Guide v1.3) → v1.4 で復元済** ([Style Guide 統合版](./style-guide-all-versions.md) §4.5 投稿頻度の変遷 + §2.14 v1.4 差分まとめ)
- v9.2 §2.5 当初設計値 (Phase 0 v2 24 アカ分析前):
  - X: 月-木 1 日 5 投稿 / 金 4 / 土 3 / 日 4 = 週 31 投稿 / 月 ~120-130 本
  - IG: 1 本/日 (カルーセル) = 月 ~30 本目安、内訳カルーセル週 2-3 + リール週 1
  - note: 無料 3-5 本/月 + 有料 1 本/月
- Style Guide v1.1 (Phase 0 v2 24 アカ分析後、PR #23) で「コンテンツ品質を保つために 1 投稿/日 が現実的」と判断され X 頻度が縮減 (v9.2 5/日 → v1.1 1/日)。v1.3 で note / Instagram にも「週 1」と silent reduction が発生し、ユーザー指摘 (cs:s2-68) を経て v1.4 で復元。
- **Current (v10.3 + Style Guide v1.4)** 正設計 (cs:p3-592d):
  - **X = 1 投稿/日 = 30 本/月**
  - **Instagram = カルーセル週 2 + リール週 1 = 月 12 本**
  - **note = 無料 3-5 + 有料 1 = 月 4-6 本**
- 旧 v9.2 §2.5 timetable (X 5/日 等) は v1.1 以降 deprecated。本節で history として保持。

### 3.9 [元 v9〜v10] 受信フェーズ "PCR 3 週連続 0.3% 超" auto-post 化 gate

- Status: **Deprecated in v10.3** (理由: C-9、品質・運用 gate に変更)
- 原文 (v9 §4.8 / v10.1 §4.8):
  > **自動切替トリガ**: PCR 平均が 3 週連続 0.3% 超 + 上位投稿パターンが 3 類型以上特定できた時点で **実体験 6 : 翻案 4** に切替。  
  > Phase 2 移行: PCR 3 週連続 0.3% 超 で自動移行候補 (人間承認必須)。
- v10.3 改訂後 (§4.6.5):
  ```
  auto-post 移行条件 (AND、4 週連続):
    - 重大誤り 0 件 (Editor reject / 投稿後の事実訂正リプライ)
    - 規約差戻し 0 件 (X / Meta / note からの shadowban 警告 / Strike)
    - 承認滞留 p95 < 24h (人間承認モードでの遅延)
    - token refresh 正常 (OAuth blocked 検出ゼロ)
  ```
- PCR を gate から外し、品質・運用安定性を gate とする方針に転換。

---

## 4. 数値・分類軸の進化マトリクス

このセクションは、各バージョンで変化した重要数値・分類軸の進化を 1 表で追跡できるようにしたもの。**silent reduction 厳禁 (cs:s3-68)**、各セル原値保持。

| 指標 | v9 | v9.1 | v9.2 | v10 | v10.1 | v10.2 | v10.3 (Current) |
|---|---|---|---|---|---|---|---|
| **Target segment** | 非エンジニア経営者 (士業含む) | 同 | 同 | 同 | 同 + 月別業種フォーカス導入 (税理士から開始) | 同 | 非エンジニア経営者、士業は industry_sop sub-segment へ格下げ + 業法独占薄い順 (経理 → 製造 → 教育 → 税理士 → ...) |
| **投稿頻度 X** | 月-木 5/日 + 金土日 (v9 では均一 5/日 = 月 ~120-130) | 同 | 同 (タイムテーブル詳述、1 日 5 投稿) | 同 (1 日 5 投稿 × 4 日 + 金 4 / 土 3 / 日 4 = 週 31 / 月 ~120-130) | 同 (M-6 反映で金土日縮減明示) | 同 | **1 投稿/日 = 30 本/月** (Style Guide v1.1 で品質確保のため縮減、v1.4 確定 / cs:p3-592d 正設計、v9.2 timetable は §3.8 history) |
| **投稿頻度 note** | 無料 3-5/月 + 有料 1/月 (500-980 円) | 同 (5 系統構成パターン、価格 × CVR 詳述、500/980/980-1480) | 同 | 同 | Phase 1 = 3 系統 (まとめ 40 / 専門職×AI 40 / シリーズ 20)、Phase 2 で残 2 系統追加 | 同 | **4-6/月** (無料 3-5 + 有料 1)、価格 500/980/1480 (3 段) — Style Guide v1.4 SSOT (v1.3 で「週 1 = 月 4」と silent reduction、v1.4 で復元) |
| **投稿頻度 Instagram** | 1/日 (カルーセル) ← v9 当初表記、内訳カルーセル週 2-3 + リール週 1 = 月 8-12 想定 | 同 | 同 (5 テンプレ A-E、デザインシステム詳述) | 同 | 同 | 同 | **カルーセル週 2 + リール週 1 = 月 12 本** (Style Guide v1.4 SSOT / cs:p3-592d 正設計、v1.3 で「週 1 = 月 4」と silent reduction、v1.4 で復元) |
| **海外X cron** | (定義なし) | (定義なし) | (定義なし) | (定義なし) | 週次 (Phase 0 inspirations ingest 設計) | 週次 | **日次** (cs:p3-fd8c、publishing_lag 1-6h と整合) |
| **Hook 分類軸** | 自由 (初期 10 種) | 自由 | + 3 主軸 (David Ondrej transfer 含む 13 種) | 13 種 | **3 主軸 + 4 テスト枠** (M-8) Phase 1 配分定義 | CR-5 で Hook 配分は「未検証仮説」扱い、primary_hook + devices 分離 | 16 種類 (4 primary_hook × 13 devices)、failure_story 月 ≤ 4 上限 |
| **Hook 配分 主軸 3** | (未確定) | (未確定) | (未確定) | 13 種 + Phase 1 配分仮 | 数字 25-30 / 失敗談 25-30 / Before-After 15-20 + テスト枠 4 + 残合算 5-10 | "Phase 1 観察、配分固定は Month 3 以降" | failure_story 月 ≤ 4 上限 / business_repro / critique 数字 + テスト枠 5 + 休眠 5-10 |
| **KPI** | PCR + url_link_clicks (+ 削除 dwell_time) | 同 | 同 | 同 | 同 | + qualified_consultation / paid_revenue / impressions / profile_clicks | + utm_attribution + qualified_lead + transfer_learning_ingest_count (3 段) |
| **publishing_lag** | — | — | — | — | — | — | translation 1-6h / paraphrase 6-12h / opinion 24-48h |
| **価格設計 (note 有料)** | 500-980 円 | **500/980/980-1480** (3 段、A/B/シリーズ) | 同 | 同 | 980-1480 円 (high)、PSM 計画 | 同 | **500/980/1480** (3 段、PSM 廃止 → ランダム + switchback) |
| **失業手当ガード** | あり | あり | あり | あり | あり | あり | **除外** (本人指示、cs:p3-3be3) |
| **業法ガード** | なし | なし | なし | あり (§10 法務章) | あり | あり | あり (§10.9 業法独占キーワード) + §10.10 note 販売 compliance (= §10.8) |
| **4 排他軸 (軸 1)** | 翻案 5 : 実体験 3 (2 区分) | 同 | 同 | 同 | **翻案 4 : 実体験 4 : 業種別 SOP 2** (3 区分) | 同 | **translation 10 / paraphrase 20 / opinion 30 / first_hand 40** (4 排他、Style Guide v1.3) |
| **Editor ルール** | 6+1 (Hook 強度) | 同 | 同 | 6+2 (ステマ表記追加) | **6+4** (+3 失敗談 + ID / +4 読者像 1 行) | **6+5** (+5 公開許諾 + DLP、CR-2) | 6+5 改訂 (+3 改訂 verified_failure_story / +5 固有名詞 mask 一本化) |
| **集客導線** | A/B/C 同時運用、URL 比率 Thompson Sampling | 同 | 同 (3 パターン × タイムテーブル詳述) | 同 | **Phase 1 = A 単独 + 夕方 1 投稿だけ B**、C は Phase 2 で導入 (R-5) | 同 | + AND 条件 (3 週連続 PCR ≥ 0.3% × 30 日平均 ≥ 0.4% × 28 日 impressions ≥ 20,000 × profile_clicks ≥ 60) |
| **承認必須 gate** | 4 種 (Style Guide v / 新類型 / 媒体 / 月予算) | 同 | 同 | **5 種** (+ 骨組み変更) | 同 | 同 | **4 種** (cs:p3-fcbb 反映、骨組み変更は Phase 2 weekly に組み込み四半期判断) |
| **Visualizer モード切替** | PSM (Mann-Whitney から変更) | 同 | 同 | 同 | 同 (デザインシステム sub-accent 追加) | PSM 適用前提を満たさない (10 対 10、3 共変量 = pair 不足、Codex 13-1) | **PSM 廃止** → ランダム割当 + 週単位 switchback + 5 KPI 観察 (R-23) |
| **Phase 0** | 2-3 週間 Foundation 計画 | 同 | 同 | 同 | **完了済 (2026-05-25)** | + Phase 0 残作業 5 件 (OAuth PKCE / 公開許諾 / バックアップ削除 / cost_model / primary_hook 再ラベリング) | + Phase 0 v2 やり直し (24 アカ × 50+9 項目、cs:s3-54 由来) |
| **Phase 1 主軸** | 2 課題 (C1 + C4 未定義) | 同 | 同 | 同 | 同 | 同 | **C1 (AI で何ができるか分からない) + C4 (失敗が怖い) = 証拠 + 安心感** (D-1 4 大課題明示) |
| **顧客素材方針** | 投稿生成可 | 同 | 同 | 同 | 同 | "Phase 1 は顧客素材投入禁止、本人事業のみ" (CR-2 + Codex 10-2) | **撤回**、許諾済前提全投入 OK + 投稿文に固有名詞出さない (Editor +5 DLP redaction 一本化) |
| **non_engineer_rate** | (定義なし) | (定義なし) | (定義なし) | (定義なし) | ≥ 0.30 固定 | 同 | **Phase 別段階運用** (Phase 1 W1-4 ≥ 0.20 / M2-3 ≥ 0.30 / Phase 2+ 0.30-0.40、B-3) |
| **新類型認定 (Hook)** | HDBSCAN min_cluster_size=5 | 同 | 同 | 同 | Phase 1 緩和 (+10% PCR 改善幅 ≥ 5 件) | **Phase 1 停止** (1 投稿/日 = 月 30 投稿、未知 ~6 件 = HDBSCAN 不可) | Phase 2 以降 (unknown ≥ 50 + impressions ≥ 1,000) |
| **MA active vs duration billing** | duration_seconds × $0.08/h で保守的試算 (B-3) | 同 | 同 | 同 | 同 | + cost_model.csv 作成 + Phase 1 予算 commit (CR-3) | + expected ¥9,154 / low ¥6,500 / p95 ¥13,800 |
| **OAuth PKCE gate** | 言及なし | — | — | — | — | **新章 §3.5 (CR-4)** Phase 1 着手前の実機テスト 4 項目 | 同 |
| **業種フォーカス順** | (定義なし) | — | — | — | 税理士 → 社労士 → 士業 → 製造 → 教育 → 法務 → AI 委託 → まとめ | 同 | **逆順** (経理 → 製造 → 教育 → AI 委託 → 税理士 → 社労士 → 行政 / 司法 → まとめ + 弁護士)、業法独占薄い順 |

---

## 5. 統合プロセスメモ

- **統合者**: Claude (sub-agent dispatch, retry session)
- **統合日**: 2026-05-27
- **入力**: 7 ファイル (合計 5,590 行)
  - v9 (1,177) / v9.1 (539) / v9.2 (459) / v10 (1,183) / v10.1 (645) / v10.2 (586) / v10.3 (1,001)
- **出力**: 1 ファイル (本ドキュメント)
- **統合方針**: §0.1 の 4 ルール厳守
  1. 省略なし (Deprecated 節で原文保持)
  2. バージョン来歴ヘッダー (`*Version History*:` 各主要節)
  3. 現行 SSOT 明示 (`**Current (v10.3)**` マーカー)
  4. 数値・分類・範囲は原値保持 (cs:s3-68 silent reduction 厳禁)
- **silent reduction 防止**: cs:s2-68 / [Style Guide 統合版](./style-guide-all-versions.md) §4.5 投稿頻度の変遷 + §2.14 v1.4 差分まとめ にも明記。**Current 投稿頻度 SSOT**: X = 30/月 / IG = 月 12 / note = 4-6/月 (cs:p3-592d 正設計、v1.4 確定)。v9.2 §2.5 の 5 投稿/日 timetable は §3.8 で history 保持。
- **関連シリーズ統合ファイル** (同 worktree 内):
  - `outputs/improvements/x-account-design-consolidated/style-guide-all-versions.md` (4 バージョン)
  - `outputs/improvements/x-account-design-consolidated/competitor-report-all-versions.md` (3 バージョン)
  - `outputs/improvements/x-account-design-consolidated/query-design-all-versions.md` (2 バージョン)
- **既存 211 行 (§0 / §1 / §2.1〜§2.1.5)** は変更せず保持。本セッションは §2.2 以降の追記 (§2.2-§2.12 / §3 Deprecated 9 件 / §4 マトリクス / §5 本節) を担当。

---

*End of consolidated document.*
