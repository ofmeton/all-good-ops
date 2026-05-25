# Phase 0 — 海外/業種別 AI 発信者発掘 (2026-05-25)

## Executive Summary

ofmeton が国内 10 アカ調査で見つけた "空白領域" (業種別 SOP / 非エンジニア委託フロー / 数字付き ROI / 失敗談先行 / 士業 / 法務 / 単価 / 教育 / 経理 AI) を埋めるため、海外英語圏 17 アカ + 国内業種別 7 アカを発掘した。

最大の発見は **(1) 国内 "業種別 × 数字付き ROI × 非エンジニア言語" の先行者として畠山謙人 (@kandmybike) が圧倒的に強い** (60社 / スタッフ 0人 / 339万リーチ長文) こと、**(2) 海外では Liam Ottley / Nate Herk / David Ondrej の 3 名が "AAA (AI Automation Agency) 教育コンテンツ" を 5,000円-7,000ドル の階層教育商品で売っている** ことで、ofmeton の note 有料記事 + 将来の AI 自動化代行サービスの値付け先行例として参考可能。

調査の制約: X 直接 fetch は HTTP 402 で全件不可、WebSearch / WebFetch 経由の handle / フォロワー数は **記事側の二次情報** であり、フォロワー数は 1-3 ヶ月の誤差を含む。実在確認できなかったアカウントは D 章末尾に「発掘失敗」として記録した。

---

## A. 海外英語圏 (17 アカ)

### 早見表

| # | handle | 主軸 | フォロワー (概算) | フォーマット | ofmeton 向け学習ポイント |
|---|---|---|---|---|---|
| A1 | @AnthropicAI | Anthropic 公式 (Claude メーカー) | 大量 (公式) | プロダクト発表 / リサーチ | Claude 新機能の一次情報源。発信時の引用元 |
| A2 | @claudeai | Claude 公式プロダクト | 公式 | プロダクト更新 / プロンプト例 | Claude プロンプト事例の公式ソース |
| A3 | @alexalbert__ | Anthropic Claude Relations / DevRel | 141K | 短文 Tips + ローンチ告知 | "技術者だが非技術者にも届く" 翻訳トーン (ofmeton ポジションに近い) |
| A4 | @simonw | Simon Willison / LLM ブロガー (Django 共同創設) | ~70K (記事側数字) | 長文ブログ + X で要約 | "23 年 AI ブログ" の蓄積戦略。LLM の限界・落とし穴を冷静に語る信頼性 |
| A5 | @swyx | Shawn Wang / Latent Space 編集 / AI Engineer 命名者 | ~100K+ | ニュースレター + Podcast + X | "AI Engineer" という新カテゴリ命名 + 10M リーダーへの拡大。カテゴリ命名による先行者利益 |
| A6 | @mreflow | Matt Wolfe / Future Tools / 二週刊 AI ニュースレター | ~250K (X) / 230K (NL) / 700K (YT) | ニュースレター + YouTube + X | "AI ツール DB" を作って人を集める導線。複数チャネル並列運用の参考 |
| A7 | @mckaywrigley | Mckay Wrigley / Takeoff AI 創業者 / Cursor + Claude チュートリアル | ~150K+ | スレッド + 動画チュートリアル | "Vibe coding" 系教育コンテンツ。非エンジニア向け Cursor + Claude 入門の先行モデル |
| A8 | @liamottley_ | Liam Ottley / Morningside AI 創業 / AAA Accelerator | 19.4K (X) / 750K (YT) / 280K (Skool) | スレッド + YouTube + 有料コミュニティ | "$5k AI チャットボット → $60k AI 監査 → $250k+ 開発案件" の階段単価設計。**ofmeton AI 自動化代行の値付け先行例** |
| A9 | @nateherk | Nate Herk / Uppit AI 創業 / n8n 教育 | (記事数字) 750K YT / X は 2025-05 開始で成長中 | 動画チュートリアル + X + 無料コース | "8 ヶ月で $500K" を毎回明示する数字付き ROI 開示の徹底。非エンジニア向け n8n 教育の代表 |
| A10 | @DavidOndrej1 | David Ondrej / Scale Software AI / Vectal.ai (買収済) | ~50K (推測) | 短文断言 + YouTube | "SaaS is dead. Agents killed it." のような断言型フック。AI agent 教育の有料コミュニティ運営 |
| A11 | @alliekmiller | Allie K. Miller / Open Machine CEO / 元 AWS ML for Startups | 2M (LinkedIn 公称) | 短文 Tips + LinkedIn 連動 | "AI Business" の最大インフルエンサー。エンタープライズ AI 視点で中小経営者にも刺さる |
| A12 | @rileybrown_ai | Riley Brown / Vibecode 共同創業 ($9M raise) | 1.5M (全アカ合算) | 短尺動画 + X + TikTok | "Vibe coding" 用語の流通源。短尺動画 × 複数アカ並列運用の先行モデル |
| A13 | @jspujji | Jesse Pujji / Gateway X 創業 / 元 Ampush ($500M ad spend) | ~174K | ストーリーテリング + ブートストラップ系スレッド | "ブートストラップ x AI venture studio" の見せ方。発信が直接案件流入になる構造 |
| A14 | @rowancheung | Rowan Cheung / The Rundown AI 創業 | (記事数字) 1.7M (NL 2M) | 日次 5 分 NL + スレッド | "AI 5 分 NL" のフォーマット先駆。$7M ARR (スポンサー収益) の規模感 |
| A15 | @bentossell | Ben Tossell / Ben's Bites 創業 (元 Makerpad / Zapier 買収) | (記事数字) 140K-400K NL | NL + Twitter | "no-code → AI 自動化" への自然な移行。Zapier 買収後の発信が中小企業導入の参考 |
| A16 | @AravSrinivas | Aravind Srinivas / Perplexity CEO | ~300K+ | プロダクト発表 + 短文 | Perplexity 機能 / 検索 × AI の動向源。ofmeton の "AI で調査" 文脈の参考 |
| A17 | @ShaanVP | Shaan Puri / My First Million Podcast | ~600K+ | 短文断言 + Podcast | "AI is a big deal because it turns English into a programming language" 系のメタファー作り。非エンジニア言語化の達人 |

