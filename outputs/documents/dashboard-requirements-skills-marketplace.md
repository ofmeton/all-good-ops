# ニュースダッシュボード要件定義（Skills/ワークフローマーケット事業向け）

**作成日**: 2026-04-22
**作成者**: all-good-ops 秘書（Claude Opus 4.7）
**目的**: Skills/ワークフロー販売マーケット事業の方向転換シグナルを早期検知するための、並行構築中ニュースダッシュボードへの追加要件

---

## 0. このドキュメントの使い方

別セッションで本ドキュメントを読み込み、既存のニュースダッシュボードに以下の観測軸・仕様を統合する。
既存ダッシュボードの実装スタックが不明なので、本ドキュメントでは **「何を」「どこから」「どの頻度で」「どう通知するか」** を技術非依存で定義する。

---

## 1. 背景：本事業の戦略ポジション

### 事業概要
- **事業**：Claude で使える Skills + ワークフローを売買できるマーケットプレイス
- **前提**：日本語圏特化
- **目標**：2026-12-31 までに月収 100 万円
- **現状**：初期顧客 0 人、ユーザー個人のブランドで前進中

### 採用戦略（段階的アプローチ）
```
Stage 0: 汎用ワークフロー販売で「作れる・売れる」を証明（Phase 1, 2026年内）
Stage 1: 買い手属性データから濃い業種を発見
Stage 2: Vertical版リリース
Stage 3: エンタープライズ版（D）提案
Stage 4: D パートナー合流で D 事業にピボット or 並走
```

### 方向転換トリガー（何があれば動くか）
- **🔴 即動く**: Anthropic が公式有料マーケットを発表（R1 リスク顕在化）→ **当事業は別路線に逃がす必要**
- **🔴 即動く**: エンタープライズの共同創業者候補・大企業コンタクトが出現 → **D 事業に重心移動**
- **🟡 数週で検討**: 特定 vertical の AI 導入事例が急増 → **Stage 2 早期化**
- **🟡 数週で検討**: ソロ起業家の成功事例パターンに変化 → **BM ミックス見直し**

---

## 2. 観測軸 5 つ（Tier 別）

### 🔴 Tier-1：即座に戦略を揺らすシグナル（**日次チェック、即時通知**）

#### 軸 1. Anthropic 公式発表
| 項目 | 内容 |
|---|---|
| **監視対象** | ブログ記事、docs 更新、TOS 改訂、GitHub リリース |
| **キーワード（英）** | `marketplace monetization`, `skills paid`, `plugin commerce`, `commercial terms`, `reseller`, `marketplace fee` |
| **キーワード（日）** | `マーケットプレイス`, `スキル販売`, `プラグイン有料化`, `商用利用規約` |
| **ソース** | anthropic.com/news, code.claude.com/docs, platform.claude.com/docs, github.com/anthropics/skills, github.com/anthropics/claude-plugins-official, @AnthropicAI (Twitter/X) |
| **通知閾値** | キーワード1つでもヒットしたら即時 |
| **アクション** | 秘書に連絡し、R1 リスク評価を即実施 |

#### 軸 2. 主要競合の動向
| 項目 | 内容 |
|---|---|
| **監視対象企業/サービス** | ClaudeSkills.ai / Skills4Agents / Agent37 / SkillsMP / claudemarketplaces.com / Vercel skills.sh / Cloudflare AI Marketplace / n8n Creator Hub / LangChain Hub / Replit Agent Market / tech-leads-club/agent-skills |
| **監視イベント** | 価格改定、新機能、**日本語化・日本市場参入**、資金調達、買収、CEO発言 |
| **ソース** | 各社 Changelog / プレスリリース / HN / Product Hunt / HN Show HN / @ 各社代表 Twitter / TechCrunch / VentureBeat |
| **通知閾値** | 日本語化 or 資金調達 or 買収は即時、それ以外は週次ダイジェスト |
| **アクション** | 差別化戦略の見直し、価格/UVP の再確認 |

---

### 🟡 Tier-2：数週単位で判断材料化（**週次チェック、ダイジェスト通知**）

#### 軸 3. 日本国内 AI エージェント市場ニュース
| 項目 | 内容 |
|---|---|
| **監視対象** | 大企業の生成AI導入事例、セキュリティ要件の変化、日本向け SaaS の参入、政府・規制当局の発表 |
| **具体的関心事** | ①エンタープライズで Claude を導入した事例 ②J-SOX/金商法/個人情報保護法 改正 ③経産省/総務省 の生成AI指針 ④国内 AI スタートアップの資金調達 |
| **ソース** | ITmedia（itmedia.co.jp）/ ASCII.jp / 日経クロステック（xtech.nikkei.com）/ Ledge.ai / AINOW / Business Insider Japan / PR Times "AI" "生成AI" タグ / 経産省プレスリリース / 総務省プレスリリース |
| **通知閾値** | エンタープライズ Claude 導入事例は即時、それ以外は週次 |
| **アクション** | D（エンタープライズ）機会の早期シグナル検知 |

#### 軸 4. Vertical シグナル（職種別の"熱"）
| 項目 | 内容 |
|---|---|
| **監視対象職種**（優先順） | 税理士 / 行政書士 / 社労士 / 工務店・建築 / 医療事務 / 物流 / 介護 / 不動産 / 教育 |
| **監視イベント** | 各職種向け AI ツールの登場、業務効率化事例、業界団体の AI 指針、人材不足・DX 調査レポート |
| **ソース** | 建設通信新聞 / TKC 情報 / 日経メディカル / LogisticsToday / 介護DX関連メディア / 業界団体の公式発表 |
| **通知閾値** | 週次ダイジェスト。特定職種で3件以上ヒットがあれば強調表示 |
| **アクション** | Stage 2 の職種選定材料として蓄積。半年後にデータ分析 |

