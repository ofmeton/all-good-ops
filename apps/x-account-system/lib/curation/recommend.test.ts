import {
  buildRecommendPrompt,
  validateRecommendations,
  recommendMaterials,
  type RecommendMaterial,
} from "./recommend.ts";
import type { TemplateSummary } from "./compose-templates.ts";

const TEMPLATES: TemplateSummary[] = [
  {
    id: "template_chaen_gold",
    name: "チャエン型1（黄金）",
    description: "速報フック→意味づけ→箇条書き→実務接続",
    preferredFmats: ["short", "medium"],
  },
  {
    id: "template_value_deepdive",
    name: "価値深掘り型",
    description: "速報→感情→箇条書き→記事誘導",
    preferredFmats: ["long", "medium"],
  },
];

function fakeClient(recs: unknown, usage = { input_tokens: 100, output_tokens: 50 }) {
  let seenPrompt = "";
  const client = {
    messages: {
      create: async (params: { messages: { content: string }[] }) => {
        seenPrompt = params.messages[0].content;
        return {
          content: [{ type: "tool_use", name: "recommend_posts", input: { recommendations: recs } }],
          usage,
        };
      },
    },
  };
  return { client, getPrompt: () => seenPrompt };
}

function mat(id: string, text = `素材本文 ${id}`): RecommendMaterial {
  return { id, text, lang: "ja", hasMedia: false };
}

describe("buildRecommendPrompt", () => {
  test("テンプレ summary（name/description）と fmat 候補がプロンプトに載る", () => {
    const p = buildRecommendPrompt([mat("m1")], TEMPLATES);
    expect(p).toContain("template_chaen_gold");
    expect(p).toContain("チャエン型1（黄金）");
    expect(p).toContain("速報フック→意味づけ→箇条書き→実務接続");
    expect(p).toContain("template_value_deepdive");
    // fmat 候補
    expect(p).toContain("short");
    expect(p).toContain("thread");
    // 素材 id が載る
    expect(p).toContain("m1");
  });

  test("tone/hookType を持つ summary（T-B 契約）はプロンプトに反映する", () => {
    const withExt = [
      { ...TEMPLATES[0], tone: "速報屋らしく短文", hookType: "速報" } as TemplateSummary,
    ];
    const p = buildRecommendPrompt([mat("m1")], withExt);
    expect(p).toContain("速報屋らしく短文");
    expect(p).toContain("速報");
  });

  test("テンプレ空でも壊れない", () => {
    const p = buildRecommendPrompt([mat("m1")], []);
    expect(p).toContain("テンプレ一覧が空");
    expect(p).toContain("m1");
  });
});

