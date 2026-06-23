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
- **事例 (2026-06-10, optimizer)**: Stage 2A で reward 配線を正しく直してテスト緑にしたが、本番実走で `extractSuccessSignals` が **0 件**。真因は `performance_metrics` が空＝engagement 実績の取込パイプライン自体が無く、配線を直しても**学習燃料がゼロ**だった。
- **派生原則: 学習/最適化/集計系を直す前に「本番に実データ(燃料)があるか」を先に確認する**。reward/posterior/KPI/レコメンド等「データを食って動く」系は、ロジック修正より先に `select count(*)` で供給源が埋まっているか本番確認。空なら上流の取込を先に作る。

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

## 原則7（自律実行）: agent がコードを書いて自己改善する系は「最小権限 × 初回安全弁 × 起動経路の事前 smoke」

optimizer apply-code runner（accepted 提案を nested `claude -p` に実装させ→gate→merge→deploy）で確立（2026-06-11）。LLM が自分でコードを書いて本番に流す系ほど、境界をコードで強制し初回は安全に壊す。

- **最小権限**: secret は必要な subprocess にだけ渡す。`.env.local` を global process.env に積んで全 spawn が継承する設計は事故る（`ANTHROPIC_API_KEY` 継承で nested claude が API 課金化／本番 secret 在中で env-guard テスト偽陰性→gate 崩壊）。子の env で secret を unset し creds 必須の操作（deploy）だけ渡す。
- **権限境界はコードで強制し agent に与えない**: implementer agent に push/gh/deploy ツールを渡さない＝merge 権限は決定的 runner だけ。allowlist 外の変更は 1 ファイルでも無条件 reject（部分 merge なし）。`bypassPermissions` でなく `acceptEdits`＋allowedTools の多層防御（bypass は prompt-injection で任意コード実行＝セキュリティ HIGH 指摘）。
- **初回本番実走は安全弁**: throwaway 入力＋rollback で正味ゼロ化し初回で実バグを段階摘出（apply-code は plan-mode/空diff/secret漏れ/bypass の4実バグを初回実走で安全に摘出）。可逆性（git revert + 再deploy）を最初から配線。
- **起動経路の事前 smoke**: dry-run が外部CLI（claude -p / gh / wrangler）を呼ばない設計だと、その経路は実走まで未検証で初発覚し再走コストが嵩む。外部CLI を含む経路は dry-run と別に単発 smoke を先に。← 原則2 の subprocess 版。
- 詳細手順: memory [[headless-claude-subprocess]]。

## 原則8: ユーザーが依存する状態は永続化する。模倣対象は実物を計測してから作る

ローカル開発ツール（daemon/常駐プロセス）が**ユーザーの操作前提として保持する状態**（編集の undo 履歴・認証トークン・セッション）を in-memory に置くと、プロセス再起動で消えてユーザー体験を毀損する。

- **事例 (2026-06-13, web-ui-bridge)**: 「D&D したら壊れ、undo で戻らなかった」。根因は undo 履歴が daemon の in-memory で、worktree 切替に伴う daemon 再起動で消失（＋トークンも起動毎生成で失効し開いたままのページが編集不能化）。→ 履歴・トークンを target 配下に永続化（再起動でロード/同一トークン再利用）して解消。
- **一般化**: 「ユーザーがいつでも戻せる/続けられる」と期待する状態は、プロセス境界を越えて永続化する設計を最初から。dev ツールでもプロセスは普通に再起動する前提で。
- **模倣対象は推測でなく実物を計測**: 既存プロダクトの UI/挙動を寄せる時、参照が手元（ブラウザ）にあるなら一般知識で推測せず chrome-devtools で実測してから作る。事例: STUDIO が終始開いていたのにダークで作り「色が全然違う」（実機はライト）と指摘され作り直し。実機 `getComputedStyle` で色を抽出して是正。← 原則2「実物で確認」の UI 版。memory [[feedback_browser_test_all_user_ops]]。
- **検証は実挙動**: 「全ボタンテスト済」と言う前に、ユーザーが現実にやる操作（D&D の実ドラッグ・再起動後の undo・壊れた後の復帰）を実機ブラウザ＋スクショ目視で潰す。dispatch 成功や DOM count では不足。

---

## 多エージェントの仮説は reasoning でなく実システムで確定する（2026-06-14）

多エージェント/dynamic workflow でバグの「仮説」を並列生成し別エージェントで敵対的に反証しても、それは reasoning の確からしさに過ぎない。コードを読んだ反証者は「防御コードの有無」は見ても「その不具合状態に**実際に到達できるか**」を見落とす。

- **事例 (2026-06-14, web-ui-bridge bug-hunt)**: 40エージェント workflow が 26件を「real clear bug」と判定。実機 chrome-devtools でトリアージすると本物は4件で、`primaryIdx` 系の「high severity バグ」は **primary が常に最後＝その壊れ状態に UI から到達不能**な偽陽性だった（reasoner は splice 後のインデックス計算だけ見て reachability を見落とした）。
- **原則**: 仮説生成（広く）→ reasoning 反証（絞る）の後に、**必ず実システムでの経験的確認（実機/プローブで再現）を確定ゲートに置く**。reasoning の多数決で「real」を最終確定して自動修正に流さない。経験確認で4件に収束＝**経験確認こそ最大のレバー**（reasoning だけの多数決は ROI が低い）。
- **ワークフロー設計への含意**: 並列で稼ぐのは「仮説生成」と「非破壊プローブ（実システム駆動）」。reasoning 反証は補助。可能なら反証段に再現プローブの実走まで内包し `real` を経験で裏取りしてから人に上げる。memory [[feedback_browser_test_all_user_ops]]。

