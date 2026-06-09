/**
 * lib/ma/agent-registry.test.ts
 * - hit: xad.ma_agents の active 行から ref を返す
 * - miss: 行無し / status!=active は throw（誤 stub 投稿防止思想）
 * - cache: 2 回目はクエリを再発行しない（isolate 内 Map）
 * - error: query エラーは握り潰さず throw
 * 実 Supabase は叩かない（mock sb 注入）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgentRef, clearCache } from "./agent-registry";

type QueryResult = { data: unknown; error: { message: string } | null };

/** .from().select().eq().eq().maybeSingle() を満たす mock。eq の引数と回数を記録。 */
function makeMockSb(result: QueryResult) {
  const calls = { from: 0, select: 0, maybeSingle: 0, eqs: [] as Array<[string, unknown]> };
  const builder = {
    select(_cols: string) {
      calls.select++;
      return builder;
    },
    eq(col: string, val: unknown) {
      calls.eqs.push([col, val]);
      return builder;
    },
    async maybeSingle() {
      calls.maybeSingle++;
      return result;
    },
  };
  const sb = {
    from(_table: string) {
      calls.from++;
      return builder;
    },
  } as unknown as SupabaseClient;
  return { sb, calls };
}

describe("agent-registry.getAgentRef", () => {
  beforeEach(() => clearCache());
  afterEach(() => clearCache());

  test("hit: active 行から agentId/version/environmentId を返す", async () => {
    const { sb, calls } = makeMockSb({
      data: { agent_id: "agent_w", version: "3", environment_id: "env_w" },
      error: null,
    });
    const ref = await getAgentRef(sb, "writer");
    expect(ref).toEqual({ agentId: "agent_w", version: "3", environmentId: "env_w" });
    // agent_key=writer AND status=active で絞り込む
    expect(calls.eqs).toContainEqual(["agent_key", "writer"]);
    expect(calls.eqs).toContainEqual(["status", "active"]);
  });

  test("miss: 行無しは bootstrapped エラーで throw（誤 stub 防止）", async () => {
    const { sb } = makeMockSb({ data: null, error: null });
    await expect(getAgentRef(sb, "editor")).rejects.toThrow(
      /agent not bootstrapped: editor/,
    );
  });

  test("query エラーは握り潰さず throw", async () => {
    const { sb } = makeMockSb({ data: null, error: { message: "boom" } });
    await expect(getAgentRef(sb, "writer")).rejects.toThrow(/boom/);
  });

  test("cache: 2 回目はクエリを再発行しない", async () => {
    const { sb, calls } = makeMockSb({
      data: { agent_id: "agent_w", version: "3", environment_id: "env_w" },
      error: null,
    });
    const a = await getAgentRef(sb, "writer");
    const b = await getAgentRef(sb, "writer");
    expect(b).toEqual(a);
    expect(calls.from).toBe(1); // 1 回だけクエリ
  });

  test("clearCache 後は再クエリする", async () => {
    const { sb, calls } = makeMockSb({
      data: { agent_id: "agent_w", version: "3", environment_id: "env_w" },
      error: null,
    });
    await getAgentRef(sb, "writer");
    clearCache();
    await getAgentRef(sb, "writer");
    expect(calls.from).toBe(2);
  });
});
