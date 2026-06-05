---
date: 2026-05-26
source: user input (session 2026-05-26)
purpose: x-account-design Phase 0 v2 母集団 (24 アカ = 既存信頼 4 + ユーザー追加 20)
permitted_storage: handle + 公開メタデータのみ (本文 raw は別途 jp-publishers-v2 ブランチで取得)
retention: forever
---

# x-account-design Phase 0 v2 参考アカウント (確定)

ユーザー (ofmeton) が 2026-05-26 セッションで明示指定。**参考アカウント = 情報収集対象アカウント** 兼用。

## 1. 既存母集団から信頼できる 4 アカ (継続)

Phase 0 (2026-05-24 jp-publishers) で取得済の 10 アカのうち、2026-05-26 ユーザー評価で「めっちゃ参考になる」と確定:

| handle | 主軸 | 既存 raw data |
|---|---|---|
| Shimayus | AIエージェント実装・業務効率化、株式会社quai CEO 医師起業家 | jp-publishers raw 取得済 |
| SuguruKun_ai | ChatGPT/Claude/Gemini 全般 + 公式資料解説、AI研修・開発会社 CEO | jp-publishers raw 取得済 |
| masahirochaen | AIニュース最速発信、デジライズ CEO、法人向け AI 開発・研修 | jp-publishers raw 取得済 |
| ClaudeCode_love | Claude Code 機能速報 + 海外バズ、Claude Code ガチ勢 3 人運営 | jp-publishers raw 取得済 |

## 2. ユーザー追加 20 アカ (Phase 0 v2 新規取得対象)

| # | handle | 推定ドメイン (要 Phase 0 v2 で検証) |
|---|---|---|
| 1 | ClaudeCode_UT | Claude Code 関連 (日本語) |
| 2 | obsidianstudio9 | Obsidian + AI 活用 (日本語想定) |
| 3 | MakeAI_CEO | AI 経営層向け (日本語想定) |
| 4 | mmmiyama_D | AI 業務自動化 (日本語想定) |
| 5 | tetumemo | AI 学習メモ・知見共有 (日本語想定) |
| 6 | claudecode_lab | Claude Code 実験・研究 (日本語想定) |
| 7 | ObsidianOtaku | Obsidian + AI 深掘り |
| 8 | so_ainsight | AI insight 発信 |
| 9 | Codestudiopjbk | コード生成・スタジオ系 |
| 10 | exploraX_ | AI ツール探索 |
| 11 | jason_coder0 | 海外 coder (英語想定) |
| 12 | heynavtoor | 海外 AI 発信 (英語想定) |
| 13 | ethancoder0 | 海外 coder (英語想定) |
| 14 | cyrilXBT | 海外 XBT 関連 (要確認) |
| 15 | daifukujinji | 日本語、テーマ要確認 |
| 16 | Fluyeporlaweb | スペイン語想定、要確認 |
| 17 | commte | テーマ要確認 |
| 18 | csaba_kissi | 海外、テーマ要確認 |
| 19 | ai_explorer25 | AI 探索系 |
| 20 | Atenov_D | テーマ要確認 |

各アカの正確な主軸・フォロワー数・engagement は Phase 0 v2 (twitterapi.io advanced_search で from:handle since:90d 取得) で確定。

## 3. 既存母集団から除外する 6 アカ (Phase 0 v2 集計対象外)

ターゲット (非エンジニア経営者) に届かないため Phase 0 v2 から除外:

| handle | 除外理由 |
|---|---|
| umiyuki_ai | AI 業界批評、ターゲット外 |
| kosuke_agos | ヘルスケア・社会論主軸、AI 業務自動化から逸脱 |
| minorun365 | AWS DevRel、エンジニア向け |
| icoxfog417 | AWS DevRel、機械学習エンジニア向け |
| ai_jitan | NotebookLM/Gemini 中心、Claude 軸でない |
| milbon_ | スモビジ・副業ハック中心 |

ただし jp-publishers ブランチに 90 日 raw は保存済 (アーカイブとして残置)。

## 4. 用途

- **Phase 0 v2 競合調査の母集団** (50 + 9 = 59 項目集計対象)
- **Optimizer 週次 inspirations ingest cron の固定対象** (24 アカ、海外英語圏 17 アカは別 cron)
- **発信ネタ仕入れ方法分析の対象** (各アカが何を見て発信しているか、リリース → 発信のタイムラグ、引用元の偏り 等)

詳細仕様は `outputs/improvements/x-account-design-v10-phase0-v2/query-design.md` 参照。
