# X発信フロー 改善レバー棚卸しカタログ（Stage 1）

> optimizer 再設計プログラムの SSOT。本番コード（`apps/x-account-system`、HEAD=a989301）に整合した「各工程の改善レバー」を2-3階層で網羅する。
> **本書は読み取り分析の成果物でありコード変更を含まない。** Stage 2（観測配線）/ Stage 3（LLM-optimizer ループ）/ Stage 4（実行権限）はこのカタログを入力とする。
> 関連: 設計思想 SSOT = `outputs/improvements/x-account-design-consolidated/initial-values-design.md`、死守ガード = `apps/x-account-system/lib/optimizer/guards.ts`。

## 改訂ノート（2026-06-09・MA化＋段階1-1B 反映）

本カタログ初版は HEAD=a989301 時点。その後 **PR#145（永続 Managed Agents 化）** と **段階1-1B（session 観測永続化）** が入り、以下が更新された（該当セクションは下記で読み替え）:

- **プロンプト所在（compose/check/collect）**: 各工程の system prompt は `lib/ma/bootstrap-core.ts` の SYSTEM_BUILDERS が SSOT。`buildWriterSystemPrompt`（`lib/curation/compose-prompts.ts:81`、**旧 `lib/writer/system-prompts.ts` を置換＝参考資料化**）/ `buildCheckSystemPrompt`（`lib/check/check-prompts.ts:67`）/ `buildExploreSystemPrompt`（`lib/ingest/collector-prompts.ts:14`）。§1〜§3 の「プロンプト所在」はこれで読み替え。
- **プロンプト変更経路**: 「ファイル編集→deploy」ではなく **`npm run ma:render`（TS→agents/*.system.md 生成・VCSコミット）→ `npm run ma:bootstrap --update`（ant version-up・`xad.ma_agents` upsert・worker redeploy不要）**。担当層 L（提案）の実適用はこの version-up を人間ゲートで通す（Stage 4 の権限設計対象）。
- **8テンプレ**: `compose-templates.ts` は健在だが、永続 MA の system は固定のため **userMessage 注入**（`buildComposeUserBlocks`/`renderTemplatePrompt`）に変更。§2 の注記を読み替え。
- **観測（§9-2 の解消）**: 段階1-1B で `session_event`/`run_session`（migration 0021）が追加。MA化3工程（collect/compose/check）の thinking/tool_use/tool_result が永続化され、相関キー `writer_session_id`/`checker_session_id`/`materials_store.meta.collector_session_id`。→ §9-2「意思決定消滅」は collect/compose/check で大半解消（思考は text 形式で残り、構造化抽出は Stage 3 の LLM 再解析）。**残る穴＝人間承認/却下理由（最重要・未記録）/ scheduled-publish slot理由 / editor 判定経路（MA外）**。
- **editor / recommend**: MA外（messages.create 維持）。§4 は不変。

## optimizer 再設計の担当層決定（2026-06-09 確定）

- **下の階（Thompson）で握るのは本質3本のみ**: ①posting_time ②hook_distribution ③x_format_ratio（Stage 2A で reward 配線）。
- **据え置き5本（bandit化しない・固定値＋死守ガードで維持）**: content_axis / visualizer / industry_sop / publishing_lag / citation。first_hand≥30% / industry_sop≥月5 / AI画像≤10% は guards.ts が引き続き保証。
- **収集クエリ（watchlist/キーワード/scoringWeights）は上の階（Stage 3）**: engagement でなく**ファネル変換率**（素材→承認/公開）を reward に LLM が分析→提案→人間承認（`autoPromoteDiscoveredSources=false` 思想に沿う）。

## 凡例

- **種別**: `数値knob`（連続/離散の bounded 値）/ `プロンプト`（文字列）/ `ルール`（regex・LLM judge・閾値ゲート）/ `クエリ`（外部API取得条件）/ `構造`（model選定・テンプレID・フラグ・列挙）
- **担当層**（自律度の境界）:
  - **T = Thompson閉ループ**: bounded・可逆・reward 直結の数値。DB posterior で自己調整可。
  - **L = LLM提案**: 意味/人格/出力構造を変える。optimizer は提案まで、実変更は git→人間merge→deploy。
  - **🔒 = 不可侵**: 安全・法務・死守。optimizer は遵守チェックの対象であって変更主体にしない。
  - **L運用**: 運用調整（cost/throughput）の数値。reward 直結でなく LLM 提案＋人間判断。
- **現状観測**: 投稿performance まで reward 配線が通っているか／意思決定の"なぜ"が DB に残るか。`✅`=観測可 / `⚠️`=部分 / `❌`=消滅。

---

## 1. collect 工程

`lib/ingest/collector-config.ts` / `collector-prompts.ts`。素材収集（twitterapi.io 探索 → 3軸スコア → `xad.materials_store`）。

| レバー名 | 種別 | 所在 | 現在値・値域 | 制約 | 担当層 | 現状観測 |
|---|---|---|---|---|---|---|
| watchlist（信頼ソース群） | 構造/クエリ | collector-config.ts:39-72 | 28ソース（jp_publisher24 / ai_official3 / en_curator1） | 自由 | **L**（候補→人間承認。`autoPromote=false` の思想踏襲） | ⚠️ どのソース由来が高scoreかは materials.meta に残るが、watchlist 改廃の効果測定は未配線 |
| autoPromoteDiscoveredSources | 構造（フラグ） | collector-config.ts:81 | `false` | 自由 | **L** | — |
| scoringWeights（3軸比率） | 数値knob | collector-config.ts:74 | freshness .3 / velocity .3 / target_fit .4（合計1.0） | 自由 | **T候補**（間接reward。素材score→下流成果の attribution 要設計） | ❌ 重み変更の効果が後段に配線されていない |
| trendWoeids | 数値/クエリ | collector-config.ts:73 | `[23424977]`（US。woeid=1 は実測で日本返却バグ→不使用） | 自由 | **L** | — |
| scoringModel | 構造（model） | collector-config.ts:77 | `claude-sonnet-4-5` | 自由 | **L** | trace に model 記録あり |
| translationModel | 構造（model） | collector-config.ts:78 | `claude-haiku-4-5-20251001` | 自由 | **L** | — |
| maxFetchPerRun | 数値knob | collector-config.ts:75 | `120` | 自由 | **L運用**（budget上限） | trace に cost 記録あり |
| maxExploreIterations | 数値knob | collector-config.ts:76 | `8`（agent tool_use 往復上限） | 自由 | **L運用** | ⚠️ 反復ごとの判断は console.log |
| scoringBatchSize | 数値knob | collector-config.ts:79 | `20` | 自由 | **L運用** | — |
| dedupWindowDays | 数値knob | collector-config.ts:80 | `14` | 自由 | **L運用** | — |
| 探索戦略プロンプト | プロンプト | collector-prompts.ts:14-30（方針19-24 / 制約26-28） | watchlist巡回・海外トレンド先取り・キーワード検索・新ソース発見・スレッド復元 | 自由 | **L** | ❌ どの戦略を選んだか・rejected除外理由は消滅 |
| scoring rubric プロンプト | プロンプト | collector-prompts.ts:33-46（重み参考値42「3:3:4」） | freshness/velocity/target_fit/overall/reason の定義 | 自由 | **L**（数値 scoringWeights と整合必須） | — |
| TARGET_DEFINITION | プロンプト | collector-prompts.ts:7-11 | 対象読者＝AI活用したい日本のビジネスパーソン／合言葉「チャエンが投稿しそうか」 | 自由（戦略の核） | **L** | — |

**観測の穴**: 各候補の発見理由（tool名=search_trend/fetch_user/thread_restore）と rejected候補の除外理由が trace に残らず console.log で消滅。→ Stage 2 候補。

---

## 2. compose 工程

`lib/curation/compose-config.ts` / `compose-templates.ts` / `compose-prompts.ts`。MA writer が選抜素材→ドラフト生成。**LLM最適化の主戦場**。

| レバー名 | 種別 | 所在 | 現在値・値域 | 制約 | 担当層 | 現状観測 |
|---|---|---|---|---|---|---|
| writerModel | 構造（model） | compose-config.ts:17 | `claude-sonnet-4-6` | 自由 | **L** | trace に model/cost 記録あり |
| maxComposePerRun | 数値knob | compose-config.ts:18 | `3` | 自由 | **L運用** | — |
| timeoutMs | 数値knob | compose-config.ts:19 | `120_000`（2分） | 自由 | **L運用** | — |
| defaultTemplateId | 構造（テンプレID） | compose-config.ts:20 | `template_chaen_gold` | 自由 | **L** | — |
| 8テンプレ registry | 構造＋プロンプト | compose-templates.ts:49-281 | 下記8型（各 tone/structure/hookType/hookStrength/systemPromptPatch/preferredFmats） | 自由（炎上型は要慎重） | **L**（テンプレ追加・patch 調整が主戦場） | ⚠️ 選択された template_id は materials.meta に記録。選択"理由"は無し |
| submit_draft tool schema | 構造（tool契約） | compose-prompts.ts:24-50 | required: body/fmat/topic/category、optional: primary_hook/citations | 自由（波及大） | **L**（人間ゲート固定） | 出力（fmat/category/primary_hook）は post_drafts に残る |
| COMPOSE_FMATS / FMAT_LABELS | 構造（列挙） | compose-prompts.ts:12,15-21 | short/medium/long/article/thread | 自由 | **L** | fmat は post_drafts に記録 |
| buildWriterSystemPrompt | プロンプト | compose-prompts.ts:56-82 | ポジション61 / リサーチ掟65-69（数字捏造防止）/ 執筆掟70-75 / 進め方77-81 | 自由（安全掟は🔒寄り） | **L** | ❌ tone/style/citation 選択理由・web_search 実行/skip 理由は消滅 |

**8テンプレ（compose-templates.ts:49-281、systemPromptPatch は全8型が保有）**:

| ID | hookType / strength | preferredFmats | 注記 |
|---|---|---|---|
| template_chaen_gold | 速報 / strong | short, medium | 既定値 |
| template_chaen_contrarian | 逆張り / medium | medium, long | |
| template_chaen_howto | 数字 / medium | medium, long, thread | |
| template_case_calm | 権威 / medium | medium, long | 敬体・保存版 |
| template_value_deepdive | 速報 / strong | long, medium | ビフォーアフター矢印図が肝 |
| template_reaction_light | 共感 / strong | short, thread | 軽さが肝 |
| template_contrarian_news | 逆張り / strong | short, article | ⚠️炎上リスク最高・ファクト判定＋人間承認必須 |
| template_offer_savings | 数字 / strong | medium, thread | ⚠️実在のお得情報がある時限定 |

**観測の穴**: MA session 内部判断（tone/style/citation の選択理由、tool呼出履歴）が消滅。→ Stage 2 候補。

---

## 3. check 工程

`lib/check/check-config.ts` / `check-prompts.ts`。MA checker が重複・ファクトチェック。

| レバー名 | 種別 | 所在 | 現在値・値域 | 制約 | 担当層 | 現状観測 |
|---|---|---|---|---|---|---|
| checkerModel | 構造（model） | check-config.ts:19 | `claude-haiku-4-5`（低コスト判定） | 自由 | **L**（cost-quality trade-off の要） | trace に model/cost あり |
| maxCheckPerRun | 数値knob | check-config.ts:20 | `5` | 自由 | **L運用** | — |
| recentPostsLookbackDays | 数値knob | check-config.ts:21 | `14`（重複比較の遡及日数） | 自由 | **L運用**（editor R5 と整合） | — |
| timeoutMs | 数値knob | check-config.ts:22 | `120_000` | 自由 | **L運用** | — |
| maxRedoAttempts | 数値knob | check-config.ts:23 | `2`（差し戻し再生成の上限＝ループ停止） | 自由 | **L運用** | ⚠️ 差し戻し判定は trace 出力、ロジックは code固定 |
| submit_check tool schema | 構造（tool契約） | check-prompts.ts:14-55 | verdict[ok/flag] / risk_level[low/high] / duplicate[ok/similar] / factcheck[ok/suspicious/unverifiable] / source_grounded:bool / flags[] | 自由（波及大） | **L** | ✅ verdict/duplicate/factcheck/source_grounded は trace.output に全件記録 |
| 重複判定 rubric | プロンプト | check-prompts.ts:65-68 | 主題/具体内容の被りのみ flag（言い回し違い許容） | 自由 | **L** | — |
| ファクトチェック rubric | プロンプト | check-prompts.ts:70-74 | 元ネタツイート含有判定優先→新情報/数字のみ裏取り | 自由 | **L** | — |

**観測の穴**: flag 詳細（どの観点で flag か）は console.log のみ、trace の構造化フィールドに無し。差し戻し条件チェック履歴も明示記録なし。→ Stage 2 候補。

---

## 4. editor 工程

`lib/editor/rules/base.ts`＋`extension.ts` / `hook-quotas.ts` / `lib/writer/system-prompts.ts`。6+6ルール判定。**観測の優等生**（判定結果は `post_drafts.editor_output` JSONB に完全保存）。

### 4-1. ルール（R1-R6 / X1-X6）

| ルール | 種別 | 所在 | 判定 | 参照閾値 | 担当層 |
|---|---|---|---|---|---|
| R1_workflow_theme | LLM judge | base.ts:30-37 | soft | — | L（rubric調整可） |
| R2_first_hand_line | regex | base.ts:44-71 | soft/skip（first_hand時のみ必須） | `FIRST_HAND_REGEX`（私は/僕は…＋過去形） | L（regex精度） |
| R3_no_enemy | LLM judge | base.ts:76-83 | soft | — | L |
| **R4_no_conflict_phrase** | regex | base.ts:88-102 | **hard却下** | `FORBIDDEN_PHRASES`=`/(時代遅れ\|無能\|情弱\|養分\|搾取\|奴隷)/` | **🔒** |
| R5_no_duplicate_14d | cosine | base.ts:109-124 | **hard却下** | `DUPLICATE_COSINE_THRESHOLD`≥0.85 / `DUPLICATE_WINDOW_DAYS`=14 | L（閾値は要慎重） |
| R6_assertive_conclusion | LLM judge | base.ts:129-136 | soft | — | L |
| X1_hook_strength | 数値閾値 | extension.ts:26-39 | **hard却下** | `HOOK_STRENGTH_THRESHOLD`=0.4 | L（閾値は要慎重） |
| **X2_stealth_disclosure** | LLM judge | extension.ts:47-56 | **hard却下** | アフィリ無→always pass | **🔒**（業法 disclosure） |
| **X3_failure_story_verified** | 複合gate | extension.ts:66-125 | **hard却下** | `VERIFIED_FAILURE_STORY_MONTHLY_CAP`=4＋material検証（consent/redaction） | **🔒**（同意・redaction管理） |
| X4_audience_line | LLM judge | extension.ts:130-137 | soft | — | L |
| **X5_dlp_and_proper_noun** | 複合gate | extension.ts:146-178 | **hard（実PII）/soft（金額）** | DLP high-risk / proper noun judge | **🔒**（PII・DLP） |
| X6_source_grounding | factuality judge | extension.ts:189-199 | soft警告（pipeline HARD set 外） | — | L |

### 4-2. 閾値・配分定数（hook-quotas.ts）

| 定数 | 所在 | 現在値・値域 | 制約 | 担当層 |
|---|---|---|---|---|
| HOOK_QUOTA_PCT | hook-quotas.ts:25-30 | failure_story20 / business_repro40 / critique15 / tips_enum25（%、editorでは参考値・failしない） | 自由 | T候補（hook配分） |
| **VERIFIED_FAILURE_STORY_MONTHLY_CAP** | hook-quotas.ts:35 | `4`（月上限） | **死守** | **🔒** |
| HOOK_STRENGTH_THRESHOLD | hook-quotas.ts:40 | `0.4`（0-1） | 自由 | L（要慎重） |
| DUPLICATE_COSINE_THRESHOLD | hook-quotas.ts:45 | `0.85`（0-1） | 自由 | L（要慎重） |
| DUPLICATE_WINDOW_DAYS | hook-quotas.ts:50 | `14` | 自由 | L運用 |

### 4-3. writer ベースプロンプト・配分（system-prompts.ts）

| 定数 | 種別 | 所在 | 現在値 | 制約 | 担当層 |
|---|---|---|---|---|---|
| **OFMETON_PERSPECTIVE** | プロンプト（人格） | system-prompts.ts:50-57 | 「速報屋」アイデンティティ・非エンジニア実務者向け | ブランド核 | **🔒**（人格の核） |
| BUZZ_STYLE_GUIDE | プロンプト（スタイル） | system-prompts.ts:64-88 | hook型/感情断定/箇条書き3-5/CTA頻度/絵文字1-3/140-280字 | 自由 | L（チャエン型踏襲、調整可） |
| PLAINTEXT_GUIDE | プロンプト（制約） | system-prompts.ts:91-96 | Markdown禁止・「・」or数字+改行 | X仕様 | **🔒**（wire契約） |
| **SAFETY_GUARDRAILS** | プロンプト（安全） | system-prompts.ts:99-107 | 個人情報禁止/顧客名mask/業法独占KW禁止/攻撃語禁止/disclosure必須/末尾hedge禁止 | 死守 | **🔒** |
| THREAD_FORMAT_GUIDE | プロンプト（フォーマット） | system-prompts.ts:117-124 | delimiter のみ・各ツイート字数上限 | X仕様 | **🔒**（wire契約） |
| HOOK_DISTRIBUTION | 数値配分 | system-prompts.ts:22-30 | number.18/question.14/failure_story.12/contrast.1/tips_enum.08/first_hand.08/他10種.30 | 自由（failure_storyは🔒cap併存） | **T**（hook配分） |
| FORMAT_RATIO | 数値配分 | system-prompts.ts:33-39 | short.5/medium.25/long.1/thread.1/article.05 | 自由 | **T**（format比率） |
| EXCLUSIVE_AXES | 構造（排他軸） | system-prompts.ts:42-47 | translation↔paraphrase / opinion↔first_hand / industry_sop↔failure_story / business_repro↔critique | 自由（first_handは🔒下限） | L＋T |
| FORMAT_MAX_CHARS | 数値knob | system-prompts.ts:167-173 | short/medium280 / long/article4000 / thread上限 | X仕様 | 🔒寄り |

**観測**: ✅ editor_output JSONB に12ルール判定（hard/soft却下理由・DLP findings 含む）を完全保存。hook分類は Python subprocess のため一部 trace に明示記録なし（⚠️）。

---

## 5. line-approval 工程

`src/jobs/line-event.ts` / `lib/editor/rule-labels.ts`。人間承認・修正・フィードバック。

| レバー名 | 種別 | 所在 | 現在値・仕様 | 制約 | 担当層 | 現状観測 |
|---|---|---|---|---|---|---|
| ルールラベル（承認カード表示） | 構造（マッピング） | rule-labels.ts:10-30 | 12 RuleId→日本語ラベル | 自由 | **L** | — |
| style_feedback 反映（覚えて/修正） | プロンプト（動的注入） | line-event.ts:142-145, 224-322 | `getRecentStyleFeedback` を SOFT 注入 → reviseDraftForX → editor 再実行 | 自由 | **L**（フィードバックの重み付けは設計余地） | ⚠️ 修正フローは withTrace 記録。承認/却下の"理由"は DB 未記録 |
| 承認UI一本化 | 構造 | line-event.ts:109-114, 535-537 | postback/text の旧 approve/reject 経路は遮断・案内のみ | — | 🔒（運用固定） | 承認結果は post_drafts.human_approval_status |

**観測の穴**: 人間が「なぜ承認/却下したか」が DB に残らない。これは LLM-optimizer にとって最重要の教師信号になりうる。→ Stage 2 候補（承認理由の構造化記録）。

---

## 6. scheduled-publish 工程

`lib/publishing/schedule-config.ts` / `slot-planner.ts`。承認済みストックをピーク帯に割当て予約。

| レバー名 | 種別 | 所在 | 現在値・値域 | 制約 | 担当層 | 現状観測 |
|---|---|---|---|---|---|---|
| peakHoursJstWeekday | 数値knob（時間帯） | schedule-config.ts:24 | `[7,8,12,15,17]`（朝2/昼1/夕2） | 自由 | **T**（optimizer posting_time と対応） | ⚠️ 後述の reward 断線 |
| peakHoursJstWeekend | 数値knob（時間帯） | schedule-config.ts:26 | `[8,12,17]`（朝1/昼1/夕1） | 自由 | **T** | ⚠️ 同上 |
| lookaheadDays | 数値knob | schedule-config.ts:27 | `1`（翌日のみ） | 自由 | **L運用** | — |
| maxPerDay | 数値knob | schedule-config.ts:28 | `7`（1日上限ガード） | 自由 | **L運用** | — |
| slot 割当ロジック | 構造（アルゴ） | slot-planner.ts:62-127, 161-185 | FIFO（human_approved_at 昇順、null末尾）＋日次キャップ。純関数・決定的 | 自由 | **L**（FIFO↔優先度の方針変更余地） | ❌ 割当理由・media fetch 再試行判定は console.log |

**観測の穴**: slot 割当の決定（なぜこの時刻か）と media fetch 失敗の再試行判定が消滅。最終予約時刻のみ trace 記録。→ Stage 2 候補。

---

## 7. 横断レバー

| レバー名 | 種別 | 所在 | 現在値 | 制約 | 担当層 |
|---|---|---|---|---|---|
| BUDGET_MONTHLY_LIMIT_JPY | 数値knob | wrangler.toml:93 | `10000`（¥/月） | 自由 | L運用（人間ゲート） |
| BUDGET_BROWNOUT_THRESHOLD_JPY | 数値knob | wrangler.toml:94 | `11500`（上限×115%） | 自由 | L運用 |
| PHASE | 構造（フラグ） | wrangler.toml:96 | `1`（人間承認必須） | 🔒（運用段階） | 🔒 |
| AUTONOMOUS_PUBLISH | 構造（フラグ） | wrangler.toml:97 | `false`（自律投稿ブロック） | 🔒 | 🔒 |
| cron triggers | 構造（スケジュール） | wrangler.toml:68-75 | collect05:30 / digest21:00 / optimizer23:00 / rollback2h / rotation月初 | 自由 | L運用 |
| 各工程の model選定 | 構造（model） | 各 *-config.ts | sonnet-4-5/4-6, haiku-4-5 | 自由 | L（cost-quality） |

---

## 8. 死守 vs 自由パラメータ SSOT 突き合わせ

`guards.ts`（`GUARD_RULES`）と `initial-values-design.md` §8.3-8.4 の二重 SSOT。**この5つは code-level hardlock、optimizer 不可侵。**

### 8-1. 死守（🔒・guards.ts §8.3）

| paramId | 制約 | 値域 | 所在 | 根拠 |
|---|---|---|---|---|
| hook_failure_story_verified_cap_per_month | monthlyCap | ≤4本/月（≤0.133） | guards.ts:40-44 | initial-values §3.2/§8.3、verified供給制約。editor X3＋`VERIFIED_FAILURE_STORY_MONTHLY_CAP` と整合 |
| content_axis.first_hand | lowerBound | ≥0.3 | guards.ts:46-49 | §3.4/§8.3、competitor median 15%→ofmeton 40% で差別化の核 |
| industry_sop_rate | lowerBound | ≥5投稿/月（0.1667） | guards.ts:51-54 | §3.8/§8.3、target 月6(20%)・下限月5 |
| hashtag_count | fixedValue | =0 | guards.ts:56-59 | §8.3、competitor median 0。[要検証] |
| visualizer_image_ai_generated | upperBound | ≤0.1 | guards.ts:61-64 | §3.7/§8.3、非エンジニア違和感対策 |

### 8-2. 自由（T・guards.ts §8.4、合計制約あり）

| パラメータ群 | 値域（各band/type） | 合計 | prior | 所在 |
|---|---|---|---|---|
| posting_time（5band） | 各 5-40% | 100% | Beta（empirical Bayes or 1,1） | guards.ts:67-95 / §3.1 |
| hook_distribution（7種、failure_story除外） | 各 5-30% | 100% | empirical Bayes or Beta(1,1) | guards.ts:98-138 / §3.2 |
| xfmt（4区分） | short30-60 / medium15-35 / long5-20 / thread5-20% | 95-100%（thread弾性） | Beta(2,8) 弱prior | guards.ts:141-163 / §3.6.1 |
| visualizer（3モード） | image50-80 / video5-25 / text10-20% | 100% | Dirichlet(7,1.5,1.5) | initial-values §3.7（**guards 未実装**） |

---

## 9. Stage 2 候補：観測断線の修復対象（最重要 output）

カタログ作成で浮かび上がった「optimizer が観測できない箇所」。Stage 2 の作業リスト。

### 9-1. reward 配線の stale 修復（Thompson を正常稼働させる前提）

| パラメータ | 現状の断線 | 所在 |
|---|---|---|
| posting_time | `post_drafts.slot` に時間帯名でなく `agent-xxxx` が入り、常に morning に fallback | run-compose.ts:239 vs reward-extractor.ts:90-106 |
| content_axis | `contentAxisIndex` 常に3(first_hand)固定。design4軸 vs 実装3軸(`core_ideas.category`)の不整合 | reward-extractor.ts:234 |
| visualizer | `visualizerIndex` 常に0(image)固定。attachments 未parse。AI生成画像フラグ不在 | reward-extractor.ts:236 |
| industry_sop | `isIndustrySop` 常にfalse固定。post_drafts に industry_sop フラグ不在 | reward-extractor.ts:237 |
| publishing_lag | posterior 定義のみ、update ロジック不在 | types.ts / update-loop.ts |
| citation_explicit_rate | 同上 | types.ts / update-loop.ts |
| visualizer guards | initial-values §3.7 にあるが guards.ts に未実装 | guards.ts |

### 9-2. 意思決定 trace の永続化（"なぜ"を残す）

| 工程 | 消えている意思決定 |
|---|---|
| collect | 各候補の発見理由（tool名）・rejected除外理由 |
| compose | tone/style/citation/template 選択理由・tool呼出履歴 |
| check | flag 詳細・差し戻し条件チェック履歴 |
| line-approval | **人間の承認/却下理由**（教師信号として最重要） |
| scheduled-publish | slot 割当理由・media fetch 再試行判定 |

### 9-3. 紐付けの欠落

- `run_id ↔ optimizer_proposal` 未紐付け（どの run のどのパラメータ変化を検知したか不明）
- post 公開時の `optimizer_state` snapshot 未 attach（どのパラメータ設定で公開されたか後から引けない）
- post_drafts（hook/risk/rule却下理由を保持）↔ posts_performance の追跡が人手

---

## 10. 担当層サマリー（Stage 3/4 の境界材料）

- **T（Thompson閉ループ候補）**: posting_time(5band) / hook_distribution(7種) / xfmt(4区分) / visualizer(3モード) / hook配分(HOOK_QUOTA_PCT) / scoringWeights（間接reward、要設計）
- **L（LLM提案→人間merge→deploy）**: 全プロンプト・8テンプレ・rubric・watchlist・model選定・tool schema・slot割当方針・style_feedback反映・閾値（hook strength / cosine）
- **L運用（cost/throughput調整）**: maxFetchPerRun / maxExplore / batchSize / maxComposePerRun / maxCheckPerRun / maxRedoAttempts / timeout / lookahead / maxPerDay / budget / cron
- **🔒（不可侵）**: FORBIDDEN_PHRASES(R4) / SAFETY_GUARDRAILS / X2 disclosure / X3 failure gate＋cap4 / X5 DLP / OFMETON_PERSPECTIVE / PLAINTEXT・THREAD wire契約 / 死守5param(first_hand≥30% / industry_sop≥5 / hashtag=0 / AI画像≤10%) / PHASE / AUTONOMOUS_PUBLISH

---

### 検証メモ（本カタログの網羅性）

- collect/compose/check/editor/line-approval/scheduled-publish の主要 config/prompt/rule/閾値ファイルを全件精読し計上済み。
- guards.ts の死守5＋自由13＝18 GUARD_RULES、initial-values §3(8パラメータ)・§8.3-8.4 と突き合わせ済み。
- 残課題（Stage 2 で確定）: visualizer の guards 未実装、content_axis の3軸↔4軸調停、publishing_lag/citation の update 設計。
