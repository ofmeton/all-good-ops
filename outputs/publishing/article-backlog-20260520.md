# 過去ビルド棚卸し（記事化候補 backlog）

> 作成: 2026-05-20 / 担当: brand-publisher
> 目的: 発信ピボット（ofmeton 名義 X/Instagram/note）の note 記事ネタとして、ユーザーが過去 Claude と一緒に構築した成果物を棚卸しする。
> 名義: 全候補が ofmeton 名義で出せる（はぐりん名義は monetize-os 側で別棚）。

## 評価軸

| 軸 | 値 | 意味 |
|---|---|---|
| **価値** | A / B / C | A=note 有料記事(500-1480円)候補 / B=無料記事候補 / C=X スレッドや Insta カルーセル 1 セット止まり |
| **工数** | 低 / 中 / 高 | 低=半日 / 中=1-2日 / 高=3日以上 |
| **媒体** | note / X / IG / 全 | 主推奨媒体 |
| **完成度** | 完 / 進 / 失敗→学び | 記事の素材として現状どう扱えるか |
| **名義** | ofmeton | 全候補 ofmeton で出せる（混乱なし） |

## ⭐ ユーザー指定 #0: BSA-PA を記事化

詳細は §A-1 参照。失敗談先行型（撤退理由＝学び）として強い。価値A / 工数中 / note 980円帯。

---

## A. 自動化・運用システム

### A-1. BSA Proposal Automation (BSA-PA) — ⭐ 確定記事化

**何を作ったか**: ランサーズ / Coconala / CrowdWorks の 3 媒体から HP 制作案件を自動収集 → Claude headless で提案文生成 → Next.js ダッシュボードで人間確認 → Playwright で自動入力するシステム。

**構成**: `outputs/bsa/proposal-automation/`
- `src/collector/` — 3 媒体クローラ (Playwright + cookie 永続化)
- `src/generator/` — Claude headless 提案生成 (`claude -p` child_process spawn)
- `src/dashboard/` — Next.js + SQLite + リアルタイム fit80 フィルタ
- `src/notifier/` — Slack 通知 (Tier1 即時 + digest)
- `src/shared/` — adapter / fixture / parse test

**フック案** (note 記事 1 本):
- 「1 ヶ月 / 受注 0 / 200 万円相当の投資工数で BSA 自動提案システムを撤退した理由」
- 「Claude headless で提案文を量産したら何が起きるか — 案件サイト 3 媒体での実証」
- 「やってみて分かった: 案件サイト自動応募の構造的限界」

**勝ち筋**:
- 失敗談先行型（撤退）の note は希少 → ブクマされやすい
- システム構成図 / コード片 / 数字（返信率3.2% / 受注 0 / 1 ヶ月 / 31 提案）を全部出せる
- 撤退で得た 6 軸知見（テンプレ提案の限界 / プラットフォーム ALG / 個人開発リソース / etc.）

**推奨**: note 有料 980 円 (8000-12000 字 + コード片 + ダッシュボード画像). 価値A / 工数中.

**X / Insta 派生**:
- X スレッド: 「BSA-PA 撤退した。学んだこと 7 つ」(3 ツイート構成 × 2 セット)
- Insta カルーセル: 「自動応募 1 ヶ月の数字」(9 枚)

---

### A-2. ai-radar

**何を作ったか**: AI エコシステム機会発見 + Skills 事業防衛シグナル検知のための独立 Next.js ダッシュボード。

**構成**: `~/Projects/ai-radar/`
- Day 1: Next.js 16 + Supabase スキャフォールド
- Day 2: クロール → LLM スコアリング → DB 書込
- Day 3: リトライ機構 + Anthropic News + Tier1 cron + UI
- Day 4: Gmail 通知 (digest + Tier1 即時アラート)
- Day 5: Codex 深掘り統合 (Server Action + launchd デーモン)
- UI: Anthropic Design ベース

**フック案**:
- 「Anthropic News を見逃さないために自分用ダッシュボードを 5 日で作った」
- 「AI ニュース疲れを解決する: LLM スコアリング + Tier1 即時アラートの設計」
- 「Codex を Next.js Server Action から呼ぶ launchd デーモン構成」