### 各アカ短評 (1-2 行)

- **A1 @AnthropicAI**: Claude メーカーの公式。プロダクト発表は ofmeton の発信トリガーに直結。フォローは必須。
- **A2 @claudeai**: プロダクト公式。プロンプト事例の公式ソースとして引用しやすい。
- **A3 @alexalbert__**: Claude DevRel。技術者が "非技術者にも刺さる短文 Tips" を投稿し続ける。ofmeton ポジションの近接モデル。
- **A4 @simonw**: 個人 LLM ブログの最古参。落ち着いた語り口で AI の限界も書く信頼性は ofmeton の参考になる。
- **A5 @swyx**: "AI Engineer" 命名で先行者利益を取った。カテゴリ語の発明 → 認知拡大の戦略を学べる。
- **A6 @mreflow**: Future Tools (AI ツール DB) + NL + YouTube の三位一体。複数チャネル並列運用の先行モデル。
- **A7 @mckaywrigley**: Cursor + Claude 教育の頂点。"超ビルダー時代" の象徴で、非エンジニアでも 1 週間で SaaS が作れることを示す。
- **A8 @liamottley_**: **ofmeton AI 自動化代行の値付け先行例**。$5k → $60k → $250k+ の階段単価。Skool 有料コミュニティ + 教育ピラミッド。
- **A9 @nateherk**: 数字付き ROI 開示の徹底 ($500K / 8 ヶ月)。非エンジニア向け n8n 教育の代表格。
- **A10 @DavidOndrej1**: 断言型フックの達人。"X is dead, Y killed it" 系で注目を取る。有料コミュニティ運営手法も参考。
- **A11 @alliekmiller**: AI Business 領域の最大インフルエンサー。エンタープライズ視点で中小経営者にもリーチ。
- **A12 @rileybrown_ai**: "Vibe coding" 用語の発明者の一人。短尺動画 × 複数アカウント並列。
- **A13 @jspujji**: ブートストラップ系の代表。"発信が直接案件を生む" 構造を 5 年スパンで実証。
- **A14 @rowancheung**: 日次 5 分 NL フォーマットの先駆。$7M ARR スポンサー収益の規模。
- **A15 @bentossell**: no-code → AI 自動化への自然な移行を体現。Zapier 買収後の発信が中小企業導入参考。
- **A16 @AravSrinivas**: Perplexity CEO。AI × 検索の動向源。
- **A17 @ShaanVP**: 非エンジニア言語化の達人。"AI は英語をプログラミング言語に変えた" 系メタファーは ofmeton の翻訳ポジションに直結。

