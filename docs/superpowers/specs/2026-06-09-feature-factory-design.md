# feature-factory（ソフトウェア工場）設計

- 日付: 2026-06-09
- ブランチ: `task/260609-feature-factory`
- 出典: X Article「Claude Codeに"7人のAI社員"を雇い、寝てる間に24時間開発させる全手順」（@ClaudeCode_love / 原典 @sairahul1「Software Factory」284万view）
- 関連: [[wiki/dev/agent-teams-playbook]] [[wiki/dev/standards]] [[project_agent_teams_orchestration]]

## 目的

記事の「ソフトウェア工場」モデル——役割を専門化されたエージェントに分割し、各々に〈単一の仕事 / 専用クリーンコンテキスト / 必要なツールだけ / 触れてはいけない範囲〉を与える——を、all-good-ops の既存開発体制に**欠けている上流・検証の3点**として落とし込む。

バイブコーディング（プロンプト→生成→壊れる→パッチ…）の天井を、「上流のミスを下流で増幅させない構造」で突破する。

## 現体制とのギャップ（記事7役割 × うち）

| 記事の役割 | うちの現状 | 判定 | 本設計での対応 |
|---|---|---|---|
| 1 リサーチャー（作る前に調査） | architect 起動手順に内包 / `feature-dev:code-explorer` | △ | **流用**（新設しない） |
| 2 ストーリーライター + 人間CP① | 受け入れ基準・承認CP① が無い | ❌ | **story-writer 新設** + CP① 追加 |
| 3 スペックライター + 人間CP② | architect = これ。plan approval = CP② | ✅ | 既存維持 |
| 4/5 ビルダー（BE/FE） | system-engineer | ✅ | 既存維持（BE→FE 逐次） |
| 6 テストベリファイア（受け入れテスト） | TDD で単体のみ | ❌ | **test-verifier 新設** |
| 7 バリデーター（仕様照合） | pr-review-toolkit（一般品質） | △ | **spec-validator 新設** |
| 人間CP③ PR | 本番反映ゲート | ✅ | 既存維持 |

**欠落を埋める = 上流定義（story-writer）・受け入れ検証（test-verifier）・仕様照合（spec-validator）の3エージェント新設**。

## 決定事項（ブレストで確定）

1. **落とし込み方針**: 専任エージェント新設
2. **新設範囲**: 3エージェント（story-writer / test-verifier / spec-validator）。リサーチャーは流用
3. **実行モデル**: feature-factory skill による半自動連鎖（1プロンプトで連鎖、人間CP3つで停止）
4. **受け入れテスト**: スタック依存で柔軟（Web=Playwright、lib/CLI=Vitest/tsx 等、standards B節準拠）

## アーキテクチャ

### 全体パイプライン（逐次・各工程は専用クリーンコンテキスト）

記事の核は「並列チーム」でなく**逐次連鎖**。よって既存 `agent teams`（並列・最大4人）とは**別レイヤー**として、lead が逐次サブエージェントを呼ぶオーケストレーションで実装する。同時負荷が低く監視しやすく、「最大4並列」制約とも衝突しない。

```
[Step0 調査]  researcher    architect起動手順 or feature-dev:code-explorer（流用）
   ↓
[Step1 定義]  story-writer ★  受け入れ基準つきユーザーストーリー
   ⏸ 人間CP① ストーリー承認   ← 新規追加
[Step2 設計]  architect      技術ブリーフ（= 実装ブループリント）
   ⏸ 人間CP② ブリーフ承認     ← 既存 plan approval
[Step3 実装]  system-engineer  BE→FE をサマリ受け渡しで逐次
[Step4 検証]  test-verifier ★  受け入れテストを書いて実走・基準別合否レポート
[Step5 照合]  spec-validator ★  実装を story/brief と照合・ギャップを深刻度分類で報告（修正しない）
   → 失敗/Critical は正しい担当へ差し戻し（lead はパッチしない＝責任範囲を混ぜない）
   ⏸ 人間CP③ PR承認          ← 既存 本番反映ゲート
```

人間チェックポイントは **3点だけ**（①ストーリー ②ブリーフ ③PR）。あとは自走。

### コンポーネント1: 新設3エージェント（`.claude/agents/dev-automation/`）

各エージェントは「単一責務 / 必要ツールのみ / 禁止事項を明記 / 前工程のサマリのみ受け取る」を守る。全て **frontmatter 付き**で Agent dispatch 一覧に載せる（過去の frontmatter 欠落で dispatch 不可だった事故を回避）。

#### story-writer（問題を定義する役）
- **責務**: ざっくり要望を「[役割]として[振る舞い]がほしい、なぜなら[成果]」のユーザーストーリーに変換。受け入れ基準（正常系・失敗系・ビジネスルール、テストが直接検証できる文）・エッジケース（境界/リトライ/マルチテナント）・スコープ外・未解決質問を出す
- **入力**: ユーザーのざっくり要望 + リサーチャーの調査結果
- **tools**: `Read` のみ
- **できないこと**: ビジネスルールの発明 / コードや技術設計の記述 / 不明点を推測で埋める
- **ルール**: このストーリーを人間が承認するまで下流は始まらない（最初の人間チェックポイント）

