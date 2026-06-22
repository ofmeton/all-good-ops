#!/usr/bin/env python3
"""Hermes prompt context loader.

Claude Code memory/wiki から生成したユーザー文脈投影を、捕捉分類器の
プロンプト先頭へ任意注入する。欠損時は空文字で従来挙動にデグレードする。
"""
import os

PROFILE_PATH = os.path.join(os.path.dirname(__file__), "context", "USER_PROFILE.md")


def load_user_profile(max_chars: int = 3000) -> str:
    try:
        with open(PROFILE_PATH, encoding="utf-8") as f:
            return f.read()[:max_chars]
    except Exception:
        return ""


def profile_block() -> str:
    profile = load_user_profile()
    if not profile:
        return ""
    return f"# ユーザー文脈（判断の前提）\n{profile}\n\n"