---

## B. 国内 非エンジニア向け業種別 AI 発信者 (7 アカ)

### 早見表

| # | handle | 業種 | フォロワー (概算) | 主な発信内容 | ofmeton との重複/差別化 |
|---|---|---|---|---|---|
| B1 | @kandmybike | 税理士 (公認会計士併設) | 5,000+ (本人 note 申告) / 累計 700万 imp | 「スタッフ 0 人で 60 社」Claude Code 業務自動化長文。CLAUDE.md テンプレ配布 | **同一ポジションに最も近い。差別化点 = 業種を限定せず横断 (士業 / 経理 / 教育 / 製造) する翻訳者ポジション** |
| B2 | @shigyou_ai_com | 士業横断 (税理士 / 行政書士 / 司法書士 / 公認会計士 / 弁護士) | (note 記事の本数から推測 数百〜数千) | "ChatGPT vs Claude vs Copilot" 士業特化比較。Claude 推奨で日本語強さ訴求 | **重複高め。差別化点 = ofmeton は士業以外の業種 (製造 / 小売 / 教育) も含む。連携可能性あり** |
| B3 | @ctgptlb | ChatGPT 研究所 | 大規模 (国内 AI 系トップ層) | ChatGPT 中心の最新動向 / 活用 Tips | **重複中。差別化点 = ofmeton は Claude 寄りで業種別 SOP に踏み込む** |
| B4 | (handle 未確認) "王子かわはし事務所" 中小企業診断士 | 中小企業診断士 | (note 記事 1 本確認、X handle 未特定) | 「中小企業診断士が Claude Code で仕事を回している話」 | **重複低。差別化点 = ofmeton は実装まで踏み込む。診断士は経営助言止まり。連携先候補** |
| B5 | @kimu_shindan (推定) "週末企業診断士きむ" | 中小企業診断士 × AI | (note 記事複数、X handle 推定) | 「SNS 更新が続かない経営者向け、過去資産を AI で蘇らせる発信術」 | **重複低。差別化点 = ofmeton はトピック横断、きむ氏は SNS 発信支援に特化** |
| B6 | (発掘失敗) 社労士 × AI 発信 | 社会保険労務士 | - | 検索では業界記事多数だが個人発信者の handle 未特定 | **空白領域確認。ofmeton が踏み込む余地大** |
| B7 | (発掘失敗) 行政書士 × AI 専業発信者 | 行政書士 | - | 「ゆうき行政書士事務所」note 等あるが X 発信は弱い | **空白領域確認。ofmeton が踏み込む余地大** |

### 各アカ短評

