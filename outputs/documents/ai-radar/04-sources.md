# ai-radar 初期情報源リスト（25ソース）

**運用**: 初期25ソースで MVP を回す。毎月1日の月次レポートで「ヒット率が低い／情報重複が多い」ソースを除外、新候補を追加。

---

## 🔴 Tier 1（毎時クロール・即時通知対象）

事業防衛パイプラインの最前線。R1リスク検知の最重要ソース。

| # | 名前 | URL | 方式 | pipeline |
|---|---|---|---|---|
| 1 | **Anthropic News** | https://www.anthropic.com/news | RSS | business_defense |
| 2 | **Anthropic Skills repo** | https://github.com/anthropics/skills | GitHub Releases/Commits | business_defense |
| 3 | **Anthropic Claude Plugins Official** | https://github.com/anthropics/claude-plugins-official | GitHub Releases/Commits | business_defense |
| 4 | **Claude Code Docs** | https://code.claude.com/docs | HTMLスクレイピング（差分） | business_defense |
| 5 | **Claude Platform Docs** | https://platform.claude.com/docs | HTMLスクレイピング（差分） | business_defense |
| 6 | **ClaudeSkills.ai（競合）** | https://claudeskills.ai/ | HTMLスクレイピング（/pricing /changelog 差分） | business_defense |
| 7 | **n8n Creator Hub** | https://n8n.io/creators | RSS または スクレイピング | business_defense |
| 8 | **LangChain Hub** | https://smith.langchain.com/hub | スクレイピング | business_defense |

---

## 🟡 Tier 2（朝夜クロール・週次ダイジェスト）

日本国内AIビジネスの動き。D機会（エンタープライズ共同創業者）検知の中核。

| # | 名前 | URL | 方式 | pipeline |
|---|---|---|---|---|
| 9 | **ITmedia AI** | https://www.itmedia.co.jp/rss/2.0/aiplus.xml | RSS | business_defense |
| 10 | **日経クロステック** | https://xtech.nikkei.com/rss/xtech-it.rdf | RSS | business_defense |
| 11 | **Ledge.ai** | https://ledge.ai/feed | RSS | business_defense |
| 12 | **AINOW** | https://ainow.ai/feed | RSS | business_defense |
| 13 | **PR Times AI** | https://prtimes.jp/topics/keywords/AI | スクレイピング | both |
| 14 | **経産省プレスリリース** | https://www.meti.go.jp/press/index.html | スクレイピング（「生成AI」「AI」キーワードフィルタ） | business_defense |

---

## 🟢 機会発見中心（朝夜クロール）

AIエコシステム内の新需要。ソロ起業家動向・プラットフォーム機会の検知。

| # | 名前 | URL | 方式 | pipeline |
|---|---|---|---|---|
| 15 | **HackerNews Front** | https://news.ycombinator.com/rss | RSS | opportunity |
| 16 | **HackerNews Show HN** | https://hnrss.org/show | RSS | opportunity |
| 17 | **Product Hunt** | https://www.producthunt.com/feed | RSS | opportunity |
| 18 | **Indie Hackers** | https://www.indiehackers.com/feed.xml | RSS | opportunity |
| 19 | **Reddit r/LocalLLaMA** | https://www.reddit.com/r/LocalLLaMA/.rss | RSS | opportunity |
| 20 | **Reddit r/SideProject** | https://www.reddit.com/r/SideProject/.rss | RSS | opportunity |
| 21 | **Reddit r/EntrepreneurRideAlong** | https://www.reddit.com/r/EntrepreneurRideAlong/.rss | RSS | opportunity |
| 22 | **Gumroad Discover（AIタグ）** | https://gumroad.com/discover?tags=ai | スクレイピング | opportunity |
| 23 | **GitHub Trending（個人）** | https://github.com/trending?since=daily | スクレイピング（Org除外） | opportunity |
| 24 | **Simon Willison's blog** | https://simonwillison.net/atom/everything/ | RSS | opportunity |
| 25 | **Latent Space Podcast** | https://www.latent.space/feed | RSS | opportunity |

---

## ソース別 信頼度スコア（デフォルト値）

| ソース | trust_score (0-10) | 備考 |
|---|---|---|
| Anthropic 公式（1-5） | 10 | 最高信頼 |
| 競合公式Changelog（6-8） | 9 | |
| HackerNews Front（15） | 8 | 情報密度・反応量ともに高い |
| 日経クロステック・ITmedia（9-10） | 8 | 日本メディアの中では高信頼 |
| Product Hunt（17）・Indie Hackers（18） | 7 | |
| 個人ブログ（24-25） | 7 | |
| Reddit（19-21） | 5 | 玉石混交 |
| Gumroad Discover（22）・GitHub Trending（23） | 5 | |
| PR Times AI（13）・経産省（14） | 6 | 広告記事多い / 硬い |

---

## Phase 2 以降の候補（MVP後に追加検討）

| 追加候補 | 理由 |
|---|---|
| **X/Twitter（@AnthropicAI, @sama, @karpathy 等）** | API有料・スクレイピング不安定。Phase 2で検討 |
| **Starter Story / Failory** | ソロ起業家の深掘り記事。月次レベルでOKなので後回し |
| **Stratechery / The Information** | 有料 Substack/News。Phase 3で購読連携検討 |
| **arxiv (cs.AI, cs.CL)** | 論文。ビジネス機会発見の優先度は中 |
| **Hugging Face Daily Papers** | 同上 |
| **建設通信新聞 / 日経メディカル / LogisticsToday** | Vertical職種シグナル用。Stage 1到達後に追加 |
| **Brain / note AI特集** | 日本インディー起業家の収益パターン |
| **WeChat / 小紅書** | 中国語ソース。翻訳パイプライン整備後 |

---

## 方向転換トリガー用キーワード（事業防衛パイプラインでのフラグ判定）

### R1 リスク（🔴 即動く）
```
英語: marketplace monetization, skills paid, plugin commerce,
      commercial terms, reseller, marketplace fee,
      skills marketplace, plugin marketplace
日本語: マーケットプレイス, スキル販売, プラグイン有料化,
       商用利用規約, 公式ストア, 公式マーケット
```

### D 機会（🔴 即動く）
```
日本語: エンタープライズ, 共同創業者, 大企業導入, 監査対応,
       社内AI利用, SBOM, ガバナンス, 内部統制
英語: enterprise Claude, SBOM skills, governance layer,
      skill audit, enterprise marketplace
```

### Vertical急増（🟡 数週で検討）
```
日本語: 税理士AI, 行政書士AI, 社労士AI, 工務店AI, 建築DX,
       医療事務AI, 物流AI, 介護AI, 不動産AI, 教育AI, 塾AI
英語: vertical AI agent, industry-specific Claude, tax AI Japan
```

### BMシフト（🟡 数週で検討）
```
日本語: サブスク, 情報商材, コンサル単価, Gumroad 手数料,
       Stan Store, Stripe 日本, note有料記事, Brain
英語: Gumroad fee change, Stan Store launch, Stripe Japan,
      solopreneur subscription
```

これらのキーワードがヒットしたら、事業影響スコアに +15〜25 ブースト。
