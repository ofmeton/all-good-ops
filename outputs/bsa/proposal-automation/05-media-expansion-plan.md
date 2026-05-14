# BSA-PA 媒体拡大 Plan

作成日: 2026-05-10 / 状態: ドラフト（人間承認待ち）

## 背景

- BSA Day 19/112、投下 20件 / 累計目安 80件 → **25% 達成（-75% ビハインド）**
- declined 94件のうち 93件は generator が正しく辞退（範囲外案件）
- 真因は **collected 母集団の規模不足**：9 URL × 17件 ≒ 150件/週が物理上限
- LAN/CW の標準スタック適合率が低く、母集団拡大が必須

## 今すぐ実施済（このセッション）

| 媒体 | 追加 URL | 期待効果 |
|---|---|---|
| LAN | `web/cms` | headless CMS / microCMS 構築案件 — BSA 標準スタックに直結 |
| LAN | `web/ec` | Shopify 等 EC 系 — 副業実績活用余地あり |
| CW | `category/7` | CMS 導入 — headless CMS マッチ |
| CW | `category/87` | モバイルサイト・スマホサイト制作 — LP/HP マッチ |
| CW | `category/304` | オウンドメディア制作 — HP の派生 |

→ 9 URL → **14 URL（+55%）**。1巡あたり +50% の母集団増を見込む。

## このプランで扱う追加検討

### Phase A: 新規媒体「Coconala 公開依頼」追加（**最有力**）

#### 調査結果（このセッションで判明）

- 公開依頼の Web 制作グループ全体で **33,720 件**（CW 14 の 18倍規模）
- カテゴリ別 URL 構造: `https://coconala.com/requests/categories/<id>`
- BSA fit の高い主要カテゴリ:

| ID | 名称 | BSA fit |
|---|---|---|
| 500 | ホームページ作成・サイト制作 | ◎ HP 直結 |
| 503 | LP作成・ランディングページデザイン | ◎ LP 直結 |
| 644 | Webサイト修正・カスタマイズ | ◎ L4 直結 |
| 501 | Webサイトデザイン | ○ |
| 507 | ECサイト制作・ネットショップ構築 | △ |
| 502 | HTML・CSSコーディング | △ |

#### 実装スコープ

1. `src/collector/adapters/coconala.py` — base.py 実装。500/503/644 の3カテゴリを巡回（半日）
2. `scripts/lib/_coconala_form_fill.py` — 提案フォームの自動入力。**Coconala は出品起点の提案モデル**なのでフォーム構造を要調査（半日）
3. `platforms` テーブルに `prefix='CN'` を INSERT
4. cookies 管理: `~/Library/Application Support/bsa-pa/cn-cookies.json`
5. dashboard ProposalEditor の `isCW` 判定を 3way (LAN/CW/CN) に拡張（1時間）
6. テスト fixture（HTML スナップショット）追加

→ 実装合計 **1.5-2日**

#### 注意点

- Coconala は出品ベースのプラットフォーム。出品が無いと公開依頼に提案できない仕様の可能性 → **adapter 実装前に手動で 1件 提案投下を試して仕様確認必須**
- 出品（プラチナ目標）は別レーン。BSA-PA はあくまで「公開依頼への提案」のみ扱う

### Phase B: その他新規媒体（次点候補）

#### 候補比較（Phase A 採否決定後の次点）

| 媒体 | 案件量 | 単価帯 | 競合数 | adapter 実装難度 | BSA fit |
|---|---|---|---|---|---|
| **Bizseek** | 中 | 5万〜30万 | 少（リアルタイム） | 中（DOM 比較的素直） | ◎ |
| Skima | 少 | 5千〜10万 | 中 | 中 | △（イラスト系中心） |
| Workship | 中 | 月額10-30万 | 中 | 高（ログイン後検索） | ○（要件継続案件向き） |
| ITプロパートナーズ | 中 | 月50万+ | 少 | 高（要面談） | × （週稼働型・BSA と構造ミスマッチ） |
| ランサーズ X / Pro | 少 | 中〜高 | 少 | 中 | ○（既存 LAN cookie 流用可） |

Coconala 追加で母集団規模は十分達成見込みのため、Phase B は **Coconala の Week 投下数次第で判断**。Coconala から 5件/週 取れるようなら Phase B は保留。

### Phase C: スコアリング閾値の見直し（補足）

- declined のうち本当に取れたのは **CW-20260505-028 のみ（deadline parser バグ）**
- fit_score 自体は妥当。閾値変更ではなく **deadline parser 修正** で 1件分の取りこぼしを防ぐ
- 工数: 1時間以内（collector の deadline 抽出 regex 見直し）

## 推奨実行順序

1. **今日中**: 拡張済み LAN/CW URL（計 +5本）で次回 collector 巡回を確認 → 母集団 +50% 効果を実測
2. **明日**: deadline parser 修正（小タスク・即効）
3. **〜Week4 末**: Phase A（Coconala adapter 実装）
4. **Week5 中盤**: Phase A 効果測定。Coconala 投下数次第で Phase B（Bizseek 等）の発動判断
5. **Week5 末**: 拡張後の 投下/返信/受注 を測定し、Stop/Go 判定

## 期待値

- LAN+CW URL 追加（実施済）だけで Week 投下数を **+50%** に
- Coconala 追加で 母集団 **2-3倍**（特に LP/HP 直結の 503/644/500 で受注率が高い可能性）
- 合計、Week6 以降で daily 投下 5-8件、Week 35件超を射程に

## 人間承認が必要な項目

- [x] LAN web/cms, web/ec の追加（**実施済**：DB 反映済。ロールバック容易）
- [x] CW category/7, 87, 304 の追加（**実施済**：DB 反映済。ロールバック容易）
- [ ] Phase A の Coconala adapter 実装（1.5-2日工数。実装前に手動で 1件 提案投下し仕様確認）
- [ ] Phase B の Bizseek 等の採否（Phase A 効果測定後に判断）
- [ ] Phase C の deadline parser 修正（コード変更のみ。承認不要）
