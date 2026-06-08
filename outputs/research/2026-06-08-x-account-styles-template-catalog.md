# X 6アカウント 投稿スタイル分析 → 投稿テンプレ型化カタログ

- date: 2026-06-08
- 手法: 2026-06-05 チャエン分析（`outputs/research/2026-06-05-chaen-x-account-analysis.md`）の分析フレーム踏襲
- 目的: X発信システムの投稿テンプレ拡充（現状 `template_chaen_gold` 1種のみ）。効果的な型を抽出・構造化し、次セッションで `apps/x-account-system/lib/curation/compose-templates.ts` に実装できる粒度で型化する
- 関連 spec: `docs/superpowers/specs/2026-06-08-xaccount-templates-approval-check-design.md` §3 T1
- データ収集: twitterapi.io / 6アカ×直近~40日 / 計1069投稿取得・**実コスト ¥25**
- 生データ: `raw/publishing/research/2026-06-08-account-styles/`（profiles・tweets・metrics.json・tops/・query-meta.json）
- 分析対象（オリジナル投稿のみ・リプライ/RT除外）: MakeAI_CEO / ClaudeCode_love / ClaudeCode_UT / nobel_824 / Gencoin8 / obsidianstudio9

---

## 0. サマリ（結論先出し）

6アカウントから、`template_chaen_gold` と重複しない**5つの効果的な投稿テンプレ**を抽出・型化した。

| 提案 ID | 由来 | 一言 | intent | 推奨fmat | ofmeton適合 |
|---|---|---|---|---|---|
| `template_value_deepdive` | ClaudeCode_love / obsidianstudio9 | 速報→感情増幅→箇条書き→ビフォーアフター→記事誘導の**保存版深掘り** | 保存 | **long**（単発長文。350-650字） | ◎ |
| `template_case_calm` | ClaudeCode_UT | 敬体・冷静・**事例/出典ベース**→「保存して試すといい」 | 信頼 | **medium/long**（単発96%。300-440字） | ◎◎（最適合） |
| `template_reaction_light` | MakeAI_CEO | 口語の感情リアクション先行→3行圧縮→「全部解説する↓」 | 認知/拡散 | **short→thread**（短い単発フック+番号スレ深掘り） | ○ |
| `template_contrarian_news` | nobel_824 | 「まじ？」常識破壊フレーミングの**逆張り速報1〜2文** | 議論/拡散 | **short(+article)**（極小本文+X Articleへ） | △（炎上リスク管理要） |
| `template_offer_savings` | Gencoin8 | 「知らないと損」**お得・無料配布**→手順→「今すぐ受け取る👇」 | 誘導/保存 | **medium/thread**（手順は番号スレも可） | ○（情報がある時限定） |

**全アカ共通の構造的事実**:
- **投稿 source = 100% iPhone**（6アカ全て）。チャエン分析と同じく「手動 or 本人クライアント経由」運用。X API 直投は使っていない → 当システムの chrome 予約投稿方針と整合。
- フォロワー単価（中央 like / フォロワー）首位は **Gencoin8 3.7%**（低頻度・高品質）、次いで ClaudeCode_love 0.68%。**量より密度**でも勝てる実証。
- 伸びる型は2系統に大別 → **(A) 記号フック×箇条書き×記事誘導の「保存テンプレ」**（love/UT/obsidian/Gencoin）と **(B) 短文×感情/逆張りの「拡散テンプレ」**（MakeAI/nobel）。
- **フォーマット次元（単発/スレッド/記事）も型を分ける**（詳細 §3.3）。主流は**単発ツイートに全部詰める**（UT 96%・obsidian 94%・love 77%）。例外2つ → **MakeAI は短い単発フック+本格スレッド**（thread 34%・平均6.7連結）、**nobel は短い単発+X Article**（article 11%）。当システムの fmat（short/medium/long/thread/article）はこの実態に紐づけて選ぶ。

---

## 1. 調査概要

