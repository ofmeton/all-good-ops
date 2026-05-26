"""
Phase 0 v2 #2: Sonnet 4.6 で 24 アカ × top 20 投稿の発信ネタ仕入れ方法 質的分析

spec: outputs/improvements/x-account-design-v10-phase0-v2/source-ingestion-analysis-template.md

各 handle で:
- tweets を like 数 desc で sort → top 20 抽出 (足りなければ all)
- Sonnet 4.6 に prompt (template §2 と同等)
- 9 項目 JSON で返答 → CSV row 化

cost 試算:
- input ~3,000 tok/call × 24 = 72K tok (うち system は cache hit)
- output ~800 tok/call × 24 = 19.2K tok
- Sonnet 4.6: input $3/MTok / output $15/MTok
- 概算: $0.20-0.50 = ¥30-80 (prompt caching あり) / 上限 ¥140

使い方:
  python3 analyze-source-ingestion.py --dry-run
  python3 analyze-source-ingestion.py --execute --confirm-cost-jpy=140
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

WORKTREE = Path("/Users/rikukudo/Projects/all-good-ops-x-account-phase0-v2-analysis")
RAW_BASE = WORKTREE / "raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw"
OUT_BASE = WORKTREE / "outputs/improvements/x-account-design-v10-phase0-v2"
ENV_PATH = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/money-bot/.env.local")

MODEL = "claude-sonnet-4-6"
SONNET_INPUT_USD_PER_MTOK = 3.0
SONNET_OUTPUT_USD_PER_MTOK = 15.0
SONNET_CACHE_READ_USD_PER_MTOK = 0.30  # 1/10 price for cache hits

HANDLES_20 = [
    "ClaudeCode_UT", "obsidianstudio9", "MakeAI_CEO", "mmmiyama_D", "tetumemo",
    "claudecode_lab", "ObsidianOtaku", "so_ainsight", "Codestudiopjbk", "exploraX_",
    "jason_coder0", "heynavtoor", "ethancoder0", "cyrilXBT", "daifukujinji",
    "Fluyeporlaweb", "commte", "csaba_kissi", "ai_explorer25", "Atenov_D",
]
HANDLES_4_EXISTING = ["Shimayus", "SuguruKun_ai", "masahirochaen", "ClaudeCode_love"]
TOP_N = 20

SYSTEM_PROMPT = """あなたは X (Twitter) 発信者の情報収集パターン分析者です。
ユーザーから渡される 1 アカウントの直近上位投稿 20 件を読み、
「そのアカウントがどんな情報源から / どのタイムラグで / どんな選別基準で / どんな再加工率で発信しているか」を推定し、
以下の 9 項目を厳密 JSON で返してください。

返答フォーマット (JSON のみ、追加テキスト不要):
{
  "information_source": "海外X/公式ブログ/GitHub/論文/Discord/Slack/Podcast/本/案件メモ から該当を / 区切りで列挙",
  "publishing_lag_hours": <number, 情報源リリースから投稿までの中央値時間>,
  "selection_criteria": "<1-2行の要約>",
  "translation_rate_pct": <0-100 number>,
  "paraphrase_rate_pct": <0-100 number>,
  "opinion_rate_pct": <0-100 number>,
  "citation_explicit_rate_pct": <0-100 number>,
  "cross_platform_intake_rate_pct": <0-100 number>,
  "original_rate_pct": <0-100 number>,
  "notes": "<質的観察メモ 1-2 行>"
}

