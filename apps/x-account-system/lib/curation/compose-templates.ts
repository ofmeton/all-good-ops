/**
 * lib/curation/compose-templates.ts — 投稿テンプレ registry。
 * この COMPOSE_TEMPLATES が「投稿テンプレの唯一の SSOT」。
 * テンプレ = 構造化フィールド（tone/structure/hookType/hookStrength）から合成する
 * 「投稿の型（骨子）」＋ 固有の掟（systemPromptPatch）。執筆 system prompt に差し込む。
 *
 * dashboard はテンプレ一覧をハードコードせず、worker `GET /admin/templates`
 * （listTemplateSummaries）経由で取得する（ドリフト解消済）。
 * 注意: id を変える/消す時は post_drafts 等に保存済みの template_id との
 *       後方互換に配慮する（既存ドラフトの id 解決は resolveTemplate が default に吸収）。
 */
/** フック類型（投稿冒頭で読者の注意を掴む型）。 */
export type HookType = "速報" | "逆張り" | "数字" | "共感" | "問い" | "権威";

/** フック強度（踏み込みの強さ）。 */
export type HookStrength = "strong" | "medium" | "soft";

export interface ComposeTemplate {
  id: string;
  name: string;
  description: string;
  /** 文体（語り口・トーン）。例「速報屋らしく短文・断定・テンポ重視」。 */
  tone: string;
  /** 構成（本文の流れ）。例 `["速報フック","意味づけ","箇条書き","実務接続"]`。 */
  structure: string[];
  /** フック類型（冒頭の掴み方）。 */
  hookType: HookType;
  /** フック強度（踏み込みの強さ）。 */
  hookStrength: HookStrength;
  /** 由来メモ（参考アカウント等から型化した場合の出典・任意）。 */
  referenceNote?: string;
  /** 構造化フィールドだけでは表せない固有の掟・補足を差し込む文面。 */
  systemPromptPatch: string;
  /** このテンプレが想定する fmat（任意・将来の自動 fmat ヒント用）。 */
  preferredFmats?: string[];
}

/** フック強度 → 執筆指示ラベル。 */
export const HOOK_STRENGTH_LABEL: Record<HookStrength, string> = {
  strong: "強（1行目で断定・踏み込んで掴む）",
  medium: "中（過度に煽らずバランス良く掴む）",
  soft: "弱（穏当・丁寧に入る）",
};

/** 既定テンプレ ID（未指定・無効 id 時のフォールバック先）。 */
export const DEFAULT_TEMPLATE_ID = "template_chaen_gold";