- 期間: 2026-04-29 〜 2026-06-08（直近~40日）
- 各アカ取得数: 5アカ200件 / Gencoin8 69件（投稿数自体が少ない=低頻度運用）
- 定量計測軸（チャエン分析踏襲 + フォーマット軸を追加）: 投稿頻度・記号フック率・箇条書き率・CTA率・メディア付与率・文量中央値・絵文字密度・エンゲージ中央値・投稿時間帯・source・**フォーマット分布（単発/スレッド/X Article）**
- 定性分析: 各アカ like 上位15投稿を精読し型を抽出（`raw/.../tops/<handle>.md`）

---

## 2. アカウント別プロファイル

### 2.1 ClaudeCode_love（Claude Code Studio｜34,195フォロワー）
- 指標: 156投稿 / 4.12投稿/日 / **文量中央 399字**（p90 651）/ 記号フック 81% / 箇条書き 89% / CTA 95% / **メディア 92%**（動画107・写真49）/ 絵文字中央 3 / **like中央 233・BM中央 291**（6アカ最高エンゲージ）
- 勝ち筋: 【速報】【事件】【衝撃】の強記号フック + 😳の感情 → 「これ何がヤバいかというと👇」 → 「・」箇条書き要点 → 「つまり」意味づけ → **ビフォーアフターを矢印図（旧→新）で可視化** → 末尾で外部記事に誘導。**感情増幅と情報量の両立**。チャエン黄金型を「より長く・より感情的に・記事へ刈る」方向に振ったもの。
- 投稿時間: 20時台中心（夜）

### 2.2 ClaudeCode_UT（東大ClaudeCode研究所｜21,933フォロワー）
- 指標: 196投稿 / **7.27投稿/日**（最高頻度）/ 文量中央 335字 / 記号フック 92% / 箇条書き 79%（「▶︎」多用）/ CTA 85% / メディア 82% / like中央 43・BM中央 50
- 勝ち筋: 【保存版】【最新】【話題】フック + **敬体（ですます）の落ち着いた知的トーン** + 事例/出典ベース（「〜が話題になっている」）+ 「▶︎」箇条書き + 末尾の**控えめな行動提案「保存して、自分の次のプロジェクトで試してみるといい」**。煽らず「見ておく価値はある」程度の評価に留める信頼設計。**ofmeton の「非エンジニア翻訳・実装者」ポジションに最も近い文体**。
- 投稿時間: 17-22時台

### 2.3 MakeAI_CEO（mana｜株式会社MakeAI CEO｜24,098フォロワー）
- 指標: 61投稿 / 5.39投稿/日 / **文量中央 102字**（短）/ 記号フック 1.6%（ほぼ使わない）/ 箇条書き 23% / CTA 53% / メディア 38% / like中央 55
- 勝ち筋: **口語の感情リアクションを1行目に置く**（「オープンソース界、ガチで革命起きた。」「断言する。」「やばい、まじですごすぎぃぃ！！」）→ 2-3行で要点圧縮 → 「全部解説する↓」で誘導。記号テンプレに頼らず**生の興奮**で止める。本文は軽量で、深掘りは外部記事/動画に逃がす拡散特化型。
- 投稿時間: 12時・8時・18時

### 2.4 nobel_824（tatsuki｜11,169フォロワー）
- 指標: 132投稿 / 3.36投稿/日 / **文量中央 69字**（最短）/ 記号フック 1.5% / CTA 13%（低）/ メディア 44% / like中央 9 だが **like最大 8,039・RT最大 2,908**（突出した拡散アウトライヤー）
- 勝ち筋: 敬体で**「まじ？」「なぜ〜」の逆張り・常識破壊フレーミング**を1〜2文 → 引用元リンクへ。最大バズは「Microsoftが Claude Code 使用を事実上禁止（AIコストが人件費超え）」という**前提を覆すニュース**。RT が異常に伸びる＝議論喚起型。本文は極小で、解釈の余地と反発を意図的に残す。**ハイリスク・ハイリターン**（中央値は低い）。
- 投稿時間: 10-11時（朝）

