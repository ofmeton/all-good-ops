# LLM Wiki — claude-obsidian 部分採用 設計 spec

- 起票: 2026-05-22
- 状態: draft（このブランチで合意 → main マージで active）
- 関連: [[2026-05-09-llm-wiki-design]]（既存基盤 spec）

## 0. 背景

[claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian)（MIT, 5.3k★）は Karpathy LLM Wiki パターンを実装した Obsidian + Claude Code 連携プラグイン。ours の `wiki/` システムと**同じ思想ベース**で先行運用されている。差分調査の結果、ours にない有効機能を 4 つ採用し、当面不要と判定した 5 つを却下する。

### 採用しないもの（記録）

| 機能 | 却下理由 |
|---|---|
| Address Assignment (DragonScale M2) | 効果不明・実装コスト過大 |
| Semantic tiling (DragonScale M3) | embedding cosine による重複検出。現在の wiki 規模（23 ページ）では不要 |
| agenda control (DragonScale M4) | 「次に何を学ぶか」を vault から推奨する仕組み。KGI/KPI 起点で戦略決定する ours の運用と思想ミスマッチ |
| /canvas | Obsidian Canvas でビジュアルマップ生成。nice-to-have で優先度低 |
| /autoresearch | 自律リサーチループ。`researcher` エージェントと役割重複 |
| MCP-Obsidian (Local REST API) で直接操作 | ours は Obsidian = 閲覧のみ／編集 = git + Edit で分業確立済。変更コストが効果を上回る |
| ファイル名 Title Case + spaces | wikilink 一意性に依存する設計。既存 37 ファイルが kebab-case で稼働中、移行コスト過大 |
| `.raw/` (hidden) | 既存 `raw/` (visible) で運用済。変更コスト > 効果 |

### 採用する 4 機能（本 spec で設計）

1. **hot.md ホットキャッシュ** — セッション跨ぎのコンテキスト保持
2. **3 Query Modes (quick/standard/deep)** — token 予算の明示化
3. **.manifest.json delta tracking** — 同一素材の二重 ingest 防止
4. **defuddle URL クリーニング** — WebFetch 前処理で 40-60% トークン削減

---

## 1. 採用機能の設計

### 1.1 wiki/hot.md ホットキャッシュ

**目的**: セッション間のコンテキスト保持。新規セッションが `wiki/index.md` 全読み + 個別ページ巡回をしなくて済むよう、直近 ~500 words の作業文脈を要約する。

**配置**: `wiki/hot.md`（vault root）

**フォーマット**:
```markdown
---
type: meta
title: "Hot Cache"
updated: YYYY-MM-DD
---

# Recent Context

## Last Updated
YYYY-MM-DD — <一行サマリ>

## Current Focus
- <現在進行中のテーマ 1-3 件>

## Recently Touched
- [[page-name]] (YYYY-MM-DD <更新内容 1 行>)
- ...

## Open Questions / Frontiers
- <未解決のテーマ>
```

**更新タイミング（必須）**:
- ingest 完了後（publishing/inspirations の自動 ingest 含む）
- 大きな query 合成完了後
- 戦略変更（CLAUDE.md / SCHEMA 改定）の commit 後
- セッション終了時の振り返り後（`session-retrospective.md` フローに組込）

**更新ルール**:
- 500 words 以内を厳守（超えたら古い項目を間引く）
- Recently Touched は直近 7 件
- ファイル全置換（追記ではなく書き換え）
- 文体は declarative present tense（「やった」「やる」明示）

**起動時の活用**:
- 秘書／メインセッション直接対話 ともに、セッション開始時の最初のファイル読み込み対象に `wiki/hot.md` を組み込む（CLAUDE.md「セッション開始時の秘書の動作」§1 を改訂）

### 1.2 3 Query Modes — quick / standard / deep

**目的**: token 予算の明示化。「軽量/標準/熟議」というコスト分類はあるが、query 系（wiki 読み取り）に特化したモード分けがなく、毎回 index → 個別ページの巡回をしてしまうため。

**3 モードの定義**:

