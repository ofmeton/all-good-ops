# 競合アカウント バズ投稿の書き方・スレッド構成研究

- date: 2026-06-13
- 対象: MakeAI_CEO / ClaudeCode_love / ClaudeCode_UT / nobel_824 / Gencoin8 / obsidianstudio9 / masahirochaen / X Article
- 目的: X発信システム（ofmeton）の投稿テンプレと wiki へ、バズ投稿の書き方・スレッド運用を反映する
- 広域統計ベース: `raw/publishing/research/2026-06-08-account-styles/`
- スレッド本文ベース: `raw/publishing/research/2026-06-13-viral-and-thread-study/`
- gap-fill ベース: `raw/publishing/research/2026-06-13-chaen-article-study/`
- 注意: 2026-06-08 raw は 6アカ横断の広域分布（metrics / format / top15 close-read）を見るために使う。2026-06-13 raw は top-by-faves sample（12 roots/handle）を `getThread()` で再取得した full thread body として、Part 2 のスレッド構成の主証拠にする。gap-fill raw はチャエン 20 top-by-faves tweets / 15 thread roots / X Article 9本の full body を補う。

---

## 0. 使用データ

- `metrics.json`: 6アカウント合計 775 original posts（MakeAI_CEO 61 / ClaudeCode_love 156 / ClaudeCode_UT 196 / nobel_824 132 / Gencoin8 38 / obsidianstudio9 192）
- `format-dist.json`: root 投稿単位の single / thread / article 判定。root 合計 779（format 集計は root 判定、metrics は original posts 集計のため 4 件差がある）
- `tops/*.md`: 各アカウント like 順 top15、合計 90 投稿の close-read
- `tweets/*.json`: 全 1069 tweets。root + 自己返信を含むため、限定的に conversationId 単位のスレッド片を観測可能
- `query-meta.json`: 2026-06-08 取得、61 calls、total_tweets_returned 1069、estimated_cost_jpy 25
- `raw/publishing/research/2026-06-13-viral-and-thread-study/*.threads.json`: 2026-06-13 取得。各 handle 12 roots の top-by-faves sample、`{ handle, root, thread: Tweet[] }`。thread は取得できる範囲で author filter 済み。
- `raw/publishing/research/2026-06-13-chaen-article-study/masahirochaen.tweets.json`: チャエン top-by-faves 20 posts。raw twitterapi.io shape（text / likeCount / bookmarkCount / viewCount / displayTextRange 等）。
- `raw/publishing/research/2026-06-13-chaen-article-study/masahirochaen.threads.json`: チャエン 15 roots の own-thread sample。
- `raw/publishing/research/2026-06-13-chaen-article-study/articles.json`: X Article 9本の full body。対象は nobel_824 5 / MakeAI_CEO 2 / ClaudeCode_love 1 / obsidianstudio9 1。
- `raw/publishing/research/2026-06-13-chaen-article-study/metadata.json`: 2026-06-13 取得、source twitterapi.io、article detected/fetched 9。

---

# Part 1: バズ投稿の書き方

## 1. Hook-type distribution

`metrics.json` の定量フック:

| handle | bracket_hook | num_hook | question_hook | like中央値 | like最大 |
|---|---:|---:|---:|---:|---:|
| ClaudeCode_UT | 91.8% | 0.0% | 0.5% | 43 | 1,407 |
| ClaudeCode_love | 81.4% | 0.0% | 0.0% | 233 | 4,213 |
| obsidianstudio9 | 70.3% | 0.0% | 3.1% | 33 | 5,197 |
| Gencoin8 | 5.3% | 10.5% | 0.0% | 212 | 3,400 |
| MakeAI_CEO | 1.6% | 0.0% | 11.5% | 55 | 1,427 |
| nobel_824 | 1.5% | 1.5% | 2.3% | 9 | 8,039 |

読み取り:
- 保存・解説系は `【速報】【保存版】【最新】` の bracket hook が主流。ClaudeCode_UT 91.8%、ClaudeCode_love 81.4%、obsidianstudio9 70.3%。
- 拡散・口語系は bracket をほぼ使わない。MakeAI_CEO 1.6%、nobel_824 1.5%。代わりに「ガチで革命起きた」「断言する」「まじ？」の生の一言で止める。
- 数字 hook は全体では低いが、Gencoin8 は 10.5%。「20万円分」「15万円分」「5つの構成」のように、金額・個数・手順の実利に寄せる時だけ強い。

`tweets/*.json` の original posts 775 件を1行目で簡易分類した補助集計:

