# DESIGN.md / OUTLINE.md 運用ワークフロー

> **ステータス: 承認済（2026-04-24）**
> 起案日: 2026-04-24 / 関連SSOT: `portfolio/design/README.md` / `portfolio/outline/README.md`

## 概要

BSA（LP / HP 制作）案件で「毎回同じAIっぽいデザイン」問題と「実装後修正が重い」問題を解決するための標準手順。Google Stitch 発の `DESIGN.md`（見た目の定義）と `OUTLINE.md`（構成の定義）の 2 ファイルを使い分けることで、ブランド一致 × 構成整合 × 修正容易性を同時に担保する。

## 対象

- **メイン**: design-director（案件ごとのデザイン方向性決定）
- **副次**: rapid-hp-operator（受注後のヒアリング→要件定義）、system-engineer（実装時）

## 前提の在庫

- `portfolio/design/` — 5 本の DESIGN.md テンプレ（jp-saas / jp-media / jp-local-business / modern-saas / corporate-classic）
- `portfolio/outline/` — 2 本の OUTLINE.md テンプレ（lp-standard / corporate-5p）
- 外部リソース: `awesome-design-md-jp`（GitHub）/ `getdesign.md`（npx）/ `Google Stitch`（無料月350回）/ `TypeUI`（npx）

---

## 1. 案件受注後のワークフロー

### Step 1: ヒアリング結果から素材を揃える

ヒアリングで最低限取得する項目:
- **業種**（SaaS / メディア / 地域事業者 / 製造業 等）
- **参考サイト URL**（クライアントが「こんな感じにしたい」と言ったもの）
- **ブランドカラー**（既存ロゴ・企業CIから）
- **トンマナの方向性**（信頼感 / 親近感 / 高級感 / ミニマル 等）
- **絶対NG要素**（派手な動き / 特定色 / 競合と被る表現）

### Step 2: DESIGN.md を確定する（3択）

| 選択 | 条件 | 作業 |
|---|---|---|
| **A. テンプレ流用** | 業種が `portfolio/design/` のテンプレに合致 | 該当テンプレをコピーし、カラーとフォントだけクライアント値に差し替え |
| **B. URLから抽出** | クライアントが参考サイトURLを提示 | Google Stitch（無料枠）で URL → DESIGN.md 自動抽出 → 編集 |
| **C. 合成** | 複数テンプレの良いとこ取りが必要 | design-director がセクション単位でマージ。マージ後必ずレビュー |

**判断の優先順位**: A > B > C。A で済めば制作時間が最短。

### Step 3: OUTLINE.md を確定する

`portfolio/outline/` から案件タイプに合うテンプレを選択し、セクション見出し・CTA文言をヒアリング結果で上書き。

- LP単発（L1 / L3） → `lp-standard.md`
- コーポレート5P（L2） → `corporate-5p.md`

### Step 4: Do's & Don'ts を案件別に判断

「AIが作ったっぽい典型の禁止」は**一律適用しない**。案件ごとに design-director が判断。

**判断軸**:
- クライアント参考サイトが「AIっぽい典型」を採用している → 禁止しない
- クライアントが「他社と似ないサイトにしたい」と明言 → 典型禁止を強めに
- 広告LP（CVR重視） → 効果重視で典型も許容

**禁止候補カタログ**（採用は design-director の判断）:
- 紫〜青のグラデーション背景
- pill型ボタン（border-radius 9999px）を一次CTAに使用
- 半透明 + backdrop-blur のカードグリッドを多用
- body text に font-weight 700 以上
- 従来の `border: 1px solid` の多用（shadow-border 代替可）

### Step 5: クライアント制作ルートに配置

```
{client-project}/
├── DESIGN.md    ← Step 2 の結果
├── OUTLINE.md   ← Step 3 の結果
└── CLAUDE.md    ← 以下 1 行を必ず含める
```

`CLAUDE.md` に入れる 1 行:
```
UI実装時は必ず @DESIGN.md と @OUTLINE.md を参照してスタイル・構成を適用すること。Don't セクションが存在する場合はそれを優先。
```

### Step 6: system-engineer へ実装依頼

引き継ぎフォーマット:
```
【案件】{クライアント名}
【商品ライン】L1 / L2 / L3 / L4
【SLA】残 {時間}
【DESIGN.md】{path}（ベース: {テンプレ名}）
【OUTLINE.md】{path}（ベース: {テンプレ名}）
【Do's & Don'ts】
  - 採用: {項目}
  - 採用しない: {項目}
【素材】{画像/原稿/ロゴのリンク}
```

---

## 2. 実装後修正のワークフロー

### 修正タイプ判定

修正依頼を以下 3 タイプに分類:

