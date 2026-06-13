---
name: feature-factory
description: まとまった機能をフル工程で実装する時に、定義→設計→実装→検証→照合を人間チェックポイント3点付きの逐次連鎖（ソフトウェア工場）として配線する。各工程は専任エージェントが専用クリーンコンテキストで担い、前工程のサマリのみを受け取る。ユーザーが「この機能を作って」「フル工程で実装して」「工場で回して」等とまとまった機能実装を依頼した時に起動する。小修正・単発バグ・調査は対象外（通常の単独実装で足りる）。
---

# feature-factory（ソフトウェア工場）

役割を専門化されたエージェントに分割し、各々に〈単一の仕事 / 専用クリーンコンテキスト / 必要ツールだけ / 触れてはいけない範囲〉を与えて連鎖させる。上流のミスが下流で増幅する「バイブコーディングの天井」を、構造で突破する。

**実装方式**: agent teams（並列）でなく**逐次サブエージェント呼び出し**（`superpowers:subagent-driven-development` の思想）。各工程はクリーンコンテキストで、前工程のサマリのみ受け取る（コンテキスト・ドリフト防止）。

## 起動条件 / 非対象

- **起動**: まとまった機能のフル工程実装（新機能・サブシステム）
- **非対象**: 小修正・単発バグ・調査 → 通常の単独実装 or 単発サブエージェント（トークン無駄を避ける）

## 連鎖（人間CPは3点だけ）

```
Step0 調査    architect 起動手順 or feature-dev:code-explorer（流用・新設なし）
Step1 定義    story-writer    受け入れ基準つきユーザーストーリー
   ⏸ CP① 人間がストーリーを承認
Step2 設計    architect       技術ブリーフ（実装ブループリント）
   ⏸ CP② 人間がブリーフを承認（plan approval。「IDをメモリ保持」級のミスをここで捕まえる）
Step3 実装    system-engineer  BE→FE をサマリ受け渡しで逐次（領域が割れる時のみ2分割）
Step4 検証    test-verifier   受け入れテストを書いて実走・基準別合否レポート
Step5 照合    spec-validator  実装を story/brief と照合・ギャップを深刻度分類で報告
   → 失敗/Critical は正しい担当へ差し戻し → 再実装 → 再検証クリーンまで回す
   ⏸ CP③ 人間がレビューして PR / 本番反映
```

## 各工程の受け渡し（構造化サマリ）

各サブエージェントは「成果物 + 次工程が必要とする契約」を返す。lead はそれを次工程に渡す（全履歴は渡さない）。

- story-writer → ストーリー + 受け入れ基準
- architect → 技術ブリーフ（変更ファイル一覧・データ契約・API形・改善レバー/観測）
- system-engineer → ビルダーサマリ（追加/編集ファイル・再利用パターン・API契約・全テスト緑）
- test-verifier → 基準別合否レポート
- spec-validator → ギャップレポート（深刻度 + file:line）

## 差し戻しルール（責任範囲を混ぜない）

- テスト落ち / Critical を **lead がパッチしない**。正しい担当エージェントへ差し戻して再実行
- BE失敗→backend、UI失敗→frontend、仕様漏れ→architect/story-writer
- 再検証がクリーンになるまで Step4→Step5 を回す

## ガードレール

- worktree 隔離（`wt-new.sh`）の中で回す。本番反映・migration・課金/送信系は人間確認必須（CLAUDE.md 人間確認ルール）
- アーキテクチャの仮定ミスはパッチでなく会話を捨てて正しい仮定で再開（`mem` ドリフト対策）
- 既存の並列 agent teams（複数観点レビュー等）と使い分け: **フル工程実装=factory、観点別並列レビュー=team**

## 関連

- 運用正本: `wiki/dev/agent-teams-playbook.md`
- 設計 SSOT: `wiki/dev/standards.md`
- 設計: `docs/superpowers/specs/2026-06-09-feature-factory-design.md`
