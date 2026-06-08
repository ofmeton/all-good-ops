/**
 * lib/curation/recommend.ts — キュレ画面のフォーマット/テンプレ LLM 推薦（道具）。
 *
 * 役割: 選抜素材の特徴（本文・言語・メディア有無・反応数）から、registry の
 *   テンプレ要約（listTemplateSummaries）+ FMAT 候補を Haiku に渡し、素材ごとに
 *   「最適テンプレ + fmat + 推薦理由 + 確信度」を提案させる。判断（採否）は人間。
 *
 * 設計原則:
 *   - **on-demand 限定**（ユーザー操作起点）。自動全件呼び出しはしない（従量課金抑制）。
 *   - LLM 出力は境界で検証する（mem:feedback_validate_llm_external_output）。
 *     未知 templateId → 既定テンプレにフォールバック / 未知 fmat → "medium" /
 *     confidence は [0,1] にクランプ（欠損 0.5）/ reason 欠損 "" /
 *     入力に無い materialId は破棄。
 *   - 翻訳（collector-translate）と同じ callClaudeTraced + cost 計上パターンに倣う。
 *
 * Cloudflare Worker で import 可（node:* 非依存）。
 */
import { callClaudeTraced } from "../trace/llm-trace.js";
import { costJpyFor } from "../cost/cost-of.js";
import { COMPOSE_FMATS } from "./compose-prompts.js";
import { DEFAULT_TEMPLATE_ID, type TemplateSummary } from "./compose-templates.js";

/** 推薦に使う既定モデル（Haiku・従量課金が安い軽量モデル）。 */
export const RECOMMEND_MODEL = "claude-haiku-4-5-20251001";

/** 推薦対象の素材（dashboard から渡る最小限の特徴）。 */
export interface RecommendMaterial {
  id: string;
  text: string;
  lang?: string | null;
  hasMedia?: boolean;
  /** like/retweet/view 等の反応数（任意）。 */
  engagement?: Record<string, number> | null;
}

/** 1 素材あたりの推薦結果。 */
export interface Recommendation {
  materialId: string;
  templateId: string;
  fmat: string;
  reason: string;
  /** 確信度 [0,1]。 */
  confidence: number;
}

export interface RecommendOpts {
  /** registry のテンプレ要約（listTemplateSummaries() の戻り。SSOT）。 */
  templates: TemplateSummary[];
  model?: string;
}

export interface RecommendResult {
  recommendations: Recommendation[];
  /** 推薦に焼いた概算コスト（JPY）。 */
  costJpy: number;
}

const RECOMMEND_TOOL = {
  name: "recommend_posts",
  description:
    "各素材に最適な投稿テンプレ(templateId)と長さ(fmat)を推薦し、理由と確信度を返す",
  input_schema: {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            materialId: { type: "string", description: "対象素材の id" },
            templateId: { type: "string", description: "推薦テンプレの id" },
            fmat: {
              type: "string",
              description: `投稿の長さ。次から選ぶ: ${COMPOSE_FMATS.join("/")}`,
            },
            reason: { type: "string", description: "なぜこの型/長さが良いか（日本語1〜2文）" },
            confidence: { type: "number", description: "確信度 0〜1" },
          },
          required: ["materialId", "templateId", "fmat", "reason", "confidence"],
        },
      },
    },
    required: ["recommendations"],
  },
} as const;

/** テンプレ要約 1 件を LLM 向け 1 行に整形（tone/hookType は存在時のみ・契約 forward-compat）。 */
function renderTemplateLine(t: TemplateSummary): string {
  // T-B が summary に tone/hookType を足す契約。未拡張の registry でも壊れないよう optional 参照。
  const ext = t as TemplateSummary & { tone?: string; hookType?: string };
  const parts = [`id=${t.id}`, `name=${t.name}`, `説明=${t.description}`];
  if (ext.hookType) parts.push(`フック=${ext.hookType}`);
  if (ext.tone) parts.push(`文体=${ext.tone}`);
  if (t.preferredFmats && t.preferredFmats.length > 0) {
    parts.push(`推奨fmat=${t.preferredFmats.join("/")}`);
  }
  return `- ${parts.join(" / ")}`;
}

const RECOMMEND_SYSTEM = [
  "あなたは X(Twitter) 発信の編集者。AI 活用したい非エンジニア（中小事業者・士業・コンサル）に届く投稿を設計する。",
  "与えられた素材ごとに、利用可能なテンプレ一覧から最適な templateId を 1 つ、最適な fmat（長さ）を 1 つ選ぶ。",
  "素材が薄い/短い → 短い fmat。手順や数字が多い → 中〜長め。逆張りや速報性は内容に合うテンプレを選ぶ。",
  "必ず recommend_posts ツールで {materialId, templateId, fmat, reason, confidence} の配列を返す。理由は日本語で簡潔に。",
].join("\n");

/** LLM 向け user プロンプトを構築（テスト対象）。 */
export function buildRecommendPrompt(
  materials: RecommendMaterial[],
  templates: TemplateSummary[],
): string {
  const tplBlock =
    templates.length > 0
      ? templates.map(renderTemplateLine).join("\n")
      : "（テンプレ一覧が空。汎用的な型を想定して推薦せよ）";
  const matBlock = materials
    .map((m) => {
      const eng = m.engagement
        ? Object.entries(m.engagement)
            .map(([k, v]) => `${k}:${v}`)
            .join(",")
        : "なし";
      const text = (m.text ?? "").slice(0, 600);
      return JSON.stringify({
        id: m.id,
        lang: m.lang ?? "ja",
        hasMedia: !!m.hasMedia,
        engagement: eng,
        text,
      });
    })
    .join("\n");
  return [
    "# 利用可能なテンプレ一覧",
    tplBlock,
    "",
    `# fmat 候補`,
    COMPOSE_FMATS.join(" / "),
    "",
    "# 推薦対象の素材",
    matBlock,
    "",
    "各素材に recommend_posts で推薦を返せ。",
  ].join("\n");
}

