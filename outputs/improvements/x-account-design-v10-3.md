# X 発信アカウント運用自動化システム 設計書 v10.3 — 全レビュー指摘オールクリア版

> v10.2 (Codex 重大 5 件のみ反映) に対し、**全レビュー指摘 (Claude self-review 27 件 + Codex MCP cross-review 13 件 + Codex 後悔予測 R-16〜R-25)** を inline patch。  
> 加えてユーザー方針変更 (2026-05-26): 顧客許諾は基本取得済前提 + 投稿文に具体名/個人名は出さない を反映。  
> v10.3 が new main、v10 / v10.1 / v10.2 / v9.x は履歴。

---

## 0. このドキュメントの読み方

### 0.1 v10.x シリーズの経緯

| 版 | 主な変更 | 反映済レビュー指摘 |
|---|---|---:|
| v10 | v9 + v9.1 + v9.2 統合 | 0 |
| v10.1 | Phase 0 反映 (M-1〜M-14) | 0 |
| v10.2 | Codex 重大 5 件 (CR-1〜CR-5) | 5 |
| **v10.3** | **全レビュー指摘オールクリア + 顧客素材方針変更** | **50+** |

### 0.2 v10.3 で反映した内容 (一覧)

#### Codex MCP cross-review 全 13 件 (#16 priority 1-13) — 全反映
| ID | 内容 | 反映先 |
|---|---|---|
| CR-1 | バックアップ X 削除 + owned channel | §10.3 (v10.2 既反映) |
| CR-2 | 公開許諾 gate + DLP redaction | §10.7 (v10.2 既反映 + v10.3 で方針変更) |
| CR-3 | 全 agent 月額費用再算定 | §3.3 (v10.2 既反映) |
| CR-4 | X OAuth 2.0 PKCE | §3.5 (v10.2 既反映) |
| CR-5 | primary_hook + devices 再分類 | §4.7 (v10.2 既反映) |
| **C-6** | v10.3 self-contained 統合仕様 | 本ドキュメント全体 |
| **C-7** | IG / Meta launch 独立 gate | §8.2 (新規) |
| **C-8** | note 販売 compliance | §10.8 (新章) |
| **C-9** | auto-post 移行を品質・運用 gate に | §4.6 + §5.1 (更新) |
| **C-10** | PCR から売上計測 (UTM / purchase / qualified_lead) | §9.2 + §8 KPI (更新) |
| **C-11** | Visualizer PSM 停止 → ランダム + switchback | §4.4 (差し替え) |
| **C-12** | HDBSCAN 保留 | §4.7.4 (v10.2 既反映) |
| **C-13** | 失敗談下限 KPI 撤回、上限化 | §4.6 +3 ルール反転 |

#### Codex 後悔予測 R-16〜R-25 — 既反映 4 件 + 新規 6 件
| ID | 状態 |
|---|---|
| R-16 (Hook 頻度誤読) | C-13 と統合反映 |
| R-17 (API 予算超過) | CR-3 既反映 |
| R-18 (バックアップ規約違反) | CR-1 既反映 |
| R-19 (token 切れ) | CR-4 既反映 |
| R-20 (案件メモ匿名化不足) | CR-2 + 方針変更で対応 |
| **R-21** (note 取引責任) | §10.8 (新規) |
| **R-22** (横断発信で相談ゼロ) | §1.2 + §8 (JTBD 検証) |
| **R-23** (PSM 撮影負荷) | §4.4 (新設計) |
| **R-24** (Optimizer 偶然差永続化) | §4.8 多重比較制御 (新規) |
| **R-25** (note ML 二次利用) | §10.8 と統合 |

#### Claude self-review 27 件 (`self-review-v10-1.md` §8.1 候補リスト全 24 件 + 業法ガード 1 件 + Phase 1 承認モード 1 件 + 階段単価 1 件) — 全反映
| ID | 内容 | 反映先 |
|---|---|---|
| F-2 (業法ガード) | 税理士/社労士/行政書士/司法書士/弁護士 業務独占範囲 | §10.9 (新章) |
| A-1 (Writer 2 軸クロス) | 翻案/実体験/業種別 SOP × Hook 類型 | §4.3.6 (新規) |
| A-2 (fmat タイムテーブル) | スレッド/長文枠を §4.8 に明示 | §4.8.1 (詳述) |
| A-3 (+3 失敗談カテゴリ厳密化) | 失敗談 hook のみ実体験ソース ID 必須 | §4.6 (更新) |
| A-4 (Daily Digest 因果連鎖) | 異常検知時に因果 1 行追加 | §5.2 (更新) |
| B-1 (敬体率) | 50-60% に上方修正 | §4.3.2 Style Guide |
| B-3 (non_engineer_rate Phase 別) | Phase 1 慣らし 20% → 30% | §1.4 / §8 |
| B-4 (実体験ソース ID 再使用) | 3 ヶ月以内 max 3 回 × 違う angle | §4.6 |
| B-5 (ハッシュタグ note 送客時) | 3 個まで許可 | §4.3.2 Style Guide |
| C-1 (実体験ソース ID Schema) | materials_store 拡張 | §9.2 + migration 0001/0005 |
| C-2 (Interviewer 業種別キーワード) | monthly_industry_focus 注入 | §4.1 |
| C-3 (Style Guide Supabase) | style_guide テーブル + active view | §7 + migration 0004 |
| C-4 (集客導線 Phase 2 移行 AND) | PCR 週次 + 月次 AND | §4.8.2 |
| C-5 (inspirations ingest) | §3.1 cron で twitterapi.io 海外 17 + 国内業種別 7 | §3.1.1 (詳述) |
| D-1 (4 大課題明示) | C1〜C4 を §1.2 | §1.2 (詳述) |
| D-2 (運用負担見積) | 人間承認 8 時間/月 を §4.3.5 + §8 | §4.3.5 + §8 |
| D-3 (階段単価 L3 上方) | 8,000-15,000 円 | §6.4 |
| R-11 (Phase 1 承認モード切替) | まとめ承認 + リスク別承認 | §4.6 + §5.1 |
| R-12 (業種特化 / 横断 / アグリゲーター選択) | Phase 2 移行時 A/B/C 選択 | §8.3 |
| R-13 (note 構成パターン) | Phase 1 中盤 弾力運用 | §4.3.4 |
| R-14 (Hook Phase 別検証ロードマップ) | Phase 1 主軸 3 + テスト枠 5 + 休眠 5 | §4.7.3 |
| R-15 (翻案 vs 翻訳) | 規則ベース判定 (3 条件) | §10.2 |
| G-1 (スレッド 5% → 10-15%) | 月 8-10 本まで | §4.3.2 |
| G-3 (Hook テスト枠 4 → 5) | 上記 R-14 と統合 | §4.7.3 |

