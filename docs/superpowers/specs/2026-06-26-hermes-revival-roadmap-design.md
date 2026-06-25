# hermes 自走パートナー 再生ロードマップ（設計＋セッション引き継ぎ）

- **日付**: 2026-06-26
- **種別**: 設計ドキュメント（brainstorming 由来）＋ セッション引き継ぎ
- **対象システム**: hermes（「あとでやる」自走タスクパートナー）。SSOT memory: `project_hermes_todo_partner.md`
- **ステータス**: 方針合意済み（実装未着手）。次工程＝writing-plans → Codex 半委任実装
- **関連**: `docs/superpowers/specs/2026-06-16-hermes-todo-partner-design.md`（原設計）/ `2026-06-24-hermes-notion-interaction-design.md`（Phase5）

---

## 0. TL;DR（次に読む人へ）

当初依頼は「AIクライアントを秘書にして Claude と Codex をチームメンバーにし、共有メモリは all-good-ops リポに置く構成を設計したい」だった。**調査の結論: その構想は hermes として既に存在する。新規構築は不要。やるべきは「故障修理＋ grows 点火＋判断レーンの Opus 化」。**

実測で判明した核心: **直近2週間で「投げたら自動でドラフト/実装まで到達した」のは実質1件だけ**。原因はハードウェア（PCの電源/VMスペック）ではなく、**4つのソフト/運用バグ（P0〜P3）と、学習ループ（grows）の完全未点火**。

**次にやること** = 下記ロードマップ Phase 1（P1〜P3修復）から。すべて追加課金ゼロ。実行場所（Mac/VM/Mac mini）の判断は Phase 3 まで保留（修復が先）。

---

## 1. 当初依頼と再定義

| 当初の言葉 | 調査後の解像度 |
|---|---|
| 「AIクライアントを秘書に」 | 秘書＝hermes（VM常駐の捕捉入口）。既存 |
| 「Claude と Codex をチームメンバーに」 | 脳＝Claude(`claude -p`)、手＝Codex(`codex exec`)。既存・配線済み |
| 「共有メモリは Claude リポに」 | SSOT＝all-good-ops リポ + `~/.claude` memory/wiki。既存 |
| 「ChatGPT はコンテキスト共有できてない」 | **ChatGPT対話UIは本構成に組み込まない**。Codex CLI が Plus 枠で実装担当として既に参加済み。対話UIはローカルFSにアクセスできず共有困難で価値が薄い |

**確定した役割分担:**

| 層 | 担当 | 役割 |
|---|---|---|
| 常駐の耳（入口） | hermes (VM, 現Haiku→Opus化) | 外出先からの捕捉・通知。PC閉じてても受ける |
| 深い知能（脳） | Claude Code (`claude -p --model opus`, Maxサブスク) | 分類・enrich・設計・文章・grows昇華 |
| 実装の手 | Codex (`codex exec`, gpt-5.5サブスク) | 実装・調査・集計 |
| 記憶（単一真実源） | all-good-ops リポ + `~/.claude` memory/wiki | 全員がここを読み、grows はここに書く |

**設計原則: hermes は "主役" でなく "入口"。判断は入口でせず脳=Claude に渡す。** OSS hermes の実装を主役化（全やり取りをhermes経由に）するのは知能格下げ・二重真実源・車輪の再発明になるため却下。

---

## 2. 調査で判明した事実（データ）

### 2.1 アーキテクチャ現状
```
[外出先] Telegram → VM(GCP e2-micro 無料 24/7) Haiku捕捉 → Notion看板(場)
   enrich (Mac claude -p)        draft→enriching→ready
   autorun (Mac claude -p)       draft-only → 下書き
   ccauto  (Mac codex)           cc-auto    → 実装/PR
   comment_ingest (Mac)          Notionコメント取込
   nudge digest (VM 1日3回)      → Telegram更新通知
```
- VM(35.222.76.101 / user `off_me_ton_gmail_com` / 鍵 `~/.ssh/hermes_oracle`)で動くのは**捕捉Haiku・nudge・calendar のみ**。
- **重い実行（intake/autorun/ccauto/comment）は100% Mac launchd**。→ **Mac を閉じると着手は止まる**。これが「PC閉じても進む」未達の正体。

### 2.2 VM の文脈アクセス
- VMの Haiku がアクセスできるのは `~/.hermes/context/USER_PROFILE.md`（要約2.6KB）**のみ**。
- VM には **リポ本体・`~/.claude` memory全文・wiki・claude/codex CLI が無い**。
- → VMで深い作業をするには「リポ+memory同期 + CLI設置」が前提（Phase 3 の課題）。

