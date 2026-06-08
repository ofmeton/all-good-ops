#!/usr/bin/env python3
"""6アカウントの投稿スタイル定量分析。チャエン分析(2026-06-05)の軸を踏襲。

オリジナル投稿のみ対象（リプライ・RT除外）。出力:
- metrics.json : 全アカの定量指標
- tops/<handle>.md : 各アカのエンゲージ上位投稿テキスト（質的分析用）
"""
import json
import re
import statistics as st
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).parent
TW = OUT / "tweets"
TOPS = OUT / "tops"
TOPS.mkdir(exist_ok=True)
JST = timezone(timedelta(hours=9))

HANDLES = ["MakeAI_CEO", "ClaudeCode_love", "ClaudeCode_UT", "nobel_824", "Gencoin8", "obsidianstudio9"]

EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F0FF←-⇿⌀-⏿]"
)
# 角括弧フック【】〔〕
BRACKET_HOOK = re.compile(r"^[\s]*[【〔\[]")
CTA_PAT = re.compile(r"(👇|🔽|⬇|プロフ|固定|リプ|コメント|フォロー|いいね|RT|リポスト|保存|詳細は|続きは|こちら|↓|配布|プレゼント|無料|限定|DM)")
NUM_HOOK = re.compile(r"^[\s【〔\[]*\d")  # 数字始まり
QUESTION_HOOK = re.compile(r"[?？]")


def parse_dt(s):
    return datetime.strptime(s, "%a %b %d %H:%M:%S %z %Y")


def first_line(text):
    for ln in text.split("\n"):
        if ln.strip():
            return ln.strip()
    return ""


def has_media(t):
    ee = t.get("extendedEntities") or {}
    media = ee.get("media") or []
    return media


def media_types(media):
    return [m.get("type") for m in media]


def analyze(handle):
    raw = json.load(open(TW / f"{handle}.json"))
    # オリジナルのみ: リプライ除外・RT除外（retweeted_tweet 無し）
    posts = [
        t for t in raw
        if not t.get("isReply")
        and not t.get("retweeted_tweet")
        and not t.get("inReplyToId")
    ]
    info = json.load(open(OUT / f"{handle}.json"))
    prof = info.get("data", info)

    n = len(posts)
    dts = sorted(parse_dt(t["createdAt"]) for t in posts)
    span_days = (dts[-1] - dts[0]).total_seconds() / 86400 if n > 1 else 1
    per_day = round(n / span_days, 2) if span_days else n

    lengths = [len(t["text"]) for t in posts]
    likes = [t.get("likeCount", 0) for t in posts]
    rts = [t.get("retweetCount", 0) for t in posts]
    bms = [t.get("bookmarkCount", 0) for t in posts]
    views = [t.get("viewCount", 0) for t in posts]
    replies = [t.get("replyCount", 0) for t in posts]

    bracket = sum(1 for t in posts if BRACKET_HOOK.match(t["text"]))
    numhook = sum(1 for t in posts if NUM_HOOK.match(t["text"].lstrip()))
    bullet = sum(1 for t in posts if ("・" in t["text"] or re.search(r"\n[①-⑩0-9]", t["text"])))
    cta = sum(1 for t in posts if CTA_PAT.search(t["text"]))
    q = sum(1 for t in posts if QUESTION_HOOK.search(first_line(t["text"])))
    with_media = [t for t in posts if has_media(t)]
    all_media_types = [mt for t in with_media for mt in media_types(has_media(t))]
    photo = sum(1 for x in all_media_types if x == "photo")
    video = sum(1 for x in all_media_types if x in ("video", "animated_gif"))
    emoji_counts = [len(EMOJI.findall(t["text"])) for t in posts]

    # 投稿時間帯(JST)
    hours = [parse_dt(t["createdAt"]).astimezone(JST).hour for t in posts]
    hour_hist = {h: hours.count(h) for h in range(24)}

    # source 分布
    sources = {}
    for t in posts:
        s = re.sub(r"<[^>]+>", "", t.get("source", "") or "?")
        sources[s] = sources.get(s, 0) + 1

    def pct(x):
        return round(100 * x / n, 1) if n else 0

    metrics = {
        "handle": handle,
        "name": prof.get("name"),
        "followers": prof.get("followers"),
        "following": prof.get("following"),
        "total_tweets_account": prof.get("statusesCount"),
        "description": (prof.get("description") or "")[:300],
        "analyzed_posts": n,
        "span_days": round(span_days, 1),
        "posts_per_day": per_day,
        "len_median": int(st.median(lengths)) if lengths else 0,
        "len_p90": int(sorted(lengths)[int(len(lengths) * 0.9)]) if lengths else 0,
        "bracket_hook_pct": pct(bracket),
        "num_hook_pct": pct(numhook),
        "question_hook_pct": pct(q),
        "bullet_pct": pct(bullet),
        "cta_pct": pct(cta),
        "media_pct": pct(len(with_media)),
        "media_photo": photo,
        "media_video": video,
        "emoji_median": st.median(emoji_counts) if emoji_counts else 0,
        "like_median": int(st.median(likes)) if likes else 0,
        "like_max": max(likes) if likes else 0,
        "rt_median": int(st.median(rts)) if rts else 0,
        "bookmark_median": int(st.median(bms)) if bms else 0,
        "view_median": int(st.median(views)) if views else 0,
        "reply_median": int(st.median(replies)) if replies else 0,
        "top_hours_jst": sorted(hour_hist, key=hour_hist.get, reverse=True)[:4],
        "sources": dict(sorted(sources.items(), key=lambda x: -x[1])[:4]),
    }

    # top投稿（like順 top15）テキスト書き出し
    top = sorted(posts, key=lambda t: t.get("likeCount", 0), reverse=True)[:15]
    lines = [f"# {handle} エンゲージ上位投稿（like順 top15）\n"]
    for i, t in enumerate(top, 1):
        m = has_media(t)
        mt = "+".join(media_types(m)) if m else "none"
        lines.append(
            f"## {i}. like={t.get('likeCount')} RT={t.get('retweetCount')} "
            f"BM={t.get('bookmarkCount')} view={t.get('viewCount')} media={mt}\n\n"
            f"{t['text']}\n\n---\n"
        )
    (TOPS / f"{handle}.md").write_text("\n".join(lines))
    return metrics


all_metrics = [analyze(h) for h in HANDLES]
(OUT / "metrics.json").write_text(json.dumps(all_metrics, ensure_ascii=False, indent=2))

# 比較表をstdoutに
print(f"{'handle':17} {'fol':>6} {'n':>4} {'/day':>5} {'len':>4} {'brkt%':>6} {'med%':>5} {'bul%':>5} {'cta%':>5} {'likeM':>6} {'bmM':>5}")
for m in all_metrics:
    print(f"{m['handle']:17} {m['followers']:>6} {m['analyzed_posts']:>4} {m['posts_per_day']:>5} "
          f"{m['len_median']:>4} {m['bracket_hook_pct']:>6} {m['media_pct']:>5} {m['bullet_pct']:>5} "
          f"{m['cta_pct']:>5} {m['like_median']:>6} {m['bookmark_median']:>5}")
