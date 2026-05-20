---
type: source
created: 2026-05-20
updated: 2026-05-20
sources: [raw/publishing/inspirations/note-20260520-uravation-claude-x-viral.md]
related: [[../buzz-patterns]], [[../by-media/x]], [[../by-theme/hook-patterns]], [[../by-theme/prompt-collection]]
tags: [publishing, x, ofmeton, thread, prompt-collection]
status: active
identity: ofmeton
---

# uravation「Claude CodeでX投稿バイラル｜3ツイート構成プロンプト7選」

元 URL: https://uravation.com/media/claude-code-x-viral-tweet-generation/

## 元投稿の要点

- X スレッドを「3 ツイート構成 1 セット」に絞ったプロンプト集（7 選）
- **3 ツイートの型**: 1: フック（数字 + 業務名 / 結論先出し）/ 2: 中身（具体プロンプト or Before-After）/ 3: CTA（note リンク or 続き誘導）
- 過去の自分の X 投稿データを全部 Claude Code に渡してシステムプロンプト化する「自分スタイル学習」アプローチ
- `portfolio リポの x-style-prompts/` に成功パターンを蓄積するアーキテクチャ提案

## 観察された勝ちパターン（buzz-patterns との対応）

- **パターン 1（数字 + 業務名のフック）**: 3 ツイート構成の 1 本目フックがこの型に対応
- **パターン 3（プロンプト集型）**: 7 選のプロンプト集形式。プロンプト集 × X スレッドの組み合わせが note → X への展開テンプレに
- **パターン 7（Few-Shot 自己学習ループ）**: チャエンの ingest と同じ方向性。自分の過去投稿をシステムプロンプトに組み込む手法が 2 件で確認 → パターンとして確度が上がった

## 自分の発信に応用するなら

- X スレッドは「3 件 1 セット」で完結させる型を標準運用に採用（現行の「4-7 件スレッド」との選択肢を追加）
- note 記事 1 本 → X 3 ツイート × 2-3 セットに圧縮するワークフローを multi-platform-publishing.md（未作成・作成候補）に追記
- ofmeton 名義の X 投稿が 10 件以上貯まったら Few-Shot アーカイブを作成（chaen ingest と同方向）
