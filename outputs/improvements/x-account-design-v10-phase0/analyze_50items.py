#!/usr/bin/env python3
"""Phase 0 — 10 アカ × 50 項目集計スクリプト (規則ベース、再現性確保)."""
from __future__ import annotations
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from statistics import mean, median

ROOT = Path("/tmp/phase0")
HANDLES = [
    "umiyuki_ai", "Shimayus", "SuguruKun_ai", "masahirochaen",
    "kosuke_agos", "ClaudeCode_love", "minorun365", "icoxfog417",
    "ai_jitan", "milbon_",
]

JST = timezone(timedelta(hours=9))


def load_posts(handle: str) -> list[dict]:
    path = ROOT / "posts" / f"{handle}.json"
    with path.open() as f:
        return json.load(f)


def own_posts(posts: list[dict]) -> list[dict]:
    """isReply=false のもの (= 自分発の本投稿)."""
    return [p for p in posts if not p.get("isReply")]


# ---------------------------------------------------------------------------
# A. 構造・フォーマット
# ---------------------------------------------------------------------------
URL_RE = re.compile(r"https?://[^\s]+")
TCO_RE = re.compile(r"https?://t\.co/\S+")
EMOJI_RE = re.compile(
    "["  # 主要 emoji ブロック
    "\U0001F300-\U0001F6FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA70-\U0001FAFF"
    "☀-➿"
    "]"
)
HASHTAG_RE = re.compile(r"#\S+")


def text_no_urls(t: str) -> str:
    return URL_RE.sub("", t)


def a_metrics(posts: list[dict]) -> dict:
    n = len(posts)
    if not n:
        return {"n": 0}
    lens = [len(text_no_urls(p["text"])) for p in posts]
    # 分布
    bins = {"<=140": 0, "141-280": 0, "281-1000": 0, "1001-3000": 0, ">=3001": 0}
    for L in lens:
        if L <= 140:
            bins["<=140"] += 1
        elif L <= 280:
            bins["141-280"] += 1
        elif L <= 1000:
            bins["281-1000"] += 1
        elif L <= 3000:
            bins["1001-3000"] += 1
        else:
            bins[">=3001"] += 1
    url_count = sum(1 for p in posts if URL_RE.search(p["text"]))
    # 絵文字 TOP-5
    emoji_counter = Counter()
    for p in posts:
        for ch in EMOJI_RE.findall(p["text"]):
            emoji_counter[ch] += 1
    emoji_post_count = sum(1 for p in posts if EMOJI_RE.search(p["text"]))
    # ハッシュタグ
    ht_counts = [len(HASHTAG_RE.findall(p["text"])) for p in posts]
    ht_used = sum(1 for c in ht_counts if c > 0)
    # 改行密度: \n / 文字数
    nl_density_per_post = [
        p["text"].count("\n") / max(len(p["text"]), 1) for p in posts
    ]
    return {
        "n": n,
        "avg_len": round(mean(lens), 1),
        "median_len": int(median(lens)),
        "len_dist": bins,
        "url_rate": round(url_count / n, 3),
        "emoji_post_rate": round(emoji_post_count / n, 3),
        "emoji_top5": emoji_counter.most_common(5),
        "hashtag_rate": round(ht_used / n, 3),
        "hashtag_avg_count": round(mean(ht_counts), 2),
        "newline_density_avg": round(mean(nl_density_per_post), 3),
    }


# ---------------------------------------------------------------------------
# B. 内容・トーン
# ---------------------------------------------------------------------------
KEIGO_PATTERNS = ("です", "ます", "でした", "ました", "ません")
JOUTAI_PATTERNS = ("だ。", "である", "だよ", "だね", "した。", "ない。")

FIRST_PERSON = {
    "僕": ["僕", "ぼく"],
    "俺": ["俺", "オレ"],
    "私": ["私", "わたし"],
    "筆者": ["筆者"],
    "自分": ["自分"],
}

POSITIVE_KW = ["すごい", "ヤバい", "やばい", "最高", "便利", "感動", "天才", "神"]
CRITICAL_KW = ["危険", "やめろ", "おかしい", "問題", "ダメだ", "潰れる", "失敗"]