---

## ドメイン依存の数値ロジックは「計算モデルを先に確定」してから実装する（2026-06-19）

カード請求・税・利息・締め日サイクルのような**ドメイン固有の数値計算**を、自分の素朴な近似モデルで実装して出すと、ユーザー（＝そのドメインの権威）が現実とのズレを指摘し、修正反復が雪だるま式に増える。

- **事例 (2026-06-19, mf-finance カード引落)**: 「変動カード引落＝当月利用額（暦月）」という素朴モデルで実装→以後 **5 回反復**。①当月利用は来月請求（前月オフセット）②Suica 等のカード経由チャージ（is_transfer/included=0）も請求に含む ③締め日は暦月でなくカード毎（ポケットカードは1日締め＝5月分は6/1まで）④引落は銀行口座から出る（カード口座をマイナス深掘りは逆）。どれも「カード請求はどう決まるか」を着手前に 1 回モデル化していれば前倒しで設計できた。
- **原則**: 着手前に**計算ルールを確定する**——境界（締め日/対象期間）、含む含まない（内部移動・手数料・ポイント）、帰属先（どの口座が増減するか）、暦月でない周期。不明点はユーザーに 1〜2 問確認する（ユーザーが期待値を言えば一発で収束する。[[feedback_user_perception_vs_data_check]]）。素朴な近似で「とりあえず動く」を出すより、モデルを 1 回詰める方がトークンも反復も安い。
- **付随の運用知見**: ローカル SQLite で `ALTER TABLE ADD COLUMN` を伴う変更は、**dev 再起動で migration を適用（openDb で走る）→ カラム存在を確認 → その後 build**。順序を誤ると Next build が `Failed to collect page data`（no such column）で落ちる（mf-finance で 2 回踏んだ）。

---

## 帰属・機構は権威ソースの内訳で実証してから断定する（2026-06-23）

「どこが/何が原因か（帰属）」「どう課金/動作するか（機構）」を、**間接signal**（設定ファイルの有無・エラー文言・ダッシュボードの概観・コードからの推論）だけで結論すると、確信を持って誤り、しかも誤りを成果物（memory/レポート）に焼いてから再訂正する二重コストになる。原則5（エラー報告は発信元を最初に確認）の一般化。

- **事例 (2026-06-23, claude -p 課金)**: 「`claude -p` はサブスク課金か API クレジットか」を、①ローカルに ANTHROPIC_API_KEY 無→サブスク と推論（誤）②ユーザーが「コンソールにコスト」と反証→今度はダッシュボード概観から「claude -p がクレジット課金・heavy は 7/1 まで不能」と逆断定（誤）③devtools で **コスト group-by-APIキー＋Claude Code 使用表** を見て初めて確定＝claude -p はサブスク、出血源は**廃止案件の API キー money-bot($48)**。2 回とも権威ソースの内訳を見る前に断定し、誤結論を memory に SAFE 反映→再訂正した。
- **原則**: 帰属/機構を問われたら、推論やコード読みの前に**権威ソースの分解ビュー**（課金=コンソールの group-by 内訳 / 障害=実エラー本文・transcript / 使用量=実測ログ）を開いて実証する。確信が割れ得る機構説明は **verify するまで「未確認」で保留**し、memory/レポートへ SAFE 反映しない。[[feedback_user_perception_vs_data_check]] [[reference_claude_code_subscription_vs_credit_billing]]

---

## 外部ツール/OSS の導入依頼は「そのまま入れる」前に運用制約と照合する（2026-06-24）

「〇〇を導入したい」を額面どおりインストールに直結させない。価値の核（その道具が**何をしてくれるか＝方法論**）と実装手段（OSS 本体）を分け、運用制約（**課金モデル・依存の重さ・必要権限/環境**）と先に照合する。制約に反するなら「本体は入れず、方法論だけを既存スタックで再現する」を**第一級の選択肢として早期提示**する。

- **事例 (2026-06-24, STORM 導入)**: `stanford-oval/storm` 導入依頼。本体は litellm 経由の **API 従量課金**＋重い venv(dspy-ai)＋カスタム LM 実装が前提で、ユーザーの「課金しない」制約と衝突。plan mode で要件を技術事実と突き合わせ → STORM の論文メソッド（多視点ペルソナ→質問駆動の並列調査→引用付き長文）だけを Claude サブスク内の並列サブエージェントで再現する `storm-research` skill に着地（¥0・PR#266）。PoC を実テーマで1本回してから skill 化。
- **原則**: 「導入＝インストール」と短絡しない。要件を鵜呑みにせず実現可能性（特に継続コストと依存）を先に検証し、制約に合う最小手段を選ぶ。原則2「実物で確認」の上流版＝**着手前に手段の前提を確認**。

---

## メモ
- これらは memory の atomic feedback（`feedback_llm_structured_output_validate` 等）からもリンクされる。**原子的リコールは memory、連結・高次化はこの wiki ノート**で役割分担する。