export const COMPOSE_TEMPLATES: Record<string, ComposeTemplate> = {
  template_chaen_gold: {
    id: "template_chaen_gold",
    name: "チャエン型1（黄金）",
    description:
      "速報フック→意味づけ→箇条書き要点→実務接続。AIニュースを非エンジニアに翻訳する速報の黄金型。",
    tone: "速報屋らしく短文・断定・テンポ重視。熱量はあるが煽りすぎない。",
    structure: ["速報フック", "意味づけ・感情", "箇条書き要点", "実務接続"],
    hookType: "速報",
    hookStrength: "strong",
    referenceNote:
      "チャエン氏 X アカウント分析（outputs/research/2026-06-05-chaen-x-account-analysis.md §9.1）+ 2026-06-13 gap-fill（top20 / threads15）",
    preferredFmats: ["short", "medium", "thread"],
    systemPromptPatch: `## 投稿の型（チャエン黄金型）
- 1行目: 【速報】【朗報】等 + 主語が何をしたか、または「Claude Code有能すぎる。」のような**ツール名 + 体感断定**（最強フックを1行目に置く）。速報性が薄い素材に無理に【速報】を付けない。
- 空行 → 何が起きたか/何ができたかを1〜2文で具体化し、一言の意味づけ・感情（例「便利すぎる」「これは強い」）を添える。
- 空行 → 「・」で要点 3〜5 点（箇条書き。markdown のリスト記号 - * は使わない）。
- 「だから実務/業務がどう変わるか」を一言必ず添える（仕組み化・自動化への接続）。可能なら「ご飯食べる前に依頼して、食べ終わったら完成」級の生活実感/時間短縮で締める。
- CTA（👇 等）は毎回付けない（5〜6 投稿に 1 回程度）。
- 文量は表示上 150〜220 字前後を主軸（fmat=short/medium）。raw text は多少長くても、冒頭の見た目を短く締める。
- fmat=thread を選んだ時は root 完結 + 補足/ソース/記事導線の 2〜3 parts に留める。長尺スレッド化しない。
- **プレーンテキストで書く**（**太字** や # 見出し等の markdown 記法は使わない。強調は言葉と改行で）。`,
  },

  template_chaen_contrarian: {
    id: "template_chaen_contrarian",
    name: "チャエン型2（逆張り問題提起）",
    description:
      "世間の通説に逆張りで切り込み→理由→読者の不安を言語化→実務の打ち手。立ち止まって考えさせる型。",
    tone: "落ち着いた断定。煽らず、しかし通説に正面から疑問を投げる硬めのトーン。",
    structure: ["逆張りの一言", "なぜそう言えるか", "読者の不安の言語化", "実務の打ち手"],
    hookType: "逆張り",
    hookStrength: "medium",
    referenceNote: "チャエン氏 X アカウント分析（逆張り問題提起パターン）",
    preferredFmats: ["medium", "long"],
    systemPromptPatch: `## 投稿の型（逆張り問題提起型）
- 1行目: 世間の通説・流行に逆張りする一言（例「AIで仕事は無くならない。無くなるのは"作業"だけ」）。決めつけで人を見下さない。
- 空行 → なぜそう言えるかの根拠を 1〜2 文（具体・事実ベース）。
- 空行 → 読者が薄々感じている不安を言語化して寄り添う（「焦るのはわかる」）。
- 最後に「では何をすべきか」の実務の打ち手を 1 つ示す（行動に落とす）。
- 禁止語（時代遅れ/情弱 等）は使わない。逆張りでも相手を見下さない。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。`,
  },

  template_chaen_howto: {
    id: "template_chaen_howto",
    name: "チャエン型3（数字ハウツー）",
    description:
      "具体数字フック→手順を箇条書き→再現性の担保→実務接続。やればできる感を数字で出す実用型。",
    tone: "実用書のように親切で具体的。数字と手順で「自分にもできる」と思わせるトーン。",
    structure: ["数字フック", "手順の箇条書き", "再現性の担保", "実務接続"],
    hookType: "数字",
    hookStrength: "medium",
    referenceNote: "チャエン氏 X アカウント分析（数字ハウツーパターン）",
    preferredFmats: ["medium", "long", "thread"],
    systemPromptPatch: `## 投稿の型（数字ハウツー型）
- 1行目: 具体数字を含むフック（例「3ステップで議事録作成が10分→1分になる」）。数字は素材本文 or web_search で裏が取れたものだけ。
- 空行 → 手順を「・」で箇条書き（順番が分かるように。markdown のリスト記号 - * は使わない）。
- 空行 → 「これは誰でも再現できる」根拠を一言（特別なスキル不要であることを担保）。
- 最後に「だから実務がどう楽になるか」を一言添える。
- 数字を盛らない・捏造しない（裏が取れない数字は書かない）。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。`,
  },

  template_case_calm: {
    id: "template_case_calm",
    name: "事例翻訳・敬体型（保存版）",
    description:
      "【保存版】+事例/出典→敬体で冷静に解説→要点3→一般化→「保存して試すといい」。ofmeton の非エンジニア翻訳ポジションに最適合の信頼型。intent=信頼。",
    tone:
      "敬体（ですます）・冷静・知的。煽らない。評価は「見ておく価値はある」程度に抑制し、一次情報・段取りを重視する。",
    structure: [
      "【保存版】等+事実を1-2行（事例/出典ベース）",
      "「〜について解説します/整理します」",
      "▶︎ or ・で要点3",
      "「この順序は他の業務でも機能する」等の一般化",
      "控えめな行動提案「保存して、次のプロジェクトで試してみるといい」",
    ],
    hookType: "権威",
    hookStrength: "medium",
    referenceNote: "6アカ分析 @ClaudeCode_UT（敬体・事例ベース）outputs/research/2026-06-08-x-account-styles-template-catalog.md §4 T3",
    preferredFmats: ["medium", "long"],
    systemPromptPatch: `## 投稿の型（事例翻訳・敬体型 / 保存版）
- **敬体（ですます）で統一**する（常体を混ぜない）。これがこの型の最大の肝。
- 1行目: 【保存版】【最新】等 + 事例/出典に基づく事実を 1〜2 行（「〜が話題」「〜という事例が話題になっている」）。
- 「〜について解説します/整理します」と続け、要点を「▶︎」or「・」で 3 点前後（markdown のリスト記号 - * は使わない）。
- 事例から「この順序/段取りは他の業務でも同じように機能する」と一般化して読者の実務に橋渡しする。
- 末尾は**控えめな行動提案**で締める（「保存して、自分の次のプロジェクトで試してみるといい」）。売り込み感を消す。
- メディア（動画/画像）は推奨。fmat は medium〜long の長文単発が基本（スレッド化しない）。
- 避けること: 過度な煽り・誇張 / 😳の多用 / 「絶対」「必見」等の断定的売り込み / 常体への混在。
- 絵文字は控えめ（👇程度・多くて1個）。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。

## 参考例（@ClaudeCode_UT・再現の手本）
1. 「【保存版】Webデザイナーに毎回\$1,800払っていたLP制作を、Claude Codeで4時間・\$70以下に抑えた事例が話題。渡したのはたった5枚のスクショ。最初に7つの質問をさせてから作業を開始。…『まず7つの質問をさせる』段取りが出力精度を大きく変えている。指示より先に文脈を渡す。この順序は、Webデザイン以外の業務でも同じように機能する。保存して、自分の次のプロジェクトで試してみるといい。」
2. 「【保存版】GoogleのCEOが『1人+Claudeで、10人のチームに勝てる』と語った。…毎セッション開始時、Claudeは文脈も記憶もゼロに戻る。そのポテンシャルを引き出せるかは、セッションをまたいで文脈を保持する設計が入っているか。CLAUDE.mdとメモリ設定を組み込んで、翌日確かめて欲しい。」`,
  },

  template_value_deepdive: {
    id: "template_value_deepdive",
    name: "保存版・感情増幅・深掘り解説型",
    description:
      "強記号フック→感情1語→「何がヤバいか👇」→箇条書き→ビフォーアフター→記事誘導。最強エンゲージ実証の保存版深掘り。intent=保存。",
    tone:
      "常体・高テンション・感情語を惜しまない。専門語は出すが直後に噛み砕く。情報量と感情増幅を両立する。",
    structure: [
      "強記号フック+主語が何をしたか",
      "😳等の感情1語",
      "「これ何がヤバいかというと👇」",
      "・箇条書き要点4-6",
      "「つまり/要するに」で意味づけ",
      "ビフォーアフターを旧→新の矢印図で可視化",
      "外部記事へ誘導CTA",
    ],
    hookType: "速報",
    hookStrength: "strong",
    referenceNote: "6アカ分析 @ClaudeCode_love / @obsidianstudio9（like中央233・BM中央291で最強）catalog §4 T2",
    preferredFmats: ["long", "medium"],
    systemPromptPatch: `## 投稿の型（保存版・感情増幅・深掘り解説型）
- 1行目: 【速報】【事件】【衝撃】等の強記号フック + 主語が何をしたか（最強フックを1行目に）。
- 空行 → 😳👀🔥 等の感情を1語添える（生の興奮を出す）。
- 空行 → 「これ何がヤバいかというと👇」で本題に入る。
- 空行 → 「・」で要点 4〜6 点（markdown のリスト記号 - * は使わない。7点超は間延びするので避ける）。
- 「つまり/要するに」で意味づけを一言。
- **ビフォーアフターを旧→新の矢印で可視化する**（例「今まで〔サイト→CSV→Excel→分析〕→ 今から〔接続→自然言語で質問→即分析〕」）。この矢印図がこの型の肝なので省かない。
- 末尾で外部記事/動画へ誘導（収益動線。CTA は毎回）。
- メディア（動画優先）は必須。fmat は long〜medium の長文単発が基本（スレッド化せず1ツイートに詰め切る。記事リンクは末尾に付すのみ）。
- 避けること: 感情語ばかりで具体が無い / ビフォーアフター図の省略 / markdown の太字や#見出し。
- 絵文字は要所に（😳👀🔥👇・多くて3個程度）。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。

## 参考例（@ClaudeCode_love / @obsidianstudio9・再現の手本）
1. 「【速報】Claude Codeから17,000以上の株式データに数秒でアクセスできるように😳 接続方法も簡単👇 …これ、地味に見えてかなり大きい。今まで〔サイト開く→CSV探す→Excel→分析〕でも今からは〔接続→自然言語で質問→即分析〕。Claude Codeが『開発ツール』から『リサーチOS』に進化してきてる。」（like 4,213 / BM 5,513）
2. 「【事件】Anthropicが年収\$750,000以上で雇うLLMアーキテクトの知識を、Stanfordが1時間の講義で全部教えてしまった😳しかも完全無料。 ・LLMの設計思想がゼロから ・実装レベルのアーキ解説 …これは講義じゃない。一次情報の解放です🤐」（like 2,040）`,
  },

  template_article_savings: {
    id: "template_article_savings",
    name: "保存版・X Article構造化解説型",
    description:
      "タイトル【完全保存版/2026最新】→preview悩み引用→章立て→手順/落とし穴/チェックリスト→CTA。X Article専用の資産型。intent=保存/教育/送客。",
    tone:
      "敬体寄り・冷静・実務的。煽りより保存価値を優先し、読者の悩みを受け止めてから手順に落とす。",
    structure: [
      "タイトル formula（保存版/最新+ツール+到達状態+全手順/N選）",
      "preview hook（読者の悩み2つ+共感+先に結論）",
      "背景と基礎理解",
      "初期設定/実務手順",
      "使い分け/落とし穴",
      "チェックリスト",
      "まとめ+CTA/参考リンク",
    ],
    hookType: "数字",
    hookStrength: "medium",
    referenceNote:
      "2026-06-13 X Article gap-fill（articles.json 9本: nobel_824 5 / MakeAI_CEO 2 / ClaudeCode_love 1 / obsidianstudio9 1）",
    preferredFmats: ["article"],
    systemPromptPatch: `## 投稿の型（保存版・X Article構造化解説型）
- fmat=article 専用。スレッドのように分割せず、X Article の長文本文として1本にまとめる。素材が薄く、章立て/手順/落とし穴/CTAまで作れない時はこの型を選ばない。
- タイトル: 「【完全保存版】/【2026最新】/【保存版】 + ツール名 + 読者が欲しい到達状態 + 初期設定/全手順/完全ガイド/N選」。括弧は必須ではないが、保存価値・具体数字・到達状態のうち2つ以上を入れる。
- preview冒頭: 読者の悩みを「」で2つ並べる（例「入れたけどチャット代わり」「毎回同じ前置きが面倒」）。次に「たぶん一度は通る道です」と受け止め、先に結論を1文で置く。
- 本文 skeleton:
  1. 導入: 読者の悩み2つ + 共感
  2. 先に結論: 設定/設計/手順を変えると何が楽になるか
  3. 背景: なぜ今そのツール/概念が重要か
  4. 基礎理解: そもそも何か、既存手法と何が違うか
  5. 初期設定: 最初にやる3つ
  6. 実務手順: コマンド/プロンプト/設定/ワークフローを番号で4〜10個
  7. 使い分け: 類似ツール、旧やり方、上級者向け補足
  8. 落とし穴: コスト、セキュリティ、権限、データ共有、過信を3点で潰す
  9. 今日やること: チェックリスト3〜5個
  10. まとめ: 「使う人 → 任せて確認する人」のように before/after で意味づけ
  11. CTA: オープンチャット/相談/関連記事/引用感想/参考リンクのいずれか
- 見出しは 7〜10 本を目安に番号付きで置く。各章は「結論 → 手順/具体 → 注意点」の順。本文は X Article 用なので、必要なら番号見出しやチェックリストは使ってよい。
- 保存される理由を本文内に作る。コマンド、設定パス、プロンプト、チェックリスト、FAQ、参考リンクのうち複数を入れる。
- root投稿側で説明し切らない。Article card のタイトル/preview が働く前提で、本文内に保存価値を集約する。
- 避けること: タイトルだけ強く本文が薄い / 悩み引用なしでいきなり仕様説明 / 落とし穴なしの楽観論 / 事実確認できない数字の盛り。

## 参考構造（再現の手本）
1. 「【完全保存版】Claude Code を『最強の右腕』に変える初期設定と実務コマンド10選」: 悩み引用 → 初期設定3つ → コマンド10選 → Cursorとの使い分け → コスト/セキュリティ → FAQ → CTA。
2. 「1人で8セッションを操る！Claude Code『オーケストレーション』構築完全ガイド」: 破綻理由 → 並列の仕組み → 3層構造 → role boundary → 落とし穴 → チェックリスト → オプチャCTA。`,
  },

  template_reaction_light: {
    id: "template_reaction_light",
    name: "口語・感情リアクション先行・軽量誘導型",
    description:
      "口語の感情リアクション1行→3行圧縮→「全部解説する↓」。拡散特化の軽量短文。short単発とthreadのペア運用が型の本体。intent=認知/拡散。",
    tone:
      "常体・口語・興奮ドリブン。記号テンプレに頼らず生の言葉。1人称の体験/感想を前面に出す。",
    structure: [
      "口語の感情リアクション1行（『ガチで革命起きた』『断言する。』）",
      "2-3行で何が起きたか圧縮",
      "「全部解説する↓」「〜の話を全部置いていく👇」で外部へ誘導",
    ],
    hookType: "共感",
    hookStrength: "strong",
    referenceNote: "6アカ分析 @MakeAI_CEO（短文・拡散特化。top-by-faves thread sample は multi 9/12・max3）catalog §4 T4 + 2026-06-13 thread study",
    preferredFmats: ["short", "thread"],
    systemPromptPatch: `## 投稿の型（口語・感情リアクション先行・軽量誘導型）
- 1行目: 記号【】フックに頼らず、**口語の生の感情リアクション**を置く（「オープンソース界、ガチで革命起きた。」「断言する。」「やばい、まじですごすぎぃぃ！！」）。
- 2〜3行で何が起きたかを圧縮（深掘りはしない。本文は軽く保つ）。
- 末尾で「全部解説する↓」「〜の話を全部置いていく👇」と外部記事/動画 or スレッドへ誘導。
- **型の肝は軽さ**。100字前後の短い単発フックに保ち、長文化・箇条書きで説明し切るのを避ける（深掘りは外部に逃がす）。
- 感情は絵文字でなく言葉で出す（絵文字は多くて1個）。
- fmat=thread を選んだ時は「短い単発フック → 1〜2本だけ具体で深掘り」の2段構えにする。MakeAI型の上位投稿は tight な2〜3本が中心。最大8本は配管上の hard cap で、目標本数ではない。
- スレッドの1本目: 口語フック + 何が起きたか + 読む理由 + 「全部解説する↓」。1本目だけで話題が分かるようにする。
- 2本目: 最初の具体だけを深掘りする（例「1つ目、Context Engineering」「まず、何が起きたか」）。見出し → 具体 → 効果の順。
- 3本目を使う場合: まとめ + 読者が今日やる1アクション + 保存/外部記事CTA。途中の各パートにCTAを散らさない。
- 本文は区切り「---」で分割する（後段の配管が連結投稿として処理する）。4本を超えそうなら、長文単発 or article/note 誘導に逃がす。
- 避けること: 長文化 / 記号【】フックへの依存 / 箇条書きで説明し切る。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。

## 参考例（@MakeAI_CEO・再現の手本）
1. 「オープンソース界、ガチで革命起きた。Hermes Desktopが頭おかしい。ChatGPT・GPT-5.5・Codex・Claude Code Skills全部繋がる、Mac/Win/Linux対応のネイティブAIエージェントが本日パブリックプレビュー開始。…これ知らない人は2026年負け確定の話を全部解説する↓」（like 1,427）
2. 「断言する。Claude Code使ってる人、これ入れないと脆弱性を量産し続ける。Anthropicが『security-guidanceプラグイン』をリリース。コード書いてる最中にリアルタイムで脆弱性を検出→その場で修正提案。全プラン無料。…全Claude Codeユーザー必見の新機能を全部解説する↓」（like 812）`,
  },

  template_contrarian_news: {
    id: "template_contrarian_news",
    name: "逆張りニュース・常識破壊型",
    description:
      "「まじ？」常識破壊フレーミングの逆張り速報1-2文→引用元へ。RT獲得の拡散アウトライヤー型。intent=議論。⚠️炎上リスク管理要。",
    tone:
      "敬体・知的だが結論を断定せず解釈の余地を残す。反論・議論を誘発する論点を含む。",
    structure: [
      "「まじ？」等の驚き+常識破壊ニュースを1-2文（「〜という、これまでの前提を覆す」フレーミング）",
      "「〜について解説します/深掘りします」の一文",
      "引用元リンク（本文は極小に保つ）",
    ],
    hookType: "逆張り",
    hookStrength: "strong",
    referenceNote: "6アカ分析 @nobel_824（like最大8,039・RT最大2,908の拡散アウトライヤー）catalog §4 T5",
    preferredFmats: ["short", "article"],
    systemPromptPatch: `## 投稿の型（逆張りニュース・常識破壊型）
⚠️ **炎上リスクが最も高い型**。以下のチェック工程・断定回避を必ず守ること。
- **逆張りは事実が正確な時のみ使う**。素材本文に在る事実か web_search で裏が取れた事実だけをフレーミングする。事実誤認・誇張での逆張りは厳禁（炎上・信頼毀損に直結）。
- 当システムのチェック工程（ファクト判定）と人間承認ゲートを必ず通す前提で書く。温度感は人間が最終確認する。
- 1行目: 「まじ？」等の驚き + 前提を覆す事実を 1〜2 文（「〜という、これまでの前提を根底から覆すようなもの」フレーミング）。
- 「〜について実務的な視点で深掘りします」の一文 → 引用元リンクへ。
- **本文は極小（1〜2文）に保つ**。長文の自説展開はしない（深掘りは fmat=article or note/外部記事リンクへ完全に逃がす）。本文を長くしない規律が拡散の肝。
- **結論を断定して逃げ場をなくさない**。解釈の余地・問いを残す（ただし「〜かも」等の弱い語尾で締めるのではなく、論点を提示して引用元に送る形にする）。
- 逆張りの対象は**プロダクト/業界構造への問いに限定**する。特定の人格・個人を貶める逆張りは禁止。ofmeton の信頼ポジションを毀損しない範囲に留める。
- 絵文字はほぼ使わない（0個）。箇条書きも基本使わない。
- メディア（引用元の動画/画像）は推奨。CTA は控えめ（引用元へ送るのみ。保存・フォロー煽りはしない）。
- 避けること: 事実誤認・誇張で炎上 / 断定で逃げ場をなくす / 長文の自説展開 / 誰かを貶める逆張り。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。

## 参考例（@nobel_824・再現の手本）
1. 「まじ？Microsoftが自社エンジニアにAI（Claude Code）の使用を事実上禁止しました。理由がかなり衝撃的で『AIを使うコストが、人間を雇うコストを上回ったから』という、これまでのAI導入の前提を根底から覆すようなものでした。…この構造的限界について実務的な視点で深掘りします。」（like 8,039 / RT 2,908）
2. 「OpenAI共同創業者Karpathyの CLAUDE.md が、GitHubトレンドで1位独走中。中身はライブラリでもアプリでもなく、たった65行のテキストファイル。…そこに書かれた4つの原則について解説します。」（like 2,566）`,
  },

  template_offer_savings: {
    id: "template_offer_savings",
    name: "損失回避・お得配布・手順型",
    description:
      "数字×お得（「20万円分を無料配布」）→手順→「今すぐ受け取る👇」の強CTA。フォロワー単価首位の高密度型。intent=誘導/保存。⚠️実在のお得情報がある時限定。",
    tone:
      "常体・煽り強め・お得さ前面。FOMO（取り逃し回避）を喚起する。",
    structure: [
      "煽り見出し（『〜終了のお知らせ📢』『知らないと損』）or 数字（『20万円分を無料配布』）",
      "誰が/何を/いくら分タダかを1-2行",
      "「今すぐ受け取る方法は👇」",
      "・or 番号で特典/手順を列挙",
      "「コピペでOK」「保存推奨」「今すぐやって👇」",
    ],
    hookType: "数字",
    hookStrength: "strong",
    referenceNote: "6アカ分析 @Gencoin8（フォロワー単価3.7%で首位・低頻度高密度）catalog §4 T6",
    preferredFmats: ["medium", "thread"],
    systemPromptPatch: `## 投稿の型（損失回避・お得配布・手順型）
⚠️ **適用条件**: 実在のお得情報（無料枠/配布/キャンペーン/クレジット等）が素材に在る時のみ使う。実体が無いのに煽ると誇大・規約違反・信頼毀損のリスク。
- 1行目: 煽り見出し（「〜終了のお知らせ📢」「知らないと損」）or 金額/特典の数字（「20万円分を無料配布」）。数字は素材本文 or web_search で裏が取れたものだけ（盛らない・捏造しない）。
- 誰が/何を/いくら分タダかを 1〜2 行で明示。**期限・条件は曖昧にしない**（取得条件をはっきり書く）。
- 「今すぐ受け取る方法は👇」 → 特典は「・」中黒、手順は番号（1.2.3.）で列挙（markdown のリスト記号 - * は使わない）。
- 末尾は強めの CTA（「コピペでOK」「保存推奨」「今すぐ受け取る👇」）。
- fmat は medium の単発が基本。手順が長い場合だけ番号スレッドにする。Gencoin 型の top-by-faves sample は2〜4本が中心なので、長大な手順 chain を作らない（最大8本は hard cap）。
- スレッドの1本目: 金額/特典/損失回避 + 誰が対象か + 期限/条件の有無 + 「受け取り方を置きます👇」。誇大にせず、条件を曖昧にしない。
- 2本目: 最初の手順または役割分担の具体。番号は「1.」「2.」または「①②③」。各本は「操作 → 何が起きる → つまずき注意」の順。
- 3本目を使う場合: 残り手順・条件・注意点をまとめる。無料枠/データ共有/商用可否/期限など、読者が誤解しやすい条件をここで潰す。
- 4本目を使う場合: 「コピペでOK」「保存推奨」「今すぐ確認」などの強CTA or 記事リンク。ただし途中の各パートにはCTAを散らさない。
- 本文は区切り「---」で分割する（後段の配管が連結投稿として処理する）。5本を超えそうなら、条件・注意・まとめを統合するか、外部記事に逃がす。
- 絵文字は要所に（🔥📢💰👇・多くて1個程度）。メディア（手順スクショ/画像）は推奨。
- 避けること: 実体の無いお得を煽る / 期限・条件を曖昧にする / 「誰でも」「絶対」の過剰約束。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。

## 参考例（@Gencoin8・再現の手本）
1. 「Claude Code終了のお知らせ📢 OpenAIが約20万円分のCodex開発環境を、無料で配ってる！ 今すぐ受け取る方法は… GitHubに公開リポジトリが1つでもあれば申請出来る！『Codex for OSS』 …こんな特典が全部タダ ・ChatGPT Pro 6ヶ月 ・Codexアクセス ・API使用クレジット …完全無料で申請する方法を詳しく解説します👇」（like 3,400 / BM 4,644）
2. 「OpenAI APIクレジットが『15万円分』設定を1つオンにするだけで使える制度を開始🔥 誰でも受け取れるから今すぐやって👇 名前は Data Sharing Program。やることは簡単 〔Dashboard→Data Controls→Sharing→ON〕…」（like 372）`,
  },
};

