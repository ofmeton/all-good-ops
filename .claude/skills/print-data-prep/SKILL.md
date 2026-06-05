---
name: print-data-prep
description: "PNG を印刷所（accea 等）入稿データに仕上げる。Real-ESRGAN アップスケール→塗り足し→CMYK→トンボ→PDF 出力まで一気通貫。「accea に入稿したい」「塗り足し/トンボ/CMYK 対応して」依頼時に使う。"
---

# 印刷データ入稿準備（Print Data Prep）

## 概要

PNG を印刷所（accea 等）への入稿データに仕上げる。Real-ESRGAN でアップスケール後、塗り足し・CMYK・トンボ・PDF 出力まで一気通貫で処理する。

- **誰が**: system-engineer
- **いつ**: 「accea に入稿したい」「印刷データを作りたい」「塗り足し/トンボ/CMYK 対応して」等
- **何のために**: 印刷所規格（解像度・CMYK・塗り足し・トンボ）に適合したPDFを生成する

## トリガー（自然文例）

- 「accea 入稿用に体裁を整えたい」
- 「PNG を A1 350dpi CMYK にして塗り足し・トンボ付きで出して」
- 「印刷用データ作って」

## 前提環境

```
~/.venvs/img-tools/    # torch / spandrel / Pillow / numpy 常設
~/.local/share/realesrgan/RealESRGAN_x4plus.pth  # 64MB モデル（初回のみ DL）
```

モデル未取得の場合:
```bash
mkdir -p ~/.local/share/realesrgan
curl -L "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth" \
  -o ~/.local/share/realesrgan/RealESRGAN_x4plus.pth
```

## ⚠️ MPS の落とし穴（最重要）

Apple Silicon (M1/M2/M3) の MPS で **フル画像を一括推論すると出力が真っ黒になる**。

- パッチ単位（256px 以下）では正常動作
- **フル画像 → タイル分割処理が必須**

## 標準フロー

### Step 0 — 情報収集

ユーザーに確認：

| 項目 | 例 |
|---|---|
| ファイルパス | `~/Downloads/design.png` |
| 仕上がりサイズ | A0/A1/A2/A3/A4/B2/B3/B4、またはmm指定 |
| アップスケール品質 | Real-ESRGAN（高品質・推奨）/ LANCZOS（高速） |

### Step 1 — 現状確認

```python
from PIL import Image
img = Image.open("input.png")
print(img.size, img.mode, img.info.get("dpi"))
```

目標 DPI（通常 350）でのサイズ比較：

```
目標px = 仕上がりmm / 25.4 * DPI
必要倍率 = 目標px / 現在px
```

倍率 ≤ 4 なら Real-ESRGAN x4 で 1 パスで足りる。倍率 > 4 なら x4 後に LANCZOS で補完（x4→LANCZOSが最善）。

### Step 2 — Real-ESRGAN タイル推論（MPS）

```python
import torch, numpy as np, spandrel, math
from PIL import Image

TILE = 256    # 入力側タイルサイズ（この値で MPS が安定）
OVERLAP = 16  # オーバーラップ（つなぎ目ブレンド用）
device = torch.device("mps")  # MPS を使う
scale = 4

model = spandrel.ModelLoader(device=device).load_from_file(
    str(Path.home() / ".local/share/realesrgan/RealESRGAN_x4plus.pth"))
model.eval()

src = Image.open(INPUT_PATH).convert("RGB")
W, H = src.size

out_W, out_H = W * scale, H * scale
output  = np.zeros((out_H, out_W, 3), dtype=np.float32)
weights = np.zeros((out_H, out_W, 1), dtype=np.float32)

cols = math.ceil(W / (TILE - OVERLAP * 2))
rows = math.ceil(H / (TILE - OVERLAP * 2))

for row in range(rows):
    for col in range(cols):
        x0 = max(0, col * (TILE - OVERLAP*2) - OVERLAP)
        y0 = max(0, row * (TILE - OVERLAP*2) - OVERLAP)
        x1 = min(W, x0 + TILE)
        y1 = min(H, y0 + TILE)

        patch = src.crop((x0, y0, x1, y1))
        arr = np.array(patch).astype(np.float32) / 255.0
        t = torch.from_numpy(arr).permute(2,0,1).unsqueeze(0).to(device).float()

        with torch.no_grad():
            out_t = model(t)

        out_arr = out_t.float().cpu().squeeze(0).permute(1,2,0).clamp(0,1).numpy()

        # Hanning ウィンドウでブレンド（つなぎ目を消す）
        ph, pw = out_arr.shape[:2]
        w = np.hanning(pw).reshape(1, pw, 1) * np.hanning(ph).reshape(ph, 1, 1)

        ox0, oy0 = x0*scale, y0*scale
        ox1, oy1 = ox0 + out_arr.shape[1], oy0 + out_arr.shape[0]
        output[oy0:oy1, ox0:ox1]  += out_arr * w
        weights[oy0:oy1, ox0:ox1] += w

output = np.clip(output / np.maximum(weights, 1e-8), 0, 1)
upscaled = Image.fromarray((output * 255).astype("uint8"), "RGB")
```