---

### 🟢 Tier-3：月次で構造把握（**月次チェック、月次レポート**）

#### 軸 5. ソロ/インディー起業家の収益パターン変化
| 項目 | 内容 |
|---|---|
| **監視対象** | AI 時代のソロ起業家の成功パターン、収益化手法、失敗事例、プラットフォーム変化 |
| **具体的関心事** | ①ソロ運営で月100万円超の事例 ②情報商材/サブスク/コンサルのミックス比率 ③Gumroad / Stan Store / Stripe の手数料・機能変化 ④note / Brain / Teachable の日本市場動向 |
| **ソース** | Indie Hackers / HN Show HN / Starter Story / Failory / tinybuild.com / Product Hunt / Micropreneur 系 Substack / note の AI クリエイター特集 |
| **通知閾値** | 月次ダイジェスト |
| **アクション** | BM ミックス（M2 + M6 + M7）の比率見直し |

---

## 3. ダッシュボード側の仕様要件

### 必須機能

1. **AI 要約レイヤー（最重要）**
   - 生ニュースをそのまま流さない
   - **「本事業にとって何を意味するか」を1行添える**（要約ではなく "解釈"）
   - 推奨プロンプト例：
     ```
     以下のニュースを、「Claude Skills/ワークフロー販売マーケット事業、
     2026年内に月収100万円を目指すソロ運営」の観点から1文で解釈してください。
     - 何が変わるか
     - この事業に対するインパクト（追い風/逆風/中立）
     - 推奨アクション（あれば）
     ```

2. **即時通知機構（Tier-1 専用）**
   - Slack or Discord or メール（ユーザー側既存環境に合わせる）
   - **件名フォーマット**：`[Tier1] [Anthropic|競合|... ] 見出し要約`
   - 通知には「なぜ重要か」を本文に含める

3. **週次ダイジェスト（毎週日曜朝 8:00）**
   - A4 1枚に収まる分量
   - 構成：
     - 今週の最重要3シグナル（各100字以内）
     - 推奨アクション（各30字以内）
     - 観察継続案件（リンクのみ、見出しで列挙）

4. **構造化保存**
   - 検知イベントを JSONL で蓄積
   - スキーマ例：
     ```json
     {
       "detected_at": "2026-04-22T10:00:00+09:00",
       "tier": 1,
       "axis": "anthropic_official",
       "source_url": "...",
       "title": "...",
       "summary": "...",
       "impact": "headwind|tailwind|neutral",
       "recommended_action": "...",
       "confidence": 0.8
     }
     ```
   - 後から「この時点で何が起きていたか」を再構成可能にする
   - 秘書エージェントが改善ループで読めるよう、all-good-ops/data/ 配下と連携できると理想

---

### あると嬉しい機能

5. **"意思決定フラグ" 機構**
   - 戦略変更トリガー（第1章の方向転換トリガー）にヒットした場合、自動で「判断要フラグ」を立てる
   - フラグが立つと通常の通知より強い警告を出す

6. **月次トレンドサマリ**
   - 各観測軸について「先月比で何が増減したか」を可視化
   - 例：「今月は vertical×医療 のヒット数が先月比 3倍 → Stage 2 候補として注目」

7. **ノイズフィルタ**
   - 単なる広告記事・プレスリリースの焼き直しを除外
   - Anthropic 公式 vs ブログ系メディアの信頼度重み付け

---

## 4. 既存ダッシュボードとの統合時の確認事項

別セッションでこのドキュメントを読み込む際、以下をユーザーに確認してほしい：

- [ ] 現在の実装スタック（Next.js / Notion / n8n / 自作スクリプト / RSS reader 等）
- [ ] 既存の情報ソース一覧（重複を避けるため）
- [ ] 通知系の連携状況（Slack/Discord/メール のどれを使っているか）
- [ ] 既存の AI 要約機構の有無と、あれば使用プロバイダ（OpenAI/Claude 等）
- [ ] ストレージ（Postgres / Supabase / ローカル JSONL 等）

---

## 5. 参考：観測ソース一覧（コピー用）

### RSS / Feed 対応可能なソース
```
https://www.anthropic.com/news (RSS あり)
https://itmedia.co.jp/news/ (RSS あり)
https://xtech.nikkei.com/ (RSS あり)
https://www.itmedia.co.jp/keywords/ai.html
https://prtimes.jp/topics/keywords/AI (キーワードフィード)
https://news.ycombinator.com/rss
https://www.indiehackers.com/feed.xml
https://feeds.feedburner.com/ProductHunt
```

### RSS 非対応、スクレイピング or API が必要
```
https://code.claude.com/docs/ (docs 差分監視)
https://github.com/anthropics/skills (GitHub Releases/Commits 購読)
https://github.com/anthropics/claude-plugins-official (同上)
ClaudeSkills.ai / Skills4Agents / Agent37 各社 Changelog or /pricing ページ差分
Twitter/X: @AnthropicAI, @claudeai, @ 各社代表アカウント
```

### キーワード監視（Google Alerts 代替）
```
- "Claude Skills" "マーケット" lang:ja
- "生成AI" "エンタープライズ" "導入事例" lang:ja
- "AI エージェント" "日本語" lang:ja
- "plugin marketplace" "monetization" Anthropic
```

---

## 6. 備考

- 本要件は **秘書（Claude Opus 4.7）** が 2026-04-22 時点で整理したもの。事業仮説が更新されたら追随して改訂する
- 関連メモリ：
  - `project_skills_marketplace.md`（構想・戦略・方向転換シグナル）
  - `project_current_streams.md`（既存収入源との関係）
- 関連ファイル：本ドキュメント作成の前提となった調査結果は、2026-04-22 の秘書セッションログに記録済み
