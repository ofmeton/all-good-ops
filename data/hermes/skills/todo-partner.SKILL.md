---
name: todo-partner
description: Telegram で受けたメモ・依頼を逆質問で成形し Notion タスクDBにカード化する。あとでやる系を後回しにしない捕捉/トリアージの中核。
version: 1.0.0
platforms: [macos]
metadata:
  hermes:
    tags: [tasks, notion, telegram]
    category: productivity
---

## When to Use
ユーザーから Telegram で届いた発言が「あとでやる/依頼/メモ/予定の種」に見えるとき。雑談・私的な内省（ジャーナル/感情吐露）には使わない。

## 対象 Notion DB
- Database ID: `2159405e11a84e7f90a8b6252bb43d38`
- Data Source ID: `782773d8-4cc4-445e-978d-42e48d892717`
- Status 列: Inbox → NeedInfo → Ready → InProgress → Blocked → Review → Done
- Autonomy: light-auto / cc-auto / draft-only / ask-first / reminder

## Procedure
1. 受信メッセージを分類する: 「タスク候補」か「雑談/私的」か。私的・感情的な内省はカード化しない（ユーザーに確認し、本人が private と言えば破棄。記録もしない）。
2. タスク候補なら Notion にカードを作る（create-pages, parent=上記 Data Source ID）:
   - Title=要約, Source=`Telegram`, Status=`Inbox`, Owner=`AI`,
   - RawSourceId=元メッセージの識別子, ThreadKey=この Telegram 会話を一意に表すキー。
3. 着手に足りない情報（目的/期日/成果物/制約）があれば、Telegram で**一度に1〜2問**だけ具体的に逆質問する。回答が来たら update-page で Details / Due / NextAction を埋める。
4. Autonomy を**提案**する: コード/案件=`cc-auto`、調べもの=`cc-auto`、文面/返信=`draft-only`、生活雑用=`reminder`、判断が要る=`ask-first`、即終わる雑用=`light-auto`。「これは cc-auto でいい？」と Telegram で確認し、ユーザーが承認したラベルを update-page で設定。
5. Details が揃い Autonomy が確定したら Status を `Ready` にする。情報待ちなら `NeedInfo`。
6. **会話のカードへの集約**: 上記やりとり（捕捉元メッセージ・逆質問・回答・確定ラベル）を create-comment でそのカードのコメントに転記する。ThreadKey で同一カードを特定する。コメントが使えない場合は `ConversationLog` プロパティに追記。
7. 静時間帯 22:00–8:00 はこちらからの能動通知/逆質問を抑制し、翌朝にまとめる（緊急を除く）。

## Pitfalls
- 私的/感情的内容をカード化しない（ジャーナルは別領域・~/journal）。
- 逆質問は質問攻めにしない。1〜2問ずつ。
- Autonomy はユーザー確認なしに確定しない（提案→承認）。
- 同一メッセージで重複カードを作らない（RawSourceId で照合）。
- 金銭・送信・契約・migration に関わるタスクは自走させず ask-first/reminder に倒す。

## Verification
- Telegram にメモ→Notion DB の `Ready`（または `NeedInfo`）にカードが立つ。
- そのカードのコメントに会話経緯が残る。
- 私的発言はカード化されない。
