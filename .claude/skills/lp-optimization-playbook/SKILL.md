---
name: lp-optimization-playbook
description: "LP/HP の軽量化を3ステップ（各 commit 分離で revert 可能）で行うプレイブック。「サイト重い」「LP 軽量化」「Lighthouse 改善」「FCP 短く」要請時に使う。static/Vite 両構成に適用可。"
---

# LP 軽量化プレイブック

## 概要

BSA / その他 LP 案件で「サイトが重い、軽量化したい」と要請があった時に起動する。3 ステップ（A1 / A2 / B1）を順次適用し、各ステップを **別 commit に分けて revert 可能** にする。Anthropic Design API 由来の Babel standalone prototype のような static 構成にも、Vite ビルド系にも適用可能。

- **誰が**: rapid-hp-operator / system-engineer / conversion-designer
- **いつ**: 「LP 軽量化」「サイト重い」「Lighthouse 改善」要請時
- **何のために**: 画像とランタイムを削って First Contentful Paint と Total Page Weight を下げる

## トリガー（自然文例）

- 「みどり工務店のサイト軽量化図れる？」「LP の重さ改善して」
- 「Lighthouse スコア上げたい」「FCP 短くしたい」

## 前提

実行前に**必ずユーザーに「中プラン採用＋ commit 分割 で進める」を宣言**する。即実行はしない。プラン提示は以下の表で:

| プラン | 採用項目 | 削減量目安 | 工数 | 後戻り |
|---|---|---|---|---|
| 小 | A1 + A2 | -7MB（-32%） | 10分 | 容易 |
| **中**（推奨） | A1 + A2 + B1 | -15MB（-68%） | 1時間 | 容易 |
| 大 | A1 + A2 + B1 + B2 + C1 + C2 | -18MB＋TBT劇的改善 | 3〜4時間 | やや手間 |

A1/A2/B1 を最低限とし、B2 (Babel 撤廃→esbuild) はビルド工程追加が許容できる時のみ提案。

## 実行フロー

### Step 0 — 現状実測

```sh
cd <site-root>
echo "=== 総容量 ===" && du -sh .
echo "=== assets 内訳 ===" && du -sh assets/* | sort -hr
echo "=== top 画像 ===" && find assets -name "*.png" -exec du -h {} + | sort -hr | head -15

# 不使用画像検出
USED=$(grep -hoE 'assets/[a-zA-Z0-9_/.-]+\.(png|jpg|webp|svg)' components/*.jsx index.html styles.css 2>/dev/null | sort -u)
ALL=$(find assets -type f \( -name "*.png" -o -name "*.jpg" \) | sort -u)
UNUSED=$(comm -23 <(echo "$ALL") <(echo "$USED"))
echo "=== 不使用 ===" && echo "$UNUSED" | wc -l
echo "$UNUSED" | xargs -I{} du -k {} | awk '{s+=$1} END {printf "%.1f MB\n", s/1024}'
```

### A1. 不使用画像削除（必須）

```sh
echo "$UNUSED" > /tmp/unused.txt
xargs -I{} git rm "{}" < /tmp/unused.txt
```

commit メッセージテンプレ:
```
perf(A1): 不使用画像 N 個を削除（-X.X MB）

grep で参照確認済の以下を削除: ...
合計: assets YM → ZM（-N%）
後戻り: git revert <この commit sha> で全復元
```

### A2. React UMD を production build に切替（React UMD 構成のみ）

`index.html` の `<script src=".../react.development.js">` を `react.production.min.js` に変更。**integrity SHA も再計算必須**。

```sh
for u in \
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js" \
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"; do
  hash=$(curl -sL "$u" | openssl dgst -sha384 -binary | base64)
  echo "$u → integrity=sha384-$hash"
done
```

得た SHA を `integrity="sha384-..."` 属性に置換。

`vite/next` ビルド構成の場合は本ステップ不要（既に minified）。

### B1. 大物画像を WebP 化（必須・最大効果）

対象選定:
- 500KB 超の PNG/JPG（特に背景・ヒーロー・サービス写真）
- decor 系の小さな PNG（< 50KB）は無理に変換しなくてよい（WebPブラウザ判定の overhead で逆効果）

