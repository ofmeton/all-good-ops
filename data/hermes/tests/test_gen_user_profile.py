#!/usr/bin/env python3
import os
import sys
import tempfile
from io import StringIO

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import gen_user_profile


def test_collect_sources_skips_missing_paths():
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".md") as f:
        f.write("存在する内容")
        path = f.name
    missing = path + ".missing"
    try:
        collected = gen_user_profile.collect_sources([path, missing])
        assert f"### {os.path.basename(path)}" in collected
        assert "存在する内容" in collected
        assert missing not in collected
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def test_collect_sources_warns_unreadable_paths():
    with tempfile.NamedTemporaryFile("wb", delete=False, suffix=".md") as f:
        f.write(b"\xff\xfe\x00")
        path = f.name
    original_stderr = sys.stderr
    stderr = StringIO()
    try:
        sys.stderr = stderr
        collected = gen_user_profile.collect_sources([path])
        warning = stderr.getvalue()
        assert collected == ""
        assert "WARN: skipped unreadable source" in warning
        assert path in warning
    finally:
        sys.stderr = original_stderr
        try:
            os.unlink(path)
        except OSError:
            pass


if __name__ == "__main__":
    test_collect_sources_skips_missing_paths()
    test_collect_sources_warns_unreadable_paths()
    print("OK")