### 2.5 Gencoin8（Codex研究ラボ｜5,764フォロワー）
- 指標: 38投稿 / **1.21投稿/日**（最低頻度）/ 文量中央 284字 / 数字フック 11% / 箇条書き 63% / CTA 74% / メディア 71% / **like中央 212・BM中央 199**（フォロワー単価 3.7% で6アカ首位）
- 勝ち筋: 「Claude Code終了のお知らせ📢」等の**煽り見出し（損失回避/逆張り）** + **「20万円分の環境を無料配布」「15万円分クレジット」の数字×お得** + 「コピペでOK」「保存推奨」+ 全角スペースで改行リズム調整 + 手順番号付き。**少数精鋭・お得情報に全振り**。投稿数が少なくても密度で勝つ実証。
- 投稿時間: 14-17時

### 2.6 obsidianstudio9（りゅう@Obsidianガチ勢｜3,279フォロワー）
- 指標: 192投稿 / 5.25投稿/日 / 文量中央 340字 / 記号フック 70% / 箇条書き 80% / CTA 96% / **メディア 91%**（写真100・動画77）/ like中央 33・**like最大 5,197**
- 勝ち筋: 構造は ClaudeCode_love と同型（【速報】+😳+「何がヤバいか👇」+箇条書き）だが **Obsidian ニッチに完全特化** + **日常対比フック**（「Netflix観る代わりに今夜1時間だけ〜しろ」「今夜やるかやらないかで差がつく」）+ 「5年後の自分が見たらどう思う?」**問いかけ** + **完全定型 CTA**「この下の記事を読むと理解が一気に深まる。マジでおすすめ👇」。テンプレ固定度が最も高く、量産に最適化。
- 投稿時間: 14時・11時

---

## 3. 横断比較

### 3.1 主要指標比較表

| アカウント | フォロワー | 投稿/日 | 文量中央 | 記号フック | 箇条書き | CTA | メディア | like中央 | BM中央 | フォロワー単価 |
|---|---|---|---|---|---|---|---|---|---|---|
| ClaudeCode_love | 34,195 | 4.1 | 399 | 81% | 89% | 95% | 92% | **233** | **291** | 0.68% |
| MakeAI_CEO | 24,098 | 5.4 | 102 | 2% | 23% | 53% | 38% | 55 | 59 | 0.23% |
| ClaudeCode_UT | 21,933 | **7.3** | 335 | **92%** | 79% | 85% | 82% | 43 | 50 | 0.20% |
| nobel_824 | 11,169 | 3.4 | **69** | 2% | 18% | 13% | 44% | 9※ | 6 | 0.08%※ |
| Gencoin8 | 5,764 | 1.2 | 284 | 5% | 63% | 74% | 71% | 212 | 199 | **3.7%** |
| obsidianstudio9 | 3,279 | 5.3 | 340 | 70% | 80% | **96%** | 91% | 33 | 33 | 1.0% |
| （参考）チャエン | 194,125 | 6.6 | — | 40% | 69% | 15%※ | 87% | 184 | — | 0.09% |

※ nobel は中央値が低い一方 like最大8,039の拡散アウトライヤー型。※チャエンの CTA 15% は「売り込み抑制」設計で、本6アカ（記事誘導が収益動線）とは設計思想が異なる。

### 3.2 型の分布（2系統）

- **(A) 保存テンプレ系**（love / UT / obsidian / Gencoin）: 記号 or 数字フック → 箇条書き → 意味づけ → 外部誘導。メディア必須・長め・BM（保存）が伸びる。**資産化・収益動線向き**。
- **(B) 拡散テンプレ系**（MakeAI / nobel）: 短文 → 感情 or 逆張り → 引用元へ。記号テンプレに頼らず生の言葉。RT が伸びる。**認知拡大・新規リーチ向き**。

→ 当システムは現状 (A) 系の `template_chaen_gold` のみ。**(A) のバリエーション拡充 + (B) 系の新規追加**で投稿の打ち手が広がる。

### 3.3 フォーマット次元（単発 / スレッド / 記事）

スタイル（型）とは別軸の **「投稿フォーマット」**を実測した（self-reply 連鎖でスレッド、`article` フィールドで X Article を判定。root 投稿単位）。当システムの `PublishFormat = short|medium|long|thread|article` に直結する。

