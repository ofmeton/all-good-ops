/**
 * lib/curation/compose-knowledge.ts — 執筆Agへ渡すフォーマット別の書き方知見。
 *
 * referenceNote:
 * - outputs/research/2026-06-13-viral-writing-and-thread-study.md
 * - raw/publishing/research/2026-06-13-chaen-article-study/{metadata,articles}.json
 * - outputs/research/2026-06-05-chaen-x-account-analysis.md
 * - outputs/research/2026-06-08-x-account-styles-template-catalog.md
 * - wiki/publishing/{buzz-patterns,by-media/x,by-theme/hook-patterns}.md
 *
 * Worker 実行時に filesystem を読めないため、研究メモの実用点だけを runtime const に蒸留する。
 */

/** フォーマット横断の書き方原則。system prompt の掟と重複する細則は持たない。 */
export const KNOWLEDGE_COMMON = [
  "- ターゲットは Claude Code を使う実務者層。専門家向けに書かず、誰でも伝わる平易な言葉で噛み砕く",
  "- 専門用語: LLM/API/プロンプト/CLI/トークン等、Claude Code を使う人なら分かる語は説明しない。難しいエンジニア用語だけ一度短く補足する",
  "- AI感を消す: 定型挨拶・薄い総論・過剰な記号連打を避け、人間の体感/判断を1文入れる",
  "- 1行目はフック類型から選ぶ: 速報 / 逆張り / 数字 / 共感 / 問い / 権威",
  "- SCQAで組む: 状況 → 変化/問題 → 読者の問い → 先に結論",
  "- 失敗談先行が使える素材は、失敗 → 変更 → 改善で入る",
  "- 保存される材料を入れる: 手順・設定・コマンド・プロンプト・チェックリスト",
  "- 末尾は余韻ではなく断定。読者が持ち帰る判断を明確に残す",
].join("\n");

/** 全フォーマットに適用する、人間っぽい文章のための anti-slop 指針。 */
export const KNOWLEDGE_ANTI_SLOP = [
  "- 前置き・喉慣らしを切る。「〜について解説します」「本記事では〜」「結論から言うと」「重要なポイントは3つあります」「いかがでしょうか」「ぜひお試しください」は禁止",
  "- 人間を主語にして能動態で書く。抽象名詞が勝手に動く文（「構造が変える」「判断が生まれる」等）は、誰が何をするかに直す",
  "- 具体で止める。曖昧な断定や「誰でも/絶対/常に」系の誇張を避け、条件・数字・場面を置く",
  "- リズムを崩す。同じ長さの文が3つ続いたら1つを短くする。体言止めの連打、三点セットの量産、pull-quote臭い決め台詞を避ける",
  "- 読者を信頼して直接言う。遠いナレーション、過剰な共感、手取り足取りの言い訳を削る",
  "- 提出前チェック: 削れる副詞/受け身/Wh型の前置き/「これは〜」の空振り/Not X but Y構文/締めの名言風一文を見つけたら書き換える",
].join("\n");

/** 希望 fmat ごとに追加する、効く型だけの短いチェックリスト。 */
export const KNOWLEDGE_BY_FMAT: Record<string, string> = {
  thread: [
    "- 上位の勝ち筋は tight 2-4本。8本は上限であって目標ではない",
    "- 1本目で最強フック: 何が変わったか / なぜ読むべきかを単体で成立させる",
    "- 各ツイートは1論点だけ: 補足 / 最初の具体 / 手順 / CTA の役割を分ける",
    "- `tweets` は1本ずつ、`body` は `\\n\\n---\\n\\n` 区切りの連結でよい",
    "- CTAは最終ツイートに集約。途中は価値提供に寄せる",
    "- 素材が薄い時は無理に伸ばさず long/medium 単発で完結させる",
  ].join("\n"),
  article: [
    "- タイトル: 【完全保存版/2026最新】+ ツール + 到達状態 + N選/全手順/完全ガイド",
    "- preview冒頭: 読者の悩みを「」で2つ → 共感 → 先に結論",
    "- 章立て: 背景 → 基礎 → 初期設定 → 手順番号 → 使い分け → 落とし穴3点 → チェックリスト → before/afterまとめ → CTA",
    "- 見出しは7-10本目安。手順・落とし穴・FAQは見出しで探せる形にする",
    "- 保存材料を厚くする: コマンド / 設定 / プロンプト / FAQ / 参考リンク",
    "- 素材が薄く skeleton を作れない時は article にしない",
  ].join("\n"),
  short: [
    "- 速報×体感断定を優先: 「Claude Code有能すぎる。」型で短く止める",
    "- 表示テキストは短く。チャエン上位は表示レンジ中央値151字",
    "- 1行目で新事実 or 使った体感を断定し、2段落目で何ができるかを書く",
    "- 箇条書きは使っても3点まで。保存要素は手順/数字/使いどころに絞る",
    "- 末尾は実務の変化を一言で断定する",
  ].join("\n"),
  medium: [
    "- 速報×体感断定を起点に、要点3-5個を箇条書きで圧縮する",
    "- 表示テキストは短く見せる。冒頭151-220字に価値を寄せる",
    "- 1行目フック → 意味づけ → ・箇条書き → 実務変化 の順で読む負荷を下げる",
    "- 【速報】固定にしない。ツール名+体感断定 / 数字 / 問いも使い分ける",
    "- CTAは控えめに、保存・次の行動が自然な時だけ置く",
  ].join("\n"),
  long: [
    "- long は保存版深掘り。単発で読者があとで使える状態まで詰める",
    "- 1行目フック → 何がヤバいか/重要か → ・要点4-6 → つまり/実務変化",
    "- 手順・比較・before/after・注意点を入れ、保存理由を本文内に作る",
    "- 箇条書きで視認性を作る。長い段落だけで読ませない",
    "- thread に逃がさず単発で完結できるなら long を優先する",
  ].join("\n"),
};

/**
 * 指定 fmat に効く知見だけを userMessage 用に描画する。
 * 未知/未指定 fmat は共通知見のみ返し、prompt bloat を避ける。
 */
export function renderKnowledgeBriefing(fmat: string): string {
  const specific = KNOWLEDGE_BY_FMAT[fmat];
  const sections = [`## 共通知見\n${KNOWLEDGE_COMMON}`, `## anti-slop 知見\n${KNOWLEDGE_ANTI_SLOP}`];
  if (specific) sections.push(`## ${fmat} 知見\n${specific}`);
  return sections.join("\n\n");
}