| 1行目分類 | 件数 | 比率 |
|---|---:|---:|
| `【】` 等の記号フック | 447 | 57.7% |
| 平叙・ニュース提示 | 275 | 35.5% |
| 口語リアクション・損失回避 | 30 | 3.9% |
| 問い | 17 | 2.2% |
| 数字始まり | 6 | 0.8% |

この補助集計は raw text からの regex 分類で、`metrics.json` の bracket / number / question とは別に「口語リアクション」を切り出したもの。

## 2. 1行目の型

### A. 記号 + ニュース

主に ClaudeCode_love / ClaudeCode_UT / obsidianstudio9。top15 でも ClaudeCode_love は 14/15、ClaudeCode_UT は 11/15、obsidianstudio9 は 9/15 が `【】` 始まり。

型:
- `【速報】` + ツール/企業/人物が何をしたか
- `【保存版】` + 無料講義/事例/手順
- `【衝撃】【事件】` + 既存前提が変わる事実

伸びた例:
- @ClaudeCode_love: `【速報】Claude Codeから17,000以上の株式データに数秒でアクセスできるようになりました`（like 4,213 / BM 5,513）
- @ClaudeCode_UT: `【保存版】Webデザイナーに毎回$1,800払っていたLP制作を、Claude Codeで4時間・$70以下に抑えた事例`（like 820 / BM 1,283）
- @obsidianstudio9: `【実は】「Netflix観る代わりに今夜1時間だけObsidian + Claudeを構築しろ」`（like 5,197 / BM 6,364）

### B. 口語リアクション

主に MakeAI_CEO。bracket_hook は 1.6% しかないが、like最大 1,427 を出している。

型:
- `オープンソース界、ガチで革命起きた。`
- `断言する。`
- `やばい、まじですごすぎぃぃ！！`
- `Claudeが教えてくれた裏技、ガチでヤバすぎる。`

役割は「情報の正確な分類」より「人間の温度でスクロールを止める」こと。本文は 2-3 行で圧縮し、深掘りは `全部解説する↓` で thread / article / 外部へ逃がす。

### C. 逆張り・常識破壊

主に nobel_824。中央値 like は 9 と低い一方、最大 like 8,039 / RT 2,908 の突出アウトライヤーがある。

型:
- `まじ？` + 前提を覆すニュース
- `なぜ〜なのか`
- `〜という、これまでの前提を根底から覆す`

伸びた例:
- @nobel_824: Microsoft が Claude Code 使用を事実上禁止、理由を「AIコストが人件費を上回った」と framing（like 8,039 / RT 2,908 / BM 2,700）
- @nobel_824: Karpathy の `CLAUDE.md` を「たった65行のテキストファイルが累計10万スター超え」と framing（like 2,566 / BM 4,503）

ofmeton で使う場合は、人格攻撃ではなく「プロダクト/業界構造への問い」に限定し、事実確認を必ず通す。

### D. 数字 + お得 / 手順

主に Gencoin8。投稿頻度は 1.21/day と低いが、like中央値 212、BM中央値 199、フォロワー単価は高い。

型:
- `20万円分を無料配布`
- `15万円分`
- `5つの構成`
- `11のステップ`

伸びた例:
- @Gencoin8: `Claude Code終了のお知らせ📢 OpenAIが約20万円分のCodex開発環境を、無料で配ってる！`（like 3,400 / BM 4,644）
- @Gencoin8: `『Codex』で完璧なAI社員を5人雇い...5つの構成`（like 1,962 / BM 2,900）

## 3. 文量

`metrics.json` の中央値 / p90:

| handle | len_median | len_p90 | 読み取り |
|---|---:|---:|---|
| nobel_824 | 69 | 561 | 短文が基本だが、たまに長文構造解説 |
| MakeAI_CEO | 102 | 246 | 100字前後の短いフック投稿が中心 |
| Gencoin8 | 284 | 1,021 | medium中心だが、手順投稿は長文化 |
| ClaudeCode_UT | 335 | 439 | 300-440字の落ち着いた長文単発 |
| obsidianstudio9 | 340 | 502 | 340字前後で固定テンプレ量産 |
| ClaudeCode_love | 399 | 651 | 最も長文寄り、情報量と感情を両立 |

`tweets/*.json` original posts の 140 / 280 字 band 補助集計:

| handle | short(<=140) | medium(141-280) | long(>280) |
|---|---:|---:|---:|
| MakeAI_CEO | 35 | 22 | 4 |
| ClaudeCode_love | 10 | 24 | 122 |
| ClaudeCode_UT | 6 | 39 | 151 |
| nobel_824 | 94 | 19 | 19 |
| Gencoin8 | 12 | 7 | 19 |
| obsidianstudio9 | 11 | 50 | 131 |