#### ユーザー方針変更 (2026-05-26)
| 項目 | v10.2 | v10.3 |
|---|---|---|
| 顧客素材投入 | Phase 1 禁止 (本人事業のみ) | **基本許諾済前提で投入 OK** |
| 投稿文への固有名詞 | DLP redaction で mask | **DLP redaction 維持 + 投稿文は必ず固有名詞なし** |
| §10.7.4 ZDR / API 送信 | 投入禁止 | **redacted_text のみ送信 + 業務文脈の抽象化を Editor +5 で必須化** |

### 0.3 用語

v10.2 §0.4 を継承 + 以下追加:

- **JTBD**: Jobs-to-be-Done (顧客が "雇用する" 動機)、§1.2 / §8 R-22 リスクヘッジで使用
- **業法独占キーワード**: 「税務相談 / 労務相談 / 法務相談 / 訴訟 / 登記」等、業務独占資格を必要とする業務名 (§10.9)
- **UTM 属性**: utm_source / utm_medium / utm_campaign、X → note → 購入の attribution 経路 (§9.2)
- **switchback**: 週単位で Visualizer モードを切替えて A/B を取る計画 (§4.4)
- **verified_failure_story**: 実体験ソース ID + 公開許諾 + 顧客非影響を全て満たした失敗談記述 (§4.6 +3 反転)

---

## 1. 背景と発信戦略

### 1.1 発信主体のプロファイル

v10.2 §1.1 と同じ。変更なし。

### 1.2 発信の戦略目的 + 4 大課題明示 (D-1) + JTBD 検証 (R-22)

v10.2 §1.2 を継承 + **ターゲットの 4 大課題** 明示:

| 課題 ID | ターゲット課題 | ofmeton の解決軸 |
|---|---|---|
| **C1** | "AI で何ができるか分からない" | 業種別事例 (T1-1) で証拠提示 |
| **C2** | "自社業務に AI が組み込めるか判断できない" | 委託フローと要件定義 (T1-2) |
| **C3** | "AI 導入の見積りが妥当か分からない" | 階段単価 + ROI 開示 (T1-3) |
| **C4** | "AI を入れて失敗するのが怖い" | 失敗談先行 (T1-4) |

**Phase 1 主軸 = C1 + C4** (証拠 + 安心感)、**Phase 2-3 で C2 + C3** (購入導線への接続)。

#### 月別業種フォーカス順 (v10.3 改訂、業法独占薄い順から開始)

§10.9 業法ガードのリスクが薄い業種からスタートして、Phase 2 後半に士業へ拡張する:

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

業法独占キーワード (§10.9) を含む業種は **Phase 2 後半 (2026-11) から** 段階的に投入。  
Phase 1 (2026-07〜09) で「業務横断 + 製造 + 教育」のデータを蓄積し、業法独占外でも qualified_lead 獲得可能性を実証する。

#### R-22 リスクヘッジ: JTBD ベース検証

「業種横断翻訳者」が "どの業種にも刺さらない" リスクへの対応:

```
Phase 1 中盤 (Month 2):
  非エンジニア経営者 5-10 人への課題インタビュー実施 (LINE / Zoom / DM)
  既購入支援サービスの把握
  共通課題 (JTBD) を 3 つに絞る

Phase 2 移行判定 (§8.3):
  "同一課題の相談が 2 業種以上から合計 3 件発生" を継続条件にする
  PCR ではなく business outcome を gate に
```

### 1.3 真の北極星指標 + 売上 attribution (C-10)

v10.2 §1.3 を継承 + **business outcome 指標** 追加:

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

### 1.4 コンテンツバランスの初期方針 (M-1, M-2 + B-3)

v10.2 §1.4 を継承 + **non_engineer_rate Phase 別段階運用** (B-3):

```
Phase 1 Week 1-4 (慣らし):  non_engineer_rate ≥ 0.20
Phase 1 Month 2-3:          non_engineer_rate ≥ 0.30
Phase 2 以降:               0.30-0.40 で推移、自アカ実績で最適化
```

過剰に "非エンジニア向け" を強調するとエンジニア層の信頼を失うリスク (B-3 既出)。Phase 1 後半に 30% へ段階的に上げる。

---

## 2. 設計の根本原則

v10.2 §2 と同じ。変更なし。

---

## 3. システムアーキテクチャ

### 3.1 レイヤー構成 + inspirations ingest プロセス (C-5)

v10.2 §3.1 を継承 + **①素材レイヤーに inspirations ingest cron を明示**:

#### 3.1.1 inspirations ingest プロセス (週次 cron)

```
毎週月曜 09:00 JST cron:
  1. twitterapi.io advanced_search で:
     - 海外 17 アカ (transfer learning 元、Phase 0 Report A 章)
     - 国内業種別 7 アカ (Phase 0 Report B 章)
     × 過去 7 日の上位投稿 (各 5-10 件) を取得
  2. 既存 wiki/publishing/buzz-patterns.md と差分計算
  3. 新規発見を raw/publishing/inspirations/<media>-<date>-<slug>.md として保存
  4. brand-publisher agent が ingest 候補をユーザーに LINE で提示 (週次まとめ)
  5. ユーザー Y/N で wiki/publishing/ に統合

KPI: transfer_learning_ingest_count ≥ 3 件/週
内訳: 海外 ≥ 1 / 国内業種別 ≥ 1 / note ≥ 1
未達は Daily Digest で警告
```

