# ローカルファイル整理プロトコル

ローカルディレクトリ（Downloads / Desktop / Documents / iCloud Drive 等）の大型整理タスクを5フェーズで標準化する。情報取得・方針合意・実行を最短で進めるためのテンプレ。

- **誰が**: 横断スキル。秘書 or メインセッション
- **いつ**: ユーザーから「〇〇フォルダ整理して」「散らかってる」「片付けたい」等の依頼を受けた時
- **何のために**: 30+ ターン使う整理タスクを 5-7 フェーズに圧縮し、構造提案の手戻りを防ぐ

## トリガー（自然文例）

- 「Downloads整理して」「Desktop片付けて」「散らかってきたから整理したい」
- 「〇〇フォルダの中見てカテゴリ分けして」

## 5フェーズ標準フロー

### Phase 1 — 初動スキャン（1ターン）

**最初の1メッセージで全体像を一発取得**。ls から段階的に深掘りしない。

```bash
TARGET=~/Downloads  # 整理対象

cd "$TARGET" && {
  echo "=== サイズ降順 ==="
  du -sh */ 2>/dev/null | sort -hr

  echo ""
  echo "=== root 直下件数・全体サイズ ==="
  ls | wc -l
  du -sh "$TARGET" | awk '{print $1}'

  echo ""
  echo "=== 拡張子別件数 ==="
  ls | sed 's/.*\.//' | sort | uniq -c | sort -rn | head

  echo ""
  echo "=== 同サイズ重複候補（root直下のみ） ==="
  find . -maxdepth 1 -type f -printf "%s %p\n" 2>/dev/null | sort -n | awk '
    { sizes[$1] = sizes[$1] " " $2; count[$1]++ }
    END { for (s in count) if (count[s] > 1) print s ":" sizes[s] }
  ' | head -10

  echo ""
  echo "=== 主要フォルダの中身ヒント ==="
  for d in */; do
    count=$(ls "$d" 2>/dev/null | wc -l | tr -d ' ')
    size=$(du -sh "$d" 2>/dev/null | awk '{print $1}')
    echo "[$d] $count files, $size"
  done | head -20
}
```

### Phase 2 — 方針合意（必須3軸 + 個別質問）

`AskUserQuestion` で必ず確認する軸:

1. **置き場所**: 対象ディレクトリ内に集約 / 別ディレクトリ（Documents/Projects等）に振り分け / ハイブリッド
2. **経理・会計系の独立扱い**: 領収書・請求書を独立 `会計/` フォルダにまとめるか
3. **重複自動判定の許可**: 同サイズ・近名のファイルを MD5 照合 → 一致なら削除提案、まで自動で進めてよいか
4. **不明ファイルの中身確認許可**: 由来不明な docx/pdf を `unzip word/document.xml` 等で開いて分類判断してよいか

オプション質問:
- 大型インストーラ（dmg/exe/msi）の扱い: 削除 / バックアップ保持 / 個別判断
- 過去案件の扱い: 別アーカイブに分離 / そのまま残す

### Phase 3 — 不明ファイルの中身確認

`AskUserQuestion` で許可が出たら、以下の手段で中身を確認:

| ファイル種別 | 中身確認コマンド |
|---|---|
| .docx | `unzip -p file.docx word/document.xml \| sed 's/<[^>]*>/ /g' \| tr -s ' ' \| head -c 500` |
| .xlsx | `unzip -p file.xlsx xl/sharedStrings.xml \| sed 's/<[^>]*>/ /g' \| head -c 500` |
| .pptx | `unzip -p file.pptx ppt/slides/slide1.xml \| sed 's/<[^>]*>/ /g' \| head -c 500` |
| .doc (古) | `textutil -stdout -cat txt file.doc \| head -c 400` |
| .pdf | `mdls -name kMDItemTitle -name kMDItemAuthors -name kMDItemNumberOfPages file.pdf` |
| .html | `head -c 2000 file.html \| grep -oE '<title>[^<]+</title>'` |
| .zip | `unzip -l file.zip \| head` |

### Phase 4 — 構造案の提示と承認

最終構造案を提示する時のチェックリスト:

- [ ] **既存フォルダを尊重**: 既に存在するプロジェクト粒度のフォルダを新規命名で覆わない
- [ ] **経理系の独立**: 会計/ または該当するトップフォルダに集約
- [ ] **粒度を揃える**: トップ直下のフォルダは「プロジェクト粒度」「カテゴリ粒度」のどちらかに統一
- [ ] **mv 前の衝突確認**: 移動先になりうる既存フォルダは事前に `ls -d <移動先>` で確認
- [ ] **リネーム提案の根拠**: 連番・ID系の不可解な名前は中身確認後に内容ベースで命名

`AskUserQuestion` で構造案承認 → 修正点があれば反映 → 最終承認。

### Phase 5 — バッチ実行（4-6バッチ目安）

実行は必ず**バッチ単位で承認**を取りながら進める。バッチ分けの基本:

| バッチ | 内容 | 例 |
|---|---|---|
| 削除 | 重複・ゴミファイル一括削除 | dmg / Windows残骸 / 完全重複 |
| 主軸プロジェクト | 一番件数が多い主プロジェクト | WEB制作 / Shopify / RICE CREAM |
| 経理・会計 | 会計/ への集約 | 領収書 / 請求書 / 業務委託費 |
| 法的書類 | 法人設立 / 不動産 / 契約 | 定款 / 就任承諾書 |
| 画像・素材 | 写真 / 生成画像 / スクショ | picture/写真, picture/生成 |
| その他 | 個別に独立しないものをまとめる | calendar / SKIP / 古いダンプ |

**実行時の鉄則**:
- `mv` 前に必ず `ls -d <移動先>` で衝突確認
- macOS zip 展開は `unzip -l` 確認 → `-d` 決定 → `__MACOSX/` 即削除
- 削除前は MD5 照合で重複であることを検証（同サイズ ≠ 重複）
- バッチ完了ごとに残エントリ数とサイズを報告

## 重複検出の3手順型

```bash
# 手順1: 同サイズ抽出
find . -maxdepth 1 -type f -printf "%s %p\n" | sort -n

# 手順2: 同サイズ群の MD5 照合
md5 -q file1 file2

# 手順3: 一致 → 重複削除候補 / 不一致 → 内容違いと判定して保持
```

「同サイズ＝重複」で短絡しない（MENU PDF 4本やMenu pptx 3本のように、サイズ同一でも内容違いがありうる）。

## 絶対にやらないこと

1. **方針合意前にファイル移動を始める** — 必ず `AskUserQuestion` で承認を取ってからバッチ実行
2. **MD5 照合せずに「重複」と決めつけて削除する** — サイズ一致は重複の必要条件であって十分条件ではない
3. **既存フォルダを無視して新規命名で覆う** — 既存運用粒度を尊重し、受け皿として活用する
4. **macOS zip を `unzip -l` 確認なしで `-d` 展開する** — root 構造把握 + `__MACOSX/` 削除を必ずセットで
5. **構造案を3回以上修正する** — 修正が3回続いたら、構造ではなく前提（粒度・配置・例外ルール）が抜けているサイン。前提質問に戻る

## 関連リソース

- 重複ファイル検出: `feedback_mv_collision_check.md`（移動先衝突確認）
- macOS zip 展開: `feedback_zip_extract_macos_pitfalls.md`
- 整理方針合意の質問軸: `feedback_organization_consent_questions.md`
- 初動スキャンテンプレ: `feedback_file_organization_init_scan.md`