- **B1 @kandmybike (畠山謙人 / AI 税理士)**: **国内最重要発掘対象**。「スタッフ 0 人で 60 社」339万リーチ + Forbes 取り上げ。CLAUDE.md テンプレ配布など "実装の中身を見せる" 開示姿勢が ofmeton の参考フォーマットになる。ただし業種は税理士 1 本に絞っており、ofmeton が "業種横断翻訳者" ポジションを取ればバッティングしない。
- **B2 @shigyou_ai_com (士業 AI 研究所)**: 士業 5 領域 (税理士 / 行政書士 / 司法書士 / 公認会計士 / 弁護士) 横断で AI 活用情報を発信。"ChatGPT vs Claude" の使い分けを業務シーン別に書くスタイルは ofmeton が踏襲できる。連携相手としても候補。
- **B3 @ctgptlb (ChatGPT 研究所)**: 国内 AI 系トップ層のフォロワー数。ただし ChatGPT 中心で Claude 比重低い。ofmeton は Claude + 業種別 SOP で差別化可能。
- **B4 王子かわはし事務所**: note 「中小企業診断士が Claude Code で仕事を回している話」を確認。X handle は記事中に明示されず、発掘失敗扱い。中小企業診断士 × AI 実装は空白に近く、ofmeton が踏み込みやすい領域。
- **B5 週末企業診断士きむ**: note 「SNS 更新が続かない経営者向け、過去資産を AI で蘇らせる発信術」を確認。発信支援に特化しており、ofmeton の業務自動化全般とは住み分け可能。
- **B6 社労士 × AI 発信**: 検索では業界記事 (久米和子 note「AI 社労士」等) や法律事務所コラムは多数あるが、X で継続発信している社労士の handle は WebSearch で特定できず。**ofmeton が踏み込める空白**。
- **B7 行政書士 × AI 専業発信者**: ゆうき行政書士事務所等 note 単発記事はあるが X 継続発信者は確認不可。**ofmeton が踏み込める空白**。

---

## C. ofmeton が transfer すべき要素 (8 件)

1. **海外 A8 Liam Ottley の階段単価設計 ($5k → $60k → $250k+) → ofmeton は note 有料記事 500/980/1480円 + 将来の AI 自動化代行 5万/15万/30万円 の階段に展開**: 「最初は安く広く、ROI 実証を見せてから単価を上げる」を価格設計の SSOT にする。
2. **海外 A9 Nate Herk の数字付き ROI 開示 ($500K / 8 ヶ月) → ofmeton は「Before-After + 数字 + 期間」を全 X 投稿のテンプレに**: 国内 10 アカ調査で空いていた「数字付き ROI」を ofmeton が埋める標的。
3. **国内 B1 畠山謙人の「CLAUDE.md テンプレ配布」型コンテンツ → ofmeton は「業種別 Claude プロンプト集」を note 有料記事の中核に**: 開示の徹底 (プロンプト全文 / 業種別カスタマイズ手順 / 失敗パターン) が読者の信頼を作る。
4. **海外 A5 swyx の "AI Engineer" カテゴリ命名 → ofmeton は「AI 翻訳者」「業種別 SOP デザイナー」等の用語を発明し、検索上の最先行者を取りに行く**: カテゴリ命名による先行者利益を狙う。
5. **海外 A10 David Ondrej の断言型フック ("SaaS is dead. Agents killed it.") → ofmeton は「日本の中小経営者は AI を "節約" に使いがちだが、本当に効くのは "新規受注獲得" だ」型の断言で X 投稿のフックを強化**: 国内 10 アカ調査の空白「失敗談先行 / 数字付き断言」を埋める。
6. **海外 A6 Matt Wolfe の AI ツール DB / A14 Rowan Cheung の日次 5 分 NL → ofmeton は wiki/publishing 配下に "業種別 AI 自動化 SOP DB" を蓄積、note メンバーシップで継続購読化**: 単発記事ではなく「DB 化された資産」が継続収益の鍵。
7. **国内 B1 畠山謙人の「Forbes 級ロングフォーム X 投稿」 (1 投稿で 339万リーチ) → ofmeton は X 単発投稿の中に "ロングフォーム月 1 本" を組み込み、note 有料記事への送客導線にする**: X の長文機能 (~25,000 字) を活用したリーチ獲得戦略。
8. **海外 A11 Allie K. Miller の "AI ビジネス" 領域への横展開 → ofmeton は LinkedIn / Instagram 連動を Phase 2 以降で検討**: 単独媒体ではなく LinkedIn (B2B / 経営者リーチ) も視野に入れる。