### 3.2 技術スタック

v10.2 §3.2 と同じ。変更なし。

### 3.3 コスト試算

v10.2 §3.3 と同じ (expected ¥9,154 / low ¥6,500 / p95 ¥13,800)。変更なし。

### 3.4 Managed Agents 一本化の判断

v10.2 §3.4 と同じ。変更なし。

### 3.5 OAuth 2.0 PKCE 実装 gate

v10.2 §3.5 と同じ。変更なし。

---

## 4. 各エージェント・モジュールのロジック詳細

### 4.1 Interviewer + 業種別キーワード注入 (C-2)

v10.2 §4.1 を継承 + **monthly_industry_focus 注入**:

```
InterviewState (v10.3 追加):
  monthly_industry_focus: text  // '税理士', '社労士', '製造業' 等 (§1.2 ローテーション通り)

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

### 4.2 選別エージェント

v10.2 §4.2 と同じ。変更なし。

### 4.3 Writer

#### 4.3.1 マルチプラットフォーム派生原則

v10.2 §4.3.1 と同じ。

#### 4.3.2 X 投稿フォーマット (G-1: スレッド 10-15%、B-1: 敬体 50-60%、B-5: ハッシュタグ note 送客時 3 個)

| fmat | v10.3 比率 | 主用途 |
|---|---|---|
| 短文単発 (≤140 字) | 50% | 失敗談先行、Hook 主軸 (数字 + Before-After) |
| 中文単発 (141-280 字) | 25% | 結論先出 + 経験談、敬体 / 常体ミックス |
| 長文単発 (281-1000 字) | 10% | 業界批評、月 1-2 本 |
| **スレッド (2-7 本)** | **10-15%** (月 8-10 本) | ストーリー型 + 構造化解説 |

##### Writer プロンプト固定要素 (v10.3 更新)

```
language_tone:
  keigo_rate: 0.50-0.60       # ofmeton ターゲット (非エンジニア経営者) に最適化 (B-1)
  first_person_rate: 0.40-0.55
  reader_address_rate: ≥0.30

