# Writer X (PR-B)

X 投稿用 draft 本文を生成する Anthropic Sonnet 4.6 ベースのライター。

## 入出力

- 入力: `CoreIdea` (topic / primary_hook / format / audience / content_type / source_material_ids)
- 出力: `DraftOutput` (draftId / body / primaryHook / estimatedScore / llmCostUsd / generator)

## SSOT

- `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §6.4
- `outputs/improvements/x-account-design-consolidated/initial-values-design.md` §3, §4.1, §5.10
- `outputs/improvements/x-account-design-consolidated/style-guide-all-versions.md`

## Phase 0.5 fallback

`IN_MEMORY_FALLBACK=true` または `ANTHROPIC_API_KEY` 未設定で stub body を返す。
stub body は fixture から照合可能な deterministic 形式 (audience → first_hand → 仕組み化結論)。

```bash
IN_MEMORY_FALLBACK=true npm run writer:test
```

## Live API ON (Phase 1+)

`ANTHROPIC_API_KEY` を `.env.local` に設定すれば `claude-sonnet-4-5` を呼ぶ。
コスト概算は Sonnet 料金 (input $3/M tok, output $15/M tok) で算出。