**推奨**: note 980 円 (実装フローと 5 日分の retrospective を統合). 価値A / 工数中.

**X / Insta 派生**:
- X: 「5 日で作った AI 監視ダッシュボード」スレッド
- Insta: 「個人で作る AI ニュース選別の仕組み」9 枚

---

### A-3. all-good-ops 個人秘書エージェントチーム（このリポ）

**何を作ったか**: Claude Code 用の個人 OS。秘書ルーティング → 31 エージェント → 37 スキル → wiki/raw 知識ベース → 自己改善ループ → セッション振り返り。

**構成**:
- 31 agents (横断 + finance / life-planning / kodomo-ibasho / business-ops / communication / learning-creative / dev-automation)
- 37 skills (日次 / 仕訳 / 熟議 / 発信 / 印刷 / レスポンシブ / etc.)
- wiki/raw (Karpathy LLM Wiki パターン)
- self-improve.sh (AutoAgent 風週次)
- 1セッション=1ブランチ規律 + pre-commit hook
- メモリシステム (auto-memory + wiki + raw + 構造化ログ)

**フック案**:
- 「Claude Code で自分用秘書 OS を 2 ヶ月運用して分かったこと」
- 「個人開発者の意思決定を 30% 軽くする agent 体制設計」
- 「失業期間に Claude Code で個人 OS を作った話」(時系列)

**推奨**: note 有料 1480 円 (大型 12000-15000 字 / アーキ図 / 実コードへのリンク). 価値A / 工数高（書く時間）.

**注意**: 中身がリポ public で全部見られるので「タダで全部公開」になりがち → メンバーシップ素材としての方が向く可能性

---

## B. 個人案件 HP / LP 制作

### B-1. portfolio リポ (作例集 + 個人案件 2 件)

**何を作ったか**: ofmeton 名義のポートフォリオサイト + LP/HP サンプル 5 件 + 個人案件 2 件のホスティング。

**構成**: `~/Projects/portfolio/`
- 作例: minato / hidamari / spade-study / MERIDIAN / mokumoku-koubou (→ みどり工務店)
- 個人案件: hayama-tanada-biyori (棚田びより) / totonoeru-hayama (テラ一色)
- Vite + Vercel
- INDEX バー / WORK_DETAILS パターン

**フック案**:
- 「AI 共同制作の作例 5 件と気付き」(各サンプルの制作ポイント解説)
- 「みどり工務店 LP を Claude と一緒に作った話」(1 サイトの裏側)
- 「Hidamari Lab. — シネマティック背景 + マーキー実績の LP 設計」

**推奨**: 
- 各サンプル: 無料 note 記事 1 本ずつ (1500-3000 字 + before-after 画像)
- 統合まとめ: 980 円「作例 5 件の制作裏側 全部見せ」

価値B-A / 工数低 (素材完成済). 媒体: note + Insta カルーセル.

---

### B-2. minpaku-cleaning Plan 4 — 完成待ち

**何を作ったか** (進行中): 民泊清掃管理アプリ。Supabase + Vercel + Resend + LINE Bot。  
クライアント (LINE 名義はクライアント / C案確定)、 cdqtypyasyhwbpuibhtb プロジェクト。

**フック案** (完成後):
- 「個人事業者向け業務システムを Claude と 1 人で作った話」(980-1480 円)
- 「Supabase + Vercel + Resend + LINE の最小構成で本番運用に乗せるまで」
- 「クライアント納品まで漕ぎ着けた個人案件の振り返り」

**推奨**: 完成後に書く。価値A / 工数高 (完成待ち).

---

### B-3. terra-isshiki 葉山民泊 HP — 完成待ち

**何を作ったか** (進行中): 葉山町の民泊 HP 制作。

**フック案** (完成後):
- 「葉山の民泊 HP を 1 ヶ月で形にした流れ」
- 「お客さんの『気持ちが伝わるサイト』を作るためにやった 5 つのこと」