結論:
- 保存系は long 単発で勝つ。ClaudeCode_love / ClaudeCode_UT / obsidianstudio9 は long が多数。
- 拡散系は short で勝つ。MakeAI_CEO と nobel_824 は short 比率が高い。
- Gencoin8 は medium/thread の中間。お得情報と手順を詰めるため、p90 が 1,021 まで伸びる。

## 4. 記号・絵文字

`metrics.json` の emoji_median:

| handle | emoji_median | media_pct | cta_pct |
|---|---:|---:|---:|
| ClaudeCode_love | 3.0 | 92.3% | 94.9% |
| obsidianstudio9 | 3.0 | 90.6% | 96.4% |
| MakeAI_CEO | 1.0 | 37.7% | 52.5% |
| ClaudeCode_UT | 1.0 | 81.6% | 84.7% |
| Gencoin8 | 1.0 | 71.1% | 73.7% |
| nobel_824 | 0.0 | 43.9% | 12.9% |

読み取り:
- `😳 👀 🔥 👇` は保存系テンプレの視線誘導に使われる。ClaudeCode_love / obsidianstudio9 は中央値 3。
- ClaudeCode_UT は `👇` 程度に抑える。敬体・信頼型なので絵文字過多にしない。
- nobel_824 はほぼ絵文字なし。逆張りニュースは温度を下げて論点を残す。
- `・` 箇条書き、`▶︎`、`①②③` は保存・手順の可読性を作る。bullet_pct は ClaudeCode_love 89.1%、obsidianstudio9 80.2%、ClaudeCode_UT 78.6%、Gencoin8 63.2%。

## 5. CTA / 保存誘導

CTA率:
- obsidianstudio9: 96.4%
- ClaudeCode_love: 94.9%
- ClaudeCode_UT: 84.7%
- Gencoin8: 73.7%
- MakeAI_CEO: 52.5%
- nobel_824: 12.9%

型:
- 保存系: `保存して、次のプロジェクトで試してみるといい` / `保存推奨` / `週末に見ておくのが良いです`
- 記事誘導系: `この下の記事を読むと理解が一気に深まる。マジでおすすめ👇`
- 拡散系: `全部解説する↓` / `全部置いていく👇`
- お得系: `今すぐ受け取る方法は👇` / `コピペでOK` / `今すぐやって👇`
- 逆張り系: CTA をほぼ置かず、引用元リンク・記事へ送る。売り込み感を消す。

ofmeton では、非エンジニア向けの信頼を優先するため、通常は ClaudeCode_UT 型の控えめ CTA が最も合う。MakeAI/Gencoin 型の強 CTA は「手順・配布・無料枠」など実利がある時だけ使う。

## 6. Like-top 投稿を分ける質的特徴

top15 close-read の共通点:

1. 1行目で「何が変わったか」を言い切る
   - `株式データに数秒でアクセス`
   - `LP制作を4時間・$70以下`
   - `20万円分のCodex開発環境`
   - `MicrosoftがAI使用を事実上禁止`

2. 具体のあとに意味づけがある
   - ClaudeCode_love: `Claude Codeが「開発ツール」から「リサーチOS」に進化`
   - ClaudeCode_UT: `指示より先に文脈を渡す。この順序は他の業務でも機能する`
   - obsidianstudio9: `Obsidianが"AIのOS"に変わった瞬間`

3. 保存される投稿は「あとで使える」形に落ちている
   - コマンド、手順、設定パス、プロンプト、5選/11ステップがある。
   - BM が like を上回る例が多い（ClaudeCode_love top1 like 4,213 / BM 5,513、Gencoin8 top1 like 3,400 / BM 4,644）。

4. 拡散される投稿は「議論の余白」を残す
   - nobel_824 top1 は like 8,039 / RT 2,908。本文は短く、ニュースの解釈を読者に開かせている。

5. 画像/動画の支えが強い
   - media_pct は ClaudeCode_love 92.3%、obsidianstudio9 90.6%、ClaudeCode_UT 81.6%。テキストだけで勝つより、実物/動画/スクショを添える投稿が多い。

## 7. チャエン(@masahirochaen) gap-fill

`masahirochaen.tweets.json` は 20 top-by-faves posts。既存テンプレ名の参照元だが、2026-06-13 の6アカ study には入っていなかったため補完した。

### 定量