| タイプ | 対象ファイル | 作業者 |
|---|---|---|
| **見た目の修正**（色/フォント/余白/角丸） | DESIGN.md のみ | design-director が DESIGN.md 更新 → system-engineer が再生成 |
| **構成の修正**（セクション追加/削除/順序変更） | OUTLINE.md のみ | design-director が OUTLINE.md 更新 → system-engineer が再生成 |
| **テキストコピーのみ** | 実装ファイル | system-engineer が直接編集 |

### 修正指示を自然言語で残す

クライアントからの修正依頼を受けたら、design-director が以下のフォーマットで DESIGN.md / OUTLINE.md に追記:

```markdown
## 修正履歴
- 2026-MM-DD: CTAボタンの radius を 8px → 4px へ変更。クライアント「もっと真面目な印象に」
- 2026-MM-DD: FAQ セクションを料金の下に移動。離脱分析でFAQ直帰が多かったため
```

これで次回別案件で同じパターンに遭遇した際の判断材料になる。

---

## 3. 補強ツールの使い分け

### Google Stitch（無料月350回）

- **使う時**: クライアントが URL を提示してきた時、テンプレに合致しない業種の時
- **使い方**: stitch.withgoogle.com で URL 指定 → デザイン生成 → zip エクスポート → DESIGN.md 抽出
- **注意**: 月350回は各案件で平均 5-10 回使っても余裕。気軽に試してよい

### TypeUI（無料 / npx）

- **使う時**: クライアントが「他と違うスタイルにしたい」と言った時
- **コマンド**: `npx typeui.sh pull {paper|neumorphism|brutalism|glassmorphism}`
- **効果**: スタイル方向性を意図的に振ることで、毎回同じ顔になる問題の根本対処

### awesome-design-md-jp（GitHub）

- **使う時**: クライアントが日本の有名サービスを参考に挙げた時
- **対応ブランド例**: Apple Japan / MUJI / メルカリ / SmartHR / freee / note / LINE / トヨタ / クックパッド
- **使い方**: リポジトリから該当ブランドの `.md` を DL → クライアント値で差分調整

### AIDesigner MCP（有料: Pro $25/月 ≈ 100クレジット ≈ 1回 37円）

- **使う時**: クライアントが「デザインを反復改善したい」と言った時
- **判断**: **当面は無料枠のみ運用**。月の消費クレジットを実測し、10案件ペースで消費が 80 クレジット超えたら Pro 契約検討
- **導入前**: `npx -y @aidesigner/agent-skills init claude` で MCP 導入。OAuth 認証で無料枠が使える（要ユーザー承認）

### jp-ui-contracts（無料 / GitHub）

- **使う時**: 日本語UIの崩れ検知（letter-spacing / line-height / 禁則処理）
- **現状**: DESIGN.md テンプレ側で日本語ルールは既に明文化済み。validator の導入は DESIGN.md 運用定着後に検討

---

## 4. 失敗パターンと回避策

| 失敗 | 回避策 |
|---|---|
| テンプレそのまま使ってクライアント独自性がない | Step 1 のヒアリングでブランドカラー・参考サイトを必ず抽出 |
| DESIGN.md だけ作って OUTLINE.md を省略 | 構成修正のたびに全体再実装になる。必ず2ファイルセット |
| Do's & Don'ts を一律適用してクライアント要望と衝突 | Step 4 で案件別判断。design-director の判断を明文化 |
| 修正履歴を残さない | Section 2 の「修正履歴」追記を運用ルール化。再発防止の資産になる |
| AIDesigner を深く検討せず導入 | 無料枠の消費を実測してから Pro 契約判断 |

---

## 5. design-director との連携

**design-director が主導する範囲**:
- Step 2-4（DESIGN.md / OUTLINE.md 確定と Do's & Don'ts 判断）
- Section 2 の修正タイプ判定と履歴追記
- Section 3 の補強ツール選定

**rapid-hp-operator が主導する範囲**:
- Step 1（ヒアリング）
- Step 6（system-engineer への引き継ぎ）
- SLA タイマー管理

**system-engineer が主導する範囲**:
- Step 6 受領後の実装
- Section 2 のテキストコピー直接修正

---

## 参照すべき関連スキル

| スキル | 参照条件 |
|---|---|
| `rapid-hp-playbook.md` | BSA 全体運用手順 |
| `ui-ux-pro-max:ui-ux-pro-max` | CSS 出力品質の底上げ |
| `superpowers:brainstorming` | クライアント要望が曖昧な時の発散 |
| `mcp-integration.md` | AIDesigner MCP 導入時 |
| `human-confirmation.md` | 新規ツール課金・MCP導入の判断時 |