interface RawRec {
  materialId?: unknown;
  templateId?: unknown;
  fmat?: unknown;
  reason?: unknown;
  confidence?: unknown;
}

/**
 * LLM の生出力配列を境界検証して Recommendation[] に整える（テスト対象・純関数）。
 * - materialId が入力素材集合に無い行は破棄（幻覚 id を弾く）。
 * - templateId が registry に無ければ既定テンプレにフォールバック。
 * - fmat が未知なら "medium"。
 * - confidence は [0,1] にクランプ（数値でなければ 0.5）。reason 欠損は ""。
 */
export function validateRecommendations(
  raw: unknown,
  validMaterialIds: Set<string>,
  validTemplateIds: Set<string>,
  fallbackTemplateId: string,
): Recommendation[] {
  const list: RawRec[] = Array.isArray(raw) ? (raw as RawRec[]) : [];
  const out: Recommendation[] = [];
  const seen = new Set<string>();
  // フォールバック発生件数（silent にせず集約 warn する＝drift / プロンプト劣化のサイン）。
  let tplFallbacks = 0;
  let fmatFallbacks = 0;
  for (const r of list) {
    const materialId = typeof r?.materialId === "string" ? r.materialId : null;
    if (!materialId || !validMaterialIds.has(materialId) || seen.has(materialId)) {
      // 入力に無い id・重複は破棄（1 素材 1 推薦に正規化）。
      continue;
    }
    seen.add(materialId);
    const tplKnown = typeof r?.templateId === "string" && validTemplateIds.has(r.templateId);
    const tplId = tplKnown ? (r.templateId as string) : fallbackTemplateId;
    if (!tplKnown) tplFallbacks++;
    const fmatKnown =
      typeof r?.fmat === "string" && (COMPOSE_FMATS as readonly string[]).includes(r.fmat);
    const fmat = fmatKnown ? (r.fmat as string) : "medium";
    if (!fmatKnown) fmatFallbacks++;
    const reason = typeof r?.reason === "string" ? r.reason : "";
    let confidence = typeof r?.confidence === "number" && Number.isFinite(r.confidence) ? r.confidence : 0.5;
    if (confidence < 0) confidence = 0;
    if (confidence > 1) confidence = 1;
    out.push({ materialId, templateId: tplId, fmat, reason, confidence });
  }
  // 幻覚 templateId は「既定テンプレ + 別テンプレ向け reason」の矛盾を生むため特に可視化する。
  if (tplFallbacks > 0 || fmatFallbacks > 0) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "[recommend] LLM output fell back to defaults (drift / hallucination sign)",
        templateFallbacks: tplFallbacks, // 未知/幻覚 templateId → 既定テンプレ
        fmatFallbacks, // 未知 fmat → medium
        total: out.length,
      }),
    );
  }
  return out;
}

/**
 * 素材に対しテンプレ/fmat を推薦する。空入力は LLM を呼ばず即 []（コスト 0）。
 * LLM 呼び出し失敗は呼び出し側（worker endpoint）が握って fail-open する想定で throw する。
 */
export async function recommendMaterials(
  client: Parameters<typeof callClaudeTraced>[0],
  materials: RecommendMaterial[],
  opts: RecommendOpts,
): Promise<RecommendResult> {
  const valid = materials.filter((m) => typeof m?.id === "string" && m.id.length > 0);
  if (valid.length === 0) return { recommendations: [], costJpy: 0 };

  const model = opts.model ?? RECOMMEND_MODEL;
  const templates = opts.templates ?? [];
  const userPrompt = buildRecommendPrompt(valid, templates);

  // 素材数に比例して max_tokens を確保（固定 2048 だと多素材で後半推薦が truncate し欠落する）。
  // 1 推薦 ≒ 100〜150 tokens。base + 200/素材、上限 8192（worker 20 素材上限でも収まる）。
  const maxTokens = Math.min(8192, 1024 + valid.length * 200);

  const out = await callClaudeTraced(client, {
    params: {
      model,
      max_tokens: maxTokens,
      system: RECOMMEND_SYSTEM,
      tools: [RECOMMEND_TOOL as never],
      tool_choice: { type: "tool", name: "recommend_posts" },
      messages: [{ role: "user", content: userPrompt }],
    },
    promptText: `${RECOMMEND_SYSTEM}\n\n---\n\n${userPrompt}`,
  });

  const validMaterialIds = new Set(valid.map((m) => m.id));
  const validTemplateIds = new Set(templates.map((t) => t.id));
  const fallbackTemplateId =
    templates.find((t) => t.id === DEFAULT_TEMPLATE_ID)?.id ?? templates[0]?.id ?? DEFAULT_TEMPLATE_ID;
  const rawRecs = (out.toolUse as { recommendations?: unknown })?.recommendations;
  const recommendations = validateRecommendations(
    rawRecs,
    validMaterialIds,
    validTemplateIds,
    fallbackTemplateId,
  );

  const costJpy = costJpyFor(model, out.meta.tokensIn ?? 0, out.meta.tokensOut ?? 0);

  if (recommendations.length < valid.length) {
    // 推薦が付かなかった素材を可視化（挙動は変えない＝UI 側は既定値のまま）。
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "[recommend] some materials left without recommendation",
        targets: valid.length,
        recommended: recommendations.length,
      }),
    );
  }

  return { recommendations, costJpy };
}
