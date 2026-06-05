---
date: 2026-05-27
category: situations
source: session
---

# Supabase 運用方針確定（2026-05-27）

自作アプリと納品案件で Supabase の使い分けを以下に確定:

- **自作アプリ**: 自分の Supabase 1 project（free tier）に集約、per-app schema で分離
- **納品案件**: クライアント側の Supabase アカウントで管理（クライアントにサインアップしてもらい invite 方式）

対象自作アプリ: ai-radar / money-bot / x-buzz-radar / x-account-design
納品候補: minpaku-cleaning（クライアント側へ移管予定、現 project ID: cdqtypyasyhwbpuibhtb）

検討経緯: Neon free 10 / Turso free 500 / Supabase Pro $25 と比較した上で、既存資産（Auth/RLS/Edge Functions/Storage 連結）流用と運用 dashboard 1 元化を優先し Supabase free 集約を選択。