| アカウント | root数 | 単発 | スレッド | 記事(X Article) | 単発の文量帯（短/中/長）| スレ平均連結 |
|---|---|---|---|---|---|---|
| ClaudeCode_UT | 197 | **96%** | 2% | 3% | 0 / 39 / **150** | 2.0 |
| obsidianstudio9 | 191 | **94%** | 4% | 2% | 7 / 48 / **124** | 2.0 |
| ClaudeCode_love | 158 | 77% | 22% | 2% | 7 / 15 / **99** | 2.2 |
| nobel_824 | 132 | 77% | 11% | **11%** | **71** / 13 / 18 | 4.5 |
| Gencoin8 | 40 | 70% | **25%** | 5% | 7 / 3 / **18** | 3.5 |
| MakeAI_CEO | 61 | 54% | **34%** | 11% | **27** / 5 / 1 | **6.7** |

（注: スレ平均2.0前後の love/UT/obsidian は「本文＋リンク返信」が大半で、真の物語スレは少ない。データ: `raw/.../format-dist.json`）

**フォーマットの読み取り**:
1. **主流は「単発ツイートに全部詰める」**。UT 96%・obsidian 94% がほぼ単発で、しかも**長文単発**（UT は long 150件 / 単発194件）。X の長文単発＝当システムの `fmat=long`。保存テンプレ系は長文単発が基本。
2. **MakeAI だけ本格スレッド多用**（thread 34%・平均6.7連結）。**短い単発フック（short）→ 番号付きスレッドで深掘り（thread）**の2段構え。例: 「Codexのプロンプト1行で業務自動化」(162字フック) → 【1】MCP →【2】プロンプト①…と6本連結。当システムの `fmat=thread` の手本。
3. **nobel は短い単発 + X Article**（article 11%・単発の71件が short）。本文は極小に保ち、**深掘りは X Article（`fmat=article`）へ逃がす**。タイトル例「AIに『任せる』ための最初の地図。OpenAI公式の無料資料『Codex 101』を読み解く」。当システムでは note/外部記事リンクが等価。
4. **拡散系（B）= short 主体、保存系（A）= long 主体**。intent と fmat が相関する（拡散→短く、保存→長く詰める）。

→ **キュレUI では「テンプレ(style) × fmat(format)」の2軸で選ぶ**のが正しい。本カタログの各テンプレに推奨 fmat を付与済（§4 各テンプレの `preferredFmats`）。特に `template_reaction_light` は short 単発と thread の**ペア運用**が型の本体。

---

## 4. テンプレカタログ（本体）

各テンプレは型化スキーマ（骨格 / スタイル修飾 / メタ）で定義。`examples` は実投稿の要約・抜粋（リンク短縮）。次セッションは §5 のマッピングで `compose-templates.ts` に実装する。

---

### T2. `template_value_deepdive` — 保存版・感情増幅・深掘り解説型
> 由来: ClaudeCode_love（like中央233・BM中央291で最強）/ obsidianstudio9

**骨格**
- `hookType`: 速報（【速報】【事件】【衝撃】【もはや事件】）
- `hookStrength`: strong
- `structure`: `["強記号フック+主語が何をしたか","😳等の感情1語","『これ何がヤバいかというと👇』","・箇条書き要点4-6","『つまり/要するに』で意味づけ","ビフォーアフターを旧→新の矢印図で可視化","外部記事へ誘導CTA"]`
- `tone`: 常体・高テンション・感情語を惜しまない（「地味に見えてかなり大きい」「正直どうかしてる(最大級の賛辞)」）。専門語は出すが直後に噛み砕く

**スタイル修飾**
- `mediaPolicy`: 必須（動画優先・92%付与）
- `ctaPolicy`: 毎回（末尾で外部記事/動画へ誘導。収益動線）
- `bulletStyle`: 「・」中黒。4-6点。各点は名詞止め or 短文
- `emojiPolicy`: 😳👀🔥👇 を要所に。中央3個
- `avoid`: `["箇条書きが7点超で間延び","感情語ばかりで具体が無い","ビフォーアフター図の矢印を省く（型の肝）","markdownの**太字**や#見出し"]`