注意:
- translation_rate + paraphrase_rate + opinion_rate + original_rate ≈ 100 になるように整合性を持って推定する
- citation_explicit_rate と cross_platform_intake_rate は独立軸
- 推定根拠が薄い項目も省略せず、推定値 + 自信度の低さは notes に書く
- JSON 以外のテキスト (前置き / 後置き) は一切返さない"""


def _load_env(name: str) -> str:
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"')
    raise RuntimeError(f"{name} not found in {ENV_PATH}")


def _load_handle_tweets(handle: str) -> list[dict]:
    """新 20 アカ or 既存 4 アカの posts JSON を読む"""
    if handle in HANDLES_20:
        path = RAW_BASE / "posts" / f"{handle}.json"
        data = json.loads(path.read_text())
        return data.get("tweets", []) if isinstance(data, dict) else data
    if handle in HANDLES_4_EXISTING:
        path = RAW_BASE / "posts-existing-4" / f"{handle}.json"
        data = json.loads(path.read_text())
        # jp-publishers 側の shape (top-level tweets list か dict か)
        if isinstance(data, list):
            return data
        return data.get("tweets", [])
    raise RuntimeError(f"unknown handle: {handle}")


def _pick_top_n(tweets: list[dict], n: int = TOP_N) -> list[dict]:
    def like_count(t: dict) -> int:
        return int(t.get("likeCount") or t.get("favorite_count") or 0)
    return sorted(tweets, key=like_count, reverse=True)[:n]


def _format_tweets_for_prompt(tweets: list[dict]) -> str:
    lines = []
    for i, t in enumerate(tweets, 1):
        text = (t.get("text") or "").replace("\n", " ").strip()[:280]
        likes = t.get("likeCount") or t.get("favorite_count") or 0
        created = t.get("createdAt") or t.get("created_at") or ""
        url = t.get("url") or ""
        lines.append(f"[{i}] likes={likes} created={created} text={text} url={url}")
    return "\n".join(lines)


def estimate_cost_dry_run() -> dict:
    """全 24 アカで input/output tokens を見積もる (実 API call なし)"""
    total_input_chars = 0
    handles = HANDLES_20 + HANDLES_4_EXISTING
    for h in handles:
        try:
            tweets = _load_handle_tweets(h)
            top = _pick_top_n(tweets)
            prompt = _format_tweets_for_prompt(top)
            total_input_chars += len(prompt)
        except Exception as e:
            print(f"  warn: {h} load failed: {e}", file=sys.stderr)
    # 概算: 日本語 1 char ≈ 0.7 token, 英文 1 char ≈ 0.25 token, 混在で 0.5
    input_tok_user = int(total_input_chars * 0.5)
    input_tok_system_unique = len(SYSTEM_PROMPT) // 2  # first call uncached
    input_tok_system_cached = len(SYSTEM_PROMPT) // 2 * (len(handles) - 1)
    output_tok = 800 * len(handles)

    cost_input_uncached = input_tok_user / 1e6 * SONNET_INPUT_USD_PER_MTOK
    cost_input_system_first = input_tok_system_unique / 1e6 * SONNET_INPUT_USD_PER_MTOK
    cost_input_system_cache_read = input_tok_system_cached / 1e6 * SONNET_CACHE_READ_USD_PER_MTOK
    cost_output = output_tok / 1e6 * SONNET_OUTPUT_USD_PER_MTOK
    cost_total = cost_input_uncached + cost_input_system_first + cost_input_system_cache_read + cost_output
    return {
        "handles": len(handles),
        "total_input_chars": total_input_chars,
        "input_tok_user_est": input_tok_user,
        "input_tok_system_first_call": input_tok_system_unique,
        "input_tok_system_cached_rest": input_tok_system_cached,
        "output_tok_est": output_tok,
        "cost_usd_est": round(cost_total, 4),
        "cost_jpy_est": int(cost_total * 160),
    }


def _extract_json(text: str) -> dict:
    """応答テキストから最初の {...} を抜く (Sonnet が JSON 外文字を混ぜた場合の安全網)"""
    m = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not m:
        raise RuntimeError("no JSON object in response")
    return json.loads(m.group(0))


def run_analysis() -> int:
    try:
        import anthropic  # type: ignore
    except ImportError:
        print("ERROR: anthropic SDK not installed. Run: pip3 install anthropic")
        return 1

    api_key = os.environ.get("ANTHROPIC_API_KEY") or _load_env("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=api_key)

    handles = HANDLES_20 + HANDLES_4_EXISTING
    raw_dir = OUT_BASE / "source-ingestion-analysis-raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    csv_path = OUT_BASE / "source-ingestion-analysis.csv"

    rows: list[dict] = []
    total_input_tok = 0
    total_output_tok = 0
    total_cache_read_tok = 0
    total_cache_create_tok = 0

    fields = [
        "handle", "information_source", "publishing_lag_hours", "selection_criteria",
        "translation_rate_pct", "paraphrase_rate_pct", "opinion_rate_pct",
        "citation_explicit_rate_pct", "cross_platform_intake_rate_pct",
        "original_rate_pct", "notes",
    ]

    for i, h in enumerate(handles, 1):
        try:
            tweets = _load_handle_tweets(h)
            top = _pick_top_n(tweets)
            user_text = (
                f"アカウント: @{h}\n投稿数: {len(top)}\n\n投稿一覧:\n"
                f"{_format_tweets_for_prompt(top)}"
            )
            resp = client.messages.create(
                model=MODEL,
                max_tokens=1500,
                system=[{
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=[{"role": "user", "content": user_text}],
            )
            text = resp.content[0].text  # type: ignore[union-attr]
            data = _extract_json(text)
            row = {"handle": h, **{k: data.get(k, "") for k in fields[1:]}}
            rows.append(row)

            # usage tracking
            u = resp.usage
            total_input_tok += getattr(u, "input_tokens", 0)
            total_output_tok += getattr(u, "output_tokens", 0)
            total_cache_read_tok += getattr(u, "cache_read_input_tokens", 0) or 0
            total_cache_create_tok += getattr(u, "cache_creation_input_tokens", 0) or 0

            (raw_dir / f"{h}.json").write_text(json.dumps({
                "handle": h,
                "response_text": text,
                "parsed": data,
                "usage": {
                    "input_tokens": getattr(u, "input_tokens", 0),
                    "output_tokens": getattr(u, "output_tokens", 0),
                    "cache_read_input_tokens": getattr(u, "cache_read_input_tokens", 0) or 0,
                    "cache_creation_input_tokens": getattr(u, "cache_creation_input_tokens", 0) or 0,
                },
            }, ensure_ascii=False, indent=2))
            print(f"  [{i}/{len(handles)}] {h}: input={u.input_tokens} output={u.output_tokens} cache_read={getattr(u,'cache_read_input_tokens',0) or 0}")
        except Exception as e:
            print(f"  [{i}/{len(handles)}] {h}: ERROR {e}")
            rows.append({"handle": h, "notes": f"ERROR: {e}", **{k: "" for k in fields[1:-1]}})

    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    # actual cost
    cost = (
        (total_input_tok - total_cache_read_tok - total_cache_create_tok) / 1e6 * SONNET_INPUT_USD_PER_MTOK
        + total_cache_create_tok / 1e6 * SONNET_INPUT_USD_PER_MTOK * 1.25  # cache create premium
        + total_cache_read_tok / 1e6 * SONNET_CACHE_READ_USD_PER_MTOK
        + total_output_tok / 1e6 * SONNET_OUTPUT_USD_PER_MTOK
    )
    summary = {
        "session_date": datetime.now(timezone.utc).date().isoformat(),
        "model": MODEL,
        "handles_analyzed": len(handles),
        "total_input_tokens": total_input_tok,
        "total_output_tokens": total_output_tok,
        "total_cache_read_tokens": total_cache_read_tok,
        "total_cache_creation_tokens": total_cache_create_tok,
        "actual_cost_usd": round(cost, 4),
        "actual_cost_jpy": int(cost * 160),
        "csv_path": str(csv_path.relative_to(WORKTREE)),
    }
    (OUT_BASE / "source-ingestion-analysis-usage.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2)
    )
    print("\n=== done ===")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm-cost-jpy", type=int, default=0)
    args = parser.parse_args()

    est = estimate_cost_dry_run()
    print("=== Phase 0 v2 #2 source-ingestion-analysis cost estimate ===")
    for k, v in est.items():
        print(f"  {k}: {v}")

    if args.dry_run:
        return 0
    if not args.execute:
        print("\n--execute を指定すると本実行します")
        return 0
    if args.confirm_cost_jpy < est["cost_jpy_est"] * 0.5 or args.confirm_cost_jpy > 200:
        print(f"\nERROR: --confirm-cost-jpy={args.confirm_cost_jpy} が想定範囲外 (見積 ¥{est['cost_jpy_est']}, 上限 ¥200)")
        return 1
    return run_analysis()


if __name__ == "__main__":
    sys.exit(main())
