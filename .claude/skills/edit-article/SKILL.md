---
name: edit-article
description: Edit and improve articles by restructuring sections, improving clarity, and tightening prose. Use when user wants to edit, revise, or improve an article draft.
disable-model-invocation: true
---

1. First, divide the article into sections based on its headings. Think about the main points you want to make during those sections.

Consider that information is a directed acyclic graph, and that pieces of information can depend on other pieces of information. Make sure that the order of the sections and their contents respects these dependencies.

Confirm the sections with the user.

2. For each section:

2a. Rewrite the section to improve clarity, coherence, and flow. Use maximum 240 characters per paragraph.

## 取り込みメモ（all-good-ops）

- source: https://github.com/mattpocock/skills/blob/main/skills/personal/edit-article/SKILL.md
- 取り込み日: 2026-06-19
- 位置づけ: 既存原稿の再構成・明瞭化・文体短縮を行う後工程編集スキル。
- 既存スキルとの相補関係: `scqa-writing-framework.md`（執筆前の構成設計）と `stop-slop`（AI 文体除去の最終チェック）の中間レイヤとして働く。執筆 → 本スキルで再構成/明瞭化 → stop-slop で仕上げ、という流れ。
- frontmatter は原文維持。`disable-model-invocation: true` を保持（user 起動型）。
