---
type: concept
created: 2026-06-05
updated: 2026-06-05
sources: [raw/facts/situations/2026-06-04-xad-operational-and-money-bot-down.md]
related: [[self/goals]], [[domain/lp-hp-design/design-principles]]
tags: [engineering, process, llm-robustness, retrospective, x-account-system]
status: active
---

# エンジニアリング/プロセス原則（連結学びノート）

振り返りで抽出した「点」を、ここで「原則」に合流させる成長型ノート。新しい学びは
**既存原則に追記して育てる**（フラットに増やさない）。各原則に発生事例を紐づける。

---

## 原則1: 境界で外部・LLM 出力を検証する

外部 API / LLM の出力を**そのまま信じて使わない**。受領した境界で必須フィールドの存在・形を検証し、欠損は安全側にデフォルト補完してから内部ロジックに渡す。

- **事例 (2026-06-04, x-account-system)**: LLM judge の tool_use 応答が 6 判定項目の一部を**非決定的に欠落**させ、それを読む rule が `undefined.status` でクラッシュ → runEditor throw → post-job が idea 消費後に失敗（orphan）。`tu.input` を検証せず spread していたのが原因。→ 欠損項目を `skip` 補完で堅牢化。
- **同根の事例**: 「テスト緑だが本番 stub で throw」（in-memory fallback だけ緑）/ 外部 API レスポンス形を仮定して実装 → 実形と差異。
- **一般化**: structured output / tool_use / 外部 JSON は「来ないフィールドがある」前提。境界に validate + default 層を必ず置く。
- 関連: [[principle-test-green-not-prod]]（下記 原則2）

## 原則2: 「テスト緑」≠「本番動作」。新機能は本番データで 1 回 end-to-end 実走する {#principle-test-green-not-prod}

fallback 経路（`IN_MEMORY_FALLBACK=true` 等）だけが緑でも、本番経路（実 DB / 実 LLM / 実投稿）は未実装で throw / no-op のことがある。

- **事例**: 148→400 tests 緑のまま deploy したが、本番実走で token 失効・スレッド事故・judge crash・ideation orphan・DLP 誤検出 が連続発覚。テストは全て fallback / mock を通っていた。
- **一般化**: 配線・新機能は **本番 env で lib を 1 回 end-to-end 実行**して確認する（ローカル tsx で `.env.local` を読み込み lib 関数を prod 実行する diag ハーネスが有効）。

## 原則3: 既知バグを deferred しない

レビュー/実装中に「これは将来バグる」と気づいたら、その場で improvement-log に記録し、その場か次 PR で直す。先送りすると本番で必ず噛む。

- **事例**: ideation の orphan-claim（全素材 claim→20件だけ処理→残り固着）を W2-3 時点で**気づいていたのに先送り** → 6/4 に 329件固着で昼の投稿ネタ枯渇。
- **一般化**: 「気づいた既知不具合」は記録 + 修正 or 明示チケット化。頭の中の deferred は消える。

## 原則4: 出力チャネルの形式仕様を実装時に明文化し単一契約にする

投稿先（X の thread/long/short, note 記事）ごとの形式（分割・長さ・ラベル）を、**生成側・整形側・除去側で 1 つの契約に固定**する。暗黙の magic string は drift して事故る。

- **事例**: thread 形式が「スレッド1本目」ラベルごと 1 ツイートに固着して投稿された / max_tokens が全形式共通 1024 で末尾切れ。→ writer プロンプト・分割・ラベル除去を `thread-format.ts` に単一契約化し round-trip テストで drift 検出。max_tokens をフォーマット別に。
- **一般化**: 生成 → 整形 → 出力 の各段が同じ形式定数/契約を参照し、契約乖離を検出するテストを置く。

## 原則5: エラー報告は発信元（システム名）を最初に確認する

複数システムが同じ通知先（LINE）にエラーを出す。調査着手前に**メッセージ先頭の `[システム名]` を確認**して対象を確定する。

- **事例**: 「14:21 のエラー」を x-account 側で探したが、実は `[money-bot]` の別システムだった（`publish_queue upsert: fetch failed`）。発信元未確認で誤った調査に時間を使った。

## 原則6（運用）: エージェントシステム構成は Anthropic 公式パターンに準拠する

このリポジトリ自体（CLAUDE.md / skills / agents / hooks / memory）の作り方も、振り返りと同様に公式ベストプラクティスへ収束させる。

- **CLAUDE.md は「消すと Claude がミスするか？」で各行を維持**。肥大すると指示が埋もれて無視される。ドメイン知識・領域手順は常時ロードの CLAUDE.md でなく skill へ逃がす。
- **自動起動させたいローカルスキルは `<name>/SKILL.md` 形式 + 三人称 description（何をする＋いつ使う）**。flat `.md` は frontmatter があっても自動検出されない（progressive disclosure に乗らない）。`name` に予約語 `claude`/`anthropic` 不可。
- **context は有限資源**: サブエージェントで隔離、just-in-time 取得、永続メモリ（raw/wiki/memory）で working context を膨らませない。← 原則2 の end-to-end 実走とも整合。
- **完了主張の前に検証 evidence**（verification-before-completion）。
- **事例 (2026-06-05)**: ローカル 48 skill の大半が frontmatter 無し flat `.md` で自動検出されず、CLAUDE.md の手動誘導（起動マップ+ls+Read）に依存していた → 横断ツール系 22 個を SKILL.md 化し自動起動可能に。
- 運用点検は `claude-md-health-check` スキル item 8（公式チェックリスト）に集約。出典: [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) / [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) / [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)。

---

## メモ
- これらは memory の atomic feedback（`feedback_llm_structured_output_validate` 等）からもリンクされる。**原子的リコールは memory、連結・高次化はこの wiki ノート**で役割分担する。