describe("validateRecommendations", () => {
  const validMat = new Set(["m1", "m2"]);
  const validTpl = new Set(["template_chaen_gold", "template_value_deepdive"]);
  const fb = "template_chaen_gold";

  test("正常な行はそのまま通す", () => {
    const out = validateRecommendations(
      [{ materialId: "m1", templateId: "template_value_deepdive", fmat: "long", reason: "理由", confidence: 0.8 }],
      validMat,
      validTpl,
      fb,
    );
    expect(out).toEqual([
      { materialId: "m1", templateId: "template_value_deepdive", fmat: "long", reason: "理由", confidence: 0.8 },
    ]);
  });

  test("未知 templateId は既定テンプレにフォールバック", () => {
    const out = validateRecommendations(
      [{ materialId: "m1", templateId: "does_not_exist", fmat: "medium", reason: "r", confidence: 0.5 }],
      validMat,
      validTpl,
      fb,
    );
    expect(out[0].templateId).toBe(fb);
  });

  test("未知 fmat は medium に補完", () => {
    const out = validateRecommendations(
      [{ materialId: "m1", templateId: "template_chaen_gold", fmat: "giant", reason: "r", confidence: 0.5 }],
      validMat,
      validTpl,
      fb,
    );
    expect(out[0].fmat).toBe("medium");
  });

  test("confidence は [0,1] にクランプ・非数値は 0.5、reason 欠損は空文字", () => {
    const out = validateRecommendations(
      [
        { materialId: "m1", templateId: "template_chaen_gold", fmat: "short", confidence: 1.7 },
        { materialId: "m2", templateId: "template_chaen_gold", fmat: "short", confidence: "high" },
      ],
      validMat,
      validTpl,
      fb,
    );
    expect(out[0].confidence).toBe(1);
    expect(out[0].reason).toBe("");
    expect(out[1].confidence).toBe(0.5);
  });

  test("入力に無い materialId の行は破棄（幻覚 id を弾く）", () => {
    const out = validateRecommendations(
      [
        { materialId: "ghost", templateId: "template_chaen_gold", fmat: "short", reason: "r", confidence: 0.5 },
        { materialId: "m1", templateId: "template_chaen_gold", fmat: "short", reason: "r", confidence: 0.5 },
      ],
      validMat,
      validTpl,
      fb,
    );
    expect(out).toHaveLength(1);
    expect(out[0].materialId).toBe("m1");
  });

  test("同一 materialId の重複は最初の 1 件だけ採用", () => {
    const out = validateRecommendations(
      [
        { materialId: "m1", templateId: "template_chaen_gold", fmat: "short", reason: "first", confidence: 0.5 },
        { materialId: "m1", templateId: "template_value_deepdive", fmat: "long", reason: "dup", confidence: 0.9 },
      ],
      validMat,
      validTpl,
      fb,
    );
    expect(out).toHaveLength(1);
    expect(out[0].reason).toBe("first");
  });

  test("非配列入力は空配列", () => {
    expect(validateRecommendations(null, validMat, validTpl, fb)).toEqual([]);
    expect(validateRecommendations(undefined, validMat, validTpl, fb)).toEqual([]);
    expect(validateRecommendations({}, validMat, validTpl, fb)).toEqual([]);
  });
});

describe("recommendMaterials", () => {
  test("空入力は LLM を呼ばず即 []（コスト 0）", async () => {
    let called = false;
    const client = { messages: { create: async () => { called = true; return { content: [], usage: {} }; } } };
    const out = await recommendMaterials(client, [], { templates: TEMPLATES });
    expect(out.recommendations).toEqual([]);
    expect(out.costJpy).toBe(0);
    expect(called).toBe(false);
  });

  test("LLM 出力を境界検証して返す＋コスト計上", async () => {
    const { client, getPrompt } = fakeClient([
      { materialId: "m1", templateId: "template_value_deepdive", fmat: "long", reason: "深掘り向き", confidence: 0.9 },
      { materialId: "ghost", templateId: "x", fmat: "y", reason: "z", confidence: 0.1 },
    ]);
    const out = await recommendMaterials(client, [mat("m1")], { templates: TEMPLATES });
    expect(out.recommendations).toHaveLength(1);
    expect(out.recommendations[0]).toMatchObject({ materialId: "m1", templateId: "template_value_deepdive", fmat: "long" });
    expect(out.costJpy).toBeGreaterThan(0);
    // プロンプトにテンプレ summary が載っていること
    expect(getPrompt()).toContain("template_chaen_gold");
  });

  test("LLM が不正出力（recommendations 欠落）でも空配列を返す（throw しない）", async () => {
    const { client } = fakeClient(undefined);
    const out = await recommendMaterials(client, [mat("m1")], { templates: TEMPLATES });
    expect(out.recommendations).toEqual([]);
  });

  test("id 無し素材は除外され、全除外なら LLM を呼ばない", async () => {
    let called = false;
    const client = { messages: { create: async () => { called = true; return { content: [], usage: {} }; } } };
    const out = await recommendMaterials(
      client,
      [{ id: "", text: "x" } as RecommendMaterial],
      { templates: TEMPLATES },
    );
    expect(out.recommendations).toEqual([]);
    expect(called).toBe(false);
  });
});