/** id が registry に存在するか（drift 検知用。null/未知は false）。 */
export function isKnownTemplate(id?: string | null): boolean {
  return !!id && Object.prototype.hasOwnProperty.call(COMPOSE_TEMPLATES, id);
}

/** id からテンプレを解決。無効/未指定は既定テンプレを返す（必ず ComposeTemplate を返す）。 */
export function resolveTemplate(id?: string | null): ComposeTemplate {
  if (isKnownTemplate(id)) {
    return COMPOSE_TEMPLATES[id as string];
  }
  return COMPOSE_TEMPLATES[DEFAULT_TEMPLATE_ID];
}

/**
 * 構造化フィールドから「投稿の型（骨子）」ブロックを合成し、
 * 固有の掟（systemPromptPatch）を併用した執筆指示文を返す。
 * P2 以降: buildComposeUserBlocks（compose-prompts.ts）が userMessage に差し込む
 * （永続 agent の system は固定のため、型は素材ごとに user 側で渡す）。
 */
export function renderTemplatePrompt(tpl: ComposeTemplate): string {
  const lines = [
    "## この投稿の型（骨子）",
    `- 文体: ${tpl.tone}`,
    `- 構成: ${tpl.structure.join(" → ")}`,
    `- フック類型: ${tpl.hookType}`,
    `- フック強度: ${HOOK_STRENGTH_LABEL[tpl.hookStrength]}`,
  ];
  if (tpl.referenceNote) {
    lines.push(`- 由来: ${tpl.referenceNote}`);
  }
  return `${lines.join("\n")}\n\n${tpl.systemPromptPatch}`;
}

/**
 * テンプレ要約（選択 UI + レコメンド用 contract）。
 * id/name/description/preferredFmats に加え tone/hookType を含める
 * （T-C の LLM レコメンドが型選択の判断材料に参照する）。
 * systemPromptPatch 等の本文 patch は含めない（選択 UI に不要・漏洩防止）。
 */
export type TemplateSummary = Pick<
  ComposeTemplate,
  "id" | "name" | "description" | "preferredFmats" | "tone" | "hookType"
>;

/**
 * dashboard 等の選択肢用にテンプレ要約一覧を返す（registry が SSOT）。
 * systemPromptPatch 等の本文は露出しない（選択 UI に不要・漏洩防止）。
 */
export function listTemplateSummaries(): TemplateSummary[] {
  return Object.values(COMPOSE_TEMPLATES).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    preferredFmats: t.preferredFmats,
    tone: t.tone,
    hookType: t.hookType,
  }));
}
