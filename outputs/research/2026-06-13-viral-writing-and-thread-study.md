# 競合アカウント バズ投稿の書き方・スレッド構成研究

- date: 2026-06-13
- 対象: MakeAI_CEO / ClaudeCode_love / ClaudeCode_UT / nobel_824 / Gencoin8 / obsidianstudio9
- 目的: X発信システム（ofmeton）の投稿テンプレと wiki へ、バズ投稿の書き方・スレッド運用を反映する
- 広域統計ベース: `raw/publishing/research/2026-06-08-account-styles/`
- スレッド本文ベース: `raw/publishing/research/2026-06-13-viral-and-thread-study/`
- 注意: 2026-06-08 raw は 6アカ横断の広域分布（metrics / format / top15 close-read）を見るために使う。2026-06-13 raw は top-by-faves sample（12 roots/handle）を `getThread()` で再取得した full thread body として、Part 2 のスレッド構成の主証拠にする。

---

## 0. 使用データ

- `metrics.json`: 6アカウント合計 775 original posts（MakeAI_CEO 61 / ClaudeCode_love 156 / ClaudeCode_UT 196 / nobel_824 132 / Gencoin8 38 / obsidianstudio9 192）
- `format-dist.json`: root 投稿単位の single / thread / article 判定。root 合計 779（format 集計は root 判定、metrics は original posts 集計のため 4 件差がある）
- `tops/*.md`: 各アカウント like 順 top15、合計 90 投稿の close-read
- `tweets/*.json`: 全 1069 tweets。root + 自己返信を含むため、限定的に conversationId 単位のスレッド片を観測可能
- `query-meta.json`: 2026-06-08 取得、61 calls、total_tweets_returned 1069、estimated_cost_jpy 25
- `raw/publishing/research/2026-06-13-viral-and-thread-study/*.threads.json`: 2026-06-13 取得。各 handle 12 roots の top-by-faves sample、`{ handle, root, thread: Tweet[] }`。thread は取得できる範囲で author filter 済み。

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