| 指標 | 値 |
|---|---:|
| top tweets | 20 |
| like 中央値 / 最大 | 249 / 2,527 |
| BM 中央値 / 最大 | 204 / 1,442 |
| view 中央値 / 最大 | 64,620 / 329,271 |
| raw text length 中央値 / p90 | 241 / 357 |
| displayTextRange 終端 中央値 / p90 | 151 / 169 |
| `【】` 始まり | 7/20 |
| `速報` 含み | 3/20 |
| 箇条書きあり | 11/20 |
| 数字含み | 5/20 |

読み取り:
- raw text は URL/改行/添付表示込みで中央値 241 字だが、X の表示レンジは中央値 151 字、p90 169 字。見た目は「170-220字前後の短い断定」に近い。
- `【速報】` は強いが必須ではない。20本中 `【】` 始まりは7本だけ。むしろ上位には `Claude Code有能すぎる。`、`Claude Codeのデスクトップアプリ、ついに最大6画面まで分割表示できるようになっていた。` のような、ツール主語 + 断定/体感の1行目が多い。
- `保存版` ラベルは top20 では 0/20。保存される理由はラベルより、手順・数字・使いどころが本文にあること。
- 絵文字は強くない。観測上は `⚡️` や `👇` が少数で、テンポは改行と箇条書きで作る。

### 1行目の型

チャエンの勝ち筋は「速報屋」だが、bracket hook だけではない。以下の3系統が混ざる。

1. 体感断定:
   - `Claude Code有能すぎる。YouTubeのリンクを貼るだけで、勝手に切り抜き動画を複数本作ってくれた。`（like 638 / BM 710）
   - `Claude Codeの中の人が語る『長時間自律実行のコツ』がめちゃくちゃ実践的。`（like 325 / BM 459）

2. 速報・朗報:
   - `【速報】ElevenLabsが「Flows Agent」公開。`（like 127 / BM 91）
   - `【⚡️速報】Claude Opus 4.8が登場。Opus 4.7の上位版で、価格は完全据え置き`（like 250 / BM 80）
   - `【朗報】Claude CodeのPro/Max制限がリセット`（like 243 / BM 56）

3. 保存されるリスト/概念:
   - `海外でバズっていた「2026年に理解すべきAI概念20選」`（like 1,386 / BM 1,442）
   - `これは裏技ですが、Claude Codeで資料を作る際は、まず骨格だけを作り、その後ブラウザ操作でManusを動かして資料化すると、精度が高くなります。`（like 276 / BM 346）

効いているのは、1行目で「新しい事実」か「使った体感」を断定し、2段落目で何ができたかを具体化し、`・` で要点を3-5個に圧縮し、最後に実務の変化を短く置く形。例として `Claude Code有能すぎる。` の投稿は、YouTubeリンク投入 → 1分以内の縦型ショート生成 → `横長→縦型` / `タイトル＆テロップ` / `字幕活用` → `ご飯食べる前に依頼して、食べ終わったら完成` という生活実感で締めている。

### 速報 vs 保存版

チャエンは `【保存版】` を冠して長文保存させるより、「速報/体感投稿の中に保存要素を埋める」。BM が like を上回る投稿は、上記 `Claude Code有能すぎる。`（638 likes / 710 BM）、`2026年に理解すべきAI概念20選`（1,386 / 1,442）、`長時間自律実行のコツ`（325 / 459）、`Claude Code資料作成の裏技`（276 / 346）など。ラベルではなく「あとで試せる手順・概念・比較」が保存理由になる。

### スレッド使用

`masahirochaen.threads.json` は 15 roots、multi-part 8/15、最大3 parts、中央値2 parts。

| parts | 件数 |
|---|---:|
| 1 | 7 |
| 2 | 5 |
| 3 | 3 |

使い方は長尺 thread ではなく、root 完結 + 補足/ソース/記事導線。例:
- `世界初「メガネ型のLinuxコンピュータ」Monako Glassが登場。` は root で何が変わったかを出し、reply で創業者・価格・OS・Claude Code/Codex 実行などの補足を置く（3 parts）。
- `【速報】ElevenLabsが「Flows Agent」公開。` は root で概要、reply で `会話で作り直せる` / `高コスト処理は承認` / `裏で完成まで処理` を補足（3 parts）。
- `Claude Codeの中の人が語る『長時間自律実行のコツ』` は root で要点、reply はソース URL と別投稿導線（3 parts）。

