import { describe, test, expect } from "vitest";
import {
  toTemplateOptions,
  TEMPLATE_OPTIONS_FALLBACK,
  DEFAULT_TEMPLATE_ID,
  type TemplateOption,
} from "./curation-formats";

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
});

describe("TEMPLATE_OPTIONS_FALLBACK / DEFAULT_TEMPLATE_ID", () => {
  test("fallback は既定テンプレ 1 件のみ", () => {
    expect(TEMPLATE_OPTIONS_FALLBACK).toHaveLength(1);
    expect(TEMPLATE_OPTIONS_FALLBACK[0].id).toBe(DEFAULT_TEMPLATE_ID);
  });
});
