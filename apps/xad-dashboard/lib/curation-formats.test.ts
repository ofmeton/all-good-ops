import { describe, test, expect, vi, afterEach } from "vitest";
import {
  toTemplateOptions,
  TEMPLATE_OPTIONS_FALLBACK,
  DEFAULT_TEMPLATE_ID,
  DEFAULT_FMAT,
  toRecommendations,
  modeOf,
  buildAssignments,
  type TemplateOption,
  type Recommendation,
  type MaterialAssignment,
} from "./curation-formats";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toTemplateOptions", () => {
  test("worker の templates 配列を {id,label} に変換（label=name）", () => {
    const rows = [
      { id: "template_chaen_gold", name: "チャエン型1（黄金）", description: "d", preferredFmats: ["short"] },
      { id: "template_chaen_howto", name: "チャエン型3（数字ハウツー）", description: "d" },
    ];
    const out = toTemplateOptions(rows);
    expect(out).toEqual<TemplateOption[]>([
      { id: "template_chaen_gold", label: "チャエン型1（黄金）" },
      { id: "template_chaen_howto", label: "チャエン型3（数字ハウツー）" },
    ]);
  });

  test("空配列は fallback を返す（選択肢が消えない）", () => {
    expect(toTemplateOptions([])).toEqual(TEMPLATE_OPTIONS_FALLBACK);
  });

  test("id/name 欠落の不正 row は除外し、残らなければ fallback", () => {
    const rows = [
      { id: "", name: "空 id" },
      { name: "id 無し" },
      { id: "x" },
    ];
    expect(toTemplateOptions(rows as unknown[])).toEqual(TEMPLATE_OPTIONS_FALLBACK);
  });

  test("不正混在でも有効 row だけ拾う", () => {
    const rows = [
      { id: "ok", name: "OK" },
      { id: "", name: "bad" },
    ];
    expect(toTemplateOptions(rows as unknown[])).toEqual([{ id: "ok", label: "OK" }]);
  });

  test("非配列入力は fallback", () => {
    expect(toTemplateOptions(null as unknown as unknown[])).toEqual(TEMPLATE_OPTIONS_FALLBACK);
    expect(toTemplateOptions(undefined as unknown as unknown[])).toEqual(TEMPLATE_OPTIONS_FALLBACK);
  });

  test("非空配列なのに全 reject（契約 drift）は warn を出す", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    toTemplateOptions([{ foo: "bar" }, { id: "" }]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("[toTemplateOptions]");
  });

  test("空配列（worker 到達・テンプレ 0 件）は warn を出さない", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    toTemplateOptions([]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("TEMPLATE_OPTIONS_FALLBACK / DEFAULT_TEMPLATE_ID", () => {
  test("fallback は既定テンプレ 1 件のみ", () => {
    expect(TEMPLATE_OPTIONS_FALLBACK).toHaveLength(1);
    expect(TEMPLATE_OPTIONS_FALLBACK[0].id).toBe(DEFAULT_TEMPLATE_ID);
  });
});

describe("toRecommendations", () => {
  test("正常な推薦行はそのまま通す", () => {
    const rows = [
      { materialId: "m1", templateId: "template_value_deepdive", fmat: "long", reason: "深掘り", confidence: 0.9 },
    ];
    expect(toRecommendations(rows)).toEqual<Recommendation[]>([
      { materialId: "m1", templateId: "template_value_deepdive", fmat: "long", reason: "深掘り", confidence: 0.9 },
    ]);
  });

  test("未知 fmat は既定 fmat に補正", () => {
    const out = toRecommendations([
      { materialId: "m1", templateId: "t", fmat: "giant", reason: "r", confidence: 0.5 },
    ]);
    expect(out[0].fmat).toBe(DEFAULT_FMAT);
  });

  test("materialId/templateId が欠落の行は破棄", () => {
    const out = toRecommendations([
      { templateId: "t", fmat: "short", reason: "r", confidence: 0.5 },
      { materialId: "m1", fmat: "short", reason: "r", confidence: 0.5 },
      { materialId: "m2", templateId: "t", fmat: "short", reason: "r", confidence: 0.5 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].materialId).toBe("m2");
  });

  test("confidence は [0,1] にクランプ・非数値は 0.5、reason 欠落は空文字", () => {
    const out = toRecommendations([
      { materialId: "m1", templateId: "t", fmat: "short", confidence: 1.5 },
      { materialId: "m2", templateId: "t", fmat: "short", confidence: -2 },
      { materialId: "m3", templateId: "t", fmat: "short", confidence: "x" },
    ]);
    expect(out[0].confidence).toBe(1);
    expect(out[0].reason).toBe("");
    expect(out[1].confidence).toBe(0);
    expect(out[2].confidence).toBe(0.5);
  });

  test("非配列入力は空配列", () => {
    expect(toRecommendations(null)).toEqual([]);
    expect(toRecommendations(undefined)).toEqual([]);
    expect(toRecommendations({})).toEqual([]);
  });
});

describe("modeOf", () => {
  test("空配列は既定値", () => {
    expect(modeOf([])).toEqual({ templateId: DEFAULT_TEMPLATE_ID, fmat: DEFAULT_FMAT });
  });

  test("最頻の templateId / fmat を返す", () => {
    const recs: Recommendation[] = [
      { materialId: "a", templateId: "t1", fmat: "short", reason: "", confidence: 1 },
      { materialId: "b", templateId: "t1", fmat: "long", reason: "", confidence: 1 },
      { materialId: "c", templateId: "t2", fmat: "long", reason: "", confidence: 1 },
    ];
    expect(modeOf(recs)).toEqual({ templateId: "t1", fmat: "long" });
  });
});

describe("buildAssignments", () => {
  test("推薦のある素材はその推薦、無い素材は既定で初期化（要件1）", () => {
    const recs: Recommendation[] = [
      { materialId: "m1", templateId: "t_deep", fmat: "long", reason: "r", confidence: 0.9 },
    ];
    expect(buildAssignments(["m1", "m2"], recs)).toEqual<MaterialAssignment[]>([
      { id: "m1", fmat: "long", templateId: "t_deep" },
      { id: "m2", fmat: DEFAULT_FMAT, templateId: DEFAULT_TEMPLATE_ID },
    ]);
  });

  test("推薦が空なら全行が既定（fail-open）", () => {
    expect(buildAssignments(["a", "b"], [])).toEqual<MaterialAssignment[]>([
      { id: "a", fmat: DEFAULT_FMAT, templateId: DEFAULT_TEMPLATE_ID },
      { id: "b", fmat: DEFAULT_FMAT, templateId: DEFAULT_TEMPLATE_ID },
    ]);
  });

  test("ids の順序を保持する", () => {
    const out = buildAssignments(["z", "a", "m"], []);
    expect(out.map((a) => a.id)).toEqual(["z", "a", "m"]);
  });

  test("同一 materialId の重複推薦は先頭を採る", () => {
    const recs: Recommendation[] = [
      { materialId: "m1", templateId: "t_first", fmat: "short", reason: "", confidence: 1 },
      { materialId: "m1", templateId: "t_second", fmat: "long", reason: "", confidence: 1 },
    ];
    expect(buildAssignments(["m1"], recs)).toEqual<MaterialAssignment[]>([
      { id: "m1", fmat: "short", templateId: "t_first" },
    ]);
  });

  test("ids に無い推薦は無視（選択外素材の推薦は捨てる）", () => {
    const recs: Recommendation[] = [
      { materialId: "other", templateId: "t_x", fmat: "long", reason: "", confidence: 1 },
    ];
    expect(buildAssignments(["m1"], recs)).toEqual<MaterialAssignment[]>([
      { id: "m1", fmat: DEFAULT_FMAT, templateId: DEFAULT_TEMPLATE_ID },
    ]);
  });

  test("空 ids は空配列", () => {
    expect(buildAssignments([], [])).toEqual([]);
  });
});