**推奨**: 完成後. 価値B / 工数中. 媒体: note + Insta.

---

## C. 業務委託 × 自動化 (RICE CREAM)

### C-1. 給与・労務 GAS 自動化

**何を作ったか**: 株式会社 BEAT ICE の RICE CREAM 店舗業務委託マネージャー業務として、給与明細自動生成 + 勤怠 + 月次バッチ の Google Apps Script 3 本を構築。法定帳簿フォーマット(給与明細・賃金台帳・労働者名簿) 整備。

**フック案**:
- 「アルバイト 7 名の給与明細を毎月 5 日に自動生成する GAS を作った」
- 「飲食店マネージャー業務を 8 時間 / 月 → 30 分にした自動化」
- 「業務委託で『マネジメント業務』を引き受けた人向け: 法定書類整備の最初の一歩」

**推奨**: note 980 円 (8000 字 + GAS コード + スプシ構造図). 価値A / 工数中.

**派生**: X「業務委託マネージャーの月次〆作業を 30 分にする方法」スレッド.

---

### C-2. メニュー印刷データ作成 (Real-ESRGAN + 入稿パイプライン)

**何を作ったか**: アイス商品メニュー印刷データを Real-ESRGAN MPS タイル推論で高解像度化 → 塗り足し → CMYK → トンボ → PDF。accea 等印刷所入稿。

**フック案**:
- 「印刷所入稿 PDF を Mac だけで作る: Real-ESRGAN + Pillow + ReportLab の組み合わせ」
- 「飲食店メニュー印刷を 1 人で完結させる小ワザ集」

**推奨**: 無料 note (3000 字) + Insta カルーセル「飲食店の印刷データ自作」.

価値B / 工数低 (素材完成済).

---

## D. 画像処理・印刷系（スキル化済み）

### D-1. Chroma-key グリッド切り出し

**何を作ったか**: LP 素材シート (マゼンタ / シアン背景) を 1 ファイル = 1 素材の透過 PNG に自動分割。`.claude/skills/chromakey-grid-split.md`. 

**フック案**:
- 「LP 素材を 1 枚画像から 30 個に自動分割するスクリプト」
- 「制作会社が手作業でやってる『1 素材 = 1 ファイル』を Python で 5 分」

**推奨**: 無料 note (2500 字 + コード). 価値B / 工数低.

---

### D-2. 印刷データ入稿パイプライン (skill 化済み)

`.claude/skills/print-data-prep.md`. C-2 と統合して扱う or 単体無料記事化.

---

## E. LP / HP 制作テクニック（skill 化済み）

### E-1. DESIGN.md / OUTLINE.md ワークフロー

**何を作ったか**: 「毎回 AI っぽいデザインになる問題」を構造的に解決する LP/HP 設計プロトコル。`.claude/skills/design-md-workflow.md`.

**フック案**:
- 「AI とデザインを共同制作する時に絶対書いてる 2 つのファイル」
- 「DESIGN.md があれば AI コラボでも一貫性が保てる理由」

**推奨**: 無料 note (3000-4000 字). 価値B / 工数低.

**統合候補**: 「Claude × Web デザイン 完全ガイド」(E-1〜E-5 統合の 980 円有料記事化候補)

---

### E-2. LP 軽量化 3 commit プレイブック

`.claude/skills/lp-optimization-playbook.md`. 不使用画像削除 → React UMD prod → WebP の 3 commit 分割。

**フック案**:
- 「LP を 3 commit で軽くする: 各 revert 容易な分割テクニック」

**推奨**: 無料 note (2000 字 + Before-After 数値) or X スレッド. 価値B / 工数低.

---

### E-3. Vercel team デプロイ罠回避

`.claude/skills/vercel-team-deploy-checklist.md`. git author email 一致確認 / silent ERROR 検知.

**フック案**:
- 「Vercel team プランで silent ERROR が出る本当の理由」
- 「`git config user.email` を間違えるだけで失敗する Vercel deploy」

**推奨**: 無料 note (1500 字) + X スレッド. 価値B / 工数低.

