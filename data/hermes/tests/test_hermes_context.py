#!/usr/bin/env python3
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import hermes_context


def test_missing_profile_returns_empty():
    original = hermes_context.PROFILE_PATH
    try:
        hermes_context.PROFILE_PATH = os.path.join(tempfile.gettempdir(), "missing-hermes-profile.md")
        assert hermes_context.load_user_profile() == ""
    finally:
        hermes_context.PROFILE_PATH = original


def test_profile_is_capped():
    original = hermes_context.PROFILE_PATH
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as f:
        f.write("あ" * 5000)
        path = f.name
    try:
        hermes_context.PROFILE_PATH = path
        assert len(hermes_context.load_user_profile(3000)) == 3000
    finally:
        hermes_context.PROFILE_PATH = original
        try:
            os.unlink(path)
        except OSError:
            pass


if __name__ == "__main__":
    test_missing_profile_returns_empty()
    test_profile_is_capped()
    print("OK")