#### test-verifier（ユーザー目線で証明する役）
- **責務**: 承認済みストーリーの全受け入れ基準をカバーする**受け入れテスト**（外側=ユーザー体験の角度）を書いて実走し、どの基準が通り/落ち/カバー不能かをレポート
- **入力**: 承認済みストーリー（全受け入れ基準）+ 承認済みブリーフ + 両ビルダーのサマリ
- **検証手段**: スタック依存で柔軟。Web は Playwright MCP で E2E、lib/CLI は Vitest/tsx 等。standards B節（採用スタック）に準拠
- **tools**: `Read` / `Edit` / `Write`（テストファイルのみ）/ `Bash` / Playwright MCP
- **できないこと**: 製品コードの変更 / テスト不能基準への回避策でっち上げ / 未カバー基準を「カバー済み」とマーク
- **ルール**: 受け入れテストが通るまで「機能はまだ無い」。落ちたら正しいビルダーへ差し戻し（自分はパッチしない）

#### spec-validator（全員の見落としを拾う役）
- **責務**: 実装を承認済み story/brief と突き合わせギャップ報告。**何も修正せず真実を告げるだけ**
- **必ずチェック**: 未実装の受け入れ基準 / 失敗系のテストカバレッジ欠落 / セキュリティ（認証漏れ・テナント分離の隙・ログ混入の秘密・露出した生エラー）/ スコープ外で変更されたファイル / CLAUDE.md・既存コードと食い違うパターン / 再利用すべきヘルパーの重複 / ブリーフにあったのに飛ばされた TZ・マルチテナント懸念
- **入力**: 承認済み story/brief + 実装差分
- **出力**: 深刻度分類（Critical=マージ前必須 / Important=直すべき / Minor=判断）。全指摘に file:line。問題なければ素直に「問題なし」（念のための問題発明はしない）
- **tools**: `Read` / `Grep` / `Glob` のみ
- **pr-review-toolkit との違い**: spec-validator=「承認済み仕様との照合（ギャップ）」が主。pr-review-toolkit=「一般的なコード品質・バグ・サイレント失敗」。feature-factory の検証段は spec-validator を主とし、複雑caseのみ pr-review-toolkit を追加

### コンポーネント2: feature-factory skill（`.claude/skills/feature-factory/SKILL.md`）

- **起動トリガー（description に明記）**: 「機能を作って」「フル工程で実装して」等の**まとまった機能実装**。小修正・単発バグ・調査は対象外（playbook と同じ線引き＝トークン無駄を避ける）
- **役割**: 上記パイプラインの連鎖を配線。各工程は前工程の**サマリのみ**を次工程へ渡す（コンテキスト汚染＝ドリフト防止）。人間CP①②③で停止
- **差し戻しルール**: テスト落ち/Critical は lead がパッチせず、正しい担当エージェントへ差し戻して再実行 → 再検証クリーンまで回す
- **実装方式**: agent teams（並列）ではなく逐次サブエージェント呼び出し（`superpowers:subagent-driven-development` の思想）。各サブエージェントはクリーンコンテキスト

### コンポーネント3: 既存資産の改修

- **`wiki/dev/agent-teams-playbook.md`**: 「feature-factory モード（逐次パイプライン）」節を追記。人間CP①（ストーリー承認）を追加。並列team と逐次factory の使い分けを明記（まとまった機能フル工程=factory、観点別並列レビュー=team）
- **`wiki/dev/standards.md`**: A2 設計フェーズに「受け入れ基準つきストーリー定義→人間承認」を設計の手前段として追加。A3 に「受け入れテスト（ユーザー目線・外側から）」を追加
- **`CLAUDE.md` 起動マップ**: 「機能実装・設計」行に feature-factory を追記
- **project memory** `project_agent_teams_orchestration.md` 更新（新3エージェント・factory モード・CP①）

## データフロー

各工程の受け渡しは**構造化サマリ**（前工程の成果物 + 次工程が必要とする契約）。

```
要望 → [story] ストーリー+受け入れ基準 → ⏸① → [architect] 技術ブリーフ → ⏸②
     → [system-engineer] 実装+ビルダーサマリ（=API契約）
     → [test-verifier] 受け入れテスト結果（基準別合否）
     → [spec-validator] ギャップレポート（深刻度+file:line）
     → 差し戻し or → ⏸③ PR
```

## エラーハンドリング / 規律

- standards A4 準拠: 外部API/LLM出力は境界で検証+欠損は安全側補完。エラーは発信元を先頭明示
- 差し戻し時に責任範囲を混ぜない（BE失敗→backend、UI失敗→frontend、仕様漏れ→architect/story）
- 本番反映・migration・課金/送信系は人間確認必須（CLAUDE.md 人間確認ルール）

## テスト・検証（本設計の受け入れ条件）

1. **dispatch 検証**: 新設3エージェントが frontmatter 付きで Agent dispatch 一覧にロードされる
2. **実走検証**: 小さい実機能を1本 feature-factory に流し、(a) story-writer が受け入れ基準を出す (b) CP①②③ で停止する (c) test-verifier が受け入れテストを実走する (d) spec-validator がギャップを深刻度分類で報告する (e) 差し戻しが正しい担当に向く——を確認（記事の「本物の機能を1つ流す」に相当）

## スコープ外（YAGNI）

- リサーチャーの専任新設（既存流用で足りる）
- 4人目以降のビルダー増員（system-engineer の FE/BE 逐次で足りる）
- TaskCompleted hook によるテスト緑の機械強制（playbook の「将来拡張」のまま。実走で効果を見てから）
- 記事の8人フル再現（人数でなく欠落観点を埋めるのが目的）

## 人間確認が必要な事項

- **3エージェント新設**そのもの（CLAUDE.md「エージェントの追加・削除・統合」は人間確認必須）→ 本設計の承認に含める
- CLAUDE.md / standards / playbook の改修
