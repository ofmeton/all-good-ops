#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import applenotes_capture
import calendar_capture


def test_applenotes_prompt_starts_with_profile_block():
    original = applenotes_capture.profile_block
    try:
        applenotes_capture.profile_block = lambda: "テスト用ユーザー文脈\n\n"
        prompt = applenotes_capture.build_prompt({"name": "買うもの", "folder": "Notes", "body": "牛乳"})
        assert prompt.startswith("テスト用ユーザー文脈\n\n")
        assert "メモ分類器" in prompt
    finally:
        applenotes_capture.profile_block = original


def test_calendar_prompt_starts_with_profile_block():
    original = calendar_capture.profile_block
    try:
        calendar_capture.profile_block = lambda: "テスト用ユーザー文脈\n\n"
        prompt = calendar_capture.build_prompt({"summary": "打ち合わせ", "location": "Zoom", "description": "資料確認"}, "06/22 10:00")
        assert prompt.startswith("テスト用ユーザー文脈\n\n")
        assert "事前準備判定器" in prompt
    finally:
        calendar_capture.profile_block = original


if __name__ == "__main__":
    test_applenotes_prompt_starts_with_profile_block()
    test_calendar_prompt_starts_with_profile_block()
    print("OK")
