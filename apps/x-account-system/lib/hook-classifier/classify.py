#!/usr/bin/env python3
"""
Hook 分類器 (primary_hook + devices)

v10.2 §4.7.1 で定義された分類体系:
  primary_hook (1 つ、排他):
    - failure_story:  失敗談先行型 (経験談 + ストーリー駆動)
    - business_repro: 業務再現型 (具体的な業務手順 + 数字 + Before-After)
    - critique:       業界批評型 (思考フレーム + 異論)
    - tips_enum:      tips 列挙型 (情報密度重視)

  devices (複数、追加可):
    - number / before_after / conclusion_first / question /
    - contrarian (みんなXと言うが実はY) / empathy (実は私も最初は X) /
    - meta_reference / self_deprecating / comparison / warning /
    - first_hand_past / brackets (【】) / emoji_lead

Codex 7-1 反映: 重複ラベルを避け primary_hook は 1 つに絞る。

CLI:
  python3 classify.py < text.txt              # 1 件
  python3 classify.py --batch posts.json      # 配列
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from typing import Optional


# ============================================================================
# Device 検出ルール
# ============================================================================

DEVICE_PATTERNS = {
    # 「30 分」「3 倍」「80%」「100 件」等の数字
    "number": re.compile(r"(?:\d+(?:[.,]\d+)?\s?(?:分|秒|時間|日|週間|ヶ月|年|倍|%|％|円|万円|千円|件|個|本|名|社|時短))|"
                          r"(?:[1-9]\d{0,2}(?:,\d{3})+)"),

    # 「Before: 30 分 → After: 3 分」「30 分 → 3 分」
    "before_after": re.compile(r"(?:before[\s/:＝→\-]+after|before\s*→\s*after)|"
                                r"(?:\d+[\s\d]*[→⇒\->]+\s*\d+)|"
                                r"(?:[一-龯]{0,5}前\s*[→⇒\->]+\s*[一-龯]{0,5}後)"),

    # 冒頭が断定文 (結論先出し: 「結論、」「断言します」「答えは」)
    "conclusion_first": re.compile(r"^(?:結論[、,。]|答えは|断言します|一言で言うと|要するに|つまり)"),

    # 冒頭が疑問文
    "question": re.compile(r"^[^\n]{0,40}(?:[？\?])"),

    # 「みんな X と言うが実は Y」「X だと思われているが実は Y」
    "contrarian": re.compile(r"(?:みんな|多くの人|世間|普通)\s?(?:は|が)?\s?[一-龯]{0,20}\s?(?:と言う|思って|信じて)\s?が?[、,。]?\s?(?:実は|本当は|現実は)|"
                              r"(?:と思われ|信じられ)\s?(?:て|がち)\s?(?:いる|だが|るが)[、,。]?\s?(?:実は|本当は)"),

    # 「実は私も最初は X」「私も X だった」
    "empathy": re.compile(r"(?:実は|正直)\s?(?:私|僕|自分|オレ|俺)\s?(?:も|だって|だって|もまた)\s?(?:最初|昔|初め|前)?"),

    # メタ言及 (「この投稿で」「X で」)
    "meta_reference": re.compile(r"(?:この投稿|この[ツトス]レッド|本日のツイート|今日のスレ)"),

    # 自己卑下
    "self_deprecating": re.compile(r"(?:下手|苦手|無能|ダメ|どんくさい|ポンコツ|底辺)"),

    # 比較
    "comparison": re.compile(r"(?:vs|ＶＳ|比較|と比べて|に比べて|より|の方が|より優れ|より劣)"),

    # 警告
    "warning": re.compile(r"(?:危険|要注意|注意|やめろ|やってはいけない|落とし穴|罠|警告|ご法度)"),

    # 一人称 + 過去形
    "first_hand_past": re.compile(r"(?:私|僕|自分|俺)\s?(?:は|が|を|に|で)?\s?[^\n]{0,40}(?:した|してた|だった|なった|思った|気付いた|失敗した)"),

    # 【】カッコ
    "brackets": re.compile(r"^[^\n]{0,15}【[^】]{1,12}】"),

    # 冒頭 emoji
    "emoji_lead": re.compile(r"^[\U0001F300-\U0001FAFF\U00002600-\U000027BF]"),
}


# ============================================================================
# Primary Hook 判定 (排他的)
# ============================================================================

@dataclass
class HookAnalysis:
    primary_hook: str
    devices: list[str] = field(default_factory=list)
    confidence: float = 0.5
    raw_features: dict = field(default_factory=dict)


FAILURE_KEYWORDS = ["失敗", "ダメだった", "ハマった", "詰まった", "詰んだ", "落とし穴", "後悔",
                    "迷った", "途方に暮れ", "うまくいかな", "間違", "ミス"]
BUSINESS_REPRO_KEYWORDS = ["手順", "Step", "ステップ", "ワークフロー", "プロンプト", "テンプレ",
                          "やり方", "方法", "設定", "実装", "コード", "自動化"]
CRITIQUE_KEYWORDS = ["業界", "批評", "考察", "本質", "そもそも", "つまるところ", "結局",
                    "問題は", "課題は", "違うのは", "勘違い"]
TIPS_ENUM_KEYWORDS = ["選", "つ厳選", "つの", "コツ", "ポイント", "テクニック", "Tips", "tip"]


def detect_primary_hook(text: str, devices: list[str]) -> tuple[str, float]:
    """text と検出済 devices から primary_hook を 1 つ決める。"""
    t = text.lower()
    score = {
        "failure_story": 0.0,
        "business_repro": 0.0,
        "critique": 0.0,
        "tips_enum": 0.0,
    }

    # キーワード hit ベース
    for kw in FAILURE_KEYWORDS:
        if kw in text:
            score["failure_story"] += 1.0
    for kw in BUSINESS_REPRO_KEYWORDS:
        if kw in text:
            score["business_repro"] += 0.7
    for kw in CRITIQUE_KEYWORDS:
        if kw in text:
            score["critique"] += 0.8
    for kw in TIPS_ENUM_KEYWORDS:
        if kw in text:
            score["tips_enum"] += 0.7

    # devices boost
    if "first_hand_past" in devices and ("failure_story" not in score or score["failure_story"] < 1):
        score["failure_story"] += 0.5
    if "empathy" in devices:
        score["failure_story"] += 0.6
    if "before_after" in devices:
        score["business_repro"] += 1.2
    if "number" in devices and "before_after" in devices:
        score["business_repro"] += 0.8
    if "contrarian" in devices:
        score["critique"] += 1.0
    if "comparison" in devices and not any(k in text for k in BUSINESS_REPRO_KEYWORDS):
        score["critique"] += 0.4

    # 列挙型シグナル: 数字 + 列挙 (1. ... 2. ...)
    enum_signals = len(re.findall(r"(?:^|\n)\s?[1-9一二三四五六七八九][\.\)]\s", text))
    if enum_signals >= 2:
        score["tips_enum"] += 1.5
    if "bullet" in text or re.search(r"[・▼📌✅]", text):
        score["tips_enum"] += 0.6

    # decide
    best = max(score, key=score.get)
    total = sum(score.values()) or 1.0
    confidence = min(score[best] / total, 0.95) if total > 0 else 0.3
    if score[best] < 0.5:
        # 信頼度不足 → tips_enum をデフォルトに (国内上位の最頻パターン)
        best = "tips_enum"
        confidence = 0.3
    return best, round(confidence, 3)


def classify(text: str) -> HookAnalysis:
    """text から HookAnalysis を返す。"""
    if not text:
        return HookAnalysis(primary_hook="tips_enum", devices=[], confidence=0.0)

    devices: list[str] = []
    raw = {}
    for name, pat in DEVICE_PATTERNS.items():
        m = pat.search(text)
        if m:
            devices.append(name)
            raw[name] = m.group(0)[:60]

    primary, conf = detect_primary_hook(text, devices)
    return HookAnalysis(
        primary_hook=primary,
        devices=devices,
        confidence=conf,
        raw_features=raw,
    )


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=str, help="JSON 配列 file path (text field 必須)")
    parser.add_argument("--text", type=str, help="text 直接渡し")
    args = parser.parse_args()

    if args.batch:
        with open(args.batch, encoding="utf-8") as f:
            posts = json.load(f)
        results = []
        for p in posts:
            text = p.get("text", "")
            a = classify(text)
            results.append({
                **{k: v for k, v in p.items() if k in ("id", "url", "likeCount")},
                "primary_hook": a.primary_hook,
                "devices": a.devices,
                "confidence": a.confidence,
            })
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    if args.text:
        a = classify(args.text)
        print(json.dumps(asdict(a), ensure_ascii=False, indent=2))
        return

    text = sys.stdin.read()
    a = classify(text)
    print(json.dumps(asdict(a), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
