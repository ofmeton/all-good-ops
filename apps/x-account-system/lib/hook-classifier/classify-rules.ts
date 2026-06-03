/**
 * classify-rules.ts
 *
 * Pure-TS port of classify.py (v10.2 §4.7.1).
 * No Node.js / child_process dependencies — runs in Cloudflare Workers.
 */
import type { HookClassification } from "./classify.ts";

// ============================================================================
// Device detection patterns
// ============================================================================

const DEVICE_PATTERNS: Record<string, RegExp> = {
  // 「30 分」「3 倍」「80%」「100 件」等の数字
  number:
    /(?:\d+(?:[.,]\d+)?\s?(?:分|秒|時間|日|週間|ヶ月|年|倍|%|％|円|万円|千円|件|個|本|名|社|時短))|(?:[1-9]\d{0,2}(?:,\d{3})+)/u,

  // 「Before: 30 分 → After: 3 分」「30 分 → 3 分」
  before_after:
    /(?:before[\s/:＝→\-]+after|before\s*→\s*after)|(?:\d+[\s\d]*[→⇒\->]+\s*\d+)|(?:[一-龯]{0,5}前\s*[→⇒\->]+\s*[一-龯]{0,5}後)/u,

  // 冒頭が断定文
  conclusion_first:
    /^(?:結論[、,。]|答えは|断言します|一言で言うと|要するに|つまり)/u,

  // 冒頭が疑問文
  question: /^[^\n]{0,40}(?:[？?])/u,

  // 「みんな X と言うが実は Y」
  contrarian:
    /(?:みんな|多くの人|世間|普通)\s?(?:は|が)?\s?[一-龯]{0,20}\s?(?:と言う|思って|信じて)\s?が?[、,。]?\s?(?:実は|本当は|現実は)|(?:と思われ|信じられ)\s?(?:て|がち)\s?(?:いる|だが|るが)[、,。]?\s?(?:実は|本当は)/u,

  // 「実は私も最初は X」
  empathy:
    /(?:実は|正直)\s?(?:私|僕|自分|オレ|俺)\s?(?:も|だって|もまた)\s?(?:最初|昔|初め|前)?/u,

  // メタ言及
  meta_reference: /(?:この投稿|この[ツトス]レッド|本日のツイート|今日のスレ)/u,

  // 自己卑下
  self_deprecating: /(?:下手|苦手|無能|ダメ|どんくさい|ポンコツ|底辺)/u,

  // 比較
  comparison: /(?:vs|ＶＳ|比較|と比べて|に比べて|より|の方が|より優れ|より劣)/u,

  // 警告
  warning: /(?:危険|要注意|注意|やめろ|やってはいけない|落とし穴|罠|警告|ご法度)/u,

  // 一人称 + 過去形
  first_hand_past:
    /(?:私|僕|自分|俺)\s?(?:は|が|を|に|で)?\s?[^\n]{0,40}(?:した|してた|だった|なった|思った|気付いた|失敗した)/u,

  // 【】カッコ
  brackets: /^[^\n]{0,15}【[^】]{1,12}】/u,

  // 冒頭 emoji (unicode ranges)
  emoji_lead: /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
};

// ============================================================================
// Keyword lists (match classify.py exactly)
// ============================================================================

const FAILURE_KEYWORDS = [
  "失敗",
  "ダメだった",
  "ハマった",
  "詰まった",
  "詰んだ",
  "落とし穴",
  "後悔",
  "迷った",
  "途方に暮れ",
  "うまくいかな",
  "間違",
  "ミス",
];

const BUSINESS_REPRO_KEYWORDS = [
  "手順",
  "Step",
  "ステップ",
  "ワークフロー",
  "プロンプト",
  "テンプレ",
  "やり方",
  "方法",
  "設定",
  "実装",
  "コード",
  "自動化",
];

const CRITIQUE_KEYWORDS = [
  "業界",
  "批評",
  "考察",
  "本質",
  "そもそも",
  "つまるところ",
  "結局",
  "問題は",
  "課題は",
  "違うのは",
  "勘違い",
];

const TIPS_ENUM_KEYWORDS = [
  "選",
  "つ厳選",
  "つの",
  "コツ",
  "ポイント",
  "テクニック",
  "Tips",
  "tip",
];

// ============================================================================
// Primary hook detection (mirrors detect_primary_hook in classify.py)
// ============================================================================

type Hook = HookClassification["primary_hook"];

function detectPrimaryHook(
  text: string,
  devices: string[],
): { hook: Hook; confidence: number } {
  const score: Record<Hook, number> = {
    failure_story: 0,
    business_repro: 0,
    critique: 0,
    tips_enum: 0,
  };

  // Keyword hit scoring
  for (const kw of FAILURE_KEYWORDS) {
    if (text.includes(kw)) score.failure_story += 1.0;
  }
  for (const kw of BUSINESS_REPRO_KEYWORDS) {
    if (text.includes(kw)) score.business_repro += 0.7;
  }
  for (const kw of CRITIQUE_KEYWORDS) {
    if (text.includes(kw)) score.critique += 0.8;
  }
  for (const kw of TIPS_ENUM_KEYWORDS) {
    if (text.includes(kw)) score.tips_enum += 0.7;
  }

  // Device boosts
  if (
    devices.includes("first_hand_past") &&
    score.failure_story < 1
  ) {
    score.failure_story += 0.5;
  }
  if (devices.includes("empathy")) {
    score.failure_story += 0.6;
  }
  if (devices.includes("before_after")) {
    score.business_repro += 1.2;
  }
  if (devices.includes("number") && devices.includes("before_after")) {
    score.business_repro += 0.8;
  }
  if (devices.includes("contrarian")) {
    score.critique += 1.0;
  }
  if (
    devices.includes("comparison") &&
    !BUSINESS_REPRO_KEYWORDS.some((k) => text.includes(k))
  ) {
    score.critique += 0.4;
  }

  // Enumeration signals: lines starting with 1. 2. etc.
  const enumSignals = (
    text.match(/(?:^|\n)\s?[1-9一二三四五六七八九][.)]\s/gu) ?? []
  ).length;
  if (enumSignals >= 2) {
    score.tips_enum += 1.5;
  }
  if (text.includes("bullet") || /[・▼📌✅]/u.test(text)) {
    score.tips_enum += 0.6;
  }

  // Pick best
  let best = (Object.keys(score) as Hook[]).reduce((a, b) =>
    score[a] >= score[b] ? a : b,
  );
  const total = Object.values(score).reduce((a, b) => a + b, 0) || 1.0;
  let confidence = Math.min(score[best] / total, 0.95);
  if (score[best] < 0.5) {
    best = "tips_enum";
    confidence = 0.3;
  }

  return { hook: best, confidence: Math.round(confidence * 1000) / 1000 };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Classify a text string using pure-TS regex + scoring rules.
 * Mirrors the output of classify.py's `classify()` function.
 */
export function classifyRules(text: string): HookClassification {
  if (!text) {
    return {
      primary_hook: "tips_enum",
      devices: [],
      confidence: 0.0,
      raw_features: {},
    };
  }

  const devices: string[] = [];
  const raw: Record<string, string> = {};

  for (const [name, pat] of Object.entries(DEVICE_PATTERNS)) {
    const m = pat.exec(text);
    if (m) {
      devices.push(name);
      raw[name] = m[0].slice(0, 60);
    }
  }

  const { hook, confidence } = detectPrimaryHook(text, devices);

  return {
    primary_hook: hook,
    devices,
    confidence,
    raw_features: raw,
  };
}