**メタ**
- `intent`: 保存
- `targetLength`: 350-650字（fmat=medium〜long）
- `preferredFmats`: `["long","medium"]`
- `fmat根拠`: love/obsidian とも**長文単発が主流**（love long単発99件・obsidian 124件）。スレッド化せず1ツイートに詰め切る。記事リンクは末尾に付すのみ
- `referenceNote`: "@ClaudeCode_love / @obsidianstudio9"

**examples（実投稿・抜粋）**
1. 「【速報】Claude Codeから17,000以上の株式データに数秒でアクセスできるように😳 …接続方法も簡単👇 …これ、地味に見えてかなり大きい。今まで〔サイト開く→CSV探す→Excel→分析〕でも今からは〔接続→自然言語で質問→即分析〕。Claude Codeが『開発ツール』から『リサーチOS』に進化してきてる。」（like 4,213 / BM 5,513）
2. 「【事件】Anthropicが年収$750,000以上で雇うLLMアーキテクトの知識を、Stanfordが1時間の講義で全部教えてしまった😳しかも完全無料。 ・LLMの設計思想がゼロから ・実装レベルのアーキ解説 …これは講義じゃない。一次情報の解放です🤐」（like 2,040）

---

### T3. `template_case_calm` — 保存版・事例翻訳・敬体型 ★ofmeton 最適合
> 由来: ClaudeCode_UT（敬体・冷静・事例ベース）

**骨格**
- `hookType`: 権威（【保存版】【最新】+ 出典/事例提示）
- `hookStrength`: medium
- `structure`: `["【保存版】等+事実を1-2行（事例/出典ベース）","『〜について解説します/整理します』","▶︎ or ・で要点3","『〜という順序は他の業務でも機能する』等の一般化","控えめな行動提案『保存して、次のプロジェクトで試してみるといい』"]`
- `tone`: **敬体（ですます）・冷静・知的**。煽らない。評価は「見ておく価値はある」「コスト削減の話として見るのは惜しい」程度に抑制。一次情報・段取りを重視

**スタイル修飾**
- `mediaPolicy`: 推奨（動画/画像。82%）
- `ctaPolicy`: 毎回（ただし「保存して試すといい」の柔らかい誘導。売り込み感を消す）
- `bulletStyle`: 「▶︎」or「・」3点前後。事例の要素を端的に
- `emojiPolicy`: 控えめ（中央1個。👇程度）
- `avoid`: `["過度な煽り・誇張","😳の多用","『絶対』『必見』等の断定的売り込み","常体への混在（敬体で統一）"]`

**メタ**
- `intent`: 信頼
- `targetLength`: 300-440字（fmat=medium〜long）
- `preferredFmats`: `["medium","long"]`
- `fmat根拠`: UT は**96%が単発**（long 150件）。ほぼスレッドを使わず、落ち着いた長文単発で完結。当システムの主力 fmat として最も汎用的
- `referenceNote`: "@ClaudeCode_UT"

**examples（実投稿・抜粋）**
1. 「【保存版】Webデザイナーに毎回$1,800払っていたLP制作を、Claude Codeで4時間・$70以下に抑えた事例が話題。 Claudeに渡したのはたった5枚のスクショ。最初に7つの質問をさせてから作業を開始。…『まず7つの質問をさせる』段取りがClaudeの出力精度を大きく変えている。指示より先に文脈を渡す。この順序は、Webデザイン以外の業務でも同じように機能する。保存して、自分の次のプロジェクトで試してみるといい。」（like 820）
2. 「【保存版】GoogleのCEOが『1人+Claudeで、10人のGoogleチームに勝てる』と語った。…毎セッション開始時、Claudeは文脈も記憶もゼロに戻る。…そのポテンシャルを今の業務で引き出せるかは、セッションをまたいで文脈を保持する設計が入っているか。CLAUDE.mdとメモリ設定を組み込んで、翌日確かめて欲しい。」（like 234）

---

### T4. `template_reaction_light` — 口語・感情リアクション先行・軽量誘導型
> 由来: MakeAI_CEO（短文・拡散特化）