### Step 3 — リサイズ・CMYK・トンボ・PDF

```python
from PIL import Image, ImageDraw

def mm2px(mm, dpi=350): return round(mm / 25.4 * dpi)

# サイズ定義（例: A1）
FINISH_W_MM, FINISH_H_MM = 594, 841
BLEED_MM = 3
DPI = 350
TOMBO_MM, TOMBO_GAP_MM = 5, 1

FINISH_W = mm2px(FINISH_W_MM)
FINISH_H = mm2px(FINISH_H_MM)
BLEED    = mm2px(BLEED_MM)
CANVAS_W = FINISH_W + BLEED * 2
CANVAS_H = FINISH_H + BLEED * 2

# リサイズ → CMYK
canvas_rgb = upscaled.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)
cmyk_img   = canvas_rgb.convert("CMYK")

# トンボキャンバス
TOMBO_PX = mm2px(TOMBO_MM)
GAP_PX   = mm2px(TOMBO_GAP_MM)
MARGIN   = TOMBO_PX + GAP_PX
total_w  = CANVAS_W + MARGIN * 2
total_h  = CANVAS_H + MARGIN * 2

out_canvas = Image.new("RGB", (total_w, total_h), (255, 255, 255))
out_canvas.paste(cmyk_img.convert("RGB"), (MARGIN, MARGIN))
d = ImageDraw.Draw(out_canvas)
BLACK, LW = (0,0,0), 3

fx0, fy0 = MARGIN + BLEED, MARGIN + BLEED
fx1, fy1 = fx0 + FINISH_W, fy0 + FINISH_H

# 四隅トンボ
for (cx, cy) in [(fx0,fy0),(fx1,fy0),(fx0,fy1),(fx1,fy1)]:
    sx = -1 if cx == fx0 else 1
    sy = -1 if cy == fy0 else 1
    d.line([(cx+sx*GAP_PX, cy), (cx+sx*(GAP_PX+TOMBO_PX), cy)], fill=BLACK, width=LW)
    d.line([(cx, cy+sy*GAP_PX), (cx, cy+sy*(GAP_PX+TOMBO_PX))], fill=BLACK, width=LW)

# 中央トンボ（上下左右）
cx_mid, cy_mid = (fx0+fx1)//2, (fy0+fy1)//2
d.line([(cx_mid, MARGIN-TOMBO_PX), (cx_mid, MARGIN-GAP_PX)], fill=BLACK, width=LW)
d.line([(cx_mid, MARGIN+CANVAS_H+GAP_PX), (cx_mid, MARGIN+CANVAS_H+TOMBO_PX)], fill=BLACK, width=LW)
d.line([(MARGIN-TOMBO_PX, cy_mid), (MARGIN-GAP_PX, cy_mid)], fill=BLACK, width=LW)
d.line([(MARGIN+CANVAS_W+GAP_PX, cy_mid), (MARGIN+CANVAS_W+TOMBO_PX, cy_mid)], fill=BLACK, width=LW)

# 出力
out_canvas.save("output_print.pdf", "PDF", resolution=DPI)
preview = out_canvas.copy()
preview.thumbnail((1500, 1500), Image.LANCZOS)
preview.save("output_preview.png", "PNG")
```

## 主要サイズ早見表（350dpi、塗り足し3mm込み）

| 仕上がり | 仕上がりpx | 塗り足し込みpx |
|---|---|---|
| A0 (841×1189mm) | 11598×16382 | 11680×16464 |
| A1 (594×841mm) | 8185×11589 | 8267×11671 |
| A2 (420×594mm) | 5787×8185 | 5869×8267 |
| A3 (297×420mm) | 4091×5787 | 4173×5869 |
| A4 (210×297mm) | 2894×4091 | 2976×4173 |
| B2 (515×728mm) | 7098×10032 | 7180×10114 |
| B3 (364×515mm) | 5016×7098 | 5098×7180 |

## よくあるミス

| 症状 | 原因 | 対処 |
|---|---|---|
| 出力が真っ黒 | MPS フル画像推論バグ | タイル分割（TILE=256）を必ず使う |
| プレビューが真っ黒で 9KB | 同上 | 同上 |
| つなぎ目が見える | オーバーラップ不足 | OVERLAP=16 以上、Hanning ウィンドウ必須 |
| PDF が小さすぎる | DPI 未設定 | `resolution=DPI` を save に渡す |
| CMYK がおかしい | ICC プロファイルなし | Pillow の簡易変換で印刷所は概ね通る（要確認） |
