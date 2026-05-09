# 案件ウォッチャー自動化 設計書

> 作成日: 2026-04-22
> 対象: BSA 戦略 Week1 日次チェックリスト「朝8:00の新着スキャン」を自動化
> SSOT 参照: `wiki/business/bsa/pricing-catalog.md` / `outputs/bsa/wk1-action-plan.md`
> 関連タスク: #10

---

## 0. 背景・目的

BSA Week1 計画で毎朝 Lancers / CrowdWorks / Coconala を手動スキャンして fit案件5件を選定する設計になっている（`wk1-action-plan.md`）。これを自動化し、

- 朝起きたら `outputs/watcher/YYYY-MM-DD.md` に**Top 10 案件のサマリ**が出来上がっている
- ユーザーはレポートから5件を選び、提案テンプレを選択するだけで Day 1-4 の提案投下フローが回る

状態を作る。

**非目的**:
- 提案文の自動生成（人間のカスタム化が B-C層差別化の核 — 需給分析§5 より）
- 受注の自動化
- 応募の自動送信（利用規約違反リスクあり。常にユーザー手動送信）

---

## 1. スコープ

### 1.1 監視対象プラットフォーム

| プラットフォーム | 検索URL | 認証 | 優先度 |
|---|---|---|---|
| **Lancers** | `https://www.lancers.jp/work/search/web/lp` | 無し（無ログイン閲覧可） | 🥇 |
| **Lancers** | `https://www.lancers.jp/work/search/web/website` | 無し | 🥇 |
| **Lancers** | `https://www.lancers.jp/work/search/ad` | 無し | 🥈 |
| **CrowdWorks** | `https://crowdworks.jp/public/jobs/category/12` (LP) | 無し | 🥈 |
| **CrowdWorks** | `https://crowdworks.jp/public/jobs/category/17` (HP) | 無し | 🥈 |
| **Coconala** | `https://coconala.com/requests/categories/22` (Web制作) | 無し | 🥉 |
| **Coconala** | `https://coconala.com/requests/categories/503` (LP) | 無し | 🥉 |

**Phase 1 スコープ**: Lancers 2URL のみで MVP。その後拡張。

### 1.2 収集項目（最小セット）

| フィールド | 必須 | 備考 |
|---|---|---|
| `platform` | ○ | lancers / crowdworks / coconala |
| `title` | ○ | 案件タイトル |
| `url` | ○ | 案件詳細ページ |
| `budget` | ○ | 予算テキスト（例: "10-20万円"） |
| `budget_min` / `budget_max` | ○ | 数値化（例: 100000, 200000） |
| `deadline` | △ | 応募締切・公開終了日 |
| `proposal_count` | △ | 現在の提案数（取れれば） |
| `client_rank` | △ | 依頼者の実績・評価 |
| `posted_at` | ○ | 掲載日時 |
| `description_excerpt` | ○ | 案件説明の先頭300字 |

---

## 2. fit_score 算出ロジック

### 2.1 配点表（100点満点）

| 軸 | 配点 | 判定ロジック |
|---|---|---|
| **価格帯** | 30 | 3-30万円=30 / 1-3万=20 / 30-50万=15 / 1万未満=0 / 不明=10 |
| **業種マッチ** | 25 | 建築/不動産/工務店/リフォーム=25 / 士業=20 / 医療=15 / 飲食・美容=10 / その他=5 |
| **サービス種別** | 20 | LP=20 / コーポレート=15 / 広告運用=20 / 修正改修=10 |
| **制約条件** | 15 | 認定ランサー限定=-30（除外） / 実績10件以上必須=-10 / 個人OK=+15 |
| **速度要求** | 10 | 1週間以内=10 / 2-3週間=7 / 1ヶ月以上=3 |

**合計スコア**:
- 80点以上 = 🔥 最優先提案
- 60-79点 = 🎯 推奨提案
- 40-59点 = 📋 余裕があれば
- 40点未満 = ⏭️ スキップ

### 2.2 除外条件（即スコア0）

- 認定ランサー限定案件
- 予算1万円未満（L4下限未満）
- 情報商材・副業紹介・MLM関連
- 薬機法リスク極大（誇大効能を求められる医療系）
- 「既存デザインの模倣・パクリ」指示

---

## 3. 実装方針

### 3.1 Phase 1 (MVP) — Week1 中に稼働

**スタック**: Python 3.11 + `requests` + `BeautifulSoup4` + `PyYAML`

**ファイル構成**:
```
scripts/
├── morning-watcher.sh       # launchd から起動される実行エントリ
├── watcher/
│   ├── __init__.py
│   ├── main.py              # 全体オーケストレーション
│   ├── config.yaml          # 監視対象URL・キーワード・配点表
│   ├── scrapers/
│   │   ├── lancers.py
│   │   ├── crowdworks.py
│   │   └── coconala.py
│   ├── scoring.py           # fit_score 算出
│   └── report.py            # Markdown レポート生成
└── requirements.txt
```

**出力**: `outputs/watcher/YYYY-MM-DD.md`（ファイル名は実行日）

### 3.2 スクレイピング時の安全原則

