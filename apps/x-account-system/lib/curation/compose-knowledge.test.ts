import { renderKnowledgeBriefing } from "./compose-knowledge";

describe("renderKnowledgeBriefing", () => {
  test("thread は共通知見 + スレッド知見を返す", () => {
    const b = renderKnowledgeBriefing("thread");
    expect(b).toContain("## 共通知見");
    expect(b).toContain("Claude Code を使う実務者層");
    expect(b).toContain("## thread 知見");
    expect(b).toContain("tight 2-4本");
    expect(b).toContain("\\n\\n---\\n\\n");
  });

  test("thread は anti-slop 知見を常に含む", () => {
    const b = renderKnowledgeBriefing("thread");
    expect(b).toContain("## anti-slop 知見");
    expect(b).toContain("〜について解説します");
    expect(b).toContain("人間を主語");
    expect(b).toContain("pull-quote臭い");
  });

  test("article は保存版タイトルと章立て構造を含む", () => {
    const b = renderKnowledgeBriefing("article");
    expect(b).toContain("【完全保存版/2026最新】");
    expect(b).toContain("読者の悩みを「」で2つ");
    expect(b).toContain("背景 → 基礎 → 初期設定");
    expect(b).toContain("チェックリスト");
  });

  test("未知 fmat は共通知見のみ返す", () => {
    const b = renderKnowledgeBriefing("unknown");
    expect(b).toContain("## 共通知見");
    expect(b).toContain("SCQA");
    expect(b).not.toContain("## thread 知見");
    expect(b).not.toContain("## article 知見");
  });

  test("非空かつ prompt bloat しない範囲に収まる", () => {
    for (const fmat of ["", "short", "medium", "long", "article", "thread", "unknown"]) {
      const b = renderKnowledgeBriefing(fmat);
      expect(b.trim().length).toBeGreaterThan(0);
      expect(b.length).toBeLessThan(2600);
    }
  });
});