NON_ENG_KW = [
    "中小", "経営者", "士業", "非エンジニア", "初心者",
    "コード書けない", "コードが書けない", "事業主", "個人事業",
    "プログラム書けない", "プログラミングできない",
]
FAIL_KW = [
    "ダメだった", "ハマった", "失敗", "迷った", "苦戦", "詰まった",
    "うまくいかな", "効かなかった", "後悔", "やらかし",
]
CATEGORY_KW = {
    "業務仕組み化": ["自動化", "業務", "ワークフロー", "効率化", "SOP", "業務委託", "テンプレ"],
    "ニュース速報": ["速報", "リリース", "発表", "公開された", "発売", "アナウンス", "登場", "登場した", "ローンチ"],
    "批評": ["批判", "問題", "懸念", "おかしい", "ヤバい", "やばい", "危険", "規制"],
    "tips": ["コツ", "プロンプト", "テク", "tips", "ハウツー", "やり方", "方法", "コマンド"],
}


def b_metrics(posts: list[dict]) -> dict:
    n = len(posts)
    if not n:
        return {"n": 0}
    keigo = 0
    joutai = 0
    for p in posts:
        t = p["text"]
        has_k = any(k in t for k in KEIGO_PATTERNS)
        has_j = any(j in t for j in JOUTAI_PATTERNS)
        if has_k and has_j:
            keigo += 1
            joutai += 1
        elif has_k:
            keigo += 1
        elif has_j:
            joutai += 1
    first_person_counter = Counter()
    for p in posts:
        for label, kws in FIRST_PERSON.items():
            if any(k in p["text"] for k in kws):
                first_person_counter[label] += 1
                break
        else:
            first_person_counter["無し"] += 1

    pos = sum(1 for p in posts if any(k in p["text"] for k in POSITIVE_KW))
    neg = sum(1 for p in posts if any(k in p["text"] for k in CRITICAL_KW))

    cat = {k: 0 for k in CATEGORY_KW}
    for p in posts:
        for label, kws in CATEGORY_KW.items():
            if any(k in p["text"] for k in kws):
                cat[label] += 1

    non_eng = sum(1 for p in posts if any(k in p["text"] for k in NON_ENG_KW))
    fail = sum(1 for p in posts if any(k in p["text"] for k in FAIL_KW))

    # CTA
    cta = {
        "DM言及": sum(1 for p in posts if "DM" in p["text"] or "dm" in p["text"]),
        "プロフ言及": sum(1 for p in posts if "プロフ" in p["text"] or "プロフィール" in p["text"]),
        "URL末尾誘導": sum(1 for p in posts if URL_RE.search(p["text"]) and URL_RE.search(p["text"]).end() > len(p["text"]) - 50),
        "リプ欄言及": sum(1 for p in posts if "リプ" in p["text"] or "コメント" in p["text"] or "返信" in p["text"]),
    }
    return {
        "n": n,
        "keigo_rate": round(keigo / n, 3),
        "joutai_rate": round(joutai / n, 3),
        "first_person": dict(first_person_counter),
        "pos_rate": round(pos / n, 3),
        "neg_rate": round(neg / n, 3),
        "category": {k: round(v / n, 3) for k, v in cat.items()},
        "non_engineer_rate": round(non_eng / n, 3),
        "non_engineer_n": non_eng,
        "fail_rate": round(fail / n, 3),
        "fail_n": fail,
        "cta": cta,
    }


# ---------------------------------------------------------------------------
# E. 時系列
# ---------------------------------------------------------------------------
def parse_created(s: str) -> datetime:
    # "Sat May 23 14:17:44 +0000 2026"
    return datetime.strptime(s, "%a %b %d %H:%M:%S %z %Y")


def e_metrics(posts_all: list[dict], posts_own: list[dict]) -> dict:
    if not posts_own:
        return {"n_own": 0}
    # 投稿頻度 (90 日基準だが実取得期間で割る)
    times = sorted(parse_created(p["createdAt"]) for p in posts_own)
    period_days = (times[-1] - times[0]).days or 1
    hour_hist = Counter()
    dow_hist = Counter()
    for p in posts_own:
        t = parse_created(p["createdAt"]).astimezone(JST)
        hour_hist[t.hour] += 1
        dow_hist[t.weekday()] += 1
    # 連投: 60 分以内の連続 own posts カウント
    sorted_own = sorted(posts_own, key=lambda p: parse_created(p["createdAt"]))
    chains = 0
    in_chain = False
    for i in range(1, len(sorted_own)):
        gap = (parse_created(sorted_own[i]["createdAt"]) - parse_created(sorted_own[i - 1]["createdAt"])).total_seconds()
        if gap <= 3600:
            if not in_chain:
                chains += 1
                in_chain = True
        else:
            in_chain = False
    return {
        "n_own": len(posts_own),
        "n_all": len(posts_all),
        "period_days_observed": period_days,
        "posts_per_day_own": round(len(posts_own) / period_days, 2) if period_days else None,
        "hour_hist": dict(hour_hist),
        "dow_hist": dict(dow_hist),
        "chains_60min": chains,
    }


