---
date: 2026-05-23
category: situations
source: session
---

# monetize-os 廃止 + はぐりんアカウントを money-bot 専用に転用

ユーザー判断 (2026-05-23 セッション内):
> はぐりんの monetize-os を廃止、そこで使ってたアカウントを白紙にして money-bot 用に再構築、利用します

## 確定事項

- `monetize-os` プロジェクト (`/Users/rikukudo/Projects/monetize-os/`) は **廃止** (archived)
- 既存はぐりん名義の媒体アカウントを money-bot の運用対象に転用:
  - Instagram: `_hagurin__` (id: `17841437446483422`)
  - Facebook ページ: id `1170590532794254`
  - Meta app: `all-good-studio-publisher` (app_id: `839054962594651`, user_id: `970369022458081`)
- `INSTAGRAM_GRAPH_API_TOKEN` (60日長期、expires 2026-07-21) と `INSTAGRAM_BUSINESS_ACCOUNT_ID=17841437446483422` をそのまま money-bot で使用

## アカウントの位置づけ

- money-bot の主軸ターゲットは「AI を活用したい非エンジニア」(spec §2.1)
- `はぐりん` persona の人格は既存はぐりんアカウントに残るが、新コンテンツは money-bot の brand 設計に従って投入する
- アカウント名 (`_hagurin__`) はそのまま使うのか、ofmeton 系に rename するかは別途決定 (この raw 時点では未確定)

## 後追いが必要な更新

- CLAUDE.md §名義の使い分け を更新 (はぐりん枠の monetize-os 委譲記述を撤回)
- `memory/MEMORY.md` の `external/monetize-os-pointer` の archive 化
- `wiki/external/monetize-os-pointer.md` の status: archived 化
- `docs/superpowers/specs/2026-05-22-money-bot-design.md` §6.2 の「ofmeton (X / Instagram / note 既存)」を「`_hagurin__` 名義 (旧 monetize-os 統合)」に修正
- `monetize-os/` リポ自体は別途整理 (本セッション範囲外)

## 経緯

- money-bot の人間タスク手順 Step 3-2 で IG ビジネスアカウント ID 取得時、`_hagurin__` が返ってきて判明
- 「ofmeton 取り直し / はぐりんで進める / IG 後回し」3 択でユーザーが「monetize-os 廃止 + はぐりんを money-bot に統合」を選択