Pillow で一括変換（`~/.venvs/img-tools/` 利用）:
```sh
source ~/.venvs/img-tools/bin/activate && python3 << 'PY'
from PIL import Image
import os
targets = [
  'assets/bg-desktop.png',
  'assets/bg-sp.png',
  'assets/services/order-house.png',
  # ...
]
total_b, total_a = 0, 0
for src in targets:
    dst = src.rsplit('.', 1)[0] + '.webp'
    img = Image.open(src).convert('RGB')
    img.save(dst, 'WEBP', quality=85, method=6)
    b, a = os.path.getsize(src), os.path.getsize(dst)
    total_b += b; total_a += a
    print(f"{src} {b/1024:.0f}KB → {a/1024:.0f}KB ({100*(1-a/b):.1f}% off)")
print(f"Total: {total_b/1024/1024:.2f}MB → {total_a/1024/1024:.2f}MB")
PY
```

quality=85, method=6（最大圧縮）が水彩イラスト・写真ともに最適バランス。実績で 90%+ off が出ることがある。

参照を WebP に切替:
- `styles.css`: `url('assets/bg-desktop.png')` → `url('assets/bg-desktop.webp')`
- `components/data.jsx` 等の photo: `assets/services/X.png` → `.webp`

ブラウザで確認後、元 PNG を `git rm`（git history で復元可）。

### Step 終了 — 全 commit を順次 push

各ステップを別 commit にし、最後にまとめて push:
```sh
git push
```

Vercel 自動デプロイ。`mcp__plugin_vercel_vercel__list_deployments` で各 commit の state 確認。

## 互換性メモ

- **WebP**: Chrome/Firefox/Safari 14+ / Edge すべて対応（シェア 99%+）。Safari 13 以下は背景非表示になるが、シェア < 1%なので許容
- **integrity (SRI)**: 計算ミスると script ブロックされる。production min 版の SHA は development 版と異なるので必ず再計算

## 後戻り手順

```sh
# WebP やめて PNG に戻す
git revert <B1 commit sha>
# React を development に戻す
git revert <A2 commit sha>
# 削除画像を全復元
git revert <A1 commit sha>
```

各 commit が独立しているので revert 順序は任意。衝突は通常発生しない。

## 取り入れ判断

- **B2: Babel standalone 撤廃 → esbuild ビルド導入**:
  - 効果: -3MB（Babel CDN 不要）+ TBT 数秒短縮
  - 工数: 1〜2 時間（vercel.json `buildCommand` 追加、esbuild 設定）
  - 採用判断: 「サンプル LP として動けばOK」なら不要、「本番運用＋Lighthouse スコア重視」なら踏む
- **C1: CSS minify**: 38KB → 28KB は誤差。CDN gzip 後ほぼ同じ。B2 採用時に付随でやる
- **C2: Tweaks Panel 削除**: Anthropic Design 由来の prototype に残る `tweaks-panel.jsx` (~20KB) は Vercel では絶対動かない。ついでに削除推奨

## 関連スキル / memory

- `ui-ux-pro-max` プラグインスキル: 修正前後目視確認のフロー
- `feedback_visual_diff_check_after_edit.md`: スクショ比較
- `feedback_jsx_prototype_cache_busting.md`: `?v=` クエリ更新の原則
- `vercel-team-deploy-checklist.md`: push 前の author email 確認
- `feedback_headless_chrome_spa_limit.md`: 確認スクショの取り方

## 絶対にやらないこと

1. ユーザー承認なしで A1/A2/B1 を即実行する → 必ずプラン提示と commit 分割を宣言してから着手
2. **B1 で元 PNG を残しつつ WebP 参照に切替** → A1 のメリットが減衰。原則 PNG は git rm で削除（git history で復元可）
3. **A2 で integrity 属性をそのまま production URL に流用** → SRI mismatch で script ブロック。必ず再計算
4. **複数 commit を 1 つにまとめる** → 後戻り時に一括 revert になり、選択的にやり直しできなくなる