# ---------------------------------------------------------------------------
# F. ファネル
# ---------------------------------------------------------------------------
FUNNEL_KW = [
    ("DM", ["DM", "ディーエム"]),
    ("メンバーシップ", ["メンバーシップ"]),
    ("note", ["note"]),
    ("Linktree", ["linktr", "Linktree"]),
    ("YouTube", ["YouTube", "youtube", "youtu.be"]),
    ("ブログ/Web", ["ブログ", "Blog", "blog"]),
    ("LINE", ["LINE", "line"]),
    ("Discord", ["Discord", "discord"]),
    ("Substack", ["Substack", "substack"]),
    ("メルマガ", ["メルマガ", "ニュースレター"]),
]


def f_metrics(description: str | None) -> dict:
    desc = description or ""
    found = []
    for label, kws in FUNNEL_KW:
        if any(k in desc for k in kws):
            found.append(label)
    return {"profile_cta_detected": found, "has_url_in_desc": "http" in desc}


# ---------------------------------------------------------------------------
# G. Hook
# ---------------------------------------------------------------------------
HOOK_RULES = [
    ("結論先出し", lambda t: bool(re.match(r"^[^？\?\n]{0,40}[。．]", t.strip()))),
    ("数字インパクト", lambda t: bool(re.search(r"\d", t.strip()[:60]))),
    ("問いかけ", lambda t: bool(re.match(r"^[^\n]{0,80}[？\?]", t.strip()))),
    ("逆張り", lambda t: bool(re.search(r"^.{0,40}(実は|皆が|みんな|逆に)", t.strip()))),
    ("経験談", lambda t: bool(re.search(r"^.{0,40}(私は|自分は|僕は|俺は).{0,40}(した|だった)", t.strip()))),
    ("共感", lambda t: bool(re.search(r"(気持ち分かる|あるある|わかる)", t[:80]))),
    ("警告", lambda t: bool(re.search(r"(危険|注意|やめろ|やめとけ|気をつけ)", t[:80]))),
    ("比較", lambda t: bool(re.search(r"(vs|VS|比較|と比べて|より優れ)", t[:80]))),
    ("自己卑下", lambda t: bool(re.search(r"(下手|ダメ|無能|苦手|向いてない)", t[:80]))),
    ("メタ言及", lambda t: bool(re.search(r"(ツイート|投稿|Xで|このポスト)", t[:80]))),
    ("みんなXと言うが実はY", lambda t: bool(re.search(r"みんな", t[:60]) and "実は" in t[:120])),
    ("Before-After数字", lambda t: bool(re.search(r"(Before.*After|前.*後|分.*→.*分|時間.*→.*時間)", t[:200]))),
    ("実は私も最初は", lambda t: bool(re.search(r"(私も|自分も|僕も|俺も).{0,30}(最初は|昔は|当初)", t[:120]))),
]