---

## D. 発掘プロセスメモ (調査の信頼性メタ)

### 調査の制約

1. **X 直接 fetch は全件 HTTP 402 (Payment Required) で不可**: x.com / twitter.com 配下を WebFetch すると認証要求が返る。フォロワー数や bio 文の一次確認は不可能で、すべて WebSearch 経由の記事側二次情報。
2. **フォロワー数は誤差含み**: 記事の執筆時点と 2026-05-25 現在で 1-3 ヶ月のズレがあり、特に @nateherk (2025-05 アカウント開設) のような新規アカは数字が大きく変動している可能性。
3. **国内検索の限界**: 「社労士 × AI」「行政書士 × AI」「製造業経営者 × AI」「女性経営者 × AI」のいずれも、X で継続発信している個人 handle を 1 つも特定できず。記事の中で個別の発信者名 (久米和子 / morinaga-office 等) は出るが、X 上の活動量は確認不可。**この空白こそ ofmeton の機会**。

### 発掘失敗リスト (URL 確認できず除外)

| 候補 | 理由 |
|---|---|
| @Suhail (Mighty Networks 創業者) | 検索で AI 自動化への直接接続が弱く、ofmeton の transfer 対象として優先度低と判断し A 章から除外 |
| @sama (Sam Altman) | OpenAI CEO だが ofmeton ターゲット (非エンジニア経営者) への翻訳トーンとは遠いため除外 |
| @sullyomarr (記載は別人の Ahmed Omar / Sully.ai) | 検索結果で同名異人の医療 AI 創業者 Sully.ai の Ahmed Omar が出てしまい、AI Engineer 系の Sully (@SullyOmarr) は実在確認できたが内容は medical AI 中心で ofmeton transfer 対象度低のため A 章から除外 |
| 王子かわはし事務所 中小企業診断士 X handle | note 記事は実在確認 (URL https://note.com/oji_office/n/na9b04bac9eef) だが X handle 特定できず B4 で「handle 未確認」として記録 |
| 週末企業診断士きむ X handle | note 記事 (URL https://note.com/kimu_shindan/n/n836341782565) は実在、X handle は @kimu_shindan を推定だが未検証 |
| 社労士 × AI X 発信者 | 業界記事多数だが X 上の個人発信者 handle 特定不可 |
| 行政書士 × AI X 発信者 | 同上 |
| 弁護士 × AI X 発信者 | リーガルアクセス CEO 福島駿太氏など note 発信は確認できたが X handle 未特定 |

### 信頼性ランク

| ランク | アカウント | 確認方法 |
|---|---|---|
| **A (handle + bio + 活動内容すべて二次情報で確認)** | A1, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A14, A15, A16, B1, B2 | 公式サイト / Wikipedia / 主要メディア記事 / podcast インタビュー |
| **B (handle 確認、フォロワー数は記事側数字を採用)** | A2, A13, A17, B3 | 主要メディア記事 / podcast |
| **C (handle 推定 or 未確認、参考扱い)** | B4, B5 | note 記事は確認できたが X handle 未特定 |
| **失敗** | 社労士 / 行政書士 / 弁護士 / 製造業 / 女性経営者 × AI 各領域 | WebSearch で個人 handle 到達できず |

### 次フェーズへの引き継ぎ

- 信頼性ランク C の B4 / B5 は、twitterapi.io か Playwright で X handle の一次確認を行うのが妥当。
- 発掘失敗領域 (社労士 / 行政書士 / 弁護士 / 製造業 / 女性経営者) は ofmeton にとって "空白市場" の確証。Phase 1 以降は **発掘ではなくこの空白を自分で埋める** 方向に振る。
- 海外 A 章はすべて handle が confirm されたため、Phase 1 で X content sourcing / inspiration ingest の対象として確定可能。