### 2.3 稼働実態（直近2週間・06-11〜06-25）
- **自動完遂（人手介入なしにドラフト/実装到達）= 実質1件**（「来月シフト募集」autorun のみ）。
- Codex 自動実装（ccauto）の実タスク成功 = **0件**（merge到達1件はスモークテスト）。
- 看板現状: キャンセル132 / Ready14 / Inbox12 / Done9 / InProgress5 / NeedInfo1。生存32枚中25枚が brief 未ready 滞留。

### 2.4 P0〜P3 診断

| # | 症状 | 真因 | 状態 |
|---|---|---|---|
| **P0** | enrich の `claude -p` が API使用上限で停止（06-23〜24） | heavy enrich が一時的に **API従量課金経路**で動き $65支出上限ヒット（money-bot等の巻き添え） | **解消済み**。OAuthピン留め配備で 06-24 20:28以降エラー消滅。06-25実測でサブスク経由正常（トークンは `sk-ant-oat`=正・plistにAPIキー混入なし） |
| **P1** | 非コードタスクが ccauto に流れ無限NeedInfo | コード性チェックなしで `Status==Ready AND Autonomy==cc-auto` だけで pickup。**cc-auto+Ready を確定しているのは VM側Haikuエージェント**（リポ外） | 未修正 |
| **P2** | 看板が132枚キャンセルに膨張 | **child→intake→再proposal→breakdown の再帰分割**。PR#275 ガード（Status!=NeedInfo・BriefStatus!=enriching）は子を止められない | 未修正 |
| **P3** | comment対話が前進4/21 | ①初見baseline=全author最新→**最初の回答を恒久飲み込み**（ライブ実例「ITプロパートナーズ面談」が宙吊り）②state前進がapply成功依存→**失敗カード無限ループ** | 未修正 |

### 2.5 grows（自己学習ループ）= 完全未点火
- 元ネタ OSS `NousResearch/hermes-agent`「the agent that grows with you」5本柱（Memory/Skills/Soul/Crons/Self-Improvement）。陸さんは学習4柱を**意図的に外し**、代わりに Phase A で「Claude Code memory へ書き戻すループ」を設計した。
- **実測: 学習インボックス 0件・候補生成0・昇華0・周回0。一度も1周回っていない。**
- 5本柱判定: Self-Improvement=**未点火** / Memory=部分死蔵 / Soul=死蔵（Nous既定文のまま）/ Skills=死蔵（OSSバンドルのまま）/ Crons=外した（意図どおり）。
- **構造的欠陥: PC側 enrich（最も文脈を扱う層）に学習の出口が無い**（`519dbba8` 参照がコードに皆無）。出口は Telegram訂正hint 1本だけで未発火。→ 本人が逆質問に答えても手で埋めても、どこにも蓄積されず、次回また同じことを聞かれる＝「いちいち俺が埋めるの面倒」の根本原因。

---

## 3. 設計決定（確定方針）

1. **新規構築しない**。hermes の故障修理＋拡張で当初構想を達成する。
2. **grows は Claude Code 側で点火する**（OSS native記憶層は使わない＝単一真実源を壊さない）。学習4柱の全復活はしない。grows エンジンだけ取り戻す。死蔵柱（SOUL/native memories/skills）は二重化するので捨てる/一本化。
3. **判断レーンを Haiku → `claude -p --model opus`（サブスク）へ移す**。hermes は受け口に薄くする。これで知能↑・OpenRouter従量課金↓・P1根治・grows判断の精度↑。OSS hermesのバックエンドモデル差し替え（プロキシ化）は技術ミスマッチ＆規約グレー＆OpenRouter Opusは高額なので採らない。
4. **実行場所は段階昇格**。修復→今のMacを「閉じない運用」で実証→効果次第でMac mini常駐。VM全面移設は codex認証リスク等で最終手段。先にハードへ投資しない。

---

## 4. ロードマップ

| Phase | 内容 | 課金 | 受け入れ基準 |
|---|---|---|---|
| **1 修復** | P1/P2/P3 修正 ＋ 看板棚卸し（滞留25枚を生かす/捨てる） | 0 | 1週間でTelegram投げ→自動ドラフト到達が**複数件**／看板キャンセル暴走ゼロ／宙吊り回答ゼロ |
| **2 grows点火＋判断Opus化** | 学習3経路の出口配線＋同意昇華＋enrich pull強化＋死蔵柱整理＋判断レーンOpus化 | 0 | 学習インボックスに候補が貯まる→同意でmemory昇華→**同じ質問の再発が減る**／「手で埋めた」回数が実測で減少 |
| **3 実行場所** | 閉じない運用で外出実証 → 必要ならMac mini常駐 | 0→任意 | PC閉じた状態で帰宅時にドラフト完成が再現 |

