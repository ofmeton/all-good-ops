# BEAT ICE Shopify → Slack 通知 メンション修正 仕様

作成: 2026-09-12 / 起点: 2026-09-11 みどさん定例MTG（[[raw/facts/situations/2026-09-11-beatice-midorikawa-mtg-minutes]]）
状態: **調査完了・適用は本人操作待ち（アクセス不足でブロック）**

---

## 1. 本質的な問題（課題文の再定義）

MTGでの課題文は「漢字アカウント名だとメンションが飛ばないので、アカウント名を半角英語に変える」だった。
調査の結果、**これは症状への対処であって原因の修正ではない**。

原因は「名前が漢字だから」ではなく、**通知メッセージが `@名前` という平文でメンションを書いている**こと。

- Slack の bot/webhook 投稿で `@名前` を平文で書くと、Slack は **display name（表示名）ではなく username（＝ASCII の @ハンドル）** に対してマッチングを試みる。この `link_names` によるマッチングは **2017-09 に非推奨化済み**。
- `display_name` は UTF-8 フルレンジ（漢字可）だが、`name`（ハンドル）は別物。よって漢字表示名の人は平文 `@漢字` では**構造的に永久に一致しない**。半角英語名の人だけ「たまたま」一致していた。
- 唯一サポートされた形式は **`<@U012AB3CD>`（メンバーID）**。

出典（一次情報・確認日 2026-09-12）:
- https://docs.slack.dev/messaging/formatting-message-text — 「To mention a user, provide their user ID with the following syntax: `Hey <@U012AB3CD>, ...`」
- https://docs.slack.dev/changelog/2017-09-the-one-about-usernames/ — 「Using `link_names` when posting messages is also deprecated ... please mention users with the `<@W123>` user ID format instead」「`display_name` is not unique and may contain a relatively full gamut of UTF-8 characters」
- https://help.shopify.com/en/manual/shopify-flow/reference/connectors/send-slack-message — 「You can format your message using Slack's mrkdwn syntax」= Flow の Message 欄は mrkdwn をそのまま通すので `<@U...>` が使える

## 2. 推奨する修正（メンバーID方式）

**Flow の Slack メッセージ本文の `@名前` を `<@メンバーID>` に置換する。**

メリット（アカウント名変更方式との比較）:

| | メンバーID方式（推奨） | アカウント名を英語化（MTG案） |
|---|---|---|
| 関係者への依頼 | 不要 | 全員に改名を依頼（琢磨氏・パマ君ほか） |
| 表示名変更で再発 | しない（IDは不変） | **再発する** |
| 非推奨API依存 | なし | `link_names` に依存 |
| 日本語表示名 | そのまま使える | 英語表記を強制 |
| 担当者交代時 | ID 1個差し替え | 新任者にも改名を依頼 |

→ **琢磨氏へのアカウント名英語化依頼は不要**。みどさん側の「メンション設定を英語表記に変更」も不要になる。

## 3. 適用手順

### 3-1. メンバーIDを採取（BEAT ICE の Slack ワークスペース）
対象者ごとに:
1. Slack でその人のプロフィールを開く
2. 「その他（…）」→ **「メンバーIDをコピー」**
3. `U` で始まる文字列（例 `U012AB3CD`）を控える

対象（MTG時点）:
- [ ] パマ君（新マネージャー・新しいメンション先） → `U________`
- [ ] 琢磨氏（現地マネージャー・契約は2027-03末まで） → `U________`
- [ ] 旧メンション先（田崎氏ほか）→ **削除**

> 交代が頻繁なら、個人IDではなく **ユーザーグループ**（例 `@beatice-orders`）を作り `<!subteam^SXXXXXXX>` でメンションするほうが運用が軽い。担当交代はグループのメンバー入替だけで済む。

### 3-2. Shopify Flow を修正
1. Shopify 管理画面 → Apps → **Flow**
2. Slack 通知を出しているワークフロー（Shopify注文通知／Amazon受注通知）を開く
3. **Send Slack message** アクションの Message 欄を編集
4. `@田崎` 等の平文を `<@U…>` に置換。書式例:

```
<@U0AAAAAAA> <@U0BBBBBBB> 新規注文 {{order.name}}
{{order.customer.displayName}} / 合計 {{order.totalPriceSet.shopMoney.amount}}
```

5. Channel or member id 欄は従来どおり（`#channel-name`、非公開チャンネルは `$C…`）
6. ワークフローを保存 → 有効化

### 3-3. 必須の事前確認
- 通知先チャンネルに **FlowBot が参加しているか**（チャンネル詳細 → Integrations → Add an app → FlowBot）。未参加だと投稿自体が届かない。
- 通知先がプライベートチャンネルの場合、メンバーIDのコピーは同ワークスペースに居ないとできない。

### 3-4. 検証（完了条件）
「テスト緑」ではなく**実機で通知が届くこと**を完了条件とする。
1. Flow のテスト実行、または少額のテスト注文を1件作成
2. Slack で通知を確認。合格条件:
   - メンション部分が **青いリンク**として表示されている（平文の `@名前` のままなら失敗）
   - 対象者の端末に**通知バッジ／プッシュが実際に届いた**ことを本人に口頭確認
3. 琢磨氏（漢字表示名のまま）で届けば、原因仮説が実証されたことになる

## 4. ブロッカー（本人対応が必要）

1. **Shopify 管理画面へのログインセッション** — Mac mini 側のブラウザは beatice ストアに未ログイン。Shopify CLI も未インストール（前回作業は MacBook 側 `/Users/rikukudo/...`）。かつ **Flow のワークフローは Admin API から読み書きできず、管理画面UIでしか編集できない**ため、CLI があっても自動化不可。
2. **BEAT ICE の Slack ワークスペースへのアクセス** — 現在このマシンに入っている Slack bot はワークスペース `riku`（Milla用）のみ。BEAT ICE 側のメンバーIDを採取できない。
3. **「パマ君」の特定** — 本名・Slackアカウントが未確定。みどさんからの引き継ぎ（DM等）待ち。

→ 1 と 2 が解けるまで適用できない。ID さえ揃えば実作業は5分程度。

## 5. 関連タスク（MTG由来・本件と分離）
- [~~工藤陸~~] 琢磨氏アカウント名の英語化依頼 → **本方式では不要**（依頼を止める）
- [みどさん] Slackメンション設定を英語表記に変更 → **本方式では不要**
- [全体] 9月中にシステムアップデート完了・運用開始