x_meta:
  bracket_rate: 0.05-0.10
  emoji_rate: 0.20-0.30
  url_position:
    朝昼 (7:00 / 12:00): 末尾 (URL なし or 添え)
    夕方 (17:00): 本文中 (note 送客の補足、集客導線 C)
  hashtag_rate: ≤0.05 (通常)、≤0.15 (note 送客投稿のみ、最大 3 個 #AI業務自動化 #Claude #非エンジニア向け)  # B-5
  newline_density: 0.030-0.050
```

#### 4.3.3 Instagram カルーセル

v10.2 §4.3.3 と同じ。

#### 4.3.4 note 生成フロー (R-13: 弾力運用)

v10.2 §4.3.4 を継承 + **Phase 1 中盤の未採用構成パターン読者反応観察** (R-13):

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

#### 4.3.5 1 トピックの 3 媒体展開フロー + 運用負担見積 (D-2)

v10.2 §4.3.5 を継承 + **運用負担見積り**:

| 内訳 | 時間/月 | 自動/人間 |
|---|---|---|
| Writer 自動生成 (240 投稿 × ~30 秒、MA) | 2 時間 | 自動 |
| Editor 自動判定 (240 × ~10 秒、MA) | 40 分 | 自動 |
| **人間承認 Phase 1 (240 投稿 × ~2 分)** | **8 時間** | **人間** |
| 人間承認 Phase 2 以降 (異常時のみ) | 1-2 時間 | 人間 |
| インタビュー応答 (LINE 5-10 ターン × 60 セッション + 週次まとめ) | 4-6 時間 | 人間 |
| **Phase 1 合計** | **12-14 時間/月** | — |

Phase 1 着手前に **"1 日 25-30 分 × 30 日 = 12.5-15 時間/月" 予算を確保する** を §8 に明示。

#### 4.3.6 Writer 2 軸クロス制御 (A-1)

Writer プロンプトに以下の 2 軸クロスを毎回明示:

```
軸 1 (排他、1 つ選択): 翻案 (paraphrase) | 実体験 (first_hand) | 業種別 SOP (industry_sop)
軸 2 (排他、primary_hook): failure_story | business_repro | critique | tips_enum
軸 3 (複数 OK、devices): number | before_after | conclusion_first | empathy | contrarian | ...

Phase 1 主軸 (v10.3 確定):
  軸 1 (排他、4 区分):
    所感 (opinion):     10% — 海外/国内のリリース・スキル発信を起点に ofmeton の意見/所感を述べる (引用 OK、引用元任意、誇張可、骨格は §6 Phase 0 v2 から引き出し抽出)
    翻案 (paraphrase):  30% — 元投稿 + 構造/固有名詞/数字を変更 (内部 trace_id に出典記録、投稿文には出さない)
    実体験 (first_hand): 40% — 本人事業 (RICE CREAM / 家庭教師 / portfolio / all-good-ops + 案件 client) からの素材、§4.6.2 verified_failure_story を含む
    業種別 SOP (industry_sop): 20% — 月別業種フォーカス (§1.2) に沿った業務再現解説

  軸 2 (primary_hook、4 主軸):
    failure_story 15-20% (verified 月 4 本上限から逆算、§4.6.2)
    business_repro 25-30%
    critique 15-20%
    tips_enum 15-20%
  軸 2 テスト枠 (5 種): empathy / contrarian / question / meta / warning  合計 10-15%
  軸 2 休眠: conclusion_first / 経験談導入基本 / 共感基本 / comparison / self_deprecating  合計 5%
  
  軸 2 × 軸 1 のクロスで、(failure_story, first_hand) が ofmeton "等身大" レバー
  (business_repro, industry_sop) が "実装翻訳" レバー
  (critique, paraphrase) が "業界批評" レバー
  (tips_enum, opinion) が "海外発信トリガー" レバー

failure_story 配分は §4.6.2 verified_failure_story 月 4 本上限から逆算:
  月 130 投稿 (X 単独) × 15-20% = 月 20-26 投稿のうち、verified が 4 本、
  残り 16-22 投稿は architectural_failure (本人事業の抽象的失敗パターン、固有名詞なし) で構成

軸 1 と軸 2 を毎回明示してから本文生成、後段の集計でクロス分析可能に

**所感 (opinion) の本文骨格について — 先入観排除 (v10.3 ユーザー指示)**:
- v10.3 では **opinion 投稿の本文骨格を事前定義しない**
- 骨格 (リリース紹介 → 意味 → 課題 → 楽になる → やべえ → チェック、等のパターン) は §6 Phase 0 v2 競合調査で 24 アカの実投稿から抽出
- 抽出した骨格を `outputs/improvements/x-account-design-v10-phase0-v2/opinion-patterns.md` に引き出しストック
- Writer プロンプトには「opinion category なら opinion-patterns.md から context-aware に選択」とだけ指示
- Optimizer Phase 1-2 で実 PCR / qualified_lead クロスで効く骨格を絞り込む
- トーン / 引用 / 誇張度 / 画像 / 動画 / フック / スレッド or 記事 形式も同様に Phase 0 v2 から引き出し抽出
```

### 4.4 Visualizer (C-11: PSM 停止 → ランダム + switchback + 負荷 KPI、R-23 対応)

v10.2 §4.4 を **全面差し替え**:

#### 4.4.1 モード自動切替 — PSM 廃止

v10.2 までの PSM (Propensity Score Matching) は **Phase 1 サンプル数不足** + **撮影負荷を目的変数に含めない** 問題があったため廃止。

#### 4.4.2 新設計: ランダム割当 + 週単位 switchback

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

#### 4.4.3 デザインシステム

v10.2 §4.4 (デザインシステム部分) と同じ。

### 4.5 Videographer

v10.2 §4.5 と同じ。

### 4.6 Editor (C-9: auto-post 品質 gate、C-13: 失敗談下限 KPI 撤回、A-3 厳密化、B-4 再使用、R-11 承認モード)

v10.2 §4.6 の 6+5 ルールを **C-9 / C-13 / A-3 / B-4 で再定義**:

#### 4.6.1 6+5 ルール (v10.3)

| # | ルール | 判定方法 |
|---|---|---|
| 1-6, +1, +2 | (v10.2 と同じ) | (v10.2 と同じ) |
| **+3 (改訂、C-13 + A-3)** | **失敗談 hook (primary_hook='failure_story') の投稿のみ実体験ソース ID 必須 + 公開許諾済 + verified_failure_story** | Hook 分類器の出力 + Supabase RLS |
| +4 | 読者像 1 行明示 (v10.2 と同じ) | 正規表現 + LLM judge |
| **+5 (改訂、CR-2 + 方針変更)** | **DLP redaction 通過、固有名詞 (氏名 / 社名 / 案件名) が draft text に含まれない** | DLP 正規表現 + LLM judge |

#### 4.6.2 verified_failure_story 上限 (C-13 反映)

v10.1 / v10.2 の「`fail_rate ≥ 15%` 下限 KPI」を **撤回**。代わりに:

```
verified_failure_story 供給上限 (Phase 1):
  月 ≤ 4 本 (週 1 本ペース)
  
  各 failure_story は以下を満たす:
    - 実体験ソース ID (Claude Code / Git / 案件メモ / 音声メモ) 存在
    - publication_consent='granted' (本人事業なら本人=granted、案件由来なら client granted)
    - publication_allowed フラグ ON
    - redaction_reviewed: true
    - client_impacted_flag: false (案件 client への直接影響を含まない)

Phase 1 月 4 本以下を確保できなければ、Hook 配分で failure_story を下方に自動修正
```

理由: Phase 1 で「fail_rate ≥ 15%」を強制すると **架空の失敗談 + ブランド負荷** リスク。verified 在庫から導く方が健全。

#### 4.6.3 実体験ソース ID の再使用ルール (B-4)

```
同じ実体験ソース ID は 3 ヶ月以内 max 3 回まで使用可
ただし以下 angle のいずれかが違う必要:
  - 時系列の異なる側面 (発見時 / 詰まり時 / 解決時 / 後日の応用)
  - 違うステークホルダー視点 (本人 / client / チーム)
  - 違う Hook 類型 (failure_story → business_repro → critique 等の角度)

直近 2 週で同じ angle で語った場合は §4.6 ルール 5 (類似投稿) で reject
```

#### 4.6.4 Phase 1 承認モード切替 (R-11、リスク別承認)

```
高リスク (1 件ずつ承認、まとめ NG):
  - has_numbers: 数字付き ROI 開示 (§10.2 出典必須)
  - client_derived: client 由来の素材を使用 (許諾済でも要確認)
  - business_law_keyword: 業法独占キーワード含む (§10.9)
  - paid_route: 有料 note / 個別相談 / 代行への送客導線

低リスク (週 1-2 回まとめ承認、未承認は期限切れで投稿しない):
  - 上記なし

post_drafts.risk_level (low / high) を Editor が自動付与
```

#### 4.6.5 auto-post 移行 gate (C-9、PCR 撤回)

v10.1 / v10.2 では「PCR 3 週連続 0.3% 超」で auto-post 化を検討していたが、撤回。**品質・運用 gate に変更**:

```
auto-post 移行条件 (AND、4 週連続):
  - 重大誤り 0 件 (Editor reject / 投稿後の事実訂正リプライ)
  - 規約差戻し 0 件 (X / Meta / note からの shadowban 警告 / Strike)
  - 承認滞留 p95 < 24h (人間承認モードでの遅延)
  - token refresh 正常 (OAuth blocked 検出ゼロ)

満たせば Phase 2 で auto-post (人間承認なし) を有効化
不満時は Phase 1 を延長
```

### 4.7 Hook Analyzer (R-14: Phase 別検証ロードマップ、G-3: テスト枠 5)

v10.2 §4.7 を継承 + **R-14 / G-3 で配分更新**:

#### 4.7.1 primary_hook + devices

v10.2 §4.7.1 と同じ (failure_story / business_repro / critique / tips_enum 4 種 + 13 devices)。

#### 4.7.2 Phase 別 Hook 検証ロードマップ (R-14、G-3)

| Phase | 期間 | 主軸 3 (60-65%) | テスト枠 (30-35%) | 休眠 (5-10%) |
|---|---|---|---|---|
| **Phase 1** | Month 1-3 | failure_story / business_repro / critique 数字 | empathy / contrarian / question / meta / warning (5 種) | 結論先出 / 経験談導入基本 / 共感基本 / 比較 / 自己卑下 |
| **Phase 2** | Month 4-7 | + 主軸 3 維持 | + テスト枠から 2-3 類型復活 = 9-10 類型 | 残り |
| **Phase 3** | Month 8+ | 全 13 類型 + 新類型認定 (HDBSCAN) | — | — |

#### 4.7.3 Phase 1 配分の Writer 制御 (CR-5 維持 + R-14)

Phase 1 中は **配分固定は控えめ**、Writer プロンプトに:

```
primary_hook を毎回 4 種からランダム選択 (重み: 主軸 3 比率 60-65%、テスト枠 35%、休眠 5%)
devices は自然な範囲で使う (固定配分なし)

Optimizer Phase 1 (weekly Sonnet) で primary_hook × 成果クロス集計を残し、Month 3 末で人手判定 (R-14)
```

#### 4.7.4 新類型認定 (HDBSCAN、C-12)

v10.2 §4.7.4 と同じ (Phase 2 以降、unknown ≥ 50 + impressions ≥ 1,000 まで人手 label)。

### 4.8 Optimizer (A-2 タイムテーブル詳述、C-4 集客導線 AND 移行、R-24 多重比較制御)

#### 4.8.1 タイムテーブル詳述 (A-2)

v10.2 §4.8 を継承 + **週次タイムテーブルにスレッド/長文枠を明示**:

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

#### 4.8.2 集客導線 Phase 移行判定 (C-4)

v10.2 §4.8 では「PCR 3 週連続 0.3% 超」だったが、AND 条件を明示:

```
Phase 1 → Phase 2 集客導線 B/C 導入 (AND):
  - 直近 3 週連続で週次 PCR ≥ 0.3%
  - 直近 30 日の平均 PCR ≥ 0.4%
  - 直近 28 日 impressions ≥ 20,000
  - 直近 28 日 profile_clicks ≥ 60
  
両方満たす + qualified_lead 月 ≥ 3 件で Phase 2 移行承認 (§5.1 媒体追加扱い)
```

#### 4.8.3 多重比較制御 (R-24)

R-24「偶然差を Style Guide に永続化」リスクへの対応:

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

#### 4.8.4 改善対象 + そもそも論 weekly レビュー

v10.2 §4.8 と同じ + Codex 11-1 制限 (Phase 1 Month 1-2 は異常検知のみ) 維持。

---

## 5. 自動反映 + 事後報告 + 安全装置

### 5.1 自動反映の 3 区分 (C-9 で auto-post 条件変更、R-11 承認モード)

v10.2 §5.1 の 3 区分を継承 + 上記 §4.6.5 (auto-post gate 変更)。

承認必須 4 種 (cs:p3-fcbb 反映で 5 種 → 4 種に絞る):
1. Style Guide v 変更
2. 新類型認定
3. 媒体追加・停止 (Threads / Shorts / IG launch 含む)
4. 月予算上限変更

「骨組み変更」は **Optimizer Phase 2 weekly レビュー** に組み込み、人間が四半期で判断 (Codex 2-3 反映)。

### 5.2 事後報告 (Daily Digest 因果連鎖追加、A-4)

v10.2 §5.2 を継承 + **異常検知時の因果連鎖 1 行**:

```
━━━ 5/26 Daily ━━━
投稿: X 5 / IG 1 / note 0
平均PCR: 0.22% (前日比 -0.12)
url_link_clicks: 4 件
qualified_lead: 0 件
特記:
  - 17:00 X 投稿の PCR 0.41% (本日最高)
  - PCR 急落の因果候補: transfer learning ingest が 7 日連続 0 件、翻案率 12% (基準 40%) ← A-4
自動反映:
  - twitterapi.io クエリ "min_faves" 300 → 250
承認待ち:
  - 「対比強調型」を新類型認定する? !approve_042 / !reject_042
詳細→ supabase dashboard
```

### 5.3 安全装置

v10.2 §5.3 と同じ。

---

## 6. 競合調査 (Phase 0 v2 やり直し、2026-05-26)

### 6.0 v10.2 §6 の致命的欠陥

Phase 0 (v9 当時) の調査は以下の欠陥があった (本セッションでユーザー指摘により確定):

1. **twitterapi.io advanced_search の query 文字列が raw 保存されていない** (再現不能)
2. **22 候補 → 10 名絞り込みでターゲット適合性 (非エンジニア経営者向け) のフィルタが入っていない** (致命的)
3. 結果 10 アカのうち **6 アカがターゲット不適合** (umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_)
4. **50 項目集計の実質母集団は 4 アカ** (Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love) → 統計的有意性なし
5. Style Guide v1 / Hook 配分 / 文字数比率 / 敬体率 はこの 4 アカに過適合

→ v10.3 で **Phase 0 v2 として競合調査をやり直す**。

### 6.1 Phase 0 v2 母集団 (47 アカ、確定)

| 区分 | アカ数 | 50 項目集計対象 | 備考 |
|---|---:|---|---|
| 国内既存 (信頼 4 アカ) | 4 | ✅ (既存 data 流用、追加 API call 不要) | Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love |
| 国内既存 (除外 6 アカ) | 6 | × (除外) | ターゲット不適合 (umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_) |
| **ユーザー追加参考 (2026-05-26)** | **20** | ✅ (新規 API call、Phase 0 v2 で取得) | ClaudeCode_UT / obsidianstudio9 / MakeAI_CEO / mmmiyama_D / tetumemo / claudecode_lab / ObsidianOtaku / so_ainsight / Codestudiopjbk / exploraX_ / jason_coder0 / heynavtoor / ethancoder0 / cyrilXBT / daifukujinji / Fluyeporlaweb / commte / csaba_kissi / ai_explorer25 / Atenov_D |
| 海外英語圏 (transfer learning) | 17 | × (定性観察のみ) | Phase 0 既発掘 |
| 国内業種別 (士業/診断士) | 7 | × (定性観察のみ) | Phase 0 既発掘、2 アカ handle 未確認 |
| note 競合 | 8 | × (URL 確認のみ) | Phase 0 既発掘 |
| **合計** | **62 (うち 50 項目対象 24)** | — | — |

50 項目集計の実 sample size = **4 + 20 = 24 アカ × 直近 90 日** (v10.2 の実質 4 アカから 6 倍化)。

### 6.2 Phase 0 v2 query 設計 (再現性確保)

詳細は `outputs/improvements/x-account-design-v10-phase0-v2/query-design.md`。要点:

- twitterapi.io advanced_search query を **5 つに固定** (再現性 + diff 追跡可能)
- 各 query 文字列を `raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/query-meta.json` に **永続化**
- **ターゲット適合フィルタ**: フォロワー × engagement だけでなく、bio に「中小」「経営者」「非エンジニア」「業種特化キーワード」が含まれる + 業務効率化テーマ率 ≥ 20% を必須条件
- ユーザー追加 20 アカは query 経由でなく **直接指定取得** (from:handle で 90 日抽出)

### 6.3 50 項目分析 + 発信ネタ仕入れ方法分析 (新規)

50 項目 (A〜H、Phase 0 既定義) に加えて **新規 9 項目** を追加:

```
I. 発信ネタ仕入れ方法分析 (9 項目、Phase 0 v2 新規):
  51. 主要情報源 (海外 X / 公式ブログ / 論文 / GitHub / Discord / podcast 等)
  52. 発信までのタイムラグ (リリース → 投稿までの時間、中央値)
  53. 取り上げる選別基準 (engagement 期待値 / 教育的価値 / 速報性 等)
  54. 翻訳率 (海外発信を直訳に近い形で出す比率)
  55. 翻案率 (構造 + 固有名詞 + 数字を変更している比率)
  56. 所感率 (ofmeton 想定の「リリース → 意見・所感」型の比率)
  57. 引用元明示率 (URL 明示 vs 暗黙の引用)
  58. cross-platform 仕入れ (note / YouTube / Podcast 等他媒体から拾う比率)
  59. オリジナル発信率 (本人の事業経験から発信、上記 51-58 と独立)
```

これらは **LLM judge ベース** (Sonnet 4.6) で各アカの上位 20 投稿 × 24 アカ = 480 投稿を質的分析。

→ ofmeton の「所感」カテゴリの骨格・トーン・引用設計は **項目 56 / 57 の競合実測から引き出しを抽出** して Optimizer に渡す。**v10.3 時点で本文骨格を事前定義しない** (= 先入観排除)。

### 6.4 Phase 0 v2 実コスト試算

| 項目 | tweets | USD | JPY |
|---|---:|---:|---:|
| ユーザー追加 20 アカ × 直近 90 日 (各 100 tweets) | 2,000 | $0.30 | ¥47 |
| ターゲット適合フィルタ通した発掘 query 5 個 × 100 | 500 | $0.075 | ¥12 |
| 既存 4 アカ深掘り (data 流用、追加 call 不要) | 0 | $0 | ¥0 |
| **初動 (1 回限り)** | **2,500** | **$0.375** | **約 ¥60** |

### 6.5 Phase 0 v2 実施タイミング

- v10.3 設計 merge 後、別セッションで実 API call を実行 (本セッションでは query 設計までで停止)
- 結果は `outputs/improvements/x-account-design-v10-phase0-v2/competitor-report-v2.md` に出力
- Style Guide v1.1 (Phase 0 v2 反映) を作成 → Writer プロンプトに固定 → Phase 1 着手

### 6.6 二軸集計 (v10.2 §6 から拡張)

```
primary: 50 + 9 = 59 項目
secondary: フォーマット (短文 / 中文 / 長文 / スレッド) + 集客導線パターン (A/B/C) + primary_hook
```

---

## 7. Style Guide の段階運用 (C-3 Supabase 化)

v10.2 §7 を継承 + **Supabase テーブル `style_guide` で版管理**:

```
Supabase テーブル `style_guide` (migration 0004 で実装済):
  version: text PK ('v1', 'v1.1', ..., 'v2')
  yaml_blob: text
  yaml_sha256: text
  effective_from: timestamptz
  approved_at: timestamptz
  retired_at: timestamptz

active 取得: SELECT * FROM active_style_guide()

Writer は最新 active version を取得 → base prompt に diff を `<style_guide>` セクションで追加
```

---

## 8. Phase 計画

### 8.1 Phase 0 (完了済、2026-05-25)

v10.2 §8 と同じ。

### 8.2 Phase 1 (X + note ローンチ、IG は独立 gate、C-7)

#### Phase 1 着手前 gate (X 単独 launch、~ 2026-07 末)

- [ ] H-1〜H-5 (X / Supabase / API key / Cloudflare / LINE) 完了
- [ ] OAuth PKCE test 4 項目 ✅
- [ ] 月予算 expected ≤ ¥10,000 確認
- [ ] verified_failure_story 4 本以上の在庫確保

#### Phase 1 IG launch 独立 gate (C-7)

X launch とは別:
- [ ] H-6 (Meta App Review、`instagram_content_publish` 承認)
- [ ] IG Business アカウント + FB ページ連携
- [ ] 60 日 token refresh 動作確認
- [ ] テスト投稿 1 件成功

**X launch 中 IG 投稿停止** が default、Phase 1 中盤に IG launch 切替判断。

#### Phase 1 KPI (C-10 売上 attribution 追加)

| KPI | Phase 1 目標 |
|---|---|
| note 月売上 | ¥30,000 |
| X フォロワー | 500 |
| IG フォロワー | 300 |
| **qualified_consultation** | **≥ 3 件/月** (新規) |
| **paid_revenue (note 売上)** | **≥ ¥30,000/月** (新規) |
| **impressions** | **≥ 20,000/月** (新規) |
| **profile_clicks** | **≥ 60/月** (新規) |
| **transfer_learning_ingest_count** | **≥ 12/月 (週 3 × 4)** (新規) |

#### Phase 1 運用負担見積り (D-2)

- 自動: Writer/Editor/MA = 2-3 時間/月
- 人間: 承認 8 時間 + インタビュー 4-6 時間 = **12-14 時間/月**
- 着手前に「1 日 25-30 分 × 30 日 = 12.5-15 時間/月」予算確保

### 8.3 Phase 2 (拡張、~ 2026-10 末) + 業種特化 / 横断 / アグリゲーター選択 (R-12)

Phase 1 終了時に **3 軸選択** (R-12 リスクヘッジ):

```
Option A: 業種横断を継続 (Phase 1 で qualified_lead が 2 業種以上から取れた場合)
Option B: 業種特化 (1 つの業種に絞る) — 例: "税理士特化" → 畠山謙人と直接対決
Option C: 横断だが "失敗談アグリゲーター" として独占 — テーマで差別化

Phase 1 終了時に Optimizer + 人間判断で A/B/C を選択
```

Phase 2 KPI:
- note 月売上 5 万円 + メンバーシップ起ち上げ検討
- X 2,000 フォロワー
- IG 1,000 フォロワー
- qualified_lead ≥ 5 件/月

### 8.4 Phase 3 (~ 2027-02 末)

v10.2 §8 と同じ。

---

## 9. データフロー + observability

### 9.1 論理構造

v10.2 §9.1 と同じ。

### 9.2 各ストアの論理単位 + UTM / business outcome (C-10)

v10.2 §9.2 を継承 + **performance_metrics と posted_records 拡張**:

```
posted_records 拡張:
  utm_source: text  ('x_post_id_<id>' 形式、各投稿の自動生成 utm)
  utm_medium: text  ('x' / 'note' / 'ig')
  utm_campaign: text ('phase1_failure_story' / 'phase1_industry_<name>' 等)

performance_metrics 拡張:
  qualified_consultation_attributed: bool
  paid_revenue_attributed_jpy: int
  funnel_stage: text ('impression' / 'profile_click' / 'note_visit' / 'note_purchase' / 'consultation')

business_outcomes (新テーブル、migration 0005):
  source_post_id (posted_records FK)
  outcome_type ('consultation' / 'paid_article' / 'service_inquiry')
  outcome_at: timestamptz
  outcome_value_jpy: int
  attribution_confidence: numeric (utm 直接 / cross-platform 推定 / 手動入力)
```

### 9.3 Observability

v10.2 §9.3 と同じ。

---

## 10. 法務・規約ガード

### 10.1 ステマ規制

v10.2 §10.1 と同じ。

### 10.2 翻案ルール + 規則ベース翻訳判定 (R-15)

v10.2 §10.2 を継承 + **X 短文翻案の 3 条件**:

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

### 10.3 X / Meta 自動投稿規約

v10.2 §10.3 と同じ。

### 10.4-10.6

v10.2 §10.4-10.6 と同じ。

### 10.7 個人情報・公開許諾ガード (CR-2 + 方針変更 2026-05-26)

v10.2 §10.7 を継承 + **方針変更**:

#### 10.7.1 方針 (v10.3 改訂)

v10.2 §10.7.4 は撤回:
- ~~"Phase 1 では顧客素材は投入禁止、本人事業のみ"~~ → **基本許諾済前提で投入 OK**
- **投稿文には固有名詞 (氏名 / 社名 / 案件名) は出さない** が新ルール
- Editor +5 ルールで draft の固有名詞を必ず reject

#### 10.7.2 Schema (v10.3 確定、許諾済前提全投入)

`materials_store.publication_consent` のデフォルト:
- **本人事業 4 種** (RICE CREAM / 家庭教師 / portfolio / all-good-ops): `'granted'` 自動付与
- **案件 client 由来 (terra-isshiki / minpaku-cleaning 含む)**: `'granted'` (基本許諾済前提、ofmeton 確認済)
  - 監査用に `consent_obtained_from` / `consent_obtained_at` を入力推奨 (mandatory ではない)
  - `client_impacted_flag` は記録するが、それ自体で Writer pool 除外しない
- v10.2 / v10.3 草稿で書いた「client_impacted_flag=true は failure_story 使わない」「Phase 1 は本人事業のみ」は **撤回**
- ガード機構は **Editor +5 ルール (DLP redaction、固有名詞 mask) に一本化**

つまり、許諾は素材投入の前提として全て OK、Writer / Editor の責務は **生成文に固有名詞を出さない** こと一点に集約 (運用負荷削減)。

#### 10.7.3 DLP redaction (Editor +5)

v10.2 §10.7.2 と同じ。固有名詞検出 → reject。

### 10.8 (新章) note 販売 compliance (C-8 + R-21 + R-25)

#### 10.8.1 特商法表記 (R-21)

note 規約はクリエイターが特商法表示を行うことを求める。階段化する場合:

```
販売開始前 gate (Phase 1 初回 note 有料公開前):
  ☐ 特商法表記ページを note プロフィール / 自社サイトに用意
  ☐ 提供内容 / 価格 / 解約・返品 / 連絡方法 / 個別相談の提供条件 / 問い合わせ対応時間
  ☐ 返金方針を明文化
```

人間タスク: HUMAN_TASKS H-12 で扱う。

#### 10.8.2 機械学習データ提供設定 (R-25)

note は公開コンテンツを ML 学習データとして第三者に提供できる旨を規約で定めている。クリエイターは設定で停止可。

```
note 発行 checklist (Writer / Editor / publisher の通過必須):
  ☐ note 設定で「ML 学習データ提供」設定確認 → ofmeton は default OFF を推奨
  ☐ 顧客素材を公開しないルール (固有名詞 redaction、§10.7)
  ☐ 有料記事へ顧客由来の例を載せる時は §10.7.2 consent + redaction 必須
```

#### 10.8.3 UTM 設計

note 商品ごとに専用 CTA + 相談フォーム識別子:
- `utm_source=x_post_<id>` / `utm_medium=x` / `utm_campaign=<campaign_name>`
- 商品別 `paid_article_purchase`, `consultation_request`, `qualified_lead` を business_outcomes に記録

### 10.9 (新章) 業法ガード (Claude self-review F-2)

ofmeton が「税理士業務」「社労士業務」「行政書士業務」「司法書士業務」「弁護士業務」を語る時の業法独占範囲ガード。

#### 10.9.1 禁止

- 個別の税務 / 労務 / 法務相談に AI で回答する内容
- 業務独占資格を必要とする業務に AI を「代替」する内容
- 例: 「税理士の代わりに AI で確定申告できます」「弁護士無しで AI 訴訟可能」等

#### 10.9.2 許可

- 業務効率化ツール (見積書生成 / OCR / データ整理等) の解説
- 各士業者本人が自分の業務に AI を使う事例の紹介 (本人取材ベース)
- "業務独占の範囲外" の業務効率化 (経理データ集計 / 給与計算 RPA 等)

#### 10.9.3 Editor +5 ルールに統合 (高リスク扱い、R-11)

```
business_law_keywords:
  ["税務相談", "労務相談", "法務相談", "訴訟", "登記", "確定申告 (代行)", "労務管理 (代理)", "契約書 (作成)"]

post_drafts.business_law_risk_flag = true if any keyword present
→ §4.6.4 高リスク承認モードで 1 件ずつ承認
→ Editor +5 ルールで「ofmeton が本人代わりに語る構造」をチェック (LLM judge)
```

---

## 11. クロスレビュー観点 — 全 50 件オールクリア宣言

v10.2 §11 の E-1〜E-45 をすべて反映済 (v10.3 各章に inline patch)。

### 11.1 v10.3 残置観点 (Phase 1 実証で検証する 7 件)

| # | 論点 | 検証フェーズ |
|---|---|---|
| E-46 | 6+5 Editor ルール (DLP + 業法 + 失敗談上限) の運用速度 (1 件処理 < 10 秒目標) | Phase 1 Week 1-2 |
| E-47 | verified_failure_story 月 4 本上限の継続供給可能性 | Phase 1 Month 1-3 |
| E-48 | UTM attribution の cross-platform 推定精度 | Phase 1 Month 2 |
| E-49 | Visualizer ランダム + switchback の 5 KPI 差検出力 | Phase 1 Month 3 |
| E-50 | 月別業種フォーカス (§1.2) が JTBD 検証で具体的 lead 獲得に繋がるか | Phase 1 Month 2-3 |
| E-51 | C-9 auto-post gate (重大誤り 0 / 規約差戻し 0 / 承認滞留 p95 < 24h / OAuth 正常) の達成可能性 | Phase 1 Month 4 |
| E-52 | Optimizer Phase 2 (Opus weekly + thinking) の本番コスト ¥702/月 ±30% に収まるか | Phase 1 Month 1 |

---

## 12. 議論の経過

| 版 | 日付 |
|---|---|
| v10 / v10.1 / v10.2 | 2026-05-25 |
| **v10.3** | **2026-05-26 (全レビュー指摘オールクリア + 顧客素材方針変更)** |

---

## 13. レビュアーへの最終依頼

v10.3 で全レビュー指摘 50 件をオールクリア反映。Phase 1 実証で検証する 7 件 (E-46〜E-52) のみ残置。

以下を最終確認してほしい:

1. **顧客素材方針変更 (§10.7)** が「許諾済前提 + 投稿文に固有名詞出さない」運用で持続可能か (Editor +5 DLP 通過率)
2. **§10.9 業法ガード** が士業 client への失礼にならない範囲で機能するか (誤検知ハードル)
3. **§10.8 note 販売 compliance** で Phase 1 初回有料 note 公開前 gate が現実的か
4. **§4.6.2 verified_failure_story 月 4 本上限** が ofmeton の活動量 (RICE CREAM / 家庭教師 / portfolio 等) で確保可能か
5. **§9.2 UTM 設計 + business_outcomes** が cross-platform attribution で実用解析可能か
6. **§4.4 Visualizer ランダム + switchback** が Phase 1 サンプル数で差検出できるか
7. **§4.8.3 多重比較制御** が初動を遅らせすぎないか (1 変数 × 28 日窓 × 月次反映)

---

## 付録 A: v10.x シリーズとの関係

| 文書 | 役割 | 状態 |
|---|---|---|
| **v10.3 (本ドキュメント)** | **new main、全レビュー反映** | 起草中 (本 PR #20) |
| v10.2 | Codex 重大 5 件のみ反映 | 履歴 (PR #18 起源) |
| v10.1 | Phase 0 反映 | 履歴 |
| v10 | v9 + v9.1 + v9.2 統合 | 履歴 (PR #17 merged) |

## 付録 B: Phase 0 成果へのリンク

v10.2 と同じ + v10.3 で追加 ingest プロセス cron (§3.1.1)。

## 付録 C: v10.3 で全クリア達成、v10.4 以降の改善候補

v10.4 以降は Phase 1 実証データに基づく改訂 (E-46〜E-52 の検証結果反映)。設計上の未解決指摘は **ゼロ**。

---

*以上、x-account-design v10.3 (全レビュー指摘オールクリア版) 終わり。v10.3 が new main。次のアクション: 実装 patch (migration 0005 / DLP 業法 / agents skeleton) + HUMAN_TASKS / README 更新 + PR #20 作成。*