---

### E-4. レスポンシブ検証システム

`.claude/skills/responsive-layout.md` + `responsive-snap.sh` + `responsive-audit.sh`.

**フック案**:
- 「LP 制作時の『スマホ崩れ』を自動検出するスクリプト 2 本」
- 「`responsive-snap.sh` で 全 viewport の横スクロールを自動検出」

**推奨**: 無料 note (2500 字 + スクリプト + 検証 GIF) + Insta カルーセル. 価値B / 工数低.

---

### E-5. Motion Techniques 解析吸収（spade-co.jp 由来 7 技法）

`wiki/domain/lp-hp-design/motion-techniques.md`. 競合 LP の動き解析を体系化した知識ベース.

**フック案**:
- 「最新 LP の動きを 7 つの技法に分類した」(visual カルーセル向き)
- 「シネマティック背景 / マーキー実績 / scrollspy: 真似していい LP 動き 7 選」

**推奨**: note 無料 (4000 字 + 実装コード) + Insta カルーセル (1 技法 1 枚 × 9). 価値B / 工数中.

---

### E-6. Tailwind 全テキスト一括スケール

`.claude/skills/tailwind-bulk-text-resize.md`. 全 text-[Npx]/clamp を一括 N% スケール.

**フック案**:
- 「Tailwind の全テキストを一括 N% 拡縮するスクリプト」(X 1 投稿向き)

**推奨**: X 単発 + コード片. 価値C / 工数低.

---

## F. MCP 連携・環境

### F-1. freee MCP × 請求書発行自動化

**何を作ったか**: freee MCP セットアップ + invoice-manager 連携。BEAT ICE への請求書 (INV-0000000004) で実運用。

**フック案**:
- 「freee MCP を Claude Code に繋いで請求書発行を自動化した」
- 「freee の請求書 API で踏んだ 3 つの罠 (lines / partner_title / unit_price string)」

**推奨**: 無料 note (3000 字 + 設定手順). 価値B / 工数低.

---

### F-2. Google Sheets MCP (write 系の制約突破)

**何を作ったか**: 純正 Drive MCP の write 不可制約を xing5/mcp-google-sheets で解消. 19 ツール露出.

**フック案**:
- 「Drive MCP では足りない: Google Sheets MCP を OAuth 2.0 で繋ぐ」
- 「Claude に Google スプシを書かせる最短ルート」

**推奨**: 無料 note (2500 字). 価値B / 工数低.

---

### F-3. Codex MCP × 発信ビジュアル生成

**何を作ったか**: Codex MCP で gpt-image-2 を呼んで LP モック / 発信用ビジュアルを生成. ChatGPT サブスク枠で無料運用.

**フック案**:
- 「Codex MCP で発信用ビジュアルを ChatGPT サブスク枠だけで作る」
- 「Claude + Codex の二刀流: 文字は Claude / 画像は gpt-image-2」

**推奨**: 無料 note (2500 字 + 生成例 6 枚). 価値B / 工数低. **発信ピボットと相性最良**.

---

## G. メタ・失敗・ストーリー系

### G-1. BSA 撤退 → 発信ピボット — ⭐ 強いストーリー

**何を作ったか**: 失業手当残り 2 ヶ月で BSA 戦略撤退 → 発信ピボットへの構造的決定. 設計 spec + Phase 1-4 実装.

**フック案**:
- 「失業手当残り 2 ヶ月で『受注獲得戦略』を全部捨てた話」
- 「1 ヶ月 / 受注 0 で BSA 撤退を決めた構造分析」
- 「BSA → 発信ピボット: 同じ生活費目標を別ルートに置き換えるまでの 5 ステップ」

**推奨**: note 有料 980 円 (8000 字 + 数字 + 撤退判定基準). 価値A / 工数中.

**注意**: ストーリー性が強いので個人ブランド構築に効きやすい. ofmeton 名義の「初めて読まれる note」候補.

---

### G-2. 失業期間 × Claude Code OS 構築 (all-good-ops + ai-radar + portfolio 統合)