| モード | トリガー | 読む対象 | token 目安 | 用途 |
|---|---|---|---|---|
| **quick** | 「wiki クイック」「短く」 / 単発事実問い合わせ | `wiki/hot.md` のみ | ~500 | 「最近何やった?」「あの案件のステータスは?」 |
| **standard** | デフォルト（明示なし） | `hot.md` + `index.md` + 3-5 ページ | ~3,000 | 大半の質問・依頼 |
| **deep** | 「深く調べて」「全体俯瞰」「synthesis」 | `hot.md` + `index.md` + 関連ページ全部（+ Web 補完） | ~8,000+ | 戦略合成、複数領域横断分析、月次レビュー |

**判定ルール**:
- hot.md だけで答えが取れたら quick で打ち切る（個別ページを開かない）
- 開く必要があるなら standard に昇格、明示する: 「standard で進めます」
- deep は必ず**先に宣言**（コスト最適化原則 §1）

**filing back（質問の filing）**:
- standard / deep で得た合成が再利用価値あると判定したら、`wiki/questions/<title>.md` として保存する選択肢を提示
- type: `topic`（既存 4 種に統一、新規 `question` 種別は作らない）
- 保存判定: 「もう一度同じ問いが来そうなら保存」
- 雑談・即時的なやりとりは保存しない（事実情報の自動 raw 保存ルールと同じ哲学）

**配置**: `wiki/questions/` ディレクトリを新設（現状は無）

### 1.3 raw/.manifest.json delta tracking

**目的**: 同一素材の二重 ingest を自動検出。現在の `publishing-wiki-ingest.md` skill は `wiki/publishing/log.md` の grep で取り込み済判定しているが、ファイル名変更やコピーで判定が壊れる。ハッシュベースで堅牢化する。

**配置**: `raw/.manifest.json`（raw root 直下）

**raw/ の immutable 原則との整合**:
- `.manifest.json` は **LLM 管轄のメタファイル**として `raw/` の immutable 規則から除外する
- 通常の素材ファイル（`raw/articles/*.md` 等）は引き続き immutable
- SCHEMA に明記する

**フォーマット**:
```json
{
  "sources": {
    "raw/publishing/inspirations/instagram-2026-05-20-asc-carousel-15slides.md": {
      "hash": "md5:abc123...",
      "ingested_at": "2026-05-20",
      "pages_created": ["wiki/publishing/inspirations/instagram-2026-05-20-asc-carousel-15slides.md"],
      "pages_updated": ["wiki/publishing/by-media/instagram.md", "wiki/publishing/index.md", "wiki/publishing/log.md"]
    }
  }
}
```

**運用フロー（ingest 時）**:
1. ingest 対象 raw ファイルのハッシュを計算（`md5 -q` macOS）
2. `.manifest.json` の `sources[path].hash` と一致 → 「ingest 済（変更なし）」でスキップ
3. 不一致 or 未記録 → ingest 実行
4. ingest 完了後、`.manifest.json` を更新（hash / ingested_at / created / updated）
5. ユーザー指示で `force ingest` 時は 1-2 をスキップ

**bootstrap**:
- 既存の取り込み済 raw ファイル（publishing/inspirations の 5 件 + 過去 ingest 分）に対し、初回は `wiki/publishing/log.md` 等を読みつつバックフィルする半自動スクリプトを書く
- bootstrap は 1 回限り、本 spec の Phase 1 で実施

### 1.4 defuddle URL クリーニング

**目的**: ingest 時に URL → WebFetch で取った HTML を `defuddle` で広告・ナビ・装飾を剥がす。LLM token 40-60% 削減（claude-obsidian 計測）。

**配置**: CLI として `~/.local/bin/defuddle` または npm global にインストール

**インストール手順**: 別 skill 化する（`.claude/skills/defuddle-usage.md`）

**運用フロー**:
1. ingest 対象が URL の時、`which defuddle 2>/dev/null` で存在確認
2. あれば `defuddle <url>` で清書版を取得 → raw に保存
3. なければ WebFetch fallback（既存挙動）
4. defuddle 出力は raw に `raw/articles/<slug>-<YYYY-MM-DD>.md` で frontmatter 付きで保存

**コスト**: defuddle は OSS / 無料、課金なし。Firecrawl は引き続き「無料枠のみ・第二選択」原則を維持。

---

