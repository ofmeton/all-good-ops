/**
 * lib/ingest/collector-tools.ts — エージェント探索ツールの schema ＋ dispatch。
 * fetch は決定的コード（道具）。エージェントは「どのツールをどの引数で呼ぶか」を判断する。
 */
import type { Candidate, DiscoveryTag } from "./collector-scoring.js";
import {
  searchTweets,
  getTrends,
  searchUsers,
  getUserFollowings,
  getThread,
  type QueryType,
} from "./twitterapi-client.js";

export const COLLECTOR_TOOLS = [
  {
    name: "search_tweets",
    description: "X advanced search（キーワード/min_faves/lang/from:/since 構文可）でツイート取得",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        queryType: { type: "string", enum: ["Latest", "Top"] },
        via: {
          type: "string",
          enum: ["fixed", "keyword", "trend", "user_search", "following"],
          description: "この検索の発見経路。固定watchlist=fixed, 自由検索=keyword, トレンド由来=trend",
        },
      },
      required: ["query", "queryType"],
    },
  },
  {
    name: "get_trends",
    description: "海外トレンド取得（woeid: 23424977=US 推奨。海外ネタ先取り用）",
    input_schema: {
      type: "object",
      properties: { woeid: { type: "number" } },
      required: ["woeid"],
    },
  },
  {
    name: "search_users",
    description: "キーワードで新ソース候補アカウントを発見",
    input_schema: {
      type: "object",
      properties: { keyword: { type: "string" } },
      required: ["keyword"],
    },
  },
  {
    name: "get_user_followings",
    description: "あるアカウントのフォロー先を取得（新ソース発見）",
    input_schema: {
      type: "object",
      properties: { handle: { type: "string" } },
      required: ["handle"],
    },
  },
  {
    name: "get_thread",
    description: "conversationId でスレッド全文を復元",
    input_schema: {
      type: "object",
      properties: { conversationId: { type: "string" } },
      required: ["conversationId"],
    },
  },
] as const;

/**
 * collector の tool 種別キー → 定義（bootstrap が agent に焼く SSOT）。
 * collector_tools は 5 つの探索 tool に展開される（bootstrap-core.resolveTools が flatten）。
 * web_toolset（内蔵 web_search/web_fetch）は compose 側 SSOT を共有するため別キーで足す。
 */
export const COLLECTOR_TOOL_REGISTRY: Record<string, unknown> = {
  collector_tools: COLLECTOR_TOOLS,
};

export interface ToolApi {
  searchTweets: typeof searchTweets;
  getTrends: typeof getTrends;
  searchUsers: typeof searchUsers;
  getUserFollowings: typeof getUserFollowings;
  getThread: typeof getThread;
}

export interface ToolDeps {
  key: string;
  fetchImpl: typeof fetch;
  /** test 注入用。未指定なら本物の twitterapi-client 関数 */
  api?: ToolApi;
}

export interface DispatchResult {
  candidates: Candidate[];
  toolResultText: string;
}

function defaultApi(): ToolApi {
  return { searchTweets, getTrends, searchUsers, getUserFollowings, getThread };
}

/** tool_use を実 fetch に変換。tweet には discovery タグを付与。 */
export async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  deps: ToolDeps,
): Promise<DispatchResult> {
  const api = deps.api ?? defaultApi();
  const k = deps.key;
  const f = deps.fetchImpl;

  switch (name) {
    case "search_tweets": {
      const query = String(input.query ?? "");
      const queryType = (input.queryType as QueryType) ?? "Latest";
      const via = (input.via as DiscoveryTag["via"]) ?? "keyword";
      const tweets = await api.searchTweets(query, queryType, k, f);
      const candidates: Candidate[] = tweets.map((t) => ({
        tweet: t,
        discovery: { via, query },
      }));
      return { candidates, toolResultText: `取得 ${tweets.length} 件 (query=${query})` };
    }
    case "get_trends": {
      const woeid = Number(input.woeid ?? 1);
      const trends = await api.getTrends(woeid, k, f);
      return { candidates: [], toolResultText: `海外トレンド: ${trends.join(", ")}` };
    }
    case "search_users": {
      const keyword = String(input.keyword ?? "");
      const users = await api.searchUsers(keyword, k, f);
      return { candidates: [], toolResultText: `候補ソース: ${users.join(", ")}` };
    }
    case "get_user_followings": {
      const handle = String(input.handle ?? "");
      const users = await api.getUserFollowings(handle, k, f);
      return { candidates: [], toolResultText: `${handle} のフォロー先: ${users.join(", ")}` };
    }
    case "get_thread": {
      const cid = String(input.conversationId ?? "");
      const tweets = await api.getThread(cid, k, f);
      const candidates: Candidate[] = tweets.map((t) => ({
        tweet: t,
        discovery: { via: "fixed", query: `thread:${cid}` },
      }));
      return { candidates, toolResultText: `スレッド ${tweets.length} 件復元` };
    }
    default:
      return { candidates: [], toolResultText: `unknown tool: ${name}` };
  }
}
