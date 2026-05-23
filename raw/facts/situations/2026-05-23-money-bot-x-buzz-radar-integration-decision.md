---
date: 2026-05-23
category: situations
source: session
---

# money-bot + x-buzz-radar 統合方針決定

ユーザー判断 (2026-05-23 セッション内) で以下確定:

## 統合の方向性

- **目的**:
  - x-buzz-radar = **集客** (X / IG でフォロワー獲得、注目を集める)
  - money-bot = **収益化** (集まった注目を note 購入に変換)
  - 接合面: x-buzz-radar の SNS 投稿に money-bot 生成 note への導線を埋め込み

## ユーザー判断 4 件

1. **時間軸**: Phase 1 で money-bot 単独完走 → Phase 2 で統合 (推奨案採用)
2. **コードベース**: 1 つの Vercel project に merge (money-bot に x-buzz-radar を取り込む)
3. **データフロー**: B 案 (x-buzz-radar と money-bot が直接 pipe — `note_seed_queue` テーブル経由)
4. **UI**: LINE bot 1 つ + 統合承認 UI (タブ切替で X / IG / note)

## 詳細

統合設計書: `docs/superpowers/specs/2026-05-23-publishing-engine-integration-design.md`

## 次セッション以降の引き継ぎ

- 本セッションでは Phase 1 (money-bot 単独完走) に集中
- E 案 (Managed Agents + WDK DurableAgent) でリファクタ中
- Phase 2 統合は money-bot dogfooding 1-2 週間完了後に着手判断
- 「忘れずに」とユーザー指示があったため設計書 + 本 raw + memory に明文化