**何を作ったか**: 失業 4 ヶ月で all-good-ops / ai-radar / portfolio を並行構築. 個人 OS としての設計.

**フック案**:
- 「失業中の 4 ヶ月で Claude Code に投資したら何が貯まったか」
- 「『AI 時代の個人事業者ベース』を退職金で作った」

**推奨**: note 有料 980-1480 円 (10000-12000 字). 価値A / 工数高.

**注意**: A-3 (all-good-ops 紹介) と内容かぶる. G-2 は「人生ストーリー」軸 / A-3 は「OS 技術解説」軸で差別化.

---

## H. ローカル運用・足腰系

### H-1. ローカルファイル整理プロトコル

`.claude/skills/local-file-organization.md`. Downloads/Desktop の整理 5 フェーズ.

**フック案**:
- 「Downloads が 200 ファイル超えて整理した時にやった 5 ステップ」
- 「経理系を独立扱いするローカルファイル整理ルール」

**推奨**: 無料 note (2500 字). 価値C-B / 工数低. 個人事業者の足腰系として一定需要.

---

### H-2. Git リポジトリ整理プロトコル

`.claude/skills/git-repo-cleanup-protocol.md`. コミットしてない / プッシュしてないものの整理.

**フック案**:
- 「『コミットしてないファイルがいっぱい』状態を解消する 5 フェーズ」

**推奨**: 無料 note (2500 字). 価値C-B / 工数低. エンジニア寄り向け.

---

## I. 補助・テクニカル系（エンジニア寄り）

### I-1. session-report HTML レポート

`/session-report` skill. トークン使用量 / コスト分析 / subagent 使用状況の HTML 可視化.

**フック案**:
- 「Claude Code のセッションコストを HTML で可視化した話」

**推奨**: X 単発 + スクショ. 価値C / 工数低. ofmeton ターゲット外なのでロウフックで.

---

### I-2. claude -p ヘッドレス安定 default

メモリ `feedback_claude_headless_json.md`. child_process spawn での罠回避.

**フック案**:
- 「Claude Code のヘッドレスモードを child_process spawn する時の罠 4 つ」

**推奨**: X スレッド + zenn 記事化候補. 価値C / 工数低. **ofmeton 想定読者の範囲外** (エンジニア向け). 出すなら一律無料.

---

## 🌟 推奨初動 5 本（Phase 1 〜2026-07末で書く）

価値・工数・話題性のバランスから、最初の 2 ヶ月で書くなら以下 5 本:

| # | タイトル候補 | カテゴリ | 媒体 | 価格 | 工数 | 理由 |
|---|---|---|---|---|---|---|
| 1 | **「失業手当残り 2 ヶ月で受注獲得戦略を全部捨てた話」** | G-1 | note | 980円 | 中 | ストーリー強い・ofmeton 名義の初記事として最適。読者の自己投影が起こる |
| 2 | **「1 ヶ月 / 受注 0 で BSA 自動提案システムを撤退した理由」** | A-1 | note | 980円 | 中 | ユーザー指定 + 失敗談先行型 + コード片 + 数字。1 と組み合わせるとシリーズ化可能 |
| 3 | **「Anthropic News を見逃さないために自分用ダッシュボードを 5 日で作った」** | A-2 | note | 980円 | 中 | 「業務 × ツール名」具体性高い。発信に効くスタック (Next.js+Supabase+AI) で読者層広い |
| 4 | **「アルバイト 7 名の給与明細を毎月 5 日に自動生成する GAS」** | C-1 | note | 980円 | 中 | 中小事業者 / 業務委託マネージャー直撃。実運用していて数字が出せる |
| 5 | **「Codex MCP で発信用ビジュアルを ChatGPT サブスク枠だけで作る」** | F-3 | note | 500円 | 低 | 発信ピボットと相性最良 (自分の動線そのもの)。短期間で書ける |

### サブ初動 (X / Insta 派生)

- X: 各 note 公開時に 3 ツイート構成スレッド × 2 セット
- Insta: 各 note を 9 枚カルーセルに圧縮 (visual-design-system 準拠)
- スレッド最終投稿に note リンクで送客

