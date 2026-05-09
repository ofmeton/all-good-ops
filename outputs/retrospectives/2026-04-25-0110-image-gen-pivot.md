# セッション振り返り — 2026-04-25 0110

## 対象セッション要約

**テーマ**: LP 制作ワークフローの視覚リッチさ向上の探索 → 方針転換 → Codex MCP + gpt-image-2 経路への着地

**主要な流れ**:
1. Stitch by Google / Google AI Studio のベストプラクティス調査
2. Nano Banana Pro の LP 組み込み提案（視覚リッチさ向上）
3. DESIGN.md の品質担保の説明（既存資産の棚卸し）
4. Nano Banana / Stitch の Claude Code 連携方法の整理
5. ユーザー方針転換: DESIGN.md/OUTLINE.md 規約ベース保留 → 画像生成ドリブン
6. gpt-image-2 の固有名詞・価格・API 開放時期の確認（API 開放は 2026-05 初旬予定）
7. ユーザー方針再転換: 画像生成 MCP → Codex MCP（ChatGPT サブスク枠消費）
8. Codex MCP インストール → Connected だがツール未露出 → プロンプトファイル化 + 再起動待ちで着地
9. memory 5本新規 + MEMORY.md index 更新

**成果物**:
- 確定プロンプトファイル: `portfolio/clients/totonoeru-hayama/assets/mockups/_prompt-hero-lp-mobile-v1.md`
- memory 新規 5本（project × 1 / feedback × 3 / reference × 1）+ 振り返りで追加 1本

---

## 1. 良かった点

- **固有名詞と事実確認を省略しなかった**: `gpt-image-2.0` → `gpt-image-2` 訂正、Codex MCP 未登録状態の即検知、gpt-image-2 API 開放時期の把握。推測で進めなかった
- **外部API単価を全方針で円換算して先出し**: `feedback_external_api_cost_check` 準拠。Codex サブスク vs API 直叩きの損益分岐まで提示
- **ユーザー feedback をその場で memory に保存**: スマホファースト、要件定義粒度、承認ゲートを即定着させた
- **方針転換に都度追随**: Stitch → Nano Banana → gpt-image-2 → Codex MCP。各転換で前提をゼロベースで再検証
- **再起動を跨ぐ継続性の確保**: プロンプトをファイル化して作業損失ゼロにした

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | 初回画像プロンプトが長すぎた（英日ハイブリッド詳細版） | 「画像生成には構造化プロンプト推奨」のリサーチ知識に引きずられた | 既存の DESIGN.md/OUTLINE.md を見た時点で、それらを圧縮したものがプロンプトとして適切だと判断できた | 要件定義粒度を第一案にする |
| 2 | ピクセル `1080×3600px` を勝手に付与 → 削除要求 | モデルのデフォルト挙動の不確実性を過剰カバー | 「要件定義粒度」というユーザー希望と矛盾することに気づけた | 粒度方針を決めた段階で定量値は全排除 |
| 3 | Codex MCP 登録直後に「試してみて」と進んだ | `feedback_mcp_reauth` は既知だが、追加直後のツール未露出は別パターン | 追加直後のセッションではスキーマ未ロードが通常、と即告知できた | 追加確認と同時に再起動必要を先出し |
| 4 | 当初 Stitch/Nano Banana 提案がデスクトップ前提 | BSA のモバイル主流を memory に置いていなかった | `project_bsa_strategy.md` の流入経路（広告→LP）から推論可能 | BSA 関連 LP/HP は最初からモバイル縦長で出す |

## 3. 自動化・効率化の余地

- **MCP 追加直後のツール未露出告知**は再発しているパターン → 新規 `feedback_mcp_postadd_session.md` で分離
- **要件定義 → 画像生成プロンプト変換**は今後複数案件で繰り返される型 → `feedback_image_prompt_granularity.md` は持っているが、将来的には変換手順そのもののスキル化候補
- **承認ゲートの Claude Code 側実装パターン**は Codex MCP 初回実行後に「承認ゲートスキル」として型化できる可能性

## 4. 次回への改善提案

1. BSA LP/HP 提案は最初から必ずモバイル縦長前提（memory 済）
2. 画像生成プロンプトは DESIGN.md/OUTLINE.md 抽出レベルを初手で採用、ピクセル・英語装飾語彙は入れない（memory 済）
3. MCP を新規追加した直後は「このセッションでは使えない、再起動必要」を即告知（memory 済）
4. BSA 関連の視覚系提案は、リサーチ結果を並べる前に「ユーザーの要件定義資産があるか」確認する

## 5. 反映実施

### SAFE（まとめ反映済み）

- [memory 新規] `project_image_driven_lp.md` — 画像生成ドリブン方針と却下した他選択肢（Stitch / Nano Banana / gpt-image-2 API 直叩き / AIDesigner）
- [memory 新規] `feedback_lp_mobile_first.md` — スマホファースト大前提
- [memory 新規] `feedback_image_prompt_granularity.md` — 要件定義レベル粒度、ピクセル指定しない
- [memory 新規] `feedback_image_approval_gate.md` — 生成完了ごと承認ゲート、500円/案件で自動停止
- [memory 新規] `reference_codex_mcp.md` — Codex MCP 導入、ChatGPT サブスク枠、再起動でツール露出予定
- [memory 新規] `feedback_mcp_postadd_session.md` — MCP 追加直後のツール未露出を即告知
- [MEMORY.md index] 上記 6 本を index に追加
- [improvement-log] 2026-04-25 エントリ追記

### RISKY

- なし

---

## 次セッション冒頭で入力すべき指示

```
./portfolio/clients/totonoeru-hayama/assets/mockups/_prompt-hero-lp-mobile-v1.md のプロンプトを Codex MCP で投入して画像生成して
```

もしくは「LP画像生成を再開して」でもプロンプトファイルがあれば文脈復元可能。
