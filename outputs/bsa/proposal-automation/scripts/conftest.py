"""pytest 設定: scripts/ を import path に追加し `import auto_submit` を可能にする。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