**骨格**
- `hookType`: 共感（生の感情リアクションを1行目に）
- `hookStrength`: strong
- `structure`: `["口語の感情リアクション1行（『ガチで革命起きた』『断言する。』『やばい、まじですごすぎぃぃ！！』）","2-3行で何が起きたか圧縮","『全部解説する↓』『〜の話を全部置いていく👇』で外部へ誘導"]`
- `tone`: 常体・口語・興奮ドリブン。記号テンプレに頼らず生の言葉。1人称の体験/感想が前面（「正直さっきから興奮で手が止まらない」）

**スタイル修飾**
- `mediaPolicy`: 任意（38%。テキスト単体でも成立）
- `ctaPolicy`: 毎回（「全部解説する↓」で記事/動画へ。本文は軽量に保つ）
- `bulletStyle`: 基本使わない（使っても3点まで・軽く）
- `emojiPolicy`: 控えめ（中央1個）。感情は絵文字でなく言葉で出す
- `avoid`: `["長文化（型の肝は軽さ。100字前後）","記号【】フックに頼る","箇条書きで説明し切る（深掘りは外部に逃がす）"]`

**メタ**
- `intent`: 認知（拡散・新規リーチ）
- `targetLength`: 80-250字（フック単発。深掘りスレは各ツイート~280字）
- `preferredFmats`: `["short","thread"]`
- `fmat根拠`: MakeAI は**thread 34%・平均6.7連結**で6アカ最多。**短い単発フック（short）→「全部解説する↓」→ 番号付きスレッド（【1】【2】…）で深掘り**の2段構えが型の本体。短い単発単体でも、スレッド誘導としても成立。当システムの `fmat=thread` の主たる手本（`THREAD_DELIMITER="---"` で本文を連結投稿）
- `referenceNote`: "@MakeAI_CEO"

**examples（実投稿・抜粋）**
1. 「オープンソース界、ガチで革命起きた。Hermes Desktopが頭おかしい。 ChatGPT・GPT-5.5・Codex・Claude Code Skills全部繋がる、Mac/Win/Linux対応のネイティブAIエージェントが本日パブリックプレビュー開始。…これ知らない人は2026年負け確定の話を全部解説する↓」（like 1,427）
2. 「断言する。Claude Code使ってる人、これ入れないと脆弱性を量産し続ける。 Anthropicが『security-guidanceプラグイン』をリリース。コード書いてる最中にリアルタイムで脆弱性を検出→その場で修正提案。全プラン無料。…全Claude Codeユーザー必見の新機能を全部解説する↓」（like 812）

---

### T5. `template_contrarian_news` — 逆張りニュース・常識破壊型
> 由来: nobel_824（like最大8,039・RT最大2,908の拡散アウトライヤー）

**骨格**
- `hookType`: 逆張り（「まじ？」「なぜ〜」+ 前提を覆す事実）
- `hookStrength`: strong
- `structure`: `["『まじ？』等の驚き+常識破壊ニュースを1-2文（『〜という、これまでの前提を覆す』フレーミング）","『〜について解説します/深掘りします』の一文","引用元リンク（本文は極小に保つ）"]`
- `tone`: 敬体・知的だが**結論を断定せず解釈の余地を残す**。反論・議論を誘発する論点を含む

**スタイル修飾**
- `mediaPolicy`: 推奨（44%。引用元動画/画像）
- `ctaPolicy`: 控えめ（13%。引用元へ送るのみ。保存・フォロー煽りはしない）
- `bulletStyle`: 基本使わない（1-2文の極小本文）
- `emojiPolicy`: ほぼ無し（中央0）
- `avoid`: `["事実誤認・誇張で炎上（逆張りは事実が正確な時のみ）","断定で逃げ場をなくす","長文の自説展開（短く問いを残す）","誰かを貶める逆張り（プロダクト/構造への問いに留める）"]`

**メタ**
- `intent`: 議論（拡散・RT獲得）
- `targetLength`: 60-280字（フック単発は極小。深掘りは記事側）
- `preferredFmats`: `["short","article"]`
- `fmat根拠`: nobel は**短い単発（short 71件）+ X Article 11%**。本文は1〜2文に保ち、深掘りは別フォーマット（X Article＝当システムでは `fmat=article` or note/外部記事リンク）へ完全に逃がす。本文を長くしない規律が拡散の肝
- `referenceNote`: "@nobel_824"
- ⚠️ **運用注意**: 当システムのチェック工程（T2 ファクト判定）を必ず通す。ofmeton の信頼ポジションを毀損しない範囲（プロダクト/業界構造への問い、人格攻撃でない）に限定。人間承認ゲートで温度感を必ず確認。

