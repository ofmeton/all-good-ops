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

### 2.6 投稿フロー / 自動化 (Editor 6+5 ルール、Optimizer、Visualizer 廃止)

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
- **MA Session 即 archive**: 全 MA session 終了時に retrieve → archive を強制 (v9 B-3 発見、idle 課金リーク防止) 〔**2026-06-07 訂正**: GA API(`managed-agents-2026-04-01`) は**トークン課金**(`session.usage`/`model_request_end.model_usage`)で **active_seconds/idle 課金リークは存在しない**。retrieve→archive 固定 order も不要(archive は後始末のみ)。実証=memory `project_x_agentic_rearchitecture` task1〕

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
- Style Guide v1.1 (Phase 0 v2 24 アカ分析後、PR #23) で X 頻度が 5/日 → 1/日 に切替。**切替理由は v1.1 原典に明示なし** (推定排除、Phase 1 で要検証 / E-46・E-47 連動)。v1.3 で note / Instagram にも「週 1」と silent reduction が発生し、ユーザー指摘 (cs:s2-68) を経て v1.4 で復元。
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
| **投稿頻度 X** | 月-木 5/日 + 金土日 (v9 では均一 5/日 = 月 ~120-130) | 同 | 同 (タイムテーブル詳述、1 日 5 投稿) | 同 (1 日 5 投稿 × 4 日 + 金 4 / 土 3 / 日 4 = 週 31 / 月 ~120-130) | 同 (M-6 反映で金土日縮減明示) | 同 | **1 投稿/日 = 30 本/月** (Style Guide v1.1 で 1/日 に切替、**切替理由は v1.1 原典に明示なし** / Phase 1 で要検証、v1.4 確定 / cs:p3-592d 正設計、v9.2 timetable は §3.8 history) |
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
| **MA active vs duration billing** | duration_seconds × $0.08/h で保守的試算 (B-3) 〔**2026-06-07 訂正**: GA はトークン課金。duration(秒)課金は現行 API に無し〕 | 同 | 同 | 同 | 同 | + cost_model.csv 作成 + Phase 1 予算 commit (CR-3) | + expected ¥9,154 / low ¥6,500 / p95 ¥13,800 |
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
- **2026-05-27 補完作業 (Phase 1〜4)**: completeness-audit-report.md §6 補完計画 F-1〜F-24 を実行。重大抜け漏れ 18 件 + 詳細抜け漏れ 24 件 + 軽微抜け漏れ 12 件 = 計 54 件を本ファイル §6〜§11 に追記。元 7 ファイル §4 各エージェントロジック / §5 LINE 事後報告 / §6 競合 50 項目分類 / §9 データフロー / §10 法務細目 / §11 クロスレビュー 50 件 / §12 議論経過 / §13 レビュアー依頼 / 付録を原文保持で復元。silent reduction 厳禁ルール (cs:s2-71 / cs:s3-72) 適用。

### 5.1 cs:s3-72 違反箇所の修正 (§3.8 投稿頻度 silent reduction の真因)

§3.8 で「Style Guide v1.1 (Phase 0 v2 24 アカ分析後、PR #23) で『コンテンツ品質を保つために 1 投稿/日 が現実的』と判断され」と記述したが、原典 `outputs/improvements/x-account-design-v10-phase0-v2/style-guide-v1.1.md` ヘッダーには「品質確保のため」とは**明記されていない**。これは未検証推定 (cs:s3-72)。正確には:

- v1.1 で 5/日 → 1/日 に切替、切替理由は v1.1 オリジナル文面には明示なし
- Phase 0 v2 (24 アカ × 50+9 項目やり直し) 完了直後の判断 (PR #23 で確定) であることは履歴から確認可能
- 真因は Phase 1 で要検証 (E-46 / E-47 と連動)

§3.8 該当文の修正後の正しい記述: 「Style Guide v1.1 で 5/日 → 1/日 に変更、切替理由は v1.1 オリジナル文面には明示なし (Phase 0 v2 24 アカ分析後の判断、Phase 1 で要検証)」。

---

## 6. 各エージェント・モジュールのロジック詳述 (補完: A-3〜A-7 / B-1〜B-7)

> **補完元**: completeness-audit-report.md A-3 (Writer) / A-4 (Hook Analyzer) / A-5 (Interviewer) / A-6 (選別) / A-7 (Visualizer) + B-1〜B-7 詳述。本節は §2.6 投稿フロー / 自動化 を補完するエージェント単体のロジック詳述。

### 6.1 素材レイヤー 2 系統 (補完: A-2)

*Version History*: v9 §3.1 導入 → v10 §3.1 維持 → v10.2 §3.1 維持 → v10.3 inspirations ingest プロセス (C-5) 追加

**Current (v10.3) 素材レイヤー構成**:

```
┌──────────────────────────────────────────────────────────┐
│ ① 素材レイヤー (2 系統、v9 で確定、v10.3 まで通底)           │
│                                                            │
│   レイヤー A: 外部素材 (twitterapi.io 由来)                  │
│     ・海外バズ + 日本 Claude/AI 発信                         │
│     ・Anthropic 公式・関連アカウント (@AnthropicAI /         │
│       @ClaudeAI / @simonw / Anthropic Engineering 等)        │
│       をフォロー対象に追加し公式情報を間接カバー              │
│     ・関連業界アカウント (Claude/AI 業務自動化発信者)        │
│       も同じく twitterapi.io でカバー                        │
│     ・RSS / market_signal の別実装は不要                     │
│     ・raw/publishing/inspirations/ への ingest プロセス       │
│       (週次 cron、海外 ≥ 1 / 国内業種別 ≥ 1 / note ≥ 1)      │
│                                                            │
│   レイヤー B: 内部素材 (本人の実体験由来)                    │
│     ・Claude Code 履歴 (Git commit / 案件メモ)               │
│     ・音声メモ (LINE Interviewer 経由で構造化)                │
│     ・案件運用ログ (terra-isshiki / minpaku-cleaning /        │
│       RICE CREAM / 家庭教師 / portfolio / all-good-ops)      │
│                                                            │
│   ※ ai-radar のコード・機能とも撤廃・再実装不要              │
│   ※ 公式情報は twitterapi.io で取得できる範囲で間接カバー     │
└──────────────────────────────────────────────────────────┘
                          ↓
                  [② インデックス層 (pgvector)]
                          ↓
              [③ Interviewer / ④ 選別レイヤー へ分岐]
```

**素材 source 4 軸との対応** (v10.3 軸 1 = translation / paraphrase / opinion / first_hand):

| 軸 1 区分 | 主な素材 layer | 出典 source |
|---|---|---|
| translation (10%) | レイヤー A (外部素材) | twitterapi.io 海外バズの構造そのまま要約・翻訳 |
| paraphrase (20%) | レイヤー A | twitterapi.io 構造変えて翻案 (固有名詞 + 数字差し替え) |
| opinion (30%) | レイヤー A | リリース → 意味 → 課題型の批評・所感 |
| first_hand (40%) | **レイヤー B** | Claude Code / Git / 案件メモ / 音声メモ ID |

**実体験ソース ID 必須** (v10.3 +3 Editor ルール):
レイヤー B 素材は `publication_consent='granted'` + `redaction_reviewed=true` + `client_impacted_flag=false` を満たす必要あり。失敗談 hook の投稿のみは verified_failure_story (月 ≤ 4 上限) 制約あり。

**ディレクトリ構造** (実装時):
```
materials_store/
  layer_a_twitterapi/   ← 外部素材 (海外バズ + 公式 + 業界)
    raw/                ← 取得元 JSON
    redacted/           ← DLP 通過後
  layer_b_internal/     ← 内部素材 (本人実体験)
    claude_code_logs/   ← Claude Code 履歴 + Git commit
    case_memos/         ← 案件運用メモ
    voice_memos/        ← 音声メモ (LINE Interviewer 経由)
```

### 6.2 Interviewer (補完: A-5)

*Version History*: v9 §4.1 導入 (LINE 完結方式 + 質問パターン 8 種 + 5 ステップ生成) → v10 §4.1 維持 → v10.2 §4.1 公開許諾 gate 接続 (CR-2) → v10.3 §4.1 業種別キーワード注入 (C-2)

#### 6.2.1 設計意図 (v9 通底)

- 「素材を待つ」ではなく「素材を引き出す」
- 仮説駆動 (頭の中に記事構想を持った状態で質問)
- **短くて深い (5-10 ターン上限、1 ターン 1 質問)** — cache 効くので 5 → 10 ターン拡張可
- **LINE 完結** (ターミナル起動の摩擦なし)
- 質問は定型でなく素材ログを把握した上で具体的に

#### 6.2.2 内部状態スキーマ (v9 + v10.2 + v10.3 統合)

```
InterviewState {
  source_material: {raw_log, summary, key_decisions, key_struggles}

  hypothesis: {
    working_title: 仮タイトル
    target_platform: X / Instagram / note
    target_reader_profile: 中小企業経営者 / 士業 / コンサル
    expected_angle: なぜそれを選んだか / 失敗からの学び / 比較考察
    expected_takeaway: 読者が持ち帰る具体的な行動指針
  }

  knowledge_gaps: [
    { gap_id, question_intent, priority, status }
  ]

  collected_answers: [
    { gap_id, raw_answer, distilled_insight, confidence }
  ]

  turn_count: 0  // ハードリミット 10 (cache 効くので拡張可)
  satisfaction_score: 0.0  // 0~1
  abort_reason: null  // "low_signal" / "user_request" / "max_turns"

  // v10.2 で追加 (CR-2 公開許諾 gate)
  publication_consent_status: pending | granted | denied
  client_impacted_flag: bool

  // v10.3 で追加 (C-2 業種別キーワード注入)
  monthly_industry_focus: text  // '税理士', '社労士', '製造業' 等 (§1.2 ローテーション通り)
}
```

#### 6.2.3 質問生成 5 ステップ (v9 §4.1)

1. **初期仮説形成 (Sonnet 4.6)** — 素材を読み、仮タイトル・想定読者・記事の骨格・knowledge_gaps 3-5 個を生成
2. **最初の質問生成** — 最優先 gap 選び、抽象論回避・具体的瞬間引き出す質問 1 つ
3. **回答受信後の更新** — gap 埋まり判定、新規 gap 追加、必要なら仮説修正
4. **終了判定** — turn_count ≥ 10 / satisfaction_score ≥ 0.7 / 収穫逓減検知 / ユーザー明示終了
5. **次の質問生成** — 未消化な感情語・ぼかし表現があれば同 gap 深掘り、なければ次 gap へ

#### 6.2.4 質問パターンライブラリ (8 種、pattern_id でログ記録、v9 §4.1)

| pattern_id | パターン | 例 |
|---|---|---|
| concrete_moment | 具体的瞬間 | 「その時、最初に頭に浮かんだのは何？」 |
| decision_fork | 分岐点 | 「A と B の間で迷った時、どっちに傾いてた？」 |
| revise_with_hindsight | 後知恵 | 「もう一回やるなら、最初の 3 手を変えるとしたら？」 |
| stop_signal | 中断ライン | 「うまくいかない時、続けるか中断するかの判断ラインって？」 |
| feeling_check | 感覚 | 「[出来事] の時、嬉しさと焦りどっちが強かった？」 |
| friction_zoom | 詰まり | 「一番時間吸われた瞬間って、具体的にどこ？」 |
| would_recommend | 推薦判断 | 「これ、同じ立場の友達に薦める？薦めるなら誰に？」 |
| if_constraint | 制約思考 | 「もし時間が半分だったら、何を切る？」 |

#### 6.2.5 LINE 完結方式 (v9 §4.1、v8 から変更)

- LINE Webhook → Cloudflare Worker → MA Interviewer Session → LINE reply
- ユーザーは LINE 上で 5-10 ターン応答
- ターミナル起動の摩擦ゼロ
- **LINE 通数試算**: 月 60 セッション × 平均 8 turn = 480 通 → 200 通超過 280 通 × ¥5 = +¥1,400 (¥10,000 枠内)
- (Daily Digest 30 + Weekly 4 含めても合計 ¥700-1,400 の追加課金で許容)

24 時間応答無しの場合: 別テーマに自動切替せず、**backlog に寝かせる** (Codex 指摘の「高価値テーマを捨てない」)。次回ユーザーが LINE 開いた時に「未回答テーマを続ける / 新規」を選択。

#### 6.2.6 公開許諾 gate 接続 (v10.2 CR-2)

```
ユーザー (ofmeton) が応答した内容に「顧客名 / 案件秘密」が含まれる場合、
Interviewer は raw を Q&A records にする前に「この内容、note / X で公開してよいですか?」を 1 ターン挟む
- granted → 通常フロー
- denied → 「公開しない」フラグ付きで記録、投稿 pool へ流さない
- pending → 投稿 pool 投入禁止、Daily Digest で再確認
```

#### 6.2.7 業種別キーワード注入 (v10.3 C-2)

```
質問パターン選択時に業種別キーワードを注入:
  例: friction_zoom 質問 → "経理業務で一番時間吸われた瞬間は?" (monthly_industry_focus='経理' の月)
  例: would_recommend  → "同じ製造業の現場で AI 入れたい人に薦める?" (monthly_industry_focus='製造業' の月)

Optimizer の月次ジョブで monthly_industry_focus を自動切替 (§1.2 ローテーション、業法独占薄い順):
  2026-07: 経理 / 業務効率化横断
  2026-08: 製造業 / 小売業
  2026-09: 教育 / 塾
  2026-10〜: AI 委託 → 税理士 → 社労士 → ... (§1.2 月別ローテーション参照)
```

加えて **週 1 回まとめインタビューモード** (v10.1 既反映、ADHD/ASD 配慮) を維持。

### 6.3 選別エージェント (補完: A-6)

*Version History*: v9 §4.2 導入 (翻案候補スコア式 + 実体験候補優先度 + 重複検出) → v10 §4.2 維持 → v10.2 §4.2 公開許諾済み素材のみ pool 投入

#### 6.3.1 翻案候補スコア式 (v9 §4.2 修正版、v10.2 まで通底)

```
log_engagement = log1p(likeCount + 2*RT + 4*bookmarkCount + 3*replyCount + quoteCount)

normalized = log_engagement / log1p(max(author.followers, 1000))
  ※ 分位補正: フォロワー帯別 quartile 内 z-score を併用
  ※ 帯: micro(<5k) / mid(5k-50k) / large(50k+)

freshness = exp(-hours_since_post / half_life)
  ※ テーマ別 half_life:
    - トレンド系 (新モデル発表など): 24h
    - SOP・思考系 (プロンプト集など): 14 日

hook_score = HookAnalyzer.score(tweet.text)  # 0~1
topic_relevance = TopicClassifier.score(tweet.text)  # 0~1
                  # 「非エンジニア経営者向け業務仕組み化」「Claude 固有」等への近さ

final_score = normalized * freshness * (0.4 + 0.3*hook_score + 0.3*topic_relevance)
```

各重み係数は Optimizer が週次で調整。**Current (v10.3)**: 重み係数の初期値は競合分析駆動 (§6.6 Optimizer 初期値設計参照)。

#### 6.3.2 実体験候補の優先度 (v9 §4.2)

```
priority_score = recency_weight * 0.4
               + topic_freshness * 0.3   # 直近 2 週で同テーマを投稿してないか
               + interview_depth * 0.3   # インタビュー回答の satisfaction_score

ガード:
  - topic_freshness < 0.5 → 強制除外でなく「直近投稿との差分説明を必須」(シリーズ化を殺さない、Codex 指摘)
  - interview_depth < 0.3 → 警告タグ
```

#### 6.3.3 重複検出ロジック (v9 §4.2、hashed_idea_id)

```
過去 90 日の投稿全件 embedding 比較 → 最大 cos 類似度で判定:
  - max_sim ≥ 0.85 → "実質同一"として除外
  - 0.70 ≤ max_sim < 0.85 → "近接トピック"、警告タグ
  - max_sim < 0.70 → クリア

※ 閾値は 100 件の既知ペアで ROC 確認してから決定 (Phase 0 ドライランで実施)
※ hashed_idea_id を core_ideas pool 内で一意性確認 (重複再生成防止)
```

#### 6.3.4 公開許諾済み素材のみ pool 投入 (v10.2)

`materials_store.publication_consent='granted'` を SQL レベルで Filter。pending / denied 素材は選別レイヤーから core_ideas pool へ流れない。

### 6.4 Writer (補完: A-3 + B-1)

*Version History*: v9 §4.3 導入 (マルチプラットフォーム派生 + フォーマット選択ロジック v8 ε-greedy から Contextual Thompson Sampling へ変更) → v10 §4.3 統合 (短文 60 / スレッド 30 / 長文 10) → v10.1 §4.3.2 M-4 fmat 再分配 (短文 50 / 中文 30 / 長文 15 / スレッド 5) → v10.3 §4.3.2 G-1 / B-1 / B-5 (スレッド 10-15% に戻し、敬体 50-60%、ハッシュタグ note 送客時 3 個)

#### 6.4.1 マルチプラットフォーム派生原則 (v9 §2.3 / v10 §4.3.1)

- クロスポストではない。同じ核アイデアから各プラットフォーム向けに **派生生成** (Writer プラットフォーム別プロンプト切替)
- core_idea 1 個 × 適性スコア ≥ 0.6 のプラットフォームのみ生成
- 各プラットフォームのスタイル制約は Style Guide から取得
- 短文 X → 長文 note 派生時の text reduction 戦略: X 280 字 → note 3,000 字へ拡張する際は (1) 失敗エピソードを詳述 (2) 数字根拠を追加 (3) 再現手順 Step by Step を挿入

#### 6.4.2 X 投稿フォーマット比率 (★★★★★ A-1 + B-1)

> **Current (v10.3)** — Style Guide v1.3 §2 / G-1 反映

| fmat | v9 比率 | v10 比率 | v10.1 比率 | **v10.3 比率 (Current)** | 主用途 |
|---|---|---|---|---|---|
| 短文単発 (≤140 字) | (短文 60% に内包) | 短文 60% | 50% | **50%** | 失敗談先行、Hook 主軸 (数字 + Before-After) |
| 中文単発 (141-280 字) | — | 短文 60% に内包 | 30% | **25%** | 結論先出 + 経験談、敬体 / 常体ミックス |
| 長文単発 (281-1000 字) | 10% | 10% | 15% | **10%** | 業界批評、月 1-2 本ロングフォーム |
| スレッド (2-7 本) | 30% | 30% | 5% | **10-15%** (月 8-10 本) | ストーリー型 + 構造化解説 |

**v10 当時の上位 10 アカ avg❤ 観察** (publishing research ベース、参考):

- **短文+数字** = 最高効率 (@Shimayus 7,460 / 11k フォロワー)
- **長文批評** = 強い (@umiyuki_ai 2,710 / 63k)
- **箇条書きスレッド + 公式リソース** = フォロワー多いがエンゲージメント率低 (@SuguruKun_ai 0.47%)
- **ニュース速報型** = avg❤ 低い (@masahirochaen 0.09%)

**Contextual Thompson Sampling 事前分布** (v9.2 §1.2 / v10 §4.3.2、★★★★★):

```
fmat | α (事前成功) | β (事前失敗) | 含意
短文 |     2        |     8        | Beta(2,8) = mean 0.2 = 弱い 20% prior
スレッド | 2         |     8        | Beta(2,8)
長文 |     2        |     8        | Beta(2,8)

事前分布の意味:
  - 「α=2, β=8 の弱い事前分布」= サンプル 10 件相当の弱い prior
  - 実運用データ 30 件超で prior の影響が薄まり、posterior が実測に追従
  - PCR / url_link_clicks / qualified_lead を report として観測
  - 各カテゴリ毎に Beta 分布を独立に更新 (fmat 間の独立性仮定)

更新ロジック (毎週):
  for fmat in [短文, 中文, 長文, スレッド]:
    successes = count(投稿 where fmat=this AND PCR ≥ 0.3%)
    failures = count(投稿 where fmat=this AND PCR < 0.3%)
    α_post = α + successes
    β_post = β + failures
    sample = Beta(α_post, β_post).sample()  # 1 回サンプリング
  next_fmat = argmax(samples)               # 最も高いサンプル値の fmat 選択
```

**v10.3 でのスレッド比率復元理由 (G-1)**: v10.1 で 5% に縮減したが、Phase 0 v2 24 アカ分析で「業種別 SOP の概要 / 段階型 / 比較解説の解説力はスレッドが最適」と判明。月 8-10 本 (10-15%) で復元。

#### 6.4.3 Writer プロンプト固定要素 (v10.1 §4.3.2 M-5 + v10.3 §4.3.2 B-1)

```
language_tone:
  keigo_rate: 0.50-0.60         # ofmeton ターゲット (非エンジニア経営者) に最適化 (B-1)
                                # v10.1: 0.40-0.55、v10.3 で 0.50-0.60 へ
  first_person_rate: 0.40-0.55  # 一人称使用 (実体験 4 比率と整合)
  reader_address_rate: ≥0.30    # "非エンジニア経営者へ" 等 1 行明示

x_meta:
  bracket_rate: 0.05-0.10       # 【】カッコ控えめ
  emoji_rate: 0.20-0.30          # 👇は URL 直前限定
  url_position:
    朝昼 (7:00 / 12:00): 末尾 (URL なし or 添え)
    夕方 (17:00): 本文中 (note 送客の補足、集客導線 C)
  hashtag_rate: ≤0.05 (通常)、≤0.15 (note 送客投稿のみ、最大 3 個
                                       #AI業務自動化 #Claude #非エンジニア向け)  # B-5
  newline_density: 0.030-0.050
```

**プロンプト固定要素の根拠**: Phase 0 Report §6.1 / F-3 / F-8 / F-9 + Phase 0 v2 24 アカ分析。

#### 6.4.4 X スレッド構成 4 パターン (v10 §4.3.2、★★★★★)

| パターン | 本数 | 構成 |
|---|---|---|
| 列挙型 | 5-10 本 | Hook → 1 → 2 → ... → N → 結論 / CTA |
| 構造化解説型 | 3-5 本 | Hook → 背景 → 手順 → 注意点 → CTA |
| Q&A 型 | 3-4 本 | 質問 → 答え → 補足 → CTA |
| ストーリー型 | 4-7 本 | きっかけ → 試行錯誤 → 解決 → 学び → CTA |

ofmeton 中軸: **ストーリー型 (失敗談先行)** + **構造化解説型 (業種別 SOP)**。

#### 6.4.5 Instagram カルーセル 9 枚構成 5 テンプレ (v10 §4.3.3、note 5 構成から transfer、★★★★★)

| テンプレ | 構造 | 由来 (note 構成) |
|---|---|---|
| A. まとめ型 | Hook → 9 項目 → まとめ → CTA | §4.3.4.1 まとめ型 |
| B. 段階型 | Hook → 3 Step → コスト → CTA | §4.3.4.1 段階型 |
| C. ツール比較型 | Hook → 比較軸 → A vs B → 結論 | §4.3.4.1 ツール比較型 |
| D. 専門職×AI 型 | 自己紹介 → 業務 → 失敗 → 成功 → 提言 | §4.3.4.1 専門職×AI 型 |
| E. シリーズ実践記型 | おさらい → 今回 → 結果 → 次回予告 | §4.3.4.1 シリーズ実践記型 |

**Instagram カルーセル競合観察** (v10 §4.3.3): publishing research T2-4「Instagram カルーセル形式の AI 業務自動化は完全空白」 → ofmeton の先行者利得を取れる枠。

#### 6.4.6 note 生成フロー詳述 (v9.1 §2〜§10 + v10.1 統合、B-2)

##### 6.4.6.1 構成パターン 5 系統 (competitor analysis 抽出、Phase 1 = 3 系統に絞る)

| # | パターン | 文字数 | 価格 | 主用途 |
|---|---|---|---|---|
| 1 | **まとめ型** | 5,000-10,000 字 (大) / 2,000-3,000 字 (小) | 無料 or ¥980-1,480 | 「30 職種コンプリート図鑑」「16 選」 |
| 2 | **段階型** | 3,000-5,000 字 | ¥980 | 「3 ステップで AI 委託」「コスト別設計図」 |
| 3 | **ツール比較型** | 3,000-6,000 字 | 無料 or ¥500 | 「Zapier vs Make」「Claude vs ChatGPT」 |
| 4 | **専門職×AI 型** | 3,000-5,000 字 | 無料 (初回) → ¥980 | 「税理士の私が AI に挑戦」 |
| 5 | **シリーズ実践記型** | 1,500-3,000 字 | ¥300 個別 or マガジン購読 | 「Cursor 実践記 — 5」 |

**Phase 1 採用 3 系統 (v10.1 §4.3.4.1)**: まとめ 40 / 専門職×AI 40 / シリーズ実践記 20。Phase 2 で段階 + ツール比較を追加。

##### 6.4.6.2 タイトル付け方ライブラリ (4 必須要素、v10 §4.3.4.2)

| 要素 | 役割 | 例 |
|---|---|---|
| 【】カッコ | 記事 type 明示 | 【完全保存版】【最新】【第 1 回】 |
| 数字明示 | 量 / 価格 / 効果 | 「30 職種」「16 選」「月 3,000 円」 |
| 権威付け表現 | 網羅性 / 完成度 | 「コンプリート図鑑」「徹底比較」 |
| 読者層明示 | 「誰のための記事か」 | 「非エンジニア」「1 人社長」「コード書けません」 |

##### 6.4.6.3 価格 × CVR テーブル (v10 §4.3.4.3)

| 価格 | 用途 | 想定 CVR (Phase 1) |
|---|---|---|
| 無料 | 集客 / プロフ送客 | プロフ訪問 → note クリック 10% |
| ¥500 | 軽量 tips | note 訪問 → 購入 3% |
| **¥980 (主軸)** | 中規模解説 / 業種別 SOP | note 訪問 → 購入 2% |
| ¥1,480 | 大型まとめ / 完全保存版 | note 訪問 → 購入 1.5% |

月配分: 無料 3 本 (集客) + ¥500 1 本 + ¥980 1 本 = ¥30,000 売上目標 (Phase 1)

##### 6.4.6.4 ティーザー境界設計テンプレ (v10.1 §4.3.4.4 R-4 反映)

**設計原則** (ofmeton 差別化): 「無料部分で問題提起と Why を完結 + **無料でも実装可能な軽量版を入れる**」+ 「有料部分で結論と How」

**無料部分 (700-1,200 字、v10.1 で 800-1,500 → 700-1,200 に縮減)**:
```
1. リード (100-200 字): 誰のための記事 / 何を解決
2. 問題提起 (300-500 字): 具体的詰まり / 既存解決策の限界 (v10 は 400-600 字)
3. 無料軽量版 (200-400 字): 5 分で試せる入門編 ← ofmeton 差別化 (R-4 固定)
4. 有料部分への期待値 (100-200 字): 「結論 + 再現手順 + 数値開示」予告
```

**有料部分 (1,500-6,000 字)**:
```
1. 結論 (300-500 字): 答え + 具体数値
2. 再現手順 (1,000-3,000 字): Step by Step + スクショ / コード
3. ハマりどころ (300-500 字): 同手順で詰まる箇所と対処
4. 応用例 (200-500 字): 別業種への transfer
5. CTA (100-200 字): 個別相談 / メンバーシップ
```

**A/B テストロジック (v9.1 §5.4)**: ティーザー境界の長さ (700 字 vs 1,000 字 vs 1,200 字) は Optimizer 改善対象。価格 (500/980/1480) × ティーザー長さ で 9 セル A/B テスト計画。

##### 6.4.6.5 マガジン構造 (Phase 1 = 1-2 並走に絞る、v10.1 §4.3.4.5)

| マガジン名 (案) | Phase | 価格戦略 |
|---|---|---|
| 「非エンジニア経営者の Claude 翻訳実装術」(本流) | Phase 1 から | 月額 ¥980 (Phase 2 開始時) |
| 「ofmeton 実践記」(シリーズ) | Phase 1 から | 個別 ¥300 or マガジン購読 ¥980/月 |
| 「業種別 Claude SOP カタログ」(まとめ) | Phase 2 から | 個別 ¥980 / マガジン買切 ¥4,980 |

##### 6.4.6.6 投稿時間最適化 (v9.1 §7)

- note 朝 8:00 公開で X / IG の朝投稿余波を吸収
- X / IG との連動: §2.8 集客導線 3 パターン × 1 日 5 投稿タイムテーブル参照

##### 6.4.6.7 SEO 整備 (v9.1 §8)

- note 内検索: タイトル先頭 30 字に主要キーワード + 本文冒頭 200 字に重複
- Google 検索: 「<キーワード> + <数字> + <記事 type>」、h2/h3 階層、画像 alt text
- 関連記事リンク (内部 SEO)
- Optimizer 月次で SEO Brief 生成

##### 6.4.6.8 メンバーシップ移行設計 (Phase 2-3 検討、v9.1 §9)

判定条件 (ALL 必須):
1. note フォロワー ≥ 300
2. 個別有料記事の月売上 ≥ 5 件 (月 ¥5,000 以上)
3. リピート購入 ≥ 30%
4. プロフィール訪問数 ≥ 月 1,000

価格案: ベーシック ¥480 / スタンダード ¥980 / プロ ¥2,980

##### 6.4.6.9 媒体連動詳細 (v9.1 §10、B-2)

- note → X / IG への逆流: note 公開後 30 分以内に X で「note 公開告知 + 1 ポイント引用」、IG ストーリーズで「note 公開告知 + ハイライト追加」
- X 投稿の note 引用パターン: 「→ 詳細は note (URL)」「ティーザー文 + 続きは note」「X スレッド最終ツイートに note URL」の 3 パターン
- 媒体間カニバリ防止: 同じ核アイデアの X / IG / note 派生は「視点」「数字粒度」「結論ニュアンス」を意図的に変える

#### 6.4.7 1 トピックの 3 媒体展開フロー (v9.2 §4 統合)

```
1 つの core idea
     │
     ├─→ X 短文 (朝・昼 = 失敗談 / ROI 数字)
     ├─→ X note 送客ツイート + 派生 (夕 = note 送客 / 17:30 + 21:00 引用 RT)
     ├─→ note 1 記事 (朝 8 時公開、構成パターン 5 系統から選択)
     ├─→ Instagram カルーセル 9 枚 (朝 9 時、5 テンプレから選択)
     └─→ Instagram ストーリーズ (カルーセル新着告知 + ハイライト追加)
```

月 30 core ideas × 平均 8 投稿 = **月 240 投稿**運用想定。

#### 6.4.8 媒体間カニバリ vs 補完 (v9.2 §4.2)

| 観察軸 | 内容 |
|---|---|
| カニバリ検知 | X 短文 + IG カルーセル 1 枚目で全部言って note 不要にしてないか |
| 補完効果 | 3 媒体合算エンゲージメント vs 個別単独運用 (補完効果定量化) |
| 媒体間遷移率 | X PCR → プロフィール → note 訪問 → note 購入 の漏斗各段階 CVR |
| Optimizer 横断観察 | weekly で全媒体の遷移率を観察、Writer プロンプトに警告組込 |

#### 6.4.9 1 トピックの 3 媒体テンプレ (v9.2 §4.4、集客導線統合)

| テンプレ | X | Instagram | note |
|---|---|---|---|
| A. 単発バズ型 | 短文 1 本 (Hook=数字) | 1 枚画像 | (なし) |
| B. ROI 型 | 短文 + Before-After 数字 | カルーセル B 段階型 | 段階型 ¥980 |
| C. 業種別 SOP 型 | スレッド 3-5 本 | カルーセル D 専門職×AI | 専門職×AI ¥980 |
| D. 失敗談先行型 | 短文 (Hook=「実は私も」) | カルーセル E シリーズ | シリーズ実践記 ¥300 |
| E. 比較型 | スレッド 5-7 本 (列挙型) | カルーセル C ツール比較 | ツール比較 ¥500 |

#### 6.4.10 Phase 1 中盤の未採用構成パターン読者反応観察 (v10.3 R-13)

```
Phase 1 採用 3 系統:
  まとめ型 40% / 専門職×AI 型 40% / シリーズ実践記型 20%

Phase 1 Month 2 観察 (Optimizer Weekly Brief):
  "未採用構成パターンへの読者反応" 項目を追加
  PCR / コメントで「ツール比較を求める声」が観察された場合:
    → Phase 2 を待たずに ツール比較 1 本追加可能 (auto + brownout)

Phase 2 追加 2 系統:
  段階型 / ツール比較型
```

#### 6.4.11 Writer 2 軸クロス制御 (v10.3 §4.3.6 A-1)

> **v1.3 改訂注記 (2026-05-26)**: 以下の数値配分は v1.0 (v10.3 inline) 当時のもの。Codex round 1 C-4 指摘により、Style Guide v1.1 / v1.2 と分類体系が異なる問題が顕在化したため、**Style Guide v1.3 §2.1 を Single Source として採用**。

Writer プロンプトに以下の 2 軸クロスを毎回明示:

```
軸 1 (排他、4 区分): translation | paraphrase | opinion | first_hand
軸 2 (Hook 類型、排他): failure_story (月 ≤4 上限) | industry_sop | non_engineer_translation |
                          before_after | number_first | insight_thread | tool_review | その他 8 種 mix
軸 3 (複数 OK、devices): number | before_after | conclusion_first | empathy | contrarian | ...

Phase 1 主軸 (v1.3 確定、本ブロックは [Style Guide 統合版](./style-guide-all-versions.md) §2 参照):
  軸 1 (4 排他、合計 100%): translation 10% / paraphrase 20% / opinion 30% / first_hand 40%
  軸 2 (Hook 類型、排他):
    failure_story: 月 ≤ 4 投稿 上限 (verified のみ、比率 KPI 撤回 — Codex C-5)
    industry_sop: 20% (士業含む業種別 SOP、軸 1 から軸 2 へ格上げ)
    non_engineer_translation: 20%
    before_after: 15%
    number_first: 10%
    insight_thread: 10%
    tool_review: 10%
    その他 (8 種 mix): 15%

軸 1 × 軸 2 のクロスで Writer プロンプトを毎回構成。
```

**所感 (opinion) の本文骨格について — 先入観排除 (v10.3 ユーザー指示)**:
- v10.3 では **opinion 投稿の本文骨格を事前定義しない**
- 骨格 (リリース紹介 → 意味 → 課題 → 楽になる → やべえ → チェック、等のパターン) は §10 Phase 0 v2 競合調査で 24 アカの実投稿から抽出
- 抽出した骨格を `outputs/improvements/x-account-design-v10-phase0-v2/opinion-patterns.md` に引き出しストック
- Writer プロンプトには「opinion category なら opinion-patterns.md から context-aware に選択」とだけ指示
- Optimizer Phase 1-2 で実 PCR / qualified_lead クロスで効く骨格を絞り込む
- トーン / 引用 / 誇張度 / 画像 / 動画 / フック / スレッド or 記事 形式も同様に Phase 0 v2 から引き出し抽出

### 6.5 Hook Analyzer (補完: A-4)

*Version History*: v9 §4.7 導入 (10 類型 + 分類ロジック + 月次新類型認定) → v9.2 §1.3 (新規 3 類型追加 = 13 類型) → v10.2 §4.7 (CR-5 primary_hook + devices 2 軸分離) → v10.3 §4.7 (R-14 Phase 別検証ロードマップ + G-3 テスト枠 5 + C-12 HDBSCAN 停止)

#### 6.5.1 初期 13 類型 (v9.2 既存 10 + 新規 3、★★★★★)

**v9 既存 10**:
1. 結論先出し型
2. 数字インパクト型
3. 問いかけ型
4. 逆張り型
5. 経験談導入型
6. 共感型
7. 警告型
8. 比較型
9. 自己卑下型
10. メタ言及型

**v9.2 新規 3 (v10 統合)**:
11. **「みんな X と言うが実は Y」型** (逆張り強化、@umiyuki_ai 由来)
12. **「Before-After 数字」型** (数字インパクト強化、ROI 直結)
13. **「実は私も最初は X」型** (経験談 + 共感、ofmeton ブランド整合)

#### 6.5.2 primary_hook + devices 2 軸分類 (v10.2 §4.7.1 CR-5)

```
primary_hook (1 つ、排他):
  - 失敗談先行型 (failure_story) — 経験談 + ストーリー駆動が中核
  - 業務再現型 (business_repro) — 具体的な業務手順 + 数字 + Before-After
  - 業界批評型 (critique) — 思考フレーム + 異論
  - tips 列挙型 (tips_enum) — 情報密度重視

devices (複数、追加可、13 種):
  - 数字 (例: "30 分 → 3 分")
  - Before-After
  - 結論先出し
  - 問いかけ
  - 逆張り ("みんな X と言うが実は Y")
  - 共感 ("実は私も最初は X")
  - メタ言及
  - 自己卑下
  - 比較 ("vs")
  - 警告
  - 経験談 (一人称 + 過去形)
  - 【】カッコ
  - emoji 起点
```

#### 6.5.3 Hook Analyzer の出力 schema (v10.2 §4.7.2)

```typescript
type HookAnalysis = {
  primary_hook: 'failure_story' | 'business_repro' | 'critique' | 'tips_enum';
  devices: Array<'number' | 'before_after' | 'conclusion_first' | ...>;
  confidence: 0..1;
  raw_features: { ... };  // 規則ベース判定の中間結果
};
```

#### 6.5.4 分類ロジック (v9 §4.7、★★★★★)

```
入力: 投稿テキスト (1~3 行目)
process:
  既知 13 類型と Embedding similarity 計算
  max_sim 判定:
    - max_sim ≥ 0.75 → 既知類型として分類確定
    - 0.55 ≤ max_sim < 0.75 → 信頼度低タグで暫定登録
    - max_sim < 0.55 → 「未知パターン候補」として隔離
出力: { type, confidence, raw_features }
```

#### 6.5.5 Phase 別 Hook 検証ロードマップ (v10.3 §4.7.2 R-14 + G-3、★★★★★)

| Phase | 期間 | 主軸 3 (60-65%) | テスト枠 (30-35%) | 休眠 (5-10%) |
|---|---|---|---|---|
| **Phase 1** | Month 1-3 | failure_story / business_repro / critique 数字 | empathy / contrarian / question / meta / warning (5 種) | 結論先出 / 経験談導入基本 / 共感基本 / 比較 / 自己卑下 |
| **Phase 2** | Month 4-7 | + 主軸 3 維持 | + テスト枠から 2-3 類型復活 = 9-10 類型 | 残り |
| **Phase 3** | Month 8+ | 全 13 類型 + 新類型認定 (HDBSCAN) | — | — |

#### 6.5.6 Phase 1 配分制御 (v10.2 §4.7.3 CR-5 + v10.3 §4.7.3 R-14)

Phase 1 中は **配分固定は控えめ**、Writer プロンプトに:

```
primary_hook を毎回 4 種からランダム選択 (重み: 主軸 3 比率 60-65%、テスト枠 35%、休眠 5%)
devices は自然な範囲で使う (固定配分なし)

Optimizer Phase 1 (weekly Sonnet) で primary_hook × 成果クロス集計を残し、Month 3 末で人手判定 (R-14)
```

#### 6.5.7 新類型認定 (HDBSCAN 停止、v10.3 §4.7.4 C-12)

v9 §4.7 では「クラスタ条件: 投稿数 ≥ 5 件 + 平均 PCR が既知中央値より +20% 以上 → Opus 言語化 → LINE 承認」だったが、**Phase 1 は HDBSCAN 停止** (1 投稿/日 = 月 30 投稿、未知候補は 6 件程度 = HDBSCAN 適用不可)。

```
Phase 1: HDBSCAN 停止、未知投稿は月次に人手ラベル付け

Phase 2 以降:
  - 自動 clustering は `unknown ≥ 50` かつ各候補 `impressions ≥ 1,000` の Phase 2 以降
  - HDBSCAN min_cluster_size=5 (v9 §4.7 のオリジナル値)
  - クラスタ条件: 投稿数 ≥ 5 件 + 平均 PCR が既知中央値より +20% 以上
  - クラスタの新類型を Opus が言語化
  - LINE で「新類型認定しますか?」と承認求める (§5.1 承認 gate)
```

#### 6.5.8 既存類型の自然死 (v9 §4.7、Full auto)

180 日休眠 (使用率 < 1%) の類型は自動 archive。Optimizer Phase 3 で Style Guide v2 から削除。

### 6.6 Visualizer 3 モード + 自動切替判定 (補完: A-7)

*Version History*: v9 §4.4 導入 (3 モード ai-only / self-only / hybrid + Mann-Whitney から PSM へ変更) → v10 §4.4 維持 (PSM + デザインシステム統合) → v10.2 §4.4 (PSM 適用前提を満たさない発見、Codex 13-1) → v10.3 §4.4 (PSM 廃止 → ランダム + switchback)

#### 6.6.1 3 モード定義 (v9 §4.4、★★★★)

| モード | 動作 |
|---|---|
| ai-only | OpenAI gpt-image-2 (low/mid/high 動的選択) で毎回生成 (デフォルト) |
| self-only | ユーザーに撮影指示、待つ |
| hybrid | 投稿内容で自動判定 (実装系 = self、概念系 = ai、数値系 = programmatic) |

#### 6.6.2 v9 自動切替判定 (Mann-Whitney 廃止 → PSM、Deprecated 後の履歴)

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

**自動切替は承認制** (§5.1)。

**v10.2 で PSM 適用前提が満たされない発見 (Codex 13-1)**: 10 対 10 件で 3 共変量 = pair 不足。

#### 6.6.3 v10.3 確定: ランダム割当 + 週単位 switchback (Current)

```
Phase 1:
  各 core idea を ai-only / self-only / hybrid にランダム割当 (1/3 ずつ)
  または週単位 switchback (1 週目 ai-only、2 週目 self-only、3 週目 ai-only、...)

Phase 1 観察 KPI (目的変数 5 つ):
  1. profile_actions (IG save / profile_visit)
  2. minutes_ofmeton (本人の撮影 / 編集時間)
  3. publish_delay_hours (撮影待ちによる投稿遅延)
  4. asset_failure_rate (画像 reject 率)
  5. cost_per_publish (1 投稿あたり画像 + Writer 合算)

Phase 2 移行判定 (AND):
  - 30 日サンプル各モード ≥ 10 件
  - 5 KPI で明確な差 (95% 信頼区間で 1 mode が他を上回る)
  - minutes_ofmeton が 月 2 時間未満で他 KPI 上回る場合のみ "self-only" 推奨可

Visualizer モード切替は承認制 (§5.1) を維持
```

#### 6.6.4 デザインシステム統合 (v10 §4.4、visual-designer skill 引き継ぎ)

**カラーパレット (4 色、Phase 0 で確定)**:

| 役割 | 色 (仮置き) |
|---|---|
| Primary | ofmeton ブランドカラー (例: ネイビー #1A2B5F) |
| Accent | アクセント色 (例: コーラルレッド #FF6B6B) |
| Background | オフホワイト #F8F8F5 |
| Text | チャコールグレー #2A2A2A |
| **Sub-Accent (v10.1 追加)** | **#F4D35E (ホワイトイエロー、Before-After "After" 強調)** (Phase 0 Report §6.5) |

**フォント**:
- 見出し: **Noto Sans JP Heavy (900)**
- 本文: Noto Sans JP Regular (400)

**レイアウト (Instagram カルーセル)**:
- サイズ: 1080×1080 px
- 余白: 全 4 辺 8-10% (= 86-108 px)
- 文字サイズ最小値: **32 px** (大型スマホで読める下限)

### 6.7 Optimizer 改善対象 3 区分 (補完: A-8 + A-9)

*Version History*: v9 §4.8 導入 (Full auto / Auto + 7 日 brownout / 承認必須 5 種) → v10 §4.8 維持 + v9.2 集客導線 3 パターン追加 → v10.1 §4.8 M-9 Full auto 項目追加 → v10.2 §4.8 (Codex 11-1 Phase 1 縮退) → v10.3 §4.8 (cs:p3-fcbb 承認必須 5 種 → 4 種)

#### 6.7.1 改善対象 3 区分の具体項目 (v9 §4.8 + v9.2 + v10.1 統合、★★★★)

**重要原則**: Optimizer の改善対象は **小さな数値パラメータだけではない**。エージェント定義 / フロー / レイヤー構造そのものも継続的に疑い、より良い形を提案する責務を持つ。ただし、**骨組み変更は承認必須**。

##### Full auto (承認不要) — v9 + v10.1 統合

- twitterapi.io クエリ (min_faves 閾値、キーワード)
- 選別スコア重み
- 投稿時間スロット ±60 分
- Hook 強度閾値
- 既存類型の自然死 (180 日休眠)
- **アカ別文字数中央値、敬体率、【】率を 4-12 週おきに Style Guide v 経由で自動更新** (v10.1 M-9 追加)

##### Auto + 7 日 brownout

- Writer プロンプト追記 (骨組み変更でない範囲)
- Editor ルール追加・削除 (6+2 範囲内)
- フォーマット選択の重み (Thompson Sampling 事前分布)
- Interviewer 質問パターン (8 種ライブラリ内)
- **集客導線 3 パターン (A/B/C) の URL 付き比率最適化** (v9.2 §4.3)

##### 承認必須 (v9: 5 種 → v10.3: 4 種、cs:p3-fcbb)

**v9 / v10 当時 (履歴、5 種)**:
1. Style Guide v 変更
2. 新類型認定
3. 媒体追加・停止 (Threads / Shorts ローンチ含む)
4. 月予算上限変更
5. **骨組み変更** (エージェント定義 / レイヤー構造 / 6+2 ルール / 北極星指標 / スタック)

**Current (v10.3、4 種に絞る)**:
1. Style Guide v 変更
2. 新類型認定
3. 媒体追加・停止 (Threads / Shorts / IG launch 含む)
4. 月予算上限変更

「骨組み変更」は **Optimizer Phase 2 weekly レビュー** に組み込み、人間が四半期で判断 (Codex 2-3 反映)。

#### 6.7.2 Optimizer 初期値を競合分析から設計する方針 (v9 §4.8 + competitor-report-all-versions §2.10 + §2.15、★★★★)

> **方針 (★★★★)**: Phase 1 着手時の Optimizer 各パラメータの α / β / 初期重み係数は、競合 24 アカ × 9 項目分析の中央値から逆算する。

**根拠** (competitor-report-all-versions.md §2.10 Phase 1 着手前の transfer 設計 + §2.15 §6.5 Style Guide v1 雛形):

```
Optimizer.parameter             | 初期値 (Phase 1)  | 出典
=================================|===================|=====================
fmat Thompson α / β              | α=2, β=8 (各)   | competitor §2.10 中央値
keigo_rate 目標               | 0.50-0.60        | competitor §2.6 B-1
hashtag_rate 通常              | ≤0.05            | competitor §2.6 B-5
hashtag_rate note 送客時      | ≤0.15 (3 個まで) | competitor §2.6 B-5
emoji_rate                     | 0.20-0.30        | competitor F-9 国内中央値
bracket_rate                   | 0.05-0.10        | competitor F-9
newline_density                | 0.030-0.050      | competitor F-9
twitterapi.io min_faves 閾値 | 250-500           | competitor §2.3 既存 10 アカ分析
選別スコア重み (Hook / Topic)  | 0.3 / 0.3          | competitor §2.10 中央値
```

**Style Guide v1.x の重み付け** (style-guide-all-versions.md §2.5) と双方向リンク: Optimizer は初期値を Style Guide v1 から読み、運用データで posterior 更新後、月次で Style Guide v2 への反映を提案。

#### 6.7.3 タイムテーブル詳述 (v10.3 §4.8.1 A-2)

```
週次タイムテーブル (月-木):
  通常 5 投稿/日 × 4 日 = 20 投稿/週
  内訳:
    短文 13-14 本 (65-70%、朝昼夕全枠)
    中文 5-6 本 (25-30%、17:30 引用 RT or 21:00 別角度)
    長文 1 本 (5%、木曜 21:00 ロングフォーム月 1-2 本)
    スレッド 1 本 (5%、水曜 17:00 = note 送客スレッド型告知)

週末 (金土日):
  金: 4 投稿、短文 + 中文のみ (引用 RT スキップ)
  土: 3 投稿、短文中心
  日: 4 投稿、Weekly Brief + 来週予告 (長文 1 本含む)

週合計 31 投稿
内訳: 短文 22 (71%) + 中文 6 (19%) + 長文 2 (6%) + スレッド 1 (3%)
月総数 ~120-130 投稿 (240 投稿は 3 媒体合算)
```

**※ Current (v10.3 + Style Guide v1.4) では X = 1 投稿/日 = 30 本/月** に縮減 (§3.8 history)。上記タイムテーブルは v10.3 §4.8.1 当時の参考。

#### 6.7.4 横断観察 (v9.2 §4 / v10 §4.8)

| 観察軸 | 内容 |
|---|---|
| 媒体次元 | X / IG / note のクロスで「同じテーマがどの媒体で最も効率良いか」 |
| 媒体間遷移率 | X PCR → プロフィール → note 訪問 → note 購入 の漏斗各段階 CVR |
| 横断補完スコア | 3 媒体合算エンゲージメント vs 個別単独運用 (補完効果定量化) |
| カニバリ検知 | X 短文 + IG カルーセル 1 枚目で全部言って note 不要にしてないか |

Optimizer が weekly で全媒体の遷移率を観察、Writer プロンプトに警告組込。

#### 6.7.5 そもそも論 weekly レビュー (v9.2 統合)

Optimizer Phase 2 (Opus 4.7) が weekly に以下を観測:

1. エージェント分割は適切か
2. レイヤー間 IF の摩擦
3. 北極星指標の妥当性
4. 媒体の取捨選択
5. データソースの妥当性

Weekly Brief で「考察」セクションとして提示 → ユーザー判断で深掘り依頼 / 保留 / 採用 (承認必須) を選ぶ。

**v10.2 Codex 11-1 縮退 (Phase 1 Month 1-2)**:

```
Month 1-2:
  Optimizer Phase 2 (Opus weekly) の出力は:
    - 異常検知 (PCR 急落 / cost 超過 / token refresh 失敗等)
    - 運用詰まり (公開許諾 deny 多発 / 失敗談 supply 不足等)
    - 追加計測の提案

Month 3 以降:
  - Opus weekly は構造改善提案を再開
  - 提案には 90 日窓 + business KPI + 変更前後の評価計画を含む decision memo 形式必須
  - 採用は四半期決定 (= 月次でなく)
```

#### 6.7.6 ナレッジベース蓄積 (v9 §4.8)

```
Phase 2 でランク A 仮説を別テーブルに蓄積
→ Style Guide v2 (中期版) の主原料

例:
[hypothesis_id: 042]
"スレッド 7-10 本構成は単発長文より PCR 有意に高い"
ランク: A
根拠: Phase 1 ファクト (p < 0.01, n=68)
採用日: 2026-06-15
関連設定: writer.format_selection_v3
```

#### 6.7.7 transfer learning ingest 観察 (v10.1 R-9)

```
新規 KPI: transfer_learning_ingest_count
  - raw/publishing/inspirations/ への ingest 回数 (週 ≥ 3 件)
  - 内訳: 海外 ≥ 1 / 国内業種別 ≥ 1 / note ≥ 1
```

---

## 7. LINE 事後報告 + 競合調査 50 項目分類 (補完: A-11 + A-12)

### 7.1 LINE Daily Digest / Weekly Brief (補完: A-12)

*Version History*: v9 §5.2 導入 → v10 §5.2 維持 → v10.3 §5.2 因果連鎖追加 (A-4)

#### 7.1.1 Daily Digest (毎晩 23:00 JST、LINE Messaging API)

```
━━━ 5/26 Daily ━━━
投稿: X 5 / IG 1 / note 0
平均PCR: 0.22% (前日比 -0.12)
url_link_clicks: 4 件
qualified_lead: 0 件
特記:
  - 17:00 X 投稿の PCR 0.41% (本日最高)
  - PCR 急落の因果候補: transfer learning ingest が 7 日連続 0 件、翻案率 12% (基準 40%) ← v10.3 A-4
自動反映:
  - twitterapi.io クエリ "min_faves" 300 → 250
  - 新類型「対比強調型」候補が暫定登録 (承認待ち)
承認待ち:
  - 「対比強調型」を新類型認定する? !approve_042 / !reject_042
詳細→ supabase dashboard
```

#### 7.1.2 Weekly Brief (毎月曜朝)

```
━━━ Week 22 Brief ━━━
投稿総数 / 平均PCR / url_link_clicks
集客導線比較: A (プロフ常時) 0.41% / B (送客 RT) 28 clicks / C (末尾 CTA) 0.38%
自動反映 5 件 / Optimizer 提案要約
そもそも論考察: 「note の 5 構成パターン、ツール比較型の CVR が他より 20% 低い。比較記事を月 1 → 月 0.5 に減らす案」
```

#### 7.1.3 通数試算

Daily 30 + Weekly 4 + 異常通知数件 + 完結インタビュー 300 ≈ 月 340 通 → 200 通超過 140 × ¥5 = +¥700。

### 7.2 競合調査 50 項目 A〜H 分類 (補完: A-11)

*Version History*: v9 §6 導入 (50 項目 A〜H 分類 + 二軸集計) → v10 §6 引継 → v10.3 §6.0 Phase 0 v2 やり直し (致命的欠陥 5 件発見)

#### 7.2.1 A〜H 50 項目分類軸 (v9 §6 SSOT、★★★)

合計 65 アカウント × 直近 3 ヶ月の上位 20 投稿 ≈ 1,300 投稿を分析。

| 区分 | 項目 # | 領域 |
|---|---|---|
| **A. 構造・フォーマット系** | 1-6 | 文字数、投稿形式 (短文/スレッド/長文)、絵文字、ハッシュタグ、改行頻度、URL 位置 |
| **B. 内容・トーン系** | 7-14 | 文体 (敬体/常体)、一人称、結論位置 (先出し/後出し)、CTA 強度、固有名詞使用率、業界専門用語密度 |
| **C. 画像系** | 15-21 | 画像割合、内容類型 (図解/写真/AI 生成)、トーン、文字入り画像率、カラーパレット、レイアウトパターン、画像枚数 |
| **D. 動画系** | 22-28 | 動画長さ、字幕、BGM、テロップ、編集テンポ、サムネ、動画使用率 (次フェーズ用に分析のみ) |
| **E. 時系列・運用系** | 29-32 | 時間帯ヒートマップ、曜日別投稿頻度、平日 vs 週末、季節性 |
| **F. ファネル系** | 33-35 | プロフィール (固定ポスト/Bio)、リンクツリー有無、CTA 末尾パターン |
| **G. Hook 系** | 36-40 | タイプ分類 (13 類型)、強度、primary_hook 分布、devices 使用パターン、verified_failure_story 比率 |
| **H. X フォーマット系** | 41-50 | スレッド長さ、構成パターン (列挙/構造化/Q&A/ストーリー)、引用 RT 使用、固定ポスト、quote_count、bookmark_count、reply_count、impressions、profile_clicks、url_link_clicks |

#### 7.2.2 二軸集計 (v9 §6)

```
primary: 50 項目
secondary: フォーマット (短文 / スレッド / 長文) + 集客導線パターン (A/B/C)
```

#### 7.2.3 Phase 0 v2 やり直しの致命的欠陥 (v10.3 §6.0、C-9 由来)

Phase 0 (v9 当時) の調査は以下の欠陥があった:

1. **twitterapi.io advanced_search の query 文字列が raw 保存されていない** (再現不能)
2. **22 候補 → 10 名絞り込みでターゲット適合性 (非エンジニア経営者向け) のフィルタが入っていない** (致命的)
3. 結果 10 アカのうち **6 アカがターゲット不適合** (umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_)
4. **50 項目集計の実質母集団は 4 アカ** (Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love) → 統計的有意性なし
5. Style Guide v1 / Hook 配分 / 文字数比率 / 敬体率 はこの 4 アカに過適合

→ v10.3 で **Phase 0 v2 として競合調査をやり直し**。詳細は competitor-report-all-versions.md §2.X 参照。

---

## 8. 安全装置 + 法務章細目 + 公開許諾 gate (補完: A-13 + A-14 + B-7)

### 8.1 安全装置 5 種まとめ (補完: A-13)

*Version History*: v9 §5.3 導入 (5 種) → v10 §5.3 維持 → v10.2 §3.3.4 brownout mode 発動条件詳述

#### 8.1.1 変更幅キャップ (v9 §5.3)

- スコア重み: 1 回の変更で旧との差 < 30%
- クエリ min_faves: ±200 まで
- 時間スロット: ±60 分まで

#### 8.1.2 異常検知ロールバック (v9 §5.3)

- 反映後 7 日間モニタ
- 平均 PCR -30% 以上 → 自動ロールバック
- 平均インプ -50% 以上 → 自動ロールバック
- LINE 通知 + 理由ログ

#### 8.1.3 設定変更ログ (v9 §5.3)

- 全変更履歴 Supabase 保存、任意時点へ巻き戻し可能

#### 8.1.4 キルスイッチ (v9 §5.3)

- LINE で `!stop` → 全自動反映を 48 時間停止 + 自動投稿停止

#### 8.1.5 brownout mode (v9 §5.3 + v10.2 §3.3.4 発動条件詳述、★★★)

```
費用上限到達時の挙動 (¥10,000):
  - 投稿停止 (X / Instagram / note 全媒体)
  - 計測継続 (analytics ingestion)
  - 通知継続 (LINE Daily Digest は止めない)
  - バックアップ継続

v10.2 で追加の発動条件 4 件 (CR-3):
  1. 月コスト ≥ ¥10,000 到達時 → 上記 + Writer retry を全部 reject
                                + Optimizer Opus weekly を Sonnet にダウングレード
  2. 月コスト ≥ ¥11,500 到達時 → 投稿 + Interviewer + Optimizer 全停止
                                Daily Digest + Weekly Brief は LINE で継続
  3. 月コスト ≥ ¥12,500 到達時 → 全 cron 停止、LINE 通知のみ (人間判断モード)
  4. 月コスト ≥ ¥13,800 (p95) 到達時 → 即時人間エスカレーション、cron 完全停止
```

#### 8.1.6 MA Session 即 archive (v9 B-3 発見)

全 MA session 終了時に **retrieve → archive を強制** (idle 課金リーク防止)。

> **【2026-06-07 訂正・実証済】** 上記は pre-GA/憶測の API 形に基づく **stale**。
> GA Managed Agents(`managed-agents-2026-04-01`) は **トークン課金**で active_seconds /
> idle 課金リークは存在せず、retrieve→archive の固定 order も不要(archive は単なる
> 後始末)。実装は `apps/x-account-system/lib/ma/run-session.ts`(SSE-drain)。
> 旧 `lib/ma/teardown.ts` は削除。根拠: memory `project_x_agentic_rearchitecture` task1 verdict。

### 8.2 法務章 §10.4 / §10.5 / §10.6 細目 (補完: A-14)

*Version History*: v9 §10 章新設 (10.1-10.6 全項目) → v10 §10 統合 → v10.2 §10.7 公開許諾 gate 追加 (CR-2) → v10.3 §10.7-10.9 (顧客素材方針変更 + note 販売 + 業法ガード)

#### 8.2.1 §10.4 VOICEVOX クレジット表記 (次フェーズ、★★★)

Shorts 実装時に VOICEVOX 使用する場合、音声ライブラリ規約に従ったクレジット表記を Shorts 概要欄テンプレートに固定。

**具体テンプレ例**:
```
本動画では VOICEVOX (https://voicevox.hiroshiba.jp/) を使用しています。
  音声: ずんだもん (VOICEVOX:ずんだもん)
  音声: 四国めたん (VOICEVOX:四国めたん)
ライセンス: VOICEVOX を利用した非営利・商用利用は許諾されています。
```

**実装 gate**: Shorts ローンチ判断時に Editor +6 ルールとして「VOICEVOX 使用投稿は概要欄テンプレ含むか」を追加。

#### 8.2.2 §10.5 AI 生成画像の表記 (★★★)

- alt text に「AI 生成画像 (gpt-image-2 / gpt-image-1)」
- カルーセル末尾に「画像は AI 生成」と 1 行
- CLAUDE.md「AI 表記: 自然な範囲で透明性を持って言及（隠蔽 NG、誇大 NG）」と整合

**Editor 連動**: Editor +2 ルール (ステマ表記) と並列で、AI 生成画像を使用した投稿には自動で「※画像は AI 生成」を alt text + キャプション末尾に挿入。

#### 8.2.3 §10.6 Secrets rotation 戦略 (★★★)

- key を `.env.local` のみで管理、git に commit しない
- 月次で X / Meta access token を refresh (OAuth 2.0 PKCE)
- 半年に 1 回 Anthropic API key / OpenAI API key を rotate
- 漏洩疑い時の即時 revoke 手順を別 doc 化 (`docs/secrets-revoke-runbook.md` 想定)

**Phase 1 着手前 gate**:
```
☐ .env.local の git status 確認 (commit 履歴に key 痕跡なし)
☐ rotation cron (月次 refresh) 設定
☐ revoke runbook 作成 (Anthropic / OpenAI / X / Meta / Supabase / LINE 各サービス)
```

### 8.3 公開許諾 gate Schema (補完: B-7)

*Version History*: v10.2 §10.7 導入 (CR-2) → v10.3 §10.7 顧客素材方針変更

#### 8.3.1 Schema (v10.2 §10.7.1)

```sql
materials_store (
  id uuid primary key,
  source_type text,                    -- layer_a_twitterapi / layer_b_internal
  raw_content jsonb,
  redacted_content jsonb,              -- DLP 通過後

  publication_consent text,            -- 'granted' / 'denied' / 'pending'
  consent_obtained_from text,          -- 'self' / 'client' / 'public_data'
  consent_obtained_at timestamp,
  redaction_reviewed boolean,
  client_impacted_flag boolean,
  pii_flag boolean,
  client_confidential boolean,

  created_at timestamp,
  updated_at timestamp
)
```

#### 8.3.2 Editor +5 ルール (v10.2 §10.7.2)

| 条件 | アクション |
|---|---|
| `publication_consent='granted'` AND `redaction_reviewed=true` | 投稿 pool 投入可 |
| `publication_consent='pending'` | 投稿 pool 投入不可、Interviewer で再確認 |
| `publication_consent='denied'` | 投稿 pool 投入不可、material は 90 日後 archive |
| `pii_flag=true` OR `client_confidential=true` | 必ず redacted_content のみ使用 |
| `client_impacted_flag=true` (v10.3 で記録のみ、reject しない) | 警告タグ付与、人間承認モード (高リスク) |

#### 8.3.3 顧客同意の取得フロー (v10.2 §10.7.3 + v10.3 §10.7 改訂)

**v10.2 当時 (Deprecated)**:
- Phase 1 では顧客素材は投入禁止、本人事業のみ

**Current (v10.3 改訂)**:
- 基本許諾済前提で投入 OK
- **投稿文には固有名詞 (氏名 / 社名 / 案件名) は出さない** が新ルール
- Editor +5 ルールで draft の固有名詞を必ず reject
- `materials_store.publication_consent` のデフォルト:
  - **本人事業 4 種** (RICE CREAM / 家庭教師 / portfolio / all-good-ops): `'granted'` 自動付与
  - **案件 client 由来** (terra-isshiki / minpaku-cleaning 含む): `'granted'` (基本許諾済前提、ofmeton 確認済)
  - 監査用に `consent_obtained_from` / `consent_obtained_at` を入力推奨 (mandatory ではない)
  - `client_impacted_flag` は記録するが、それ自体で Writer pool 除外しない

#### 8.3.4 ZDR / API 送信ガード (v10.2 §10.7.4)

- `materials_store` テーブルに `pii=true` / `client_confidential=true` の素材を投稿生成 prompt として送信しない
- 必要時は redacted version (顧客名 → "T 社" 等) のみを生成 prompt に渡す
- `materials_store` 自体は Supabase に **隔離スキーマ** で保管 (RLS で投稿生成エージェントから読めない)

### 8.4 OAuth 2.0 PKCE 実装 gate (補完: B-6、v10.2 §3.5 新章)

*Version History*: v9〜v10.1 言及なし → v10.2 §3.5 新章 (CR-4 Codex 重大、Phase 1 着手前 gate) → v10.3 継承

#### 8.4.1 背景 (Codex CR-4、★★★★★)

X OAuth 2.0 PKCE は **`offline.access` scope なしでは refresh token が発行されない**。Phase 1 着手前にこの仕様を実機テストで確認しないと、自動投稿が token 切れで停止する致命的リスク。

#### 8.4.2 Phase 1 着手前の実機テスト 4 項目 (v10.2 §3.5 SSOT)

```
gate: phase1_oauth_pkce_test
  status: ☐ 未実施 / ✅ 完了
  必須項目:

  ☐ 1. OAuth 2.0 PKCE flow (code_challenge_method=S256) で access_token + refresh_token 両方取得
       - scope に `offline.access` を含めること (これがないと refresh_token 発行されない)
       - Authorization URL → callback で code 受領 → token endpoint で交換

  ☐ 2. refresh_token を使った token rotation (1 回以上の実機検証)
       - refresh_token grant_type で新規 access_token 発行
       - 旧 refresh_token は使用不可になることを確認

  ☐ 3. user_profile_clicks (PCR 計算の non_public_metrics) を OAuth scope で取得可能か確認
       - X API v2 `/2/tweets/:id?tweet.fields=non_public_metrics` を OAuth Bearer で叩く
       - 401 / 403 が返らないこと

  ☐ 4. アカウント休止 / ban / scope revoke 時の error code を観察
       - 401 invalid_grant / 403 user_revoked_access 等の挙動を runbook 化
```

#### 8.4.3 失敗時の Phase 1 着手判断 (v10.2 §3.5.3)

- いずれか 1 項目でも失敗: **Phase 1 着手を保留**。X API スコープ要件 / scope 申請 / 代替投稿経路を再検討
- 全 4 項目成功: Phase 1 着手 OK、§8.2.3 Secrets rotation runbook を月次運用化 (gate を Phase 1 weekly に組み込み)

#### 8.4.4 Phase 1 着手後の monitoring 連携 (v10.3 R-19)

- OAuth blocked / token expired 検出を §9.3 Observability の `error_class` フィールドに追加
- 同 OAuth blocked 検出が Phase 1〜2 移行 gate の AND 条件に追加 (§2.11 / §6.7.5)
- HUMAN_TASKS.md H-1 (X Developer Console 申請) と連動、本 gate の前提条件

---

## 9. データフロー + observability (補完: A-17)

*Version History*: v9 §9 導入 (論理構造 + Observability 9 フィールド) → v10 §9.1-9.3 (論理単位明示 + media / funnel_stage 追加) → v10.3 §9.2 UTM + business outcome (C-10)

### 9.1 論理構造 (v9 §9.1 SSOT、★★★★)

```
[素材ソース] → [Materials store] → [Indexer] → [Vector index]
                                                      ↓
                            ┌─────────────────────────┴───┐
                            ↓                             ↓
                     [Interviewer]              [Curation Selector]
                            ↓                             ↓
                     [Q&A records]                 [Curation pool]
                            ↓                             ↓
                            └─────────────┬───────────────┘
                                          ↓
                                  [Core Ideas pool]
                                          ↓
                            [Writer / Visualizer]
                                          ↓
                                  [Post drafts]
                                          ↓
                                       [Editor]
                                          ↓
                          [Scheduled posts (per platform)]
                                          ↓
                                  [Posted records]
                                          ↓
                              [Analytics ingestion]
                                          ↓
                                  [Performance store]
                                          ↓
                                       [Optimizer]
                                          ↓
                              ┌───────────┴───────────┐
                              ↓                       ↓
                    [自動反映 configs]          [Knowledge base]
```

### 9.2 各ストアの論理単位 (v10 §9.2 + v10.3 UTM 拡張、★★★★)

- **Materials store**: 素材源 1 件 = 1 レコード、ソース種別、時系列タグ、機密タグ、layer (A/B)
- **Vector index**: 「投稿可能な瞬間」単位 (pgvector、embedding-3-large)
- **Q&A records**: インタビュー 1 回 = 1 レコード、全ターン履歴、satisfaction_score、publication_consent_status
- **Core Ideas pool**: 投稿の核 1 個 = 1 レコード、hashed_idea_id で重複検出
- **Post drafts**: 1 核アイデア × プラットフォーム数のレコード
- **Posted records**: 投稿 1 回 = 1 レコード、**集客導線パターン (A/B/C)** 含む、UTM 識別子付き
- **Performance store**: 投稿 × 時系列のメトリック
- **business_outcomes (v10.3 新規 C-10)**: paid_article_purchase / consultation_request / qualified_lead を商品別 / UTM 別に記録

### 9.3 Observability (v9 §9 引継 + v10 新規フィールド、★★★★)

全テーブルに以下を持つ:

- `trace_id`: 1 件の素材 → 投稿 → 計測の end-to-end トレース ID
- `run_id`: cron run ID
- `post_id`: 内部 ID
- `platform_post_id`: X tweet_id / IG media_id / note article_id
- `cost`: その record 生成にかかった USD
- `failure_stage`: 失敗時のレイヤー
- `agent_version`: MA agent version pinning
- `media`: X / IG / note (横断観察用、v10 新規)
- `funnel_stage`: 媒体間遷移 (X → プロフ → note → 購入) のどの段階か (v10 新規)
- `utm_source` / `utm_medium` / `utm_campaign` (v10.3 新規 C-10): cross-platform attribution
- `business_outcome_type`: 'paid_article_purchase' / 'consultation_request' / 'qualified_lead' (v10.3 新規)

### 9.4 Sentry / OTEL 連携 (v9 §9 拡張)

```
exporter:
  type: OpenTelemetry
  endpoint: Sentry OTLP gateway

trace 構造:
  - root span: cron run
    - child span: per agent (Interviewer / Writer / Editor / etc)
      - attribute: cost, failure_stage, agent_version
    - child span: per platform post
      - attribute: platform_post_id, funnel_stage

sampling:
  - 通常時: 10% (volume 制御)
  - エラー時: 100% (failure_stage != null)
```

---

## 10. コスト試算 + brownout 発動条件 (補完: A-18)

*Version History*: v9 §3.3 (実測ベース ¥6,153-6,353) → v10 §3.3 (v9.2 反映 ¥5,504-5,704) → v10.2 §3.3.1-§3.3.4 (CR-3 全 agent 月額費用再算定 ¥9,154 expected)

### 10.1 workload 表 (Phase 1 expected、v10.2 §3.3.1 SSOT、★★★)

| Agent | runs/month | input_tok/run | output_tok/run | retry_rate | model | unit cost (in/out) | 月額 (JPY) |
|---|---:|---:|---:|---:|---|---|---:|
| **Writer (核アイデア → 媒体派生 8 個)** | 30 core × 8 platform = 240 | 4,500 (Style Guide + 履歴) | 3,000 (投稿草案) | 30% (Editor reject) | Sonnet 4.6 | $3/$15 per MTok | **¥1,840** |
| **Editor (6+5 ルール判定)** | 240 × 1.3 retry = 312 | 1,500 (投稿 + ルール) | 500 (判定 + 理由) | 5% (LLM 自体 retry) | Sonnet 4.6 | $3/$15 per MTok | **¥321** |
| **Hook Analyzer (類型分類 + 新候補検出)** | 312 + 月 30 (新候補) = 342 | 800 | 300 | 5% | Sonnet 4.6 (Haiku 4.5 でも可) | $3/$15 per MTok | **¥234** |
| **Visualizer 制御 (画像生成プロンプト)** | 月 150 枚 × 1.2 retry = 180 | 1,200 | 200 | 20% (画像 retry) | Sonnet 4.6 | $3/$15 per MTok | **¥130** |
| **Interviewer (月 60 セッション)** | 60 | 2,000 (cache) | 1,500 (1 ターン) × 平均 8 ターン = 12,000 | 5% (素材不在) | Sonnet 4.6 | $3/$15 per MTok | **¥1,140** |
| **Optimizer Phase 1 (Sonnet weekly)** | 月 4 (週次) | 30,000 (週次データ) | 5,000 (数値ファクト) | 0% | Sonnet 4.6 | $3/$15 per MTok | **¥125** |
| **Optimizer Phase 2 (Opus weekly + thinking)** | 月 4 | 50,000 (Phase 1 出力 + 過去 Style Guide) | 12,000 (thinking 5,000 + 仮説 7,000) | 0% | Opus 4.7 + extended thinking | $15/$75 per MTok | **¥702** |
| **Optimizer Phase 3 (施策立案、Sonnet)** | 月 4 | 20,000 | 5,000 | 0% | Sonnet 4.6 | $3/$15 per MTok | **¥110** |
| **MA session overhead (active_seconds 課金)** | 60 + 4 + 4 + 4 = 72 sessions | — | — | — | MA | $0.005/sec × avg 1.3 min | **¥84** 〔**2026-06-07 訂正**: GA はトークン課金で session-hour/active_seconds 課金は無し。この ¥84 行は計上不要〕 |
| **Image (low 120 / medium 30 / high 0 / edit 0)** | 150 | — | — | 0% | gpt-image-2 | low $0.00816, medium $0.03168 | **¥321** |
| **X API (1 日 5 投稿 = URL 付き 1 + URL なし 4)** | 月 150 | — | — | — | X PPP | URL 付 $0.200, URL なし $0.015 | **¥1,287** |
| **twitterapi.io (海外/国内追跡 + transfer learning)** | 月 50 query | — | — | — | $0.15/1000 tweets | — | **¥100** |
| **Cloudflare Workers Paid** | — | — | — | — | Paid plan | $5/月 | **¥780** |
| **Supabase Free** | — | — | — | — | Free | — | **¥0** |
| **LINE Messaging API** | 200 通超過 = 340 通 (Daily 30 + Weekly 4 + Interview 300 + 異常 6) | — | — | — | $0.03 = ¥5/通 | — | **¥700** |
| **X Premium Basic** | — | — | — | — | — | ¥980/月 | **¥980** |
| **Anthropic API (上記合算検証用)** | (Writer + Editor + Hook Analyzer + Visualizer + Interviewer + Optimizer 1+2+3) | — | — | — | — | — | **¥4,502** |
| **合計** | — | — | — | — | — | — | **¥9,154** |

### 10.2 シナリオ別予算 (low / expected / p95、v10.2 §3.3.2)

| シナリオ | 月額 (JPY) | 主な差分 |
|---|---:|---|
| **low** | ¥6,500 | Writer retry 10% / Editor retry 0% / image low only / Opus thinking 無効 / Interviewer 月 40 |
| **expected (上記表)** | **¥9,154** | 上記前提値 |
| **p95** | ¥13,800 | Writer retry 50% / Editor retry 20% / image medium 50 枚 / Opus thinking high / Interviewer 月 80 |

### 10.3 月予算 ¥10,000 との関係 (v10.2 §3.3.3)

- expected ¥9,154 は月予算 ¥10,000 を **¥846 上回らない**ギリギリ枠
- p95 ¥13,800 で **超過リスク 30-40%** → §8.1 brownout mode の発動条件を再評価必須
- v10.1 (¥5,504-5,704) は **約 ¥3,500-4,000 過小評価** だった (主因: Writer / Editor の生成・判定費用未計上)

### 10.4 brownout 発動条件 4 件 (v10.2 §3.3.4)

§8.1 安全装置 brownout mode 参照 (重複避けてここでは参照のみ)。

---

## 11. クロスレビュー観点 全 50 件 (補完: A-15)

*Version History*: v9 §11 (E-1〜E-27、9 sub-section) → v9.1 §11 (E-28〜E-33 note 詳述) → v9.2 §5 (E-34〜E-38 X / IG 詳述) → v10 §11 (E-1〜E-38 統合) → v10.1 §11 (E-39〜E-41 v10.1 新規) → v10.2 §11 (CR-1〜CR-5 + Codex 観点統合) → v10.3 §11 (全 50 件オールクリア + 残置 E-46〜E-52 7 件)

### 11.1 v9 ロジック検証 (E-1〜E-3)

| # | 論点 | v10.3 反映 status |
|---|---|---|
| E-1 | Interviewer 収穫逓減検知アルゴリズム | ✅ §6.2.3 5 ステップで定義 |
| E-2 | Hook 動的拡張 HDBSCAN パラメータ (min_cluster_size=5) | ✅ §6.5.7 Phase 1 停止に変更 |
| E-3 | 選別スコアの分位補正 + log1p、フォロワー帯分割の妥当性 | ✅ §6.3.1 維持 |

### 11.2 v9 概念的弱箇所 (E-4〜E-6)

| # | 論点 | 反映 status |
|---|---|---|
| E-4 | 「業務仕組み化テーマに繋がるか」の LLM judge 基準 | ✅ Editor ルール 1 で LLM judge |
| E-5 | 「敵を作らない」判定の安定性 | ✅ Editor ルール 3 + 4 (対立構図フィルタ) |
| E-6 | Visualizer モード切替の PSM、コバリエート (theme, hour, format) で交絡因子分離 | ✅ §6.6.3 PSM 廃止、ランダム + switchback に変更 |

### 11.3 v9 検証なしで決め打ち (E-3.7〜E-17)

| # | 論点 | 反映 status |
|---|---|---|
| E-3.7 | 5-10 ターンで「深い」インタビュー達成 | △ Phase 1 で実測 (E-47 連動) |
| E-3.8 | Claude Code ログに「100 単位」の投稿可能瞬間 | ✅ レイヤー B (§6.1) で確保 |
| E-3.9 | 65 アカ × 3 ヶ月で意味ある統計 | ✅ Phase 0 v2 24 アカ × 50+9 項目やり直しで対応 |
| E-15 | インタビューパターン 8 種で素材抽出十分 | ✅ §6.2.4 8 種で運用 |
| E-16 | core_idea.complexity で fmat 選択妥当判定 | ✅ §6.4.2 Thompson Sampling で運用学習 |
| E-17 | 翻案 5 から実体験への自然移行の閾値 | ✅ Style Guide v1.3 で 4 排他軸へ変更 |

### 11.4 v9 Managed Agents (E-7〜E-14)

| # | 論点 | 反映 status |
|---|---|---|
| E-7 | MA state 管理の有利さ → B-3 で ¥357 実測、有利確認 | ✅ §3.4 採用判断 |
| E-10 | MA beta 依存リスク | ✅ §3.4 AgentRunner 抽象化レイヤーで対応 |
| E-11 | AgentRunner 抽象化設計 | ✅ §3.4 採用判断 |
| E-12 | 初月モニタリング → B-3 実測ベース更新済 | ✅ §3.3 コスト試算更新 |
| E-13 | research preview 機能を使わない判断 | ✅ §3.4 リスク 3 で対応 |
| E-14 | active vs duration billing → Console で確認済 (¥3) 〔**2026-06-07 訂正**: GA はトークン課金。active/duration(秒)課金は現行 API に無し〕 | ✅ §3.4 B-3 実測知見 |

### 11.5 v9 自動反映 (E-8, E-18, E-19, E-20)

| # | 論点 | 反映 status |
|---|---|---|
| E-8 | 自動反映の安全装置 (-30% 閾値、ロールバック判定) | ✅ §8.1.2 異常検知ロールバック |
| E-18 | キルスイッチ 48 時間停止の長さ | ✅ §8.1.4 維持 |
| E-19 | 変更幅キャップ (30%, ±200, ±60 分) の妥当性 | ✅ §8.1.1 維持 |
| E-20 | 承認必須 5 種で十分か | ✅ v10.3 で 4 種に絞る (§6.7.1) |

### 11.6 v9 フォーマット選択 (E-9, E-21)

| # | 論点 | 反映 status |
|---|---|---|
| E-9 | Contextual Thompson Sampling 事前分布 (α, β) | ✅ §6.4.2 α=2, β=8 確定 |
| E-21 | フォーマット別の期待 PCR の初期値設定 | ✅ §6.7.2 競合分析駆動 |

### 11.7 v9 集客導線 (E-22, E-23)

| # | 論点 | 反映 status |
|---|---|---|
| E-22 | 集客導線 3 パターン (A/B/C) の effect 差をどう推定 | ✅ §2.8 R-5 で Phase 1 単純化 (A 単独 + 夕方 1 投稿だけ B) |
| E-23 | URL 付き比率の Thompson Sampling 最適化と月コスト制約 | ✅ §2.8 v10.3 AND 条件で運用 |

### 11.8 v9 / v9.1 note 詳述 (E-24, E-25, E-28〜E-33)

| # | 論点 | 反映 status |
|---|---|---|
| E-24 | note 生成フローを X/IG と同レベルに詰める → v9.1 で実施 | ✅ §6.4.6 5 系統構成 |
| E-25 | note 有料記事ティーザー設計 / 価格 (500/980/1480) | ✅ §6.4.6.4 ティーザー境界 + §2.7 価格設計 |
| E-28 | 競合 5 作家の調査を Firecrawl で深掘りすべきか | ✅ Phase 0 v2 で実施 (competitor-report 統合版) |
| E-29 | 価格 ¥500 / ¥980 / ¥1,480 の使い分け A/B 計画 | ✅ §6.4.6.3 価格 × CVR テーブル |
| E-30 | ティーザー境界の「無料軽量版」設計の CVR 効果 | ✅ §6.4.6.4 R-4 反映で固定化 |
| E-31 | マガジン 2-3 並走は Phase 1 で過剰でないか | ✅ §6.4.6.5 Phase 1 = 1-2 並走に絞る |
| E-32 | メンバーシップ移行判定基準の閾値妥当性 | ✅ §6.4.6.8 4 条件 ALL 必須 |
| E-33 | SEO 整備の Optimizer Phase 1 数値分析への組込み | ✅ §6.4.6.7 月次 SEO Brief |

### 11.9 v9.2 X / Instagram 詳述 (E-34〜E-38)

| # | 論点 | 反映 status |
|---|---|---|
| E-34 | X fmat の Phase 1 比率 (短文 60 / スレッド 30 / 長文 10) | ✅ §6.4.2 v10.3 比率 (50/25/10/10-15) で運用 |
| E-35 | Hook 補強 3 類型 (11-13) が既存 10 と独立か | ✅ §6.5.1 13 類型独立性 + §6.5.2 primary_hook 4 種 + devices 13 種で再構成 |
| E-36 | 1 日 5 投稿が ADHD/ASD ofmeton 継続性に過剰でないか | ✅ Style Guide v1.4 で 1 投稿/日 に縮減 |
| E-37 | Instagram カルーセル 5 テンプレが note と並列化される設計の妥当性 | ✅ §6.4.5 transfer 設計で対応 |
| E-38 | 媒体間遷移率の観察を Optimizer 実装時、計測可能データが揃う Phase | ✅ §6.7.4 横断観察で Phase 1 から計測 |

### 11.10 v9 設計不確実性 (E-4.11, E-26, E-27)

| # | 論点 | 反映 status |
|---|---|---|
| E-4.11 | LINE 200 通制限のフォールバック (Discord/Slack) | △ Phase 1 で実測、超過時に LINE Premium 検討 |
| E-26 | twitterapi.io の安定性、終了/料金改定リスク | △ 月次で料金確認、代替なし時の plan B 未定 |
| E-27 | OAuth 2.0 PKCE の token refresh 戦略 (X / Meta) | ✅ §3.5 (OAuth PKCE gate) v10.2 で対応 |

### 11.11 v10.1 新規 (E-39〜E-41)

| # | 論点 | 反映 status |
|---|---|---|
| E-39 | M-1〜M-14 の Phase 1 反映の漏れ | ✅ v10.1 §4 全項目反映 |
| E-40 | R-1〜R-15 後悔予測の Phase 1 実証可能性 | △ Phase 1 で実測 |
| E-41 | non_engineer_rate Phase 別段階運用の必要性 | ✅ v10.3 §1.4 Phase 別段階運用で対応 |

### 11.12 Codex 重大 5 件 (CR-1〜CR-5、v10.2)

| # | 論点 | 反映 status |
|---|---|---|
| CR-1 | バックアップアカウント運用は X Automation Rules 違反 | ✅ §3.3 Deprecated でバックアップアカウント削除 |
| CR-2 | 公開許諾 gate なしで顧客素材投稿は重大リスク | ✅ §8.3 公開許諾 gate Schema + Editor +5 で対応 |
| CR-3 | 全 agent 月額費用再算定 (¥5,704 → ¥9,154) | ✅ §10.1 workload 表で対応 |
| CR-4 | OAuth PKCE 実機テスト 4 項目を Phase 1 着手前 gate に | ✅ §3.5 (Phase 1 進行計画) |
| CR-5 | Hook 配分を Phase 1 で固定するのは早すぎ | ✅ §6.5.6 Phase 1 観察、配分固定は Month 3 以降 |

### 11.13 Codex 後悔予測 R-16〜R-25 (v10.3)

| # | 論点 | 反映 status |
|---|---|---|
| R-16 | failure_story 比率 KPI が架空失敗談を生む | ✅ §3.5 Deprecated 比率 KPI 撤回、verified ≤ 4/月 |
| R-17 | Instagram launch を X 同時で gate ザル | ✅ §2.11 IG launch 独立 gate (C-7) |
| R-18 | OAuth refresh 失敗で投稿 ban リスク | ✅ §3.5.2 (Phase 1 進行計画) refresh test 4 項目 |
| R-19 | note 販売の特商法表記漏れリスク | ✅ §2.9 §10.8.1 特商法表記 gate |
| R-20 | note ML 学習データ提供 default ON リスク | ✅ §2.9 §10.8.2 OFF 推奨 |
| R-21 | 月予算 ¥10,000 超過リスク | ✅ §10.3 brownout 発動条件強化 |
| R-22 | JTBD 検証なし業種ローテーション | ✅ §2.1.5 Phase 1 Month 2 LINE/Zoom インタビュー |
| R-23 | Visualizer PSM サンプル不足 | ✅ §6.6.3 ランダム + switchback |
| R-24 | 多重比較で偶然差を Style Guide に永続化 | ✅ §6.7.7 多重比較制御 (28 日窓 + p<0.05 + effect size + human) |
| R-25 | 業法独占キーワードで業務停止リスク | ✅ §2.10 §10.9 業法ガード新章 |

### 11.14 Claude self-review 27 件 (A-1〜A-4 / B-1〜B-5 / C-1〜C-13 / D-1〜D-2 / F-1〜F-3 / G-1〜G-3 / H-7、v10.3)

| 系列 | # | 論点 | 反映 status |
|---|---|---|---|
| A | A-1 | Writer 2 軸クロス制御 | ✅ §6.4.11 |
| A | A-2 | Optimizer タイムテーブル詳述 | ✅ §6.7.3 |
| A | A-3 | failure_story 厳密化 | ✅ §6.5 Editor +3 改訂 |
| A | A-4 | Daily Digest 因果連鎖追加 | ✅ §7.1.1 |
| B | B-1 | 敬体率 0.50-0.60 へ更新 | ✅ §6.4.3 |
| B | B-2 | note 生成フロー詳述 | ✅ §6.4.6 |
| B | B-3 | non_engineer_rate Phase 別段階 | ✅ §1.4 |
| B | B-4 | 実体験ソース ID 再使用ルール | ✅ §4.6.3 (Editor) |
| B | B-5 | ハッシュタグ note 送客時 3 個 | ✅ §6.4.3 |
| C | C-2 | 業種別キーワード注入 | ✅ §6.2.7 |
| C | C-4 | Style Guide 軸 1 分類体系矛盾 | ✅ Style Guide v1.3 で 4 排他確定 |
| C | C-5 | failure_story 比率 KPI 撤回 | ✅ §3.5 Deprecated |
| C | C-7 | IG launch 独立 gate | ✅ §2.11 |
| C | C-9 | auto-post gate を品質 / 運用に変更 | ✅ §3.9 Deprecated 旧 PCR gate |
| C | C-10 | UTM + business outcome | ✅ §9.2 + §9.3 |
| C | C-11 | Visualizer PSM 停止 | ✅ §6.6.3 |
| C | C-12 | HDBSCAN Phase 2 以降 | ✅ §6.5.7 |
| C | C-13 | fail-rate threshold 反転 | ✅ §6.5.5 verified ≤ 4/月 |
| D | D-1 | 4 大課題 (C1-C4) 明示 | ✅ §1.5 |
| D | D-2 | Phase 1 運用負担見積り | ✅ §6.4.7 + §2.11 |
| F | F-2 | 業法ガード新章 | ✅ §2.10 + §10.9 |
| G | G-1 | スレッド 10-15% 復元 | ✅ §6.4.2 |
| G | G-3 | Hook テスト枠 5 | ✅ §6.5.5 |
| H | H-7 | 残置観点 7 件の Phase 1 実証 | ✅ §2.12 E-46〜E-52 |

### 11.15 v10.3 残置観点 7 件 (E-46〜E-52)

§2.12 リスクヘッジ参照 (重複避けてここでは参照のみ)。

---

## 12. 議論の経過 (補完: B-8) + レビュアー依頼履歴 (補完: A-16)

### 12.1 各バージョンの議論経過 (v9〜v10.3 全 7 バージョン履歴、★★)

| 版 | 主な変更 | 日付 |
|---|---|---|
| v1 | 短文 Tips カード型 | — |
| v2 | PCR を北極星、note 販売連動 | — |
| v3-v7 | インタビュアー / マルチプラットフォーム / Hook 動的拡張 / 競合調査 50 項目 / Managed Agents 比較 | — |
| v8 | All Managed Agents 採用、初月モニタリング | 〜2026-05-23 |
| **v9** | クロスレビュー + B-1〜B-3 実測反映、3 媒体集約、ターゲット非エンジニア確定 | 2026-05-24 |
| **v9.1** | note 詳述 (competitor analysis 5 作家 + 構成 5 系統 + 価格 × CVR + ティーザー) | 2026-05-25 |
| **v9.2** | X / Instagram 詳述 (X publishing research + IG transfer learning) | 2026-05-25 |
| **v10** | v9 + v9.1 + v9.2 統合完全版 (new main 設計書) | 2026-05-25 |
| **v10.1** | Phase 0 競合調査 (M-1〜M-14) 反映、月別業種フォーカス、Hook Phase 1 主軸 3 + テスト枠 4、Editor 6+4 ルール | 2026-05-25 |
| **v10.2** | Codex MCP cross-review 重大 5 件 (CR-1〜CR-5) inline patch、バックアップアカウント削除、公開許諾 gate、コスト再算定 (¥9,154 expected)、OAuth PKCE gate | 2026-05-25 |
| **v10.3** | 全レビュー指摘オールクリア (Codex 13 件 + Codex 後悔予測 R-16〜R-25 + Claude self-review 27 件)、顧客素材方針変更、業法ガード新章、note 販売 compliance 新章、Visualizer PSM 廃止 | 2026-05-26 |

### 12.2 各バージョンのレビュアーへの最終依頼 (★★★)

#### v9 (1,138-1,152)

> このドキュメントを読んだ上で:
> 1. §3 アーキテクチャ + コスト試算 が ¥10,000 月予算枠内で持続可能か
> 2. §4.3 Writer の 3 媒体派生 で各媒体の精度が揃っているか
> 3. §4.4 Visualizer の準実験設計が実装可能か
> 4. §4.7 Hook Analyzer 初期 10 類型 が overlap なく独立か
> 5. §4.8 Optimizer のそもそも論 weekly レビュー が骨組み改善提案として機能するか
> 6. §5.1 承認必須 5 種 で十分なガードか (承認少なすぎ・多すぎ の bias)
> 7. §10 法務・規約ガード で抜けている規約や 2026 年現在の新規制
> 8. §11 クロスレビュー観点 27 件 の優先度ランキング
> 特に **「3 ヶ月運用してから後悔する箇所」** を予測して指摘してほしい。

#### v9.1 (508-521)

> note 章の追加に絞って:
> 1. 価格 × CVR テーブル (500/980/1480) の根拠妥当性
> 2. ティーザー境界設計の「無料軽量版」が note 販売 CVR を下げるリスク
> 3. マガジン 2-3 並走 (本流 + シリーズ + まとめ) が Phase 1 で過剰でないか

#### v9.2 (416-428)

> X / Instagram 章の追加に絞って:
> 1. X fmat の Phase 1 比率 (短文 60 / スレッド 30 / 長文 10) の妥当性
> 2. Hook 補強 3 類型 (11-13) が既存 10 と独立か
> 3. 1 日 5 投稿が ADHD/ASD ofmeton 継続性に過剰でないか

#### v10 (1,113-1,129)

> v9 + v9.1 + v9.2 を統合した完全版として:
> 1. 統合での節間整合性 (Writer Editor Optimizer の参照リンク健全性)
> 2. v8 → v10 で消失した要件が無いか
> 3. Phase 0 着手前の Foundation 5 項目 (Cloudflare / Supabase / X API / Anthropic / LINE) の不足

#### v10.1 (583-595)

> Phase 0 反映:
> 1. M-1〜M-14 が Phase 1 反映で漏れていないか
> 2. R-1〜R-15 後悔予測の優先度
> 3. non_engineer_rate Phase 別段階運用の必要性

#### v10.2 (540-551)

> Codex MCP cross-review 反映後:
> 1. CR-1〜CR-5 の反映漏れ
> 2. workload 表 (CR-3) の精度
> 3. OAuth PKCE 実機テスト 4 項目 (CR-4) の完備性

#### v10.3 (966-981)

> 全レビュー指摘オールクリア後:
> 1. 残置観点 7 件 (E-46〜E-52) の Phase 1 実証計画
> 2. v10.3 で Style Guide v1.3 確定、v1.4 で頻度復元後の整合性
> 3. 業法ガード新章 (§10.9) の Phase 1 対応工数

---

## 13. 付録 (補完: B-9 + C-12)

### 13.1 付録 A: v9 / v9.1 / v9.2 / v10 / v10.1 / v10.2 / v10.3 との関係 (v10 §A SSOT)

| 文書 | 役割 | 状態 |
|---|---|---|
| **本ドキュメント (統合版)** | new main 設計書、7 バージョン統合完全版 | 2026-05-27 確定 |
| v9 (1,177 行) | 全体設計の起源、PR #14 で main 入り | 履歴として残置 |
| v9.1 (539 行) | note 詳述、PR #15 で main 入り | 履歴として残置 |
| v9.2 (459 行) | X / IG 詳述、PR #16 で main 入り | 履歴として残置 |
| v10 (1,183 行) | v9 + v9.1 + v9.2 統合完全版 | 履歴として残置 |
| v10.1 (645 行) | Phase 0 反映、M-1〜M-14 / R-1〜R-15 | 履歴として残置 |
| v10.2 (586 行) | Codex CR-1〜CR-5 inline patch | 履歴として残置 |
| v10.3 (1,001 行) | 全レビュー指摘オールクリア (前 SSOT) | 履歴として残置 |

### 13.2 付録 B: 検証成果へのリンク (v10 §B SSOT)

- B-1 既存資産棚卸し: `outputs/improvements/x-account-design-v9-verification/B1-asset-inventory.md`
- B-2 X API フィールド: `outputs/improvements/x-account-design-v9-verification/B2-x-api-fields.md`
- B-3 MA 実コスト: `outputs/improvements/x-account-design-v9-verification/B3-ma-cost.md` + `B3-ma-cost-result.md`
- B-3 実装 script: `outputs/improvements/x-account-design-v9-verification/B3-ma-cost-script/`
- 競合調査 (X): 別 worktree `all-good-ops-jp-publishers` の `outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT.md`
- 競合調査 (note): `raw/facts/situations/2026-05-25-note-competitor-research.md`
- Anthropic Console billing 観測: `raw/facts/situations/2026-05-25-anthropic-console-billing-observation.md`
- Instagram 競合調査スキップ理由: `raw/facts/situations/2026-05-25-instagram-competitor-research-skip.md`
- v9 体制決定: `raw/facts/situations/2026-05-24-x-account-design-v9-restructure.md`
- v9 資産 disposition: `raw/facts/situations/2026-05-24-x-account-design-v9-asset-disposition.md`
- v9.0.1 review revisions: `raw/facts/situations/2026-05-24-x-account-design-v9-review-revisions.md`
- v9.0.2 final revisions: `raw/facts/situations/2026-05-24-x-account-design-v9-final-revisions.md`
- Style Guide / Competitor / Query 統合版: 同ディレクトリ `style-guide-all-versions.md` / `competitor-report-all-versions.md` / `query-design-all-versions.md`

### 13.3 付録 C: 各 v 改善候補 (v10 §C + v10.3 SSOT)

#### 13.3.1 競合調査の深掘り

- note 競合 5 作家を Firecrawl で再取得 (数値検証)
- Instagram 競合の active 観察 (Phase 1 中盤、ofmeton 自アカ実投稿開始後の自データ含め)
- メンバーシップ運営の上位 5 アカ調査
- ステマ規制 / 景表法に関する note 記事の競合分析

#### 13.3.2 実装着手前の検証

- Phase 0 ドライランで X API OAuth 2.0 PKCE 実機検証
- 集客導線 3 パターンの effect 差を A/B テスト計画
- ティーザー境界の「無料軽量版」設計の CVR 効果検証

#### 13.3.3 拡張機能 (Phase 2-3)

- Threads / Shorts ローンチ判定
- Videographer (Remotion + VOICEVOX) 実装
- メンバーシップ (note) 起ち上げ判定
- リール戦略の詳細化

#### 13.3.4 ブランド整備 (Phase 0 で確定)

- ofmeton ブランドカラー (4 色 + Sub-Accent)
- ofmeton ロゴ / アイコン
- Instagram bio + Linktree の文面
- ハッシュタグ戦略 (1 投稿 3-5 個 / 30 個など)

### 13.4 付録 D: 軽微な歴史記録 (C-1〜C-11、v9〜v10.X)

#### C-1 v8 → v9 主要変更点 (v9 §0.2)

- 4 媒体 (X/Threads/IG/Shorts) → 3 媒体 (X/IG/note) に集約
- ターゲット非エンジニア経営者確定 (元: 一般 AI ユーザー)
- B-1〜B-3 実測ベースでコスト試算更新 (¥7,370 → ¥6,153)
- MA 全部入り採用判断 (B-3 で月 ¥357 確認)
- dwell_time 削除 (B-2 で X API v2 に存在しない確認)
- 既存資産 (BSA / haguri / x-buzz-radar / ai-radar) 全撤廃
- Contextual Thompson Sampling 導入 (v8 ε-greedy から変更)
- 集客導線 3 パターン (A/B/C) を Optimizer 改善対象に
- §10 法務章新設

#### C-2 発信主体のプロファイル詳述 (v9 §1.1、§1.1 で要約済)

主要 stack: Python / Java / GAS / VBA / Claude Code + MCP。B-1〜B-3 試験で実測されたコスト詳細は付録 B 参照。

#### C-3 設計の根本原則 (v9 §2)

- **自動化レベル**: 「素材投入から投稿までを自動化、人間は承認のみ」
- **予算制約**: 月 ¥10,000 (ハードリミット)
- **マルチプラットフォーム展開**: 1 core idea → 3 媒体派生

#### C-4 技術スタック詳細 (v9 §3.2、§3.4 Deprecated 参照)

v8 から実測ベース更新: Cloudflare Workers Paid / Claude MA (beta) / Supabase Free / LINE Messaging API / OpenAI gpt-image-2 / Anthropic Haiku 4.5 + Sonnet 4.6 + Opus 4.7。

#### C-5 Managed Agents 一本化の判断 (v9 §3.4、§3.4 で要約済)

採用理由 / 採用判断 / リスクと対処 (4 リスク) 詳述は v9 §3.4 原文参照。

#### C-6 v9.1 §6-§10 詳細 (B-2 統合)

§6 マガジン構造 / §7 投稿時間最適化 / §8 SEO 整備 / §9 メンバーシップ移行設計 / §10 媒体連動詳細 → §6.4.6.5-§6.4.6.9 で統合済。

#### C-7 v10 §6 競合調査 50 項目 (Phase 0 実施)

§7.2 で統合 + competitor-report-all-versions.md に詳述。

#### C-8 v10 §7 Style Guide の段階運用 (承認制)

| 版 | 用途 | 主原料 | タイミング | 承認 |
|---|---|---|---|---|
| **v1 (初期)** | 投稿開始前 Foundation | 65 アカ分析 + Tier1 空白 + note 5 構成 + X fmat + IG 5 テンプレ | Phase 0 | 不要 (初期生成) |
| **v2 (中期)** | アカウント学習後 | 競合分析 + Optimizer ナレッジベース 3 ヶ月分 + 自アカ実績 | 3 ヶ月目 | 必要 |
| **v3 (長期)** | 安定運用後 | v2 + 半年分の自アカ実績 | 6 ヶ月目以降 | 必要 |

詳細は style-guide-all-versions.md 参照。

#### C-9 v10.3 §6.0 Phase 0 v2 致命的欠陥 + §6.1〜§6.6

§7.2.3 で統合 + competitor-report-all-versions.md に詳述。

#### C-10 v10.3 §10.9 業法ガード細目 (§10.9.1-§10.9.3)

§2.10 で統合済。Editor +5 ルール統合は §10.9.3 で実装。

#### C-11 各バージョンのヘッダー (タイトル + 経緯 + 構成原則)

§1 元バージョン進化年表で要約済。各 v ヘッダー原文は元 file 参照。

---

*End of consolidated document (完全版、補完 54 件完了 2026-05-27).*