## 2. SCHEMA への接続変更

`wiki/SCHEMA.md` に以下を追記:

### 2.1 §ホットキャッシュ（新設）
- hot.md の目的・フォーマット・更新タイミング・500 words 制約
- セッション起動時に最優先で読む対象として位置付け

### 2.2 §query プロトコル（拡張）
- 既存の 4 ステップを 3 Modes に再構造化
- quick/standard/deep の判定基準
- deep は事前宣言必須

### 2.3 §ingest プロトコル（拡張）
- `.manifest.json` ハッシュチェック手順を §1 と §0（事前）に追加
- 既存「1 ingest = 1 commit」は維持

### 2.4 §raw/ の例外（追加）
- `raw/.manifest.json` は LLM 管轄のメタファイルで immutable 規則から除外
- 他の raw/* ファイルは引き続き immutable

### 2.5 ページ種別の維持
- entity / concept / source / topic の 4 種を維持（claude-obsidian の question / decision / session は採用せず）
- filing back で生成する合成は `topic` 型 + `wiki/questions/` ディレクトリで運用

---

## 3. 既存資産との整合

| 既存 | 接続方法 |
|---|---|
| `wiki/index.md`（マスターカタログ） | hot.md と二段構え。hot は直近、index は全体 |
| `wiki/log.md` / `wiki/publishing/log.md` | 維持。manifest.json は dedup 用途、log は時系列イベント記録（役割分担） |
| `publishing-wiki-ingest.md` skill | Step 1 のスキャンに manifest hash check を組み込む |
| `secretary` セッション開始時動作（CLAUDE.md） | `wiki/hot.md` を最優先で読む（index.md より前） |
| `session-retrospective.md` skill | 振り返り完了時に `hot.md` 更新を必須項目に追加 |
| コスト分類（軽量/標準/熟議） | wiki query 系は別軸の quick/standard/deep を併存（用途が違うので衝突しない） |

---

## 4. 実装フェーズ

### Phase 0: 本 spec の commit（本ブランチ）
- 本 spec を `docs/superpowers/specs/` に配置
- 一緒に下記 Phase 1-3 の最小実装も同 PR に乗せる（小さい変更が多いため）

### Phase 1: hot.md / manifest.json 雛形 + SCHEMA 更新
- `wiki/hot.md` 雛形を作成（既存ページ状況を反映した初回サマリを記入）
- `raw/.manifest.json` 空（`{"sources": {}}`）で配置
- `wiki/SCHEMA.md` に §ホットキャッシュ / §query プロトコル / §ingest（manifest）/ §raw 例外 を追記
- `CLAUDE.md` のセッション開始時動作に hot.md 読み込みを追加

### Phase 2: skill 更新
- `publishing-wiki-ingest.md` に manifest hash check を組み込む
- `session-retrospective.md` の振り返り完了時アクションに hot.md 更新を追加
- `.claude/skills/defuddle-usage.md` を新設（インストール手順 + 使い分け）

### Phase 3: bootstrap
- 既存 publishing/inspirations の 5 件 + その他取り込み済 raw ファイルに対し、`.manifest.json` の初回バックフィル
- bootstrap スクリプトを `scripts/manifest-bootstrap.sh` として配置（1 回限りの実行を想定）

### Phase 4: defuddle 導入
- `npm i -g defuddle-cli`（or 同等）でインストール（ユーザー手動）
- `which defuddle` が通れば ingest フローで自動使用
- 通らなければ WebFetch fallback（運用継続）

Phase 0-3 は本 PR で一気に着地。Phase 4 はユーザーが手動 npm install するタイミングで自動有効化。

---

## 5. 採用判断のメタ記録

- 採用 4 機能はいずれも「ours の既存運用に追加するだけで衝突なし」。新規導入リスクが小さく、効果が token コスト直撃で測定可能
- 却下 5 機能は「ours の規模／既存エージェント体制／kebab-case 規約と衝突」が共通要因
- 名義3ライン分離撤廃（2026-05-22 commit `5c07f51`）と本採用は別件だが、同じ「規約を軽くして実運用負荷を下げる」方針の連続的判断

参照: raw/facts/situations/2026-05-22-meigi-3-line-abolish.md
