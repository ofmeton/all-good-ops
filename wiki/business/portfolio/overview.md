---
type: entity
created: 2026-05-10
updated: 2026-05-10
sources: []
related: []
tags: [portfolio, ofmeton, hp-production]
status: active
---

# portfolio リポジトリ overview

ofmeton 名義の HP/LP 制作物カタログサイト。サンプルサイト + 実クライアント納品物を一括陳列し、BSA 提案・スカウト時に実績 URL として露出する。

## 基本情報

| 項目 | 値 |
|---|---|
| リポ位置 | `/Users/rikukudo/Projects/portfolio/`（外部スポーク）|
| 公開 URL | `https://portfolio-fawn-eight-63.vercel.app/` |
| 名義 | **ofmeton**（サイト全体）。`ofmeton.com` は仮置きで実在せず |
| 技術スタック | React + Vite（一部 Tailwind CSS）/ Vercel デプロイ |
| 担当エージェント | client-manager / freelance-scout（外部スポーク委譲、作業時は portfolio リポへ cwd 切替） |

## 名義位置づけ（重要）

- **portfolio サイト本体は ofmeton 名義**
- **BSA 提案（工藤陸名義）でも公開 URL を実績として露出 OK**
  - 露出 URL は vercel の neutral ドメインなので「ofmeton.com」が前面に出ない
  - リポ内の名義表記は `https://portfolio-fawn-eight-63.vercel.app/` を使う（[[overview|BSA overview]] 参照）
- リポ内 `clients/` 配下に置く実案件は名義が混在しうる（個別判定。例: terra-isshiki は工藤陸名義の個人案件 = wiki/business/personal/deals/）

## 主要サンプル 3 本（コンセプト要約）

詳細は portfolio リポ内 `sample_descriptions.md`（紹介文 1000 字以内）を参照。

### 01. minato — 高性能注文住宅工務店サイト

「室温にコミットする、◯◯◯の注文住宅」。データドリブン型。UA 0.46 / C値 0.5 / 耐震等級3 等の住宅性能を性能グリッドで可視化し、パッシブ設計を図解化。来店 / 資料請求 / 勉強会の 3 段階 CTA 設計。

### 02. hiyori — 暮らしを軸にした工務店サイト

「暮らしから、家をつくる」。ジャーナル型。施工事例を「夫婦でコーヒーを楽しむ、縁側のある家」のように物語タイトルで命名。明朝体＋広い行間。アースカラー限定で派手 CTA を排除した静かなトーン。Tailwind CSS 採用。

### 03. numata — 地域総合建設会社サイト

「◯◯の風景を、百年先へ」。建築 / 土木 / リノベーションの 3 事業を共通の余白・ナンバリングで対等に並列。スクロール連動カウントアップ演出。官公庁担当者と一般施主の両目線で違和感のない情報設計。

## サンプル一覧（サイト構造）

`src/pages/` 配下: Home / Airbnb / Linear / Spotify / Stripe / Hayama / TotonoeruHayama / minato / hiyori / numata

- 主要 3 本（minato/hiyori/numata）は紹介文付きで HP 受注の実績表記として使う
- 他のサンプル（Airbnb / Linear / Spotify / Stripe 等）は技法・トーン研究の練習作品。露出方針は要判断

## クライアント納品物（リポ内 `clients/` 配下）

| ディレクトリ | 案件 | 名義 | wiki ページ |
|---|---|---|---|
| `clients/totonoeru-hayama/` | TERRA HAYAMA HP 制作（葉山民泊）| 工藤陸（個人案件） | [[2026-04-terra-isshiki]] / [[terra-hayama]] |
| `clients/hayama-tanada-biyori/` | 棚田暮らし系（要確認） | 要確認 | （未作成） |

## 関連リソース（リポ内）

| パス | 内容 |
|---|---|
| `sample_descriptions.md` | サンプル 3 本の紹介文（公開用、1000 字以内）|
| `design/` | DESIGN.md テンプレ（[[reference_design_md_toolkit]] 参照）|
| `outline/` | OUTLINE.md テンプレ |
| `research/` | LP 潮流リサーチ・観測駆動素材 |
| `lancers_sumakura_research.md` | Lancers すまクラ調査メモ |
| `construction_hp_jobs_report.md` | 建築 HP 案件レポート |
| `construction_hp_applications.md` | 建築 HP 提案集 |

## 運用ルール

- **新サンプル追加プロトコル**: memory `feedback_sample_onboarding_checklist.md` 参照（workId 命名固定 / curl 検証 / hidamari 直近 commit 確認 / max-width + margin-inline セット）
- **portfolio へのデプロイ**: Vercel team ルール（git author email 認可）に注意。memory `feedback_vercel_git_author_authorization.md` 参照
- **作業時 cwd**: 秘書は client-manager / freelance-scout を起動しつつ、portfolio リポに作業ディレクトリを切り替える（CLAUDE.md「外部スポークへの委譲ルール」）

## 関連ページ

- [[overview|BSA overview]] — BSA 提案で portfolio URL を実績露出する運用
- [[2026-04-terra-isshiki]] — clients/totonoeru-hayama に対応する個人案件
- [[terra-hayama]] — TERRA HAYAMA クライアント像
- [[motion-techniques]] — LP/HP 演出技法カタログ（portfolio サンプル制作で参照）
