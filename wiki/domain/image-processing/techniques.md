---
type: concept
created: 2026-05-10
updated: 2026-05-10
sources: [raw/notes/image-processing-learnings.md]
related: []
tags: [image-processing, mps, real-esrgan, grid-split, playwright, python]
status: active
---

# 画像処理ノウハウカタログ

> 使用環境: macOS Apple Silicon (MPS) / Python / `~/.venvs/img-tools/`
> 関連スキル: `.claude/skills/print-data-prep/SKILL.md` / `.claude/skills/chromakey-grid-split/SKILL.md`

---

## 1. Apple Silicon MPS + Real-ESRGAN: タイル推論必須

MPS でフル画像を一括推論すると**出力が真っ黒になる**（Apple MPS の既知バグ）。

### 安定パターン: 256px タイル + Hanning ウィンドウブレンド

```python
TILE = 256        # 入力側タイルサイズ
OVERLAP = 16      # つなぎ目ブレンド用オーバーラップ

# 各タイルを推論 → float().cpu() で取り出す
out_t = model(tile_tensor)
out_t = out_t.float().cpu()

# Hanning ウィンドウで重み付き合算
pw, ph = out_tile.shape[-1], out_tile.shape[-2]
weight = np.hanning(pw)[:, None] * np.hanning(ph)[None, :]
# output_canvas / weight_canvas でブレンド後 clip
```

### セットアップ
```python
loader = spandrel.ModelLoader(device="mps")
model = loader.load_from_file(model_path)
model = model.float()   # .float() 必須
model.eval()
```

### 初回サニティチェック（新モデル×MPS の必須手順）
```python
# 64×64 パッチで min/max/mean を確認してからフル実行
test = torch.randn(1, 3, 64, 64).to("mps").float()
out = model(test)
print(out.min().item(), out.max().item(), out.mean().item())
# min ≈ 0, max ≈ 1 なら正常
```

### 備考
- CPU fallback は遅すぎる（1054×1492px で数分以上）→ MPS タイルを第一選択
- タイル推論コード全文: `.claude/skills/print-data-prep/SKILL.md`
- モデル配置先: `~/.local/share/realesrgan/`

---

## 2. グリッド画像切り出し: 3手法を最初から候補化

### 優先順位

| 優先度 | 手法 | 適用場面 |
|---|---|---|
| 1 | **実ギャップ検出**（背景99%以上の行/列を走査） | 行/列間に明確な余白がある |
| 2 | **等分割フォールバック** | 均等配置が確実な時のみ |
| 3 | **連結成分検出** | 不規則レイアウト（要素サイズがバラバラ）|

### 着手時の必須スキャン
```python
# bg比率プロファイルで構造把握
bg_row = (alpha == 0).mean(axis=1)   # 行ごとの背景比率
bg_col = (alpha == 0).mean(axis=0)   # 列ごとの背景比率

# 99%以上が背景 = ギャップ行/列
gap_rows = np.where(bg_row > 0.99)[0]
gap_cols = np.where(bg_col > 0.99)[0]
```

### 注意
- 行/列の数が想定通りでも**幅/高さが不均等なケース**を必ず仮定する
- `outputs/templates/chromakey_grid_split.py` の `detect_split_axis` が3階層実装済み
- 関連スキル: `.claude/skills/chromakey-grid-split/SKILL.md`

---

## 3. 画像処理タスクの完了報告前チェック

複数フォルダ出力の「全件OK」報告前に、**全カテゴリから最低1枚ずつ目視確認**する。

```bash
# 1. 全フォルダを一覧
ls <output_dir>/

# 2. 各フォルダから 01.png（または先頭ファイル）を Read して目視
```

**確認ポイント**:
- コンテンツが切れていないか
- 隣セルが混入していないか
- 等分割で処理したフォルダは行/列の高さ・幅が均等か確認（特に疑わしいカテゴリ）

---

## 4. Playwright での状態観測パターン

### rAF 駆動アニメーションの observe

`browser_evaluate` 内に長い `setTimeout Promise` を書くと `browser closed` を誘発する。

```python
# NG: evaluate 内に長い wait
page.evaluate("new Promise(r => setTimeout(r, 5000))")

# OK: Bash sleep で待ってから evaluate
import time
time.sleep(3)
state = page.evaluate("document.querySelector('.target').dataset.state")
```

### fill 前の visibility ガード

`display:none` の input/textarea で 30秒 timeout になる。

```python
elem = page.locator("input[name='body']")
if elem.is_visible():
    elem.fill(text)
else:
    # single-line textarea など別セレクタを試す
```

---

## 5. 共通環境

| リソース | パス |
|---|---|
| img-tools venv | `~/.venvs/img-tools/`（numpy/Pillow/scipy/torch/spandrel）|
| Real-ESRGAN モデル | `~/.local/share/realesrgan/` |
| タイル推論コード | `.claude/skills/print-data-prep/SKILL.md` |
| グリッド切り出しテンプレ | `outputs/templates/chromakey_grid_split.py` |
| Chroma-key スキル | `.claude/skills/chromakey-grid-split/SKILL.md` |