テンプレ照合:
- `template_chaen_gold` の「速報フック → 意味づけ → 箇条書き要点 → 実務接続」は合っている。
- ただし `【速報】【朗報】` 固定では狭い。fresh evidence では `Claude Code有能すぎる。` のような「ツール名 + 体感断定」も黄金型に含めるべき。
- `template_chaen_contrarian` は top20 では主戦場ではない。使うなら既存通り medium/long の問題提起に限定。
- `template_chaen_howto` は「数字ハウツー」として有効だが、チャエン本人の上位は `保存版` より「速報の中の手順」で伸びている。

---

# Part 2: スレッド構成の研究

## 1. 広域分布と top-by-faves のズレ

2026-06-08 の `format-dist.json` は、直近40日前後の root 投稿全体に対するフォーマット分布を示す。

| handle | roots | single | thread | article | thread avg parts |
|---|---:|---:|---:|---:|---:|
| MakeAI_CEO | 61 | 54% | 34% | 11% | 6.7 |
| Gencoin8 | 40 | 70% | 25% | 5% | 3.5 |
| ClaudeCode_love | 158 | 77% | 22% | 2% | 2.2 |
| nobel_824 | 132 | 77% | 11% | 11% | 4.5 |
| obsidianstudio9 | 191 | 94% | 4% | 2% | 2.0 |
| ClaudeCode_UT | 197 | 96% | 2% | 3% | 2.0 |

この表だけを見ると MakeAI_CEO は「平均6.7本の長めスレッド」が主力に見える。しかし 2026-06-13 に `getThread()` で再取得した top-by-faves sample（12 roots/handle）では、上位投稿のスレッドは短い。

| handle | top sample roots | multi-part | max parts |
|---|---:|---:|---:|
| MakeAI_CEO | 12 | 9 | 3 |
| Gencoin8 | 12 | 5 | 4 |
| nobel_824 | 12 | 5 | 2 |
| obsidianstudio9 | 12 | 4 | 2 |
| ClaudeCode_love | 12 | 3 | 2 |
| ClaudeCode_UT | 12 | 2 | 2 |

重要な差分:
- 広域平均では MakeAI_CEO の thread avg parts は 6.7 だが、上位 sample では max 3。長い6-8本チェーンが like 上位を取っているわけではない。
- Gencoin8 も上位 sample の max は 4。お得/手順型でも `root + 1-3 replies` に収まる。
- ClaudeCode_love / ClaudeCode_UT / obsidianstudio9 は、上位ではほぼ long single + 1 reply。返信は補足か自己紹介/記事誘導で、物語スレッドではない。

結論: ofmeton は「強い長文単発」を主軸にし、thread は 2-4 parts の tight structure として使う。長い chain は情報量を出せるが、この niche の上位 engagement では主勝ち筋ではない。

## 2. 1本目 hook と subsequent part の役割

### A. Strong single root + 補足1本

ClaudeCode_love / ClaudeCode_UT / obsidianstudio9 に多い。1本目に本文の大半を入れ、2本目は補足か誘導に使う。

役割:
1. 1本目: `【速報】【保存版】` or 口語 hook → 事実 → 箇条書き → 意味づけ → root 内 CTA。
2. 2本目: 技術スタック補足、再現プロンプトへの誘導、またはアカウント自己紹介 + 記事リンク。

観測:
- @ClaudeCode_love: Webサイト制作手順の投稿は、root で `ChatGPT Image 2.0 → Claude Opus 4.6` の流れと手順を説明し、reply で `React 19 / Vite 6 / Tailwind CSS 4 / Motion / TypeScript` の具体スタックを補足する。
- @ClaudeCode_UT: `【保存版】元OpenAIの天才が...無料公開` は root で講義の価値と要点を完結させ、reply は `最新の記事はこちら` の誘導。
- @obsidianstudio9: Obsidian 系の上位 multi-part は root でニュース/要点/記事誘導まで完結し、reply はアカウント紹介と記事誘導の定型文。

### B. Hook + 1 concrete expansion

MakeAI_CEO / nobel_824 に多い。1本目は強い感情・逆張りで止め、2本目で1つ目の具体に入る。上位 sample では「5選を全部 thread に並べ切る」より、1つ目だけ見せて深掘り導線を作る形が多い。

役割:
1. 1本目: 断言・悲報・まじ？などで止める。何が変わったか、なぜ読むべきかを入れる。
2. 2本目: `①` または `まず` で最初の具体。続きを期待させるが、長く連ねすぎない。

