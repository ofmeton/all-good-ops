# 画像処理ノウハウ — Apple Silicon / グリッド切り出し / Playwright

> 出典: Claude auto-memory（feedback_* 画像処理・Playwright系）より合成
> 作成: 2026-05-10
> 使用環境: macOS Apple Silicon (MPS) / Python / Playwright MCP

---

## 1. MPS + Real-ESRGAN: タイル推論必須

Apple Silicon MPS でフル画像を一括推論すると**出力が真っ黒になる**（min≈0.03、max≈0.04）。小パッチは正常動作する。

### 安定パターン: 256px タイル + Hanning ウィンドウブレンド

```python
TILE = 256       # 入力側タイルサイズ
OVERLAP = 16     # つなぎ目ブレンド用

# 各タイルを MPS で推論 → float().cpu() で取り出す
out_t.float().cpu()

# Hanning ウィンドウで重み付き合算
weight = np.hanning(pw)[:, None] * np.hanning(ph)[None, :]
# clip(output / weights)
```

### 初回サニティチェック
新モデル × MPS の初回実行は必ず **64×64 パッチでサニティチェック**（min/max/mean を確認）してからフル実行。

### セットアップ
```python
spandrel.ModelLoader(device="mps")  # device="mps" を明示
model = model.float()               # .float() を必ず付ける
```

### 注意
- CPU fallback は遅すぎる（1054×1492px で数分以上）。MPS タイルを第一選択
- 関連スキル: `.claude/skills/print-data-prep.md`（タイル推論コード全文掲載）
- 関連環境: `~/.venvs/img-tools/`（numpy/Pillow/scipy/torch/spandrel 常設）

---

## 2. グリッド画像切り出し: 3手法を最初から候補化

グリッド画像の切り出しタスクでは、**最初から 3 手法を候補として提示**する。「実ギャップ検出 → 等分割 → 連結成分検出」の順で適性判定する。

### 3 手法の優先順位

| 優先度 | 手法 | 適用場面 |
|---|---|---|
| 1 | **実ギャップ検出**（背景 99%以上の行/列を走査） | 行/列間に明確な余白がある |
| 2 | **等分割フォールバック** | 均等配置が保証できる時のみ |
| 3 | **連結成分検出** | 不規則レイアウト（要素サイズがバラバラ） |

### 着手時の必須手順
```python
# bg比率プロファイルを1回走査して構造把握
bg_ratio_row = (alpha == 0).mean(axis=1)  # 行ごとの背景比率
bg_ratio_col = (alpha == 0).mean(axis=0)  # 列ごとの背景比率
```

### 注意
- 行/列の数が想定通りでも**幅/高さが不均等なケース**を必ず仮定する
- `outputs/templates/chromakey_grid_split.py` の `detect_split_axis` が3階層フォールバック実装済み

---

## 3. 画像処理タスクの完了報告前チェック

複数フォルダ出力タスク（グリッド切り出し・透過化等）で「全件OK」と報告する前に、**出力された全カテゴリから最低1枚ずつ Read で目視確認**する。

### 確認手順
```bash
# 1. 全フォルダを一覧
ls <output_dir>/

# 2. 各フォルダから 01.png を Read（境界品質を目視）
```

### チェックポイント
- コンテンツが切れていないか
- 隣セルへの混入がないか
- **行/列の高さ・幅が不均等な可能性**がある場合は警戒（等分割で扱った全カテゴリ必須確認）

---

## 4. Playwright での rAF 駆動状態観測

`browser_evaluate` 内に長い `setTimeout Promise` を書くと `browser closed` を誘発する。

### 安定パターン: Bash sleep + 別 evaluate に分割
```python
# NG: evaluate 内に長い sleep
page.evaluate("new Promise(r => setTimeout(r, 5000))")

# OK: Bash sleep → 別 evaluate で状態確認
import time
time.sleep(3)
result = page.evaluate("document.querySelector('.state').textContent")
```

### Playwright fill 前の visibility ガード
`display:none` の input/textarea で 30秒 timeout になる。fill 前に必ず `is_visible()` を確認する。

```python
if element.is_visible():
    element.fill(value)
```

---

## 5. 共通環境メモ

- **img-tools venv**: `~/.venvs/img-tools/`（numpy/Pillow/scipy/torch/spandrel）
- **Real-ESRGAN モデル**: `~/.local/share/realesrgan/` 配置済み
- **タイル推論コード全文**: `.claude/skills/print-data-prep.md` 掲載
- **グリッド切り出しテンプレ**: `outputs/templates/chromakey_grid_split.py`