- **各URLへのアクセスは最低5秒間隔**（robots.txt と各社TOSを尊重）
- **User-Agent は正直に明示**: `Kudo Riku Web Studio / Personal Job Watcher (off.me.ton@gmail.com)`
- **失敗時の自動リトライは3回まで・指数バックオフ**
- **ログインが必要な画面は取得しない**（認証回避は利用規約違反リスク）
- **ページング深追い禁止**: 1検索あたり最新50件のみ

### 3.3 実行スケジュール

macOS launchd で朝 7:30 に起動 → 8:00 までにレポート完成。

```xml
<!-- ~/Library/LaunchAgents/com.ofmeton.job-watcher.plist -->
<!-- 毎平日 7:30 -->
<key>StartCalendarInterval</key>
<array>
  <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>30</integer></dict>
  ...（月〜金）
</array>
```

土日は手動起動（新着案件が少ないため）。

### 3.4 レポートフォーマット（`outputs/watcher/YYYY-MM-DD.md`）

```markdown
# 案件ウォッチ YYYY-MM-DD

> 生成時刻: HH:MM / 対象: Lancers / CW / Coconala / 検出件数: N件 / 🔥N件 🎯N件 📋N件

## 🔥 最優先（スコア80+）

### 1. [案件タイトル](URL) — スコア: 92
- **プラットフォーム**: Lancers
- **予算**: 15-25万円
- **業種**: 工務店HP
- **サービス種別**: Corporate 5P 想定
- **締切**: 4/26
- **現提案数**: 3件
- **依頼者**: ★4.8 / 実績12件
- **推奨テンプレ**: T2 (Corporate 5P)
- **抜粋**: "地域の工務店のHPリニューアル..."

### 2. ...

## 🎯 推奨（スコア60-79）

...

## 📋 余裕があれば（スコア40-59）

...

## 除外された案件（参考）

- 認定ランサー限定: 3件
- 予算1万未満: 2件
- 情報商材系: 1件
```

---

## 4. MVP 最小実装スコープ（Phase 1）

Week1 中に動かすための絞り込み:

| 項目 | Phase 1 MVP | Phase 2 拡張 | Phase 3 将来 |
|---|---|---|---|
| 監視プラットフォーム | Lancers 2URL のみ | + CrowdWorks | + Coconala |
| 詳細ページ取得 | 検索結果の表示項目のみ | 各案件の詳細も取得 | (同左) |
| fit_score | キーワード+予算+業種 | + 依頼者ランク | + 提案通過率学習 |
| 出力 | Markdown 1本 | + Slack通知 | + ダッシュボード化 |
| スケジュール | 手動 `bash scripts/morning-watcher.sh` | launchd 自動起動 | (同左) |
| エラー通知 | stderr ログ | Slack | Sentry |

---

## 5. リスクと対策

| リスク | 対策 |
|---|---|
| TOS違反によるアカウント停止 | ログイン必要画面は取得しない / User-Agent 正直化 / レート制限5秒 |
| HTML構造変更で動かなくなる | ユニットテストで主要セレクタを検証 / 失敗時はエラーログのみで即停止（誤データを出さない） |
| 優良案件を見逃す | fit_score 40点以上は全件レポート出力 / スコア計算は毎週チューニング |
| 稼働してから気付くエッジケース（例: 予算"応相談"案件） | Phase 1 は budget_min/max 取れないものは `budget_unknown=true` フラグで別枠表示 |
| 個人情報・機密情報の保存 | 依頼者の個人名・電話番号はスクレイピング対象外（URLと掲載タイトルのみ） |

---

## 6. 受け入れ基準（Phase 1 完了条件）

1. `bash scripts/morning-watcher.sh` で `outputs/watcher/YYYY-MM-DD.md` が生成される
2. Lancers 2URL からそれぞれ最新20件以上の案件を収集
3. fit_score が算出され、Top 10 が Markdown レポートに出力される
4. 除外された案件の件数と理由がサマリに含まれる
5. 連続3日間、1件もスクレイピングエラーなく稼働

---

## 7. 開発の見積り

| フェーズ | 見積り工数 | 担当 |
|---|---|---|
| Phase 1 MVP 実装 | 4-6h | system-engineer（秘書経由） |
| launchd 登録 | 0.5h | system-engineer |
| Phase 2 (CW/Coconala 追加) | 2-3h | 同上 |
| Phase 3 (ダッシュボード化) | 別途設計 | mcp-architect / system-engineer |

---

## 8. 人間確認ポイント

- [ ] 監視対象URLに追加/除外したいものあるか
- [ ] fit_score 配点表の業種重み（建築25 / 士業20 / 医療15）はこれでよいか
- [ ] 除外条件（認定ランサー限定など）の判定基準はこれでよいか
- [ ] launchd 起動時刻 7:30 でよいか
- [ ] Phase 1 の MVP 範囲（Lancers のみ）で着手してよいか

---

## 9. 次の一手

承認後のフロー:

1. `system-engineer` エージェントに実装依頼
2. 秘書経由で Phase 1 MVP を着手
3. Week1 Day 2-3 までに動作確認
4. Day 4 から自動レポートを Week1 日次チェックリストに組み込む

---

*本設計書は Phase 1 MVP 着手前の起案。実装着手には人間承認が必要。*