**examples（実投稿・抜粋）**
1. 「まじ？Microsoftが自社エンジニアにAI（Claude Code）の使用を事実上禁止しました。理由がかなり衝撃的で『AIを使うコストが、人間を雇うコストを上回ったから』という、これまでのAI導入の前提を根底から覆すようなものでした。…この構造的限界について実務的な視点で深掘りします。」（like 8,039 / RT 2,908）
2. 「OpenAI共同創業者Karpathyの CLAUDE.md が、GitHubトレンドで1位独走中。中身はライブラリでもアプリでもなく、たった65行のテキストファイル。…そこに書かれた4つの原則について解説します。」（like 2,566）

---

### T6. `template_offer_savings` — 損失回避・お得配布・手順型
> 由来: Gencoin8（フォロワー単価3.7%で首位・低頻度高密度）

**骨格**
- `hookType`: 数字（金額/特典の数字 + 損失回避）
- `hookStrength`: strong
- `structure`: `["煽り見出し（『〜終了のお知らせ📢』『知らないと損』）or 数字（『20万円分を無料配布』）","誰が/何を/いくら分タダかを1-2行","『今すぐ受け取る方法は👇』","・or 番号で特典/手順を列挙","『コピペでOK』『保存推奨』『今すぐやって👇』"]`
- `tone`: 常体・煽り強め・お得さ前面。FOMO（取り逃し回避）を喚起

**スタイル修飾**
- `mediaPolicy`: 推奨（71%。手順スクショ/画像）
- `ctaPolicy`: 毎回（強め。「今すぐ受け取る👇」「保存推奨↓」）
- `bulletStyle`: 「・」or 番号（1.2.3.）。手順は番号、特典は中黒
- `emojiPolicy`: 🔥📢💰👇（中央1）
- `avoid`: `["お得情報の実体が無いのに煽る（誇大・規約違反リスク）","期限/条件を曖昧にする","『誰でも』『絶対』の過剰約束"]`

**メタ**
- `intent`: 誘導（保存・行動喚起）
- `targetLength`: 200-400字（単発）/ 手順が多い時はスレッド分割
- `preferredFmats`: `["medium","thread"]`
- `fmat根拠`: Gencoin は**単発70%だが thread 25%**（平均3.5連結）。煽り見出し＋特典を単発に収める場合は medium、手順が長い場合は番号スレッドで分割（見出しツイートで止め→各手順を連結）
- `referenceNote`: "@Gencoin8"
- ⚠️ **適用条件**: 実在のお得情報（無料枠/配布/キャンペーン）がある時のみ。無い時に煽ると信頼を毀損する。

**examples（実投稿・抜粋）**
1. 「Claude Code終了のお知らせ📢 OpenAIが約20万円分のCodex開発環境を、無料で配ってる！ 今すぐ受け取る方法は… GitHubに公開リポジトリが1つでもあれば申請出来る！『Codex for OSS』 …こんな特典が全部タダ ・ChatGPT Pro 6ヶ月 ・Codexアクセス ・API使用クレジット …完全無料で申請する方法を詳しく解説します👇」（like 3,400 / BM 4,644）
2. 「OpenAI APIクレジットが『15万円分』設定を1つオンにするだけで使える制度を開始🔥 誰でも受け取れるから今すぐやって👇 名前は Data Sharing Program。やることは簡単 〔Dashboard→Data Controls→Sharing→ON〕…」（like 372）

---

## 5. 既存システムへの落とし込み（次セッション実装メモ）

### 5.1 ComposeTemplate へのマッピング

実装先: `apps/x-account-system/lib/curation/compose-templates.ts`（`COMPOSE_TEMPLATES` レジストリ）+ フロント同期 `apps/xad-dashboard/lib/curation-formats.ts` の `TEMPLATE_OPTIONS`（id 完全一致）。