def g_metrics(posts: list[dict]) -> dict:
    n = len(posts)
    if not n:
        return {"n": 0}
    counts = Counter()
    leading_lens = []
    bracket_count = 0
    emoji_lead = 0
    for p in posts:
        t = p["text"]
        first_line = t.split("\n", 1)[0]
        leading_lens.append(len(first_line))
        if re.match(r"^[【\[]", t.strip()):
            bracket_count += 1
        # 冒頭が emoji
        if t.strip() and EMOJI_RE.match(t.strip()):
            emoji_lead += 1
        for label, rule in HOOK_RULES:
            if rule(t):
                counts[label] += 1
    # engagement rate (likes / views) top 25% 推定
    eng_rates = []
    for p in posts:
        v = p.get("viewCount") or 0
        if v >= 200:
            eng_rates.append(p.get("likeCount", 0) / v)
    if eng_rates:
        eng_rates_sorted = sorted(eng_rates, reverse=True)
        top25_cut = eng_rates_sorted[max(len(eng_rates_sorted) // 4 - 1, 0)]
        top25_avg = mean(eng_rates_sorted[: max(len(eng_rates_sorted) // 4, 1)])
    else:
        top25_cut = top25_avg = 0.0
    return {
        "n": n,
        "hook_dist": dict(counts),
        "engagement_top25_avg": round(top25_avg, 4),
        "engagement_top25_cut": round(top25_cut, 4),
        "bracket_rate": round(bracket_count / n, 3),
        "leading_len_median": int(median(leading_lens)),
        "emoji_lead_rate": round(emoji_lead / n, 3),
    }


# ---------------------------------------------------------------------------
# H. X フォーマット
# ---------------------------------------------------------------------------
BULLET_RE = re.compile(r"(?:^|\n)\s*[・•▼📌◆◯○●◎▶➤👉🔸🟢]")


def h_metrics(posts: list[dict]) -> dict:
    n = len(posts)
    if not n:
        return {"n": 0}
    # スレッド本数 -> 60 分以内の連続を 1 スレッドとみなす
    sorted_posts = sorted(posts, key=lambda p: parse_created(p["createdAt"]))
    thread_lens: list[int] = []
    cur = 1
    for i in range(1, len(sorted_posts)):
        gap = (parse_created(sorted_posts[i]["createdAt"]) - parse_created(sorted_posts[i - 1]["createdAt"])).total_seconds()
        if gap <= 1800:
            cur += 1
        else:
            thread_lens.append(cur)
            cur = 1
    thread_lens.append(cur)
    thread_dist = {"1本": 0, "2-3本": 0, "4-7本": 0, "8本以上": 0}
    for L in thread_lens:
        if L == 1:
            thread_dist["1本"] += 1
        elif L <= 3:
            thread_dist["2-3本"] += 1
        elif L <= 7:
            thread_dist["4-7本"] += 1
        else:
            thread_dist["8本以上"] += 1
    quote_rate = sum(
        1 for p in posts
        if re.search(r"(twitter\.com/[^/]+/status|x\.com/[^/]+/status)", p["text"])
    ) / n
    long_rate = sum(1 for p in posts if len(text_no_urls(p["text"])) >= 1000) / n
    bullet_rate = sum(1 for p in posts if BULLET_RE.search(p["text"])) / n
    bullet_emoji_rate = sum(
        1 for p in posts if re.search(r"(?:^|\n)\s*[👇✅🟢🔥📌]", p["text"])
    ) / n
    # URL 位置
    url_end_count = 0
    url_mid_count = 0
    for p in posts:
        m = list(URL_RE.finditer(p["text"]))
        if not m:
            continue
        if m[-1].end() >= len(p["text"]) - 30:
            url_end_count += 1
        else:
            url_mid_count += 1
    cta_end = sum(
        1 for p in posts if re.search(r"(プロフ|DM|note|詳しくは|👇|こちら).{0,30}$", p["text"])
    ) / n
    multi_url = sum(1 for p in posts if len(URL_RE.findall(p["text"])) >= 2) / n
    return {
        "n": n,
        "thread_dist": thread_dist,
        "quote_rt_rate": round(quote_rate, 3),
        "long_post_rate_>=1000": round(long_rate, 3),
        "bullet_rate": round(bullet_rate, 3),
        "bullet_emoji_rate": round(bullet_emoji_rate, 3),
        "url_end_rate": round(url_end_count / n, 3) if n else 0,
        "url_mid_rate": round(url_mid_count / n, 3) if n else 0,
        "cta_end_rate": round(cta_end, 3),
        "multi_url_rate": round(multi_url, 3),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    with (ROOT / "account-metrics.json").open() as f:
        metrics = json.load(f)
    out: dict[str, dict] = {}
    for h in HANDLES:
        posts_all = load_posts(h)
        posts_o = own_posts(posts_all)
        out[h] = {
            "meta": {
                "name": metrics.get(h, {}).get("name", h),
                "followers": metrics.get(h, {}).get("followers"),
                "description": metrics.get(h, {}).get("description"),
                "n_all": len(posts_all),
                "n_own": len(posts_o),
            },
            "A": a_metrics(posts_o),
            "B": b_metrics(posts_o),
            "E": e_metrics(posts_all, posts_o),
            "F": f_metrics(metrics.get(h, {}).get("description")),
            "G": g_metrics(posts_o),
            "H": h_metrics(posts_o),
        }
    with (ROOT / "analysis-50items.json").open("w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(json.dumps(
        {h: {"A_avg_len": v["A"].get("avg_len"),
             "G_engagement_top25_cut": v["G"].get("engagement_top25_cut"),
             "B_fail_n": v["B"].get("fail_n"),
             "B_non_engineer_n": v["B"].get("non_engineer_n")}
         for h, v in out.items()},
        ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