観測:
- @MakeAI_CEO: 英会話投稿は root で「毎月課金は時間と金を捨てている」と強く入り、reply で OpenAI の音声AIの性能と「英会話の壁打ち相手」としての意味を説明する。2 parts。
- @MakeAI_CEO: DSPy/Context Engineering 投稿は root で「日本人のプロンプトは化石レベル」という強い逆張りを置き、reply で `1つ目、Context Engineering` を解説する。2 parts。
- @nobel_824: Microsoft / Claude Code コスト投稿は root でニュースと構造的限界を提示し、reply で `① 制御不能な「トークン課金」の経済性` に絞って深掘りする。2 parts。

### C. Offer / steps thread（2-4 parts）

Gencoin8 の上位 sample で最も thread らしい型。最大でも4 parts。

役割:
1. 1本目: お得/損失回避 hook + 条件 + 特典 + `詳しく解説します/今すぐ受け取る方法`.
2. 2本目: 最初の手順または役割分担の具体。
3. 3本目: 残り手順や条件の補足。
4. 4本目: 記事リンク/学習導線 CTA。

観測:
- @Gencoin8: `Claude Code終了のお知らせ` は 4 parts。root で約20万円分の特典と対象条件を提示、reply 1 でインストール/Skill file、reply 2 で GitHub公開・スター・フォーム申請、reply 3 で学習記事へ誘導。
- @Gencoin8: OpenAI APIクレジット投稿は 2 parts。root で制度名・設定手順・注意点まで長文単発で説明し、reply は Codex学習記事への誘導。
- @Gencoin8: Claude Fable コスト削減投稿は 2 parts。root で「Claudeに全部やらせず Codex と役割分担」と提示し、reply で `設計/実装/レビュー` の担当分けを示す。

## 3. Annotated thread examples

### Example 1: @Gencoin8 / Codex for OSS（4 parts）

- Part 1: Hook + offer。`Claude Code終了のお知らせ` で止め、約20万円分の Codex 開発環境、公開リポジトリがあれば申請可能、特典リストまで root に入れる。
- Part 2: 手順1。Codex install と記事付属 Skill file のコピペ。
- Part 3: 手順2-5。小さなプロジェクト作成、GitHub公開、スター、フォーム申請。`スターがゼロでも申請自体はできる` と不安を潰す。
- Part 4: CTA。手を動かして学ぶ記事へ誘導。

効いている点: root だけで価値が伝わり、reply は「今やる手順」に限定。長い解説ではなく、読者の不安解消と記事送客に絞っている。

### Example 2: @MakeAI_CEO / Context Engineering（2 parts）

- Part 1: Hook + conflict。`袋叩き覚悟`、`日本人のプロンプトは...化石レベル` の強い逆張りで止め、何が違ったのかを root で引っ張る。
- Part 2: First concrete。`1つ目、Context Engineering` として、Prompt Engineering との違いを1論点だけ説明する。

効いている点: 2本目で全部を説明しない。root の熱量を保ったまま、最初の具体だけ見せる。MakeAI 型の上位 sample は「長い番号スレ」ではなく、この 2-3 parts の teaser + concrete が多い。

### Example 3: @ClaudeCode_love / Web制作手順（2 parts）

- Part 1: Hook + full value。海外でバズった手順として、画像AIで完成イメージを作り Claude に実装させる流れを root にまとめる。
- Part 2: Technical addendum。React / Vite / Tailwind / Motion / TypeScript の stack を補足し、`絵を先に決めて、実装はAIに任せる` という分担へ意味づける。

効いている点: root がほぼ単発投稿として完結している。reply は「本文に入れると重いが、実行者には有用な具体」を足す場所。

## 4. 区切り運用

raw の `*.threads.json` では、区切りは `thread: Tweet[]` の配列要素として表現される。実投稿に `---` が入っているわけではない。

X発信システムでの生成時は、`apps/x-account-system/migrations/0027_thread_support.sql` と `apps/x-account-system/lib/curation/thread.ts` の契約に合わせる。

- `thread_bodies jsonb` が投稿時の正。
- `body` は `"\n\n---\n\n"` join 派生。
- `THREAD_MAX_PARTS = 8` は hard cap。
- `TWEET_SOFT_LIMIT = 140` は目安。

生成ルール:
- 通常は 2-4 parts に収める。8 parts は仕様上の上限であって、目標本数ではない。
- 1本目は単体で読める strong root にする。長文単発として成立するなら、無理に分割しない。
- 2本目以降は「補足」「最初の具体」「手順」「CTA」のどれか1役割に絞る。
- `①②③` や `【1】` は part 冒頭に置くが、top sample では番号が1つだけ出て終わる例も多い。番号スレを長く続ける前提にしない。

## 5. CTA placement