spec §3 T1 で `ComposeTemplate` を `tone` / `structure` / `hookType` / `hookStrength` / `referenceNote` 拡張予定。本カタログはさらに `examples` / `intent` / `mediaPolicy` / `ctaPolicy` / `avoid` を持つ。実装時は以下の対応で `systemPromptPatch` を合成する:

| カタログ・フィールド | ComposeTemplate での扱い |
|---|---|
| hookType / hookStrength / structure / tone | spec拡張フィールドに格納 → `buildWriterSystemPrompt` で prompt 文に展開 |
| **examples** | `systemPromptPatch` 末尾に「## 参考例」として2本埋め込む（**再現性に最も効く**。必須化推奨） |
| intent | `description` に併記 or 新フィールド。キュレ時の型選択ヒント |
| mediaPolicy / ctaPolicy / bulletStyle / emojiPolicy / avoid | `systemPromptPatch` の箇条書きルールに反映 |
| **preferredFmats / fmat根拠** | 既存フィールド。**テンプレ(style)と fmat(format)は別軸**。キュレUI（`CurationClient.tsx` の format/template 2 select）は両方をユーザーに選ばせる前提。テンプレ選択時に `preferredFmats[0]` を fmat の既定にプリセットすると操作が減る（例: reaction_light→short、value_deepdive→long） |

**fmat 観点の実装含意（§3.3 由来）**:
- `template_reaction_light` は **short 単発 と thread のペア**が型の本体 → fmat=thread 選択時は writer に「番号付きスレッド（【1】【2】…）で深掘り」を指示。`thread-format.ts` の `THREAD_DELIMITER="---"` で本文を分割投稿（既存 `segmentForPublish` が処理）。
- `template_contrarian_news` は fmat=article（or note 記事リンク）と組む前提。本文を long にしない規律を systemPromptPatch に明記。
- 保存系（value_deepdive / case_calm）は **long 単発が基本でスレッド化しない** → fmat=long を既定に。

### 5.2 推奨実装順（優先度）

1. **`template_case_calm`（T3）** ← ofmeton ポジション（非エンジニア翻訳・実装者）に最適合。最優先で型2に。
2. **`template_value_deepdive`（T2）** ← 最強エンゲージ実証。`template_chaen_gold` の長尺・感情増幅版として型3に。
3. **`template_reaction_light`（T4）** ← 拡散用の軽量短文。系統(B)の入口。
4. `template_contrarian_news`（T5）/ `template_offer_savings`（T6）← 効果は高いが**炎上/誇大リスク**あり。チェック工程(T2)+人間承認ゲート前提で、運用が固まってから追加。

spec の「2〜3種追加」に対しては **1〜3 を先行実装**し、4は条件付き後追いを推奨。

### 5.3 実装時の検証（spec §3 T1 準拠）

- `buildWriterSystemPrompt(templateId)` の vitest: 各テンプレ → prompt に tone/structure/hook/examples が反映されること
- `resolveTemplate` / `isKnownTemplate` が新 id を解決すること
- dashboard `TEMPLATE_OPTIONS` と backend `COMPOSE_TEMPLATES` の id 一致（drift 検知。spec で `/admin/templates` endpoint 化予定）

---

## 付録: 主要指標早見

- 全アカ source = 100% iPhone（X API直投なし）
- エンゲージ最強: ClaudeCode_love（like中央233/BM291）
- フォロワー単価最強: Gencoin8（3.7%・低頻度高密度）
- 拡散アウトライヤー: nobel_824（like最大8,039・RT2,908／逆張りニュース）
- 最高頻度: ClaudeCode_UT（7.3投稿/日）
- 投稿時間帯: 各アカ 11-22時に集中（夜=love/UT、朝=nobel、昼=MakeAI/Gencoin/obsidian）
- フォーマット主流: **単発ツイート**（UT 96%・obsidian 94%）。例外=MakeAI（thread 34%・平均6.7連結）/ nobel（X Article 11%）。詳細 §3.3
- 生データ所在: `raw/publishing/research/2026-06-08-account-styles/`（profiles `<handle>.json` / tweets `tweets/<handle>.json` / 定量 `metrics.json` / フォーマット分布 `format-dist.json` / 上位投稿 `tops/<handle>.md` / コスト `query-meta.json`）
