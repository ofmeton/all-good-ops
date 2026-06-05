# Visualizer (PR-E)

ofmeton AI 業務自動化発信システムの Visualizer モジュール。

## SSoT

- `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §2.6 / §6.4.5 / §6.6
- `outputs/improvements/x-account-design-consolidated/initial-values-design.md` §3.7 / §4.2
- `.claude/skills/visual-design-system.md` (Noto Sans Heavy / 4 色 / 文字 ≥24pt)

## モード比率 (initial-values §3.7 SSOT、Phase 1 ofmeton 採用初期値)

| Mode      | 比率 | 用途 |
|-----------|------|------|
| image     | 70%  | screenshot 50% + text overlay 20% |
| video     | 15%  | 15-30秒 10% + ≥30秒/hybrid 5% |
| text_only | 15%  | 失敗談・主観意見 (画像なし真摯トーン) |

> **silent reduction 厳禁** (cs:s2-78 / cs:s3-68 / cs:s2-68): 上記比率は initial-values §3.7 が SSOT。下流で集約する際も「画像 70% / 動画 15% / テキスト 15%」の括りを維持する。

## 5 テンプレ (Instagram カルーセル 9 枚、main-design §6.4.5 SSOT)

| Template ID            | 構造                                | 由来 (note 5 構成) |
|------------------------|-------------------------------------|--------------------|
| T1_hook_evidence       | Hook → 9 項目 → まとめ → CTA         | まとめ型           |
| T2_number_breakdown    | Hook → 3 Step → コスト → CTA         | 段階型             |
| T3_failure_chronicle   | 自己紹介 → 業務 → 失敗 → 成功 → 提言 | 専門職×AI 型       |
| T4_how_to_steps        | Hook → 比較軸 → A vs B → 結論        | ツール比較型       |
| T5_hot_take_data       | おさらい → 今回 → 結果 → 次回予告    | シリーズ実践記型   |

## Phase 0.5 fallback

- `IN_MEMORY_FALLBACK=true` または `OPENAI_API_KEY` 未設定 → stub URL (`https://stub.images/...`) を返す
- video モードは Phase 0.5 では動画自動生成しない → 撮影 SOP storyboard を text で返す

## ファイル構成

```
lib/visualizer/
├── types.ts              VisualizerRequest / ImageOutput / VideoOutput / TextOnlyOutput
├── codex-image.ts        gpt-image-2 経由画像生成 (Phase 0.5 stub)
├── mode-selector.ts      initial-values §3.7 比率で image/video/text を選択 (rand injectable)
├── carousel-composer.ts  Instagram 9 枚カルーセル 5 テンプレの slide 生成
├── index.ts              統合 entry (visualize(req): VisualizerOutput)
├── __fixtures__/         5 件 (image / carousel / video / text_only / switchback)
└── *.test.ts             selector / composer / image stub / index 統合テスト
```

## test

```
npm run visualizer:test
```

## Phase 1 移行 TODO

1. `codex-image.ts` の live path 実装 (OpenAI SDK 経由、gpt-image-2)
2. `carousel-composer.ts` の Writer LLM 呼び出し (各 slide 本文を Sonnet 4.6 で生成)
3. `selectModeBySwitchback` の週単位カットオーバー判定を実投稿カレンダーと連動