### Phase 1 累計目標 (Phase 1 〜 2026-07末)

| 媒体 | 目標 | 上記 5 本との対応 |
|---|---|---|
| note 無料 | 月 3 本 (累計 9 本) | 5 有料の派生として無料記事 4 本書く (例: E-2 / E-3 / E-5 / F-2) |
| note 有料 | 月 1 本 (累計 3 本) | 上記 1, 2, 3 で達成 |
| X | 週 5 投稿 (累計 60+) | note 派生スレッドで補完 |
| Insta | 週 2 カルーセル (累計 24) | note 派生カルーセル + 単発技法解説 |

## 🌱 Phase 2 候補 (2026-08〜10末)

- B-1 (portfolio 作例 5 件統合): 「AI 共同制作の作例 5 件 全部見せ」
- A-3 (all-good-ops OS 解説): メンバーシップ素材候補
- B-2 (minpaku-cleaning 完成記事): 980-1480 円 高単価候補
- C-1 派生: 「給与明細以外: アルバイト管理を GAS で自動化する全部」
- E-5 (Motion Techniques 7 技法): visual カルーセル系で Insta 軸

## 🌳 Phase 3 候補 (2026-11〜2027-02末)

- G-2 (失業期間 × Claude Code OS): メンバーシップ深掘り
- B-3 (terra-isshiki 完成記事)
- 「上位事業 (AI 自動化代行) の輪郭」記事 — 商品設計と連動
- 累計 inspirations で見つかった新パターン記事

---

## 📌 棚卸し時点での留意点

- **ストック完成度高め**: 1-4 番手は素材が完成しており、執筆コスト中。Phase 1 で確実に届く
- **G-1 / A-1 のシリーズ化**: 失業×ピボット文脈で 2 本セットで読まれる設計が効く
- **Codex MCP 記事 (F-3)**: ofmeton の発信動線そのものなので、書く＝信頼性証明にもなる
- **個人案件 B-2/B-3 完成待ち**: Phase 2 以降の核になる「実案件→記事化」フロー。完成しないと出せない
- **エンジニア寄りネタ (I-1/I-2)**: ofmeton ターゲット範囲外。出すなら zenn / qiita で別運用検討
- **メンバーシップ素材分離**: A-3 / G-2 は「タダで全部読まれる note」と「メンバーシップ深掘り」の切り分けが必要 → conversion-designer に相談案件

## 📁 関連リポジトリ / ファイル

| カテゴリ | 主要パス |
|---|---|
| BSA-PA | `outputs/bsa/proposal-automation/` + `archive-snapshot/` |
| ai-radar | `~/Projects/ai-radar/` |
| portfolio | `~/Projects/portfolio/` |
| all-good-ops | このリポ |
| 個人案件 | `outputs/clients/{terra-isshiki,minpaku-cleaning}/` |
| 業務委託 (RICE CREAM) | `outputs/rice-cream-tokyo-*/` + Drive 連携 |
| 印刷 / 画像処理 | `.claude/skills/{chromakey-grid-split,print-data-prep,lp-optimization-playbook}.md` |
| MCP 設定 | memory `project_freee_mcp_setup.md` / `project_google_sheets_mcp_setup.md` / `reference_codex_mcp.md` |
| 振り返り素材 | `outputs/retrospectives/2026-04-23 〜 2026-05-20-1100` |

## 📅 次のアクション候補

このまま brand-publisher が以下を進めるオプション:

1. **#1 (G-1: BSA 撤退 → 発信ピボット 980円) の構成草案を作成** — SCQA + 失敗談先行型でアウトライン化
2. **#2 (A-1: BSA-PA 撤退 980円) の構成草案を作成** — ユーザー指定の一本目
3. **#5 (F-3: Codex MCP ビジュアル 500円) を一気書く** — 工数低・発信動線そのもの・最短で出せる
4. **棚卸しの優先度ユーザーレビュー** — Phase 1 5 本の入れ替え判断
