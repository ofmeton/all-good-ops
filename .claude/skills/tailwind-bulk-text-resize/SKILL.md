---
name: tailwind-bulk-text-resize
description: LP/HP の全テキストサイズを一括 N% スケールするフロー。基準ズーム誤認やデザイン方針転換で全体サイズを再計算したい時に使う。Python 正規表現で text-[Npx] / text-[clamp(...)] を安全に変換、戻したい時は単一 commit を `git revert`
---

# Tailwind Bulk Text Resize — 全テキスト一括スケール

## 起動条件

- LP/HP の text サイズを全体的に N% 大きく/小さく揃え直したい
- 基準ズーム誤認（例: 50% zoom で調整していた）の補正
- デザイン方針転換で全体トーン変更（例: 「もっと洗練感」「ヘッドライン控えめ」）

## ワークフロー

### 1. スコープ決定

- **全要素**: `app/**/*.tsx` 全て
- **要素タイプ指定**: h1 だけ / h2 だけ / 本文だけ
- **ファイル指定**: 特定 page だけ

スコープに応じて regex を出し分け：
- 全要素 → `text-[clamp(...)]` と `text-[Npx]` を直接 match
- h2 だけ → `<h2 ... className="..."` 内の text-[...] のみ match (multi-line regex)

### 2. 係数決定

- `1 回り` ≈ 0.9 倍 (10% 縮小)
- `2 回り` ≈ 0.8 倍 (20% 縮小)
- `3 回り` ≈ 0.7 倍 (30% 縮小)
- `半分` = 0.5 倍 (zoom 50% 誤認の補正)

## スクリプト雛形

`/tmp/shrink_text.py` として配置・実行：

```python
#!/usr/bin/env python3
"""Reduce all text-[Npx] and text-[clamp(...)] declarations by FACTOR.
Scoped to a target dir of .tsx files.
"""
import re
from pathlib import Path

FACTOR = 0.7  # 30% 縮小（3 回り）
ROOT = Path("/Users/.../app")  # ← 対象ディレクトリ

def fmt(n: float) -> str:
    if abs(n - round(n)) < 0.01:
        return f"{int(round(n))}"
    return f"{n:.2f}".rstrip("0").rstrip(".")

clamp_re = re.compile(r"text-\[clamp\((\d+(?:\.\d+)?)px,(\d+(?:\.\d+)?)vw,(\d+(?:\.\d+)?)px\)\]")
plain_re = re.compile(r"text-\[(\d+(?:\.\d+)?)px\]")

# h2 限定なら追加:
# h2_re = re.compile(r'(<h2\b[^>]*\sclassName=")([^"]*)(")', re.DOTALL)

def reduce_clamp(m):
    a, b, c = float(m.group(1)), float(m.group(2)), float(m.group(3))
    return f"text-[clamp({fmt(a*FACTOR)}px,{fmt(b*FACTOR)}vw,{fmt(c*FACTOR)}px)]"

def reduce_plain(m):
    return f"text-[{fmt(float(m.group(1))*FACTOR)}px]"

count = 0
for p in ROOT.rglob("*.tsx"):
    src = p.read_text()
    new = clamp_re.sub(reduce_clamp, src)
    new = plain_re.sub(reduce_plain, new)
    if new != src:
        p.write_text(new)
        count += 1
print(f"updated {count} files")
```

## 安全策

1. **必ず単一 commit**: `git revert HEAD` で 1 発で戻せる状態を維持
2. **`min-[Npx]:` 等の breakpoint 数値は対象外**: regex は `text-[...]` の中だけ match するので breakpoint 数値は誤変換しない
3. **コメント数値も対象外**: regex は `text-[` prefix 必須なのでコメントの px は触らない
4. **commit メッセージに係数明記**: 「30% 縮小 (0.7 倍)」のように。後で別係数を当てる時の起点になる
5. **責任分離 commit**: bulk resize と個別 polish は別 commit にする (個別調整の上書きを避ける)

## 既知の落とし穴

- **vrl writing-mode 要素**: padding は logical なので scale すると意図と逆が起きうる。padding は本スクリプトの対象外、別管理
- **fixed `text-[N]px` (Tailwind preset)**: `text-sm` 等は本スクリプトの対象外。arbitrary value 形式のみ
- **leading-[Nrem]**: line-height も連動して直したい場合は別途 regex 追加
- **複数係数を順次適用**: 0.7 → 1.2 のように chain すると四捨五入で僅か誤差。一発で `× 0.7 × 1.2 = 0.84` をかける

## 関連

- [[feedback_browser_zoom_check]]: zoom 誤認による補正の典型例
- [[feedback_tailwind_vrl_padding]]: vrl 要素は padding scale 対象外
- `ui-ux-pro-max:ui-ux-pro-max` skill: text scale を変えた後の視覚再評価