### Phase 1 実装の勘所（file:line）
- **P1**:
  - `intake_enrich.py` `normalize_brief`(342-349) / `build_actions`(389-390) / triage prompt(182-192): `proposed_autonomy=='cc-auto'` を許す条件に「Details に `repo:` がある or リポ推定可」を AND。満たさなければ draft-only/ask-first へ降格。
  - `ccauto_executor.py` `process_card`(445-452): repo解決不能時に無限NeedInfoでなく **draft-only へ降格 or 1回NeedInfoで再ピックしない**（state化）。
  - **要VM作業**: VM側 Haiku エージェント（`~/.hermes/hermes-agent`・リポ外）のプロンプトにも同じ repo 条件を入れないと根治しない。
- **P2**:
  - `breakdown_apply.py` `process_parent`(208) ＋ `query_proposals`(112-120): **Parent relation を持つカード（=既に子）は分割禁止**＝階層を1段に固定。
  - `intake_enrich.py` `build_actions`(383): Parent を持つカードには breakdown 提案を出さない（二重防御）。
  - 安全弁: 1親あたり子数上限（例 N=6）＋ open カード総数 backstop（閾値超で停止＋通知）。`MAX_PER_RUN`(31) は親数上限なので別途必要。
- **P3**:
  - `comment_ingest.py` `process_card`(323): baseline を `latest_comment_created_time`（全author最新）から **bot最新コメント時刻**へ変更（`latest_bot_comment_text` 270-277 の時刻版）。
  - state を「読了地点」で先行保存（apply成否に依存させない・337-340 順序入替＋apply_intent を try 隔離）。軽微: `_run` の `ok`(363-366) を毎反復初期化。

### Phase 2 実装の勘所
- 学習の入口を3経路に拡張:
  1. 逆質問への回答（`comment_ingest` が本人回答を拾う時に同時に学習候補化）← P3修復と同じ改修。
  2. 本人が手で埋めた情報（enrich が ConversationLog/本人編集を検知）。
  3. 却下・訂正・autonomy変更（現 Telegram hint・既存・要発火）。
- 昇華は **同意ゲート経由**（`hermes-learn-review` skill・SAFE/RISKY・write_approval死守）で memory/USER_PROFILE/wiki へ。自動昇華にしない。
- enrich が次回それを読む（`gen_user_profile.py` 再生成 + memory Grep）でループが閉じる。
- 判断レーンOpus化: 捕捉Haikuを受け口に薄くし、分類・autonomy・enrich を `claude -p --model opus` に寄せる。非同期前提でレイテンシ許容。
- **Phase2 点火テスト（最短）**: Telegramで明示訂正（「これはタスクじゃない」等）を1回流し、学習インボックス(ds `56ef9df9-1dc3-48bc-bacb-f4ce42c8a448`)に pending が立つか観測。

### Phase 3 実行場所の障壁（VM移設する場合に必要なもの）
- codex CLI 設置（`ccauto_executor.py:179`）＋ codex の ChatGPT Plus 認証（`~/.codex/auth.json` 相当）をVMへ。**VMでサブスク認証が通るか要検証**。
- リポ clone ＋ origin push 権限 ＋ `gh` CLI 認証 ＋ `git config user.email` を `off.me.ton@gmail.com` に（`ALLOWED_GIT_EMAILS` 95行）。
- claude CLI + `CLAUDE_CODE_OAUTH_TOKEN` 投入、`HERMES_REPO_ROOT` 上書き（intake 28-29行）。
- → 障壁が多くMac mini常駐（同環境＝同期/認証不要）の方が確実。VM移設は最終手段。

---

## 5. 実装方針
- Phase 1〜2 は **Codex 半委任（`codex-implement`）→ Codex セルフレビュー → Claude 最終レビュー**の二段（hermes の既存PRと同じ流儀）。
- 配備モデル: リポ `data/hermes/*` が source、`~/.hermes/` へ**手動 cp 配備**（同期スクリプト無し）。Mac/VM 両方への配備が要る変更に注意。
- VM側プロンプト改修（P1根治）は Claude 専管（繊細・リポ外）。

---

## 6. 未解決・要確認事項（持ち越し）
- **P0再発防止**: なぜ06-23に一時的にAPI課金経路へ落ちたのかの確証は未取得（OAUTHトークン配備タイミング説が有力）。現状は解消済みだが、再発監視。
- **VM側 Haiku エージェントのプロンプト**（`~/.hermes/hermes-agent`・リポ外）は未調査。P1根治に必要。
- **OpenRouter の実コスト**は未計測（微額想定）。判断Opus化の主眼は知能向上であってコスト削減効果は小さい可能性。
- **看板滞留25枚**の生かす/捨てる判断は陸さん駆動（Phase 1 で実施）。
- 実行場所の最終判断（Mac mini購入8-10万）は Phase 1〜2 の効果実証後。
