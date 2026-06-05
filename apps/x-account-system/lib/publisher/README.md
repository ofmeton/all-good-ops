# Publisher X (PR-B)

X (Twitter) 投稿のための publisher。Editor 通過後の draft を OAuth 2.0 PKCE token で投稿する。

## Gates (順序固定)

1. `editorOutput.decision === 'rejected'` → blocked `editor_rejected`
2. `editorOutput.riskLevel === 'high'` AND NOT `highRiskApproved` → blocked `risk_high_pending_approval`
3. kill-switch (`X_PUBLISHER_KILL_SWITCH=true` or override) → blocked `kill_switch`
4. brownout (`X_PUBLISHER_BROWNOUT=true` or override) → blocked `brownout`
5. `dryRun === true` → status `dry_run`
6. token 未取得 (`X_ACCESS_TOKEN` 未設定) → dryRun 強制 (Phase 0.5)
7. token expired → refresh attempt (Phase 0.5 では failed)
8. POST `/2/tweets` with retry (max 3, exponential backoff 1s/2s/4s)

## Phase 0.5 fallback

`X_ACCESS_TOKEN` 未設定なら `status='dry_run'` を返す。
`__setTokenOverride()` で test 時に token を強制注入できる。

## Test override helpers

- `__setTokenOverride(state | null)` — token store の override
- `__setKillSwitchOverride(bool | null)` — kill-switch の env を無視
- `__setBrownoutOverride(bool | null)` — brownout の env を無視
- `__setFetchImpl(fn | null)` — fetch 実装を mock に差し替え

## SSOT

- `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §6.4 / §6.5
- `apps/x-account-system/lib/oauth/oauth-test-checklist.md`