観測された配置:
- Root 内 CTA: `解説します👇`、`詳しく解説します`。Gencoin8 / MakeAI_CEO に多い。
- Reply CTA: Gencoin8 の記事リンク、ClaudeCode_UT / obsidianstudio9 のアカウント紹介 + 記事誘導。
- Mid CTA: ほぼ不要。2-4 parts なので、途中の各 part は価値提供に寄せる。
- Final CTA: 4 parts の Gencoin8 では最終 reply が記事誘導。2 parts 型では reply 自体が CTA or first concrete になる。

ofmeton 推奨:
- 基本は `fmat=long`。1本で読者が保存できる構造にする。
- thread を使う時は 2-4 parts。`hook → 具体/手順1-2本 → まとめ+CTA`。
- CTA は root 末尾か final reply に集約。各 reply に毎回 CTA を置かない。

## 6. テンプレ反映方針

反映対象:
- `template_reaction_light`: MakeAI_CEO の top sample に合わせ、`root + 1-2 replies` を標準にする。最大8本は hard cap と明記し、目標本数にしない。
- `template_offer_savings`: Gencoin8 の top sample に合わせ、`root + 手順1-2本 + CTA` の 2-4 parts を標準にする。お得情報は root に条件と注意を多めに入れ、reply は実行手順と誘導に絞る。

新規 dedicated thread template は今回も追加しない。理由:
- 上位 engagement では long single と tight 2-4 parts が主で、専用の長尺 thread template を増やす根拠が弱い。
- 既存 `template_reaction_light` / `template_offer_savings` の guidance 修正で consumer の ID 互換を保てる。

---

# Part 3: 記事(X Article)投稿

## 1. 観測データ

`articles.json` は X Article 9本の full body。handle 内訳は nobel_824 5/9、MakeAI_CEO 2/9、ClaudeCode_love 1/9、obsidianstudio9 1/9。既存 `format-dist.json` でも article 比率は nobel_824 11%、MakeAI_CEO 11%、Gencoin8 5%、ClaudeCode_love 2%、ClaudeCode_UT 3%、obsidianstudio9 2%。Article は全員の主戦場ではなく、nobel_824 / MakeAI_CEO の深掘り導線で厚い。

9本の共通指標:

| 指標 | 中央値 | 範囲 |
|---|---:|---:|
| like | 139 | 40-412 |
| BM | 232 | 100-1,035 |
| view | 78,428 | 17,226-584,107 |
| root text length | 23 | 23-23 |
| article body chars | 8,982 | 7,693-26,992 |
| blocks | 128 | 91-512 |
| headings | 9 | 0-17 |
| list items | 15 | 0-57 |
| images | 1 | 0-16 |

root 投稿は 9/9 が `https://t.co/...` だけで、本文勝負ではなく Article card 自体に寄せている。like は single の最大アウトライヤーほど伸びないが、保存が強い。BM/like は全9本で 1.7-3.4 倍、nobel_824 の `1人で8セッションを操る！Claude Code『オーケストレーション』構築完全ガイド` は like 308 / BM 1,035 / view 526,581。

既存広域中央値との比較:
- nobel_824 は通常 original posts の like 中央値 9 / BM 中央値 6 / view 中央値 2,701 に対し、Article sample は like 中央値 81 / BM 194 / view 78,428。
- ClaudeCode_love は通常 like 中央値 233 / BM 291 / view 34,746 に対し、Article sample 1本は like 412 / BM 836 / view 171,047。
- MakeAI_CEO は通常 like 中央値 55 / BM 59 / view 16,286 に対し、Article sample 2本は少ない方でも like 139 / BM 232。
- obsidianstudio9 は通常 like 中央値 33 / BM 33 / view 4,560 に対し、Article sample 1本は like 82 / BM 157 / view 17,226。

読み取り: Article は拡散最大化ではなく、検索/保存/教育/送客の資産型。single のように1行目で全てを完結させるより、「あとで読む理由」を作る。

## 2. タイトル pattern

9本中 8本が数字を含む。`保存版` は3/9、`完全` は3/9、`全手順` は2/9、`初期設定` は2/9、`選` は2/9。

実例:
- `【完全保存版】Claude Code を「最強の右腕」に変える初期設定と実務コマンド10選`
- `【2026最新】Claude Codeを最強にする『神Skill』厳選5選！Find SkillsからGraphifyまで`
- `重い資料は読まずに丸投げ。Gemini 3.5 Flash の初期設定とコピペプロンプト保存版`
- `1人で8セッションを操る！Claude Code『オーケストレーション』構築完全ガイド`
- `Claude Codeに"7人のAI社員"を雇い、寝てる間に24時間開発させる全手順`
- `天才たちの「Agent Skills」完全攻略`
- `【保存版】Obsidian × Claude × N8N で自動化する全手順`

