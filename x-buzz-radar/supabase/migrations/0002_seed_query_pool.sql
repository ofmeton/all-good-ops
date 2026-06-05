-- Phase 0 seed queries (3 個から開始、Track A で育てる)
insert into query_pool (query_string) values
  ('(claude code OR claude.ai) lang:en min_faves:300 -is:retweet -is:reply'),
  ('(anthropic OR @AnthropicAI) lang:en min_faves:500 -is:retweet'),
  ('(MCP OR "model context protocol") claude lang:en min_faves:200 -is:retweet');