タイトル formula:

`【完全保存版 / 2026最新 / 保存版】 + ツール名 + 読者が欲しい到達状態 + 初期設定/全手順/完全ガイド/N選`

bracket は必須ではない。bracket なしでも、`1人で8セッションを操る`、`7人のAI社員を雇い`、`重い資料は読まずに丸投げ` のように、到達状態が具体なら Article らしい保存価値が出る。

## 3. preview_text pattern

preview は本文の冒頭そのもの。5/9 が読者の悩みを引用符で始め、7/9 が `けど` / `面倒` / `分からない` / `損` / `想像してみて` / `結論` などの問題提起で入る。

型:
1. 読者の現状を2つ引用する  
   例: `「Claude Code は入れたけど、結局チャット代わりにしか使えていない」 「便利そうなのに、毎回同じ前置きを打ち込むのが面倒で続かない」`
2. その悩みが普通だと受け止める  
   例: `Claude Code を仕事で触り始めた人なら、たぶん一度は通る道です。`
3. 先に結論/変化を約束する  
   例: `先に結論を言うと、最初の設定をちゃんと組むかどうかで、その後の体感がはっきり変わります。`

MakeAI_CEO / ClaudeCode_love は物語寄りで、`皆さん、想像してみてください。夜、寝る前にClaude Codeへ指示を出す。` や `最初に結論からお伝えします。` で広く入る。nobel_824 は悩み引用 → 共感 → 構造の順で安定している。

## 4. contents structure

多くの Article は `header-two` 見出しを 7-10 本置く。nobel_824 は見出し + unstyled paragraphs + unordered-list-item が中心。MakeAI_CEO は長尺章立て（最大 17 headings / 26,992 chars）。ClaudeCode_love は header を使わず、長い物語段落と画像 16 枚で読ませる例外。

再利用できる skeleton:

1. 導入: 読者の悩み2つ + 「これは一度は通る道」
2. 先に結論: 設定/設計/手順を変えると何が楽になるか
3. 背景: なぜ今そのツール/概念が重要か
4. 基礎理解: そもそも何か、既存手法と何が違うか
5. 初期設定: 最初にやる3つ
6. 実務手順: コマンド/プロンプト/設定/ワークフローを番号で 4-10 個
7. 使い分け: 類似ツール、旧やり方、上級者向け補足
8. 落とし穴: コスト、セキュリティ、権限、データ共有、過信を3点で潰す
9. チェックリスト: `今日やること` を3-5個にする
10. まとめ: `使う人 → 任せて確認する人` のように before/after で意味づけ
11. CTA: オープンチャット、相談、関連記事、引用感想、参考リンク

CTA は本文末尾に置く。nobel_824 はオープンチャット、引用感想、参考リンクを置く。ClaudeCode_love は問い合わせ導線、MakeAI_CEO は「小さく始める」行動提案、obsidianstudio9 は大量参考リンクで締める。

## 5. ofmeton takeaway: Article / single / thread の使い分け

- single: 速報・体感・1つの変化を即届ける。チャエン型の主戦場。表示 150-220 字 + 箇条書き 3-5 点で、読者がその場で理解できる時に使う。
- thread: single では入らない最初の具体/手順/ソースを 1-3 replies だけ足す。2-4 parts が標準。長尺連載にしない。
- Article: 手順・設定・コマンド・プロンプト・落とし穴・FAQ・参考リンクまで残す必要がある時に使う。保存/検索/教育/送客の資産型。root で説明せず、Article card とタイトル/preview に働かせる。

ofmeton では `fmat=article` を「長文単発」ではなく、X Article 用の保存版構造として扱う。素材が薄い時に無理に伸ばすのではなく、`title → preview hook → section skeleton → checklist/CTA` が作れる時だけ採用する。

## 6. テンプレ反映方針

反映対象:
- `template_chaen_gold`: fresh チャエン evidence に合わせ、`【速報】` 固定ではなく「ツール名 + 体感断定」も許容する。thread は 2-3 parts の補足/ソース/導線に留める。
- `template_article_savings`: X Article 専用の保存版・記事型を新規追加する。根拠は Article 9本の body が single/thread と明確に違い、title / preview / section skeleton / CTA の別 contract を持つため。

既存 `template_value_deepdive` は long single + 記事リンク誘導の型として残す。Article body 自体を書くテンプレとは役割が違うため、ID 互換を壊さず新規 template を増やす。
