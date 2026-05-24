# RICE CREAM 出退勤 LINE Bot 設計書

- **作成日**: 2026-05-23
- **改訂日**: 2026-05-24（クロスレビュー反映 v2）
- **作成者**: 工藤陸（all-good-ops メインセッション）
- **対象**: 株式会社 BEAT ICE / RICE CREAM 店舗スタッフ 7 名の出退勤記録
- **関連 spec**: `2026-05-15-rice-cream-manual-design.md`（給与計算 GAS 本体）
- **status**: draft v2（クロスレビュー P0-P1 反映済み・ユーザーレビュー待ち）

## 改訂履歴

| 版 | 日付 | 内容 |
|---|---|---|
| v1 | 2026-05-23 | 初稿 |
| v2 | 2026-05-24 | 実装可能性 / 運用 / セキュリティ 3 視点クロスレビューの P0-P1 を反映: ①即 reply 完結設計 ②LockService 必須化 ③署名検証 encoding 修正 ④夜跨ぎ対応 ⑤月跨ぎ訂正 ⑥同日 2 回送信フロー ⑦退職者 allowlist 運用 ⑧follow event 採取 ⑨6 行ブロック書込ロジック |

---

## 1. 背景・目的

### 現状の課題

| 項目 | 現状 |
|---|---|
| 出退勤の記録 | スタッフがノートに手書き |
| スプシへの転記 | 月末にオーナー（工藤陸）が手入力 |
| 所要時間 | 7 名 × 25 日 = 約 175 セル / 月の手入力。約 1〜2 時間 |
| エラー要因 | 字が読めない・記入漏れ・転記ミス |
| 給与計算との連結 | 毎月 5 日に GAS が自動実行されるが、データ投入が手動なため締切ギリギリになりやすい |

### ゴール

1. **スタッフ側の手数を増やさず**、出退勤データを電子化する
2. **月末のオーナー手入力をゼロにする**
3. **自己申告ベース**を維持する（リアルタイム打刻ではない）
4. **既存の給与計算 GAS（毎月5日トリガー）を改修なしで活かす**
5. **月運用コストを 100 円未満に抑える**

### Non-goals

- リアルタイム打刻、位置情報連動
- シフト希望提出フォーム（本 spec の範囲外）
- スタッフ間のコミュニケーション機能
- 給与計算ロジックの変更（休憩控除ルール追加は §7 で扱う）

---

## 2. ユーザー体験

### 通常ケース（happy path）

```
[退勤時に LINE に送信]
大津 → Bot:  「9-17」

[Bot が同期で reply（無料・タイムアウトリスク低）]
Bot → 大津:  📝 2026-05-23（金）の勤怠を以下で記録します。

             出勤: 09:00
             退勤: 17:00
             拘束時間: 8時間
             休憩控除: 45分（労基準拠）
             実労働: 7時間15分

             これでよろしければ「OK」と返信してください。
             違う場合は時間を送り直してください。

[スタッフ確認]
大津 → Bot:  「OK」

[Bot が確定処理]
Bot → 大津:  ✅ 5/23 09:00-17:00 を記録しました。お疲れ様です！

[スプシに書き込み]
202605 シート の 大津彩渚 列 / 5月23日 行（空き行）→ "09:00-17:00"
```

### 訂正ケース

```
大津 → Bot:  「先週月曜の退勤17:30に直して」

Bot → 大津:  📝 2026-05-19（月曜日）の退勤を以下に変更します。

             変更前: 09:00-17:00
             変更後: 09:00-17:30

             これでよろしければ「OK」と返信してください。
             違う日付の場合は YYYY-MM-DD 形式で送り直してください。

大津 → Bot:  「OK」

Bot → 大津:  ✅ 5/19 を 09:00-17:30 に修正しました。
```

### 夜跨ぎ勤務

```
大津 → Bot:  「19-26」  または「19:00から翌2時」

Bot → 大津:  🌙 2026-05-23（金）の夜跨ぎ勤務を以下で記録します。

             出勤: 19:00（5/23）
             退勤: 02:00（5/24）
             拘束時間: 7時間
             休憩控除: 45分
             実労働: 6時間15分

             OK？
```

スプシ書式: `19:00-26:00`（24h+ 表記）または `19:00-02:00(+1)`。実装時に 1 つ選択（推奨: 26:00 表記＝既存「12:45-23:00」フォーマットと整合）。

### 1日複数勤務（休憩で抜ける）

```
大津 → Bot:  「9-12 と 14-18」

Bot → 大津:  📝 2026-05-23（金）の勤怠を 2 コマで記録します。

             1コマ目: 09:00-12:00（3時間）
             2コマ目: 14:00-18:00（4時間）
             合計拘束: 7時間
             休憩控除: 0分（コマ間休憩は給与計算対象外）
             実労働: 7時間

             OK？
```

### エラーケース

| ケース | 挙動 |
|---|---|
| 未登録 userId からの送信 | **何も返信しない**（allowlist で即フィルタ） |
| パース不可（例: スタンプ単独、雑談） | 「ありがとうございます！🙏 出退勤の時間は数字で送ってもらえますか？ 例: `9-17` / `9:00-17:30`」 |
| OK 待ち中の二重送信 | 直前の確認状態を破棄して新しい入力を確認状態に遷移（reply で「前の確認はキャンセルしました」を明示） |
| 同日に confirmed 済みの再送信 | 「📝 既に 09:00-17:00 で記録済みです。追加コマとして記録 / 上書き / キャンセル どれにしますか？」 |
| 出勤 > 退勤（夜跨ぎ判定外） | 「出勤が退勤より遅いです。夜跨ぎ勤務でしたら『19-26』形式でお願いします」 |
| 日付指定が未来 | 「未来の日付は記録できません」 |
| 7 日超の過去日付（給与計算前） | 「7 日より前の修正は工藤さんに直接お伝えください」 |
| 7 日超の過去日付（給与計算後＝当月 5 日以降の前月分） | 同上 + オーナー通知 |
| Anthropic API エラー | 「一時的にうまく動いていません。少し時間を置いて送り直してください」+ オーナー通知 |

---

## 3. アーキテクチャ全体

```
┌──────────────────┐
│ スタッフ7名のLINE  │
└────────┬─────────┘
         │ メッセージ送信
         ▼
┌──────────────────────────┐
│ LINE 公式アカウント        │
│ (新規・専用 Channel)       │
│  - Messaging API           │
│  - Webhook URL を GAS に設定│
└────────┬─────────────────┘
         │ webhook (POST event)
         ▼
┌──────────────────────────────────────────┐
│ Google Apps Script (doPost)              │
│  0. LockService.waitLock(5000)           │
│  1. webhook signature 検証（UTF-8 byte列）│
│  2. event.type 分岐:                      │
│     - follow → userId 採取 + オーナー通知 │
│     - message → 下記                      │
│  3. userId allowlist チェック             │
│  4. レート制限チェック（24h ウィンドウ）   │
│  5. Anthropic API (Haiku 4.5) 同期パース  │
│     - tool_use 強制で JSON 構造化         │
│  6. 確認メッセージ reply                   │
│  7. 「OK」受信時に確定処理（別 doPost）   │
│  8. LockService release                  │
└────────┬─────────────────────────────────┘
         │ SpreadsheetApp
         ▼
┌──────────────────────────────────────┐
│ 出退勤・給与計算スプレッドシート       │
│ ID: 1CUJOC4i_...                     │
│  - YYYYMM シート（月別、target_date  │
│     から動的選択）                    │
│  - staff_master シート（新規）       │
│  - pending_state シート（新規）       │
│  - audit_log シート（新規）           │
└──────────────────────────────────────┘
         │（既存）毎月5日 09:00 トリガー
         ▼
   給与明細自動生成 GAS（既存）
```

### 3.1 同期 reply 完結設計の選択理由

クロスレビューで「LINE webhook は非同期処理推奨（公式: subsequent events を遅延させない）」「reply token に有効期限あり（公式値非公開）」が指摘された。一方で push 切替は月 200 通制限に乗るためコスト試算が崩壊する。

折衷案として **「即 reply 完結 + LockService + Anthropic 同期 2-3 秒」** を採用:

| 設計 | doPost 所要時間 | reply token | push 使用 | コスト |
|---|---|---|---|---|
| 同期 reply 完結（採用） | 2-4 秒（Anthropic 同期含む） | 即消費（タイムアウトリスク低） | なし | 約 80 円/月 |
| 即 200 + 非同期 push | 0.1 秒 | 使わず | 月 350 通 | push 超過分 数千円/月 |
| 完全非同期キュー | 0.1 秒 + 1 分後 push | 使わず | 月 350 通 | 同上 |

**条件付き採用**: Anthropic Haiku 4.5 の p95 応答時間が 4 秒以下である前提。実装後 1 週間の audit_log でレイテンシを実測し、超過頻発時は即 200 + 非同期 push に再設計（Phase 2 で対応）。

LINE 公式の「非同期推奨」は守らないが、3-4 秒程度の同期処理であれば「subsequent events を遅延させる」レベルではない（実用上の十分実績がある）と判断。

### 3.2 コンポーネント責務

| コンポーネント | 責務 |
|---|---|
| LINE 公式アカウント（専用 Channel） | スタッフからのメッセージ受信窓口 |
| GAS Webhook (doPost) | 認可・パース・確認・書き込みの全体オーケストレーション |
| LockService | doPost 並列実行時の pending_state 競合防止 |
| Anthropic API (Haiku 4.5) | 自然言語 → 構造化された時刻データへの変換（tool_use 強制） |
| 出退勤シート（既存） | 確定データの保存先 |
| staff_master シート（新規） | userId → 名前 → シート列 のマッピング、在職フラグ |
| pending_state シート（新規） | 確認待ちメッセージの一時保存 |
| audit_log シート（新規） | 全 webhook 受信ログ・改ざん監査用 |

---

## 4. データモデル

### 4.1 出退勤シート（既存 `1CUJOC4i_...` / `YYYYMM` シート）

**改変なし**。既存の 1 セル 1 時間レンジ形式に Bot が書き込む。
1 日 6 行ブロック構成（複数シフト対応）も既存仕様を踏襲。

**夜跨ぎ表記**: `19:00-26:00`（24h+ 表記）を採用。理由:
- 既存 `12:45-23:00` フォーマットとパース整合性
- 給与計算 GAS の総拘束時間計算ロジックが 24h+ で素直に動く（implementation でロジック要確認）

### 4.2 staff_master シート（新規追加）

シート名: `staff_master`

| 列 | 内容 | 例 |
|---|---|---|
| A | スタッフ名 | 大津彩渚 |
| B | LINE userId | `U1234abcd...` |
| C | 出退勤シートの該当列（アルファベット） | E |
| D | 在職フラグ | TRUE / FALSE |
| E | 1 日あたり日次レート制限 | 10（デフォルト） |
| F | 雇入日 | 2026-01-05 |
| G | 退職日（在職中は空） | （空） |
| H | 備考 | "2026-05-30 onboard" |

**重要 - userId のスコープ**:
- LINE userId は **Channel ごとに固有**（providerId + channelId で発行）
- Channel を作り直したら staff_master の userId は全て無効化
- 個人 LINE 上で取得した userId は使えない（必ず本 Channel で友だち追加して採取）
- OWNER_USER_ID も同 Channel で工藤陸が友だち追加した値を使う

**退職者運用**:
- 最終出勤日: 通常通り運用
- 最終出勤日翌日: D 列を FALSE に切替（手動）
- 翌月給与計算後: G 列に退職日を記入（記録保持）
- D=FALSE の userId からの送信は audit_log に warning 記録 + サイレント無視（reply 不要）

### 4.3 pending_state シート（新規追加）

シート名: `pending_state`

| 列 | 内容 | 例 |
|---|---|---|
| A | userId | `U1234abcd...` |
| B | 対象日付 | 2026-05-23 |
| C | 操作タイプ | new \| edit \| append |
| D | パース結果 JSON | `{"shifts":[{"start":"09:00","end":"17:00"}]}` |
| E | 確認メッセージ送信時刻 | 2026-05-23 17:05:32 |
| F | 状態 | awaiting_ok \| confirmed \| cancelled \| expired |
| G | 上書き対象の既存セル値（edit/append 時） | "09:00-17:00" |

- **TTL: 24 時間**（v1 の 30 分から延長）。理由: 退勤後に帰宅電車で確認するシナリオを考慮、給与計算は自己申告ベースなので記録漏れより遅延を許容
- 確定 / 期限切れ後は別シート `pending_state_archive` に移動

### 4.4 audit_log シート（新規追加）

シート名: `audit_log`

| 列 | 内容 |
|---|---|
| A | timestamp |
| B | userId |
| C | スタッフ名（in_allowlist=true 時のみ） |
| D | event_type（message/follow/unfollow/postback） |
| E | message_in（受信した本文） |
| F | parse_result_json |
| G | message_out（送った返信） |
| H | result（success/error/ignored/rate_limited/blocked_退職者/unknown_user） |
| I | error_detail |
| J | previous_cell_value（訂正時のみ、改ざん検知用） |
| K | latency_ms（Anthropic API 応答時間 - レイテンシ実測用） |

3 ヶ月以上前のログは月次クリーンアップでアーカイブシート（年単位）へ移動。

### 4.5 容量制約

- Script Properties は 1 property 最大 9KB、全体 500KB → トークン・secret のみで運用、pending_state はシートに置く（spec 通り）
- スプシ 1 ファイルは 1,000 万セル上限 → 7 名 × 365 日 × 6 行 × 1 セル = 約 15,330 セル/年。問題なし

---

## 5. 主要フロー詳細

### 5.0 共通: LockService の使用

```javascript
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    // 5 秒待っても取れない場合
    return ContentService.createTextOutput("locked");
  }
  try {
    // ... 全処理
  } finally {
    lock.releaseLock();
  }
}
```

理由: doPost は Apps Script で最大 30 並列実行され得る。pending_state の read-modify-write 競合を防ぐ。

### 5.1 follow イベント（友だち追加）

```
1. event.type === "follow"
2. event.source.userId と LINE Profile API で displayName 取得
3. staff_master を userId で照合
   - 既存登録あり（在職 TRUE）: 「お帰りなさい！」reply
   - 既存登録あり（在職 FALSE / 退職者）: サイレント無視 + audit_log
   - 未登録: 「友だち追加ありがとうございます！スタッフ登録は工藤さんが手動で行います」reply
4. OWNER_USER_ID に push 通知: 「新規 follower: <displayName> / userId: <userId>」
5. オーナーが手動で staff_master に列マッピング・在職フラグを設定
```

### 5.2 新規打刻フロー

```
1. LINE → webhook POST
2. signature 検証（§8.1）
3. event.source.userId を staff_master で照合
   - 未登録 / 在職 FALSE → サイレント無視（audit_log のみ記録）
4. 日次レート制限チェック
   - 直近 24h ウィンドウの打刻メッセージ数 > limit → 「制限超過」reply
5. メッセージ本文を Claude Haiku 4.5 に渡してパース
   - tool_use 強制で JSON 構造化（§6 参照）
   - パース失敗 → 「読み取れませんでした」reply
6. target_date から書き込み先シート（YYYYMM）を決定
   - シートが存在しなければ自動作成（既存テンプレ参照）
7. 同日の状態を確認:
   - confirmed 済みあり → §5.4 へ
   - awaiting_ok あり → cancelled に更新（最新優先）+ 「前の確認はキャンセルしました」reply
   - 何もない → step 8 へ
8. pending_state に書き込み（awaiting_ok, operation: "new"）
9. 確認メッセージを LINE に reply
```

### 5.3 OK 確定フロー

```
1. webhook POST（「OK」「ok」「はい」「お願いします」「👌」「了解」「りょ」「おけ」等）
   - Claude パースで intent: "confirm" と判定
   - またはキーワード fallback（confidence 低い時の保険）
2. userId で pending_state を引く
   - awaiting_ok のレコードを取得（無ければ「確認待ちの記録はありません」reply）
3. 操作タイプで分岐:
   - "new": 出退勤シートの該当日（YYYYMM シート）から空き行を上から探して書き込み
   - "edit": 既存セルを上書き（previous_cell_value を audit_log に保存）
   - "append": 同日の空き行に追加（複数シフト追加）
4. pending_state を confirmed に更新 → archive 移動
5. 「✅ <date> <時刻レンジ> を記録しました」reply（サマリ抜粋を再掲して誤確定検知を促す）
6. SpreadsheetApp.flush() で commit
```

### 5.4 同日 confirmed 後の再送信フロー

```
状況: 朝「9-」だけ送って OK 確定 → 夕方「-17」を送る、or 朝「9-17」確定後に「実は 18 まで」

1. 同 userId・同 target_date に confirmed があり、新規入力が来た
2. Bot reply: 「📝 5/23 は既に 09:00-17:00 で記録済みです。どうしますか？
              ① 追加コマとして記録（"add"）
              ② 上書き（"edit"）
              ③ キャンセル（"cancel"）」
3. スタッフ返信で分岐:
   - "add" / "追加" / "①" → pending_state(operation: append) で再確認
   - "edit" / "上書き" / "②" → pending_state(operation: edit) で再確認
   - "cancel" / "③" → サイレント終了
4. それぞれの確認後に §5.3 OK 確定フローへ
```

### 5.5 訂正フロー

```
1. webhook POST（「先週月曜17:30に直して」等の自然文）
2. Claude パース: intent: "edit", target_date, shifts[], operation: "edit"
3. target_date バリデーション:
   - 未来 → reject
   - 過去 7 日超 → 「7 日より前の修正は工藤さんに直接お伝えください」reply + OWNER_USER_ID に escalate 通知
   - target_date の月が当月 ≠ now の月、かつ now の日 > 5 → 給与計算後の遡及 → 同上 escalate
4. target_date から YYYYMM シートを動的選択（月跨ぎ訂正対応）
5. 既存セル値を取得（previous_cell_value として）
6. pending_state に書き込み（awaiting_ok, operation: "edit", G 列に previous_cell_value）
7. 確認メッセージを reply（変更前 / 変更後を併記、target_date は曜日付きで表示）
8. OK 受信で §5.3 へ（既存セル上書き + audit_log.J に previous_cell_value 保存）
```

### 5.6 退勤忘れ翌朝送信ガード

```
受信時刻が 04:00-10:00 かつ end 時刻のみ送信（start 不明）の場合:
  Bot reply: 「これは昨日 (<前日日付>) の退勤ですか？
              今日 (<本日日付>) の退勤の場合は時間を再送信してください」
ユーザーが追加情報なしで「OK」と答えたら → 前日付として記録
```

### 5.7 不正/エラーガード

| ガード | 実装 |
|---|---|
| userId allowlist | staff_master 在職フラグ TRUE のみ受付 |
| 日次レート制限 | 直近 24h ウィンドウで N 通（staff_master E 列、デフォルト 10） |
| 未来日付拒否 | パース後に `target_date > today` で reject |
| 過去 7 日制限 | デフォルト 7 日。それ以前は「オーナーに直接申告してください」reply + escalate |
| Anthropic 予算上限 | Anthropic コンソールで月 $5 上限を設定（保険） |
| LINE webhook 署名検証 | X-Line-Signature ヘッダで HMAC-SHA256（§8.1 詳細） |
| LockService | doPost 入口で必須 |

---

## 6. Claude パース仕様

### 6.1 モデル選定

- **claude-haiku-4-5-20251001**（Claude Haiku 4.5）
- 価格: $1/MTok input, $5/MTok output（[公式](https://platform.claude.com/docs/en/about-claude/models/overview)で確認済）
- 1メッセージあたり 100〜300 tokens 程度、応答 1〜3 秒（実測必要、audit_log で監視）

### 6.2 構造化出力（tool_use 強制）

JSON出力の安定性を担保するため、素のテキスト出力ではなく **tool_use を強制**:

```javascript
const tools = [{
  name: "record_attendance",
  description: "スタッフの出退勤メッセージから構造化データを抽出",
  input_schema: {
    type: "object",
    properties: {
      intent: { type: "string", enum: ["record", "edit", "confirm", "cancel", "unknown", "append", "stamp_only"] },
      target_date: { type: ["string", "null"], description: "YYYY-MM-DD or null（本日扱い）" },
      shifts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            start: { type: ["string", "null"], description: "HH:MM" },
            end: { type: ["string", "null"], description: "HH:MM" },
            end_next_day: { type: "boolean", description: "退勤が翌日に跨ぐ場合 true" }
          }
        }
      },
      confidence: { type: "number" },
      ambiguity_note: { type: ["string", "null"] }
    },
    required: ["intent", "shifts", "confidence"]
  }
}];

await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  tools,
  tool_choice: { type: "tool", name: "record_attendance" },  // 強制
  messages: [...]
});
```

### 6.3 system prompt（要点）

```
あなたは飲食店スタッフの出退勤メッセージから構造化データを抽出する専門家です。

ルール:
- 「9-17」「9時から5時」「朝9時 夕方5時」は全て 09:00-17:00 と解釈
- 「19-26」「19:00から翌2時」「夜7時から朝2時」は { start: "19:00", end: "02:00", end_next_day: true }
- 「9-」だけ → { start: "09:00", end: null, end_next_day: false }（出勤のみ報告）
- 「OK」「ok」「はい」「お願いします」「👌」「了解」「りょ」「おけ」「うぃ」「✌️」は intent: "confirm"
- 「キャンセル」「やめる」「①追加」「②上書き」「③キャンセル」は intent に "cancel" or "append" or "edit"
- スタンプ単独 / 「お疲れ」「ありがと」など雑談 → intent: "stamp_only" or "unknown"
- 時刻を一切抽出できなければ intent: "unknown"
- 日付指定（「昨日」「先週月曜」「5/19」）は target_date に変換。本日は ${today}
- 「先週月曜」が前々週月曜の解釈余地があれば confidence を 0.7 以下にして ambiguity_note に記載
- 5 時が午前/午後不明なら飲食店勤務時間帯（11:00-23:00 中心）を優先

例:
入力: 「9-17」→ {"intent":"record","shifts":[{"start":"09:00","end":"17:00","end_next_day":false}],"confidence":0.95}
入力: 「19-26」→ {"intent":"record","shifts":[{"start":"19:00","end":"02:00","end_next_day":true}],"confidence":0.95}
入力: 「先週月曜の退勤17:30に直して」→ {"intent":"edit","target_date":"2026-05-19","shifts":[{"start":null,"end":"17:30","end_next_day":false}],"confidence":0.9}
入力: 「9-12 と 14-18」→ {"intent":"record","shifts":[{"start":"09:00","end":"12:00","end_next_day":false},{"start":"14:00","end":"18:00","end_next_day":false}]}
入力: 「おつかれ〜🍦」→ {"intent":"stamp_only","shifts":[],"confidence":0.95}
```

### 6.4 fallback

- tool_use が返らない（極稀）→ intent: "unknown"
- shifts[].start > shifts[].end かつ end_next_day=false → 「夜跨ぎ勤務でしたら『19-26』形式で送ってください」エラー
- target_date が未来 → 拒否
- confidence < 0.5 → 確認メッセージで ambiguity_note を明示しユーザー再確認

---

## 7. 既存システムへの改修

### 7.1 給与計算 GAS

**書き込み I/F は改修不要**。Bot が既存セル形式（時間レンジ）で書き込むため、既存集計ロジックがそのまま動く。

ただし以下を確認:
- 夜跨ぎ表記 `19:00-26:00` の集計ロジック（24h+ で正しく拘束時間を計算できるか）
- 月跨ぎ訂正が 5 日トリガー後に来た場合の再計算手順（マニュアル運用）

### 7.2 休憩控除ルール追加（Phase 1 同時実装）

労基準拠で集計時に自動控除:
- 拘束 6h 以下 → 控除 0 分
- 拘束 6h 超〜8h 以下 → 控除 45 分
- 拘束 8h 超 → 控除 60 分

実装場所: 既存の集計 GAS の「総実動」計算部分。
- writing-plans フェーズで既存コードを read し、現状ロジックとの差分を確定
- 既に控除処理が入っている場合は確認のみで済む可能性あり

### 7.3 給与計算トリガー時刻明記

毎月 5 日の実行時刻を **09:00 固定**とする。スタッフ向け説明文に「修正は前月末から当月 4 日 23:59 まで」と明示。

---

## 8. セキュリティ・運用ガード

### 8.1 webhook 署名検証（重要）

LINE が送ってきた POST には `X-Line-Signature` ヘッダ（payload body の HMAC-SHA256 + Base64）。
GAS では **UTF-8 byte 列で計算**する必要がある（文字列のまま `computeHmacSha256Signature` に渡すと UTF-16 解釈で false 判定が起きる）:

```javascript
function verifySignature(e) {
  const channelSecret = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_SECRET");
  const signature = e.headers["X-Line-Signature"] || e.headers["x-line-signature"];
  const rawBody = e.postData.contents;

  // 重要: UTF-8 byte 列で HMAC 計算
  const rawBodyBytes = Utilities.newBlob(rawBody).getBytes();
  const secretBytes = Utilities.newBlob(channelSecret).getBytes();
  const hash = Utilities.computeHmacSha256Signature(rawBodyBytes, secretBytes);
  const computedSignature = Utilities.base64Encode(hash);

  return signature === computedSignature;
}
```

不一致時の挙動: **応答時間を一定化（タイミング攻撃対策）** + サイレント無視。

### 8.2 シークレット管理

GAS の Script Properties に格納:
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `ANTHROPIC_API_KEY`
- `OWNER_USER_ID`（工藤陸の userId / 重大エラー通知先）

**アクセス境界**: スクリプトのオーナーは工藤陸単独。共有編集者を作らない（Script Properties は編集権限者全員に見える）。

**rotate 手順**:
- LINE: Channel 管理画面で Access Token reissue → Properties 更新
- Anthropic: Console で API Key rotate → Properties 更新
- 年 1 回 or 漏洩疑い時に実施

### 8.3 監査ログ（再掲・拡張）

§4.4 audit_log シートで全 webhook 受信を記録。3 ヶ月超は年単位アーカイブシートへ。

### 8.4 オーナー通知

以下が発生したら GAS で OWNER_USER_ID に push（200 通/月無料枠）:
- Anthropic API が 3 回連続でエラー
- 未登録 userId からの送信が 1 日 5 回以上（スパムフォロー疑い）
- レート制限超過
- 過去 7 日超 / 給与計算後の遡及修正依頼（escalate）
- 退職者（D=FALSE）からの送信があった場合
- 友だち追加 event（新規 follower 通知）

想定通知量: 月 10-30 通程度（無料枠内）。

### 8.5 法定帳簿としての耐性

- 出退勤データは賃金台帳（労基法 109 条で 5 年保存）の根拠資料
- audit_log.J 列 previous_cell_value で**変更前後の差分を完全記録**
- audit_log.E 列で**スタッフが送った原文を保存**（後から「Bot が誤解釈した」立証可能）
- audit_log.K 列で Anthropic レイテンシを記録（パフォーマンス監視用）

---

## 9. テスト戦略

### 9.1 単体テスト（GAS 簡易フレーム）

- `verifySignature(e)` の正常 / 異常パターン（マルチバイト文字含む）
- `parseTimeRange("9-17")` / `parseTimeRange("19-26")` / `parseTimeRange("9-12 と 14-18")`
- `applyBreakDeduction({restraint_minutes: 480})` → 45min
- `applyBreakDeduction({restraint_minutes: 481})` → 60min
- `selectTargetSheet("2026-04-30")` → "202604"（月跨ぎ）
- `findEmptyRowInDay(sheet, date)` → 既存記録ある場合 / ない場合
- `checkRateLimit(userId, audit_log)` → boolean

### 9.2 統合テスト

webhook を curl で直接叩く / LINE Bot 用テストツール:
1. allowlist 外 userId → 無視 + audit_log 記録
2. 正常な「9-17」→ 確認 → 「OK」→ スプシ書き込み
3. 「19-26」夜跨ぎ
4. 訂正フロー（月跨ぎ含む）
5. 同日 confirmed 後の追加送信（add/edit/cancel 分岐）
6. 確認待ち 24h 経過 → expired
7. レート制限超過
8. 退職者（D=FALSE）からの送信
9. follow event ハンドリング
10. 並列 doPost（LockService 動作確認）

### 9.3 受け入れテスト（実機）

工藤陸が自分の LINE で 1 日テスト後、自分以外の 1-2 名に Day -3 でテスト参加してもらう。

---

## 10. 移行計画

### 10.1 ロールアウト

#### Day -7 (準備)
- 新規 LINE 公式アカウント Channel 作成（同 Business ID 配下）
- Channel access token / secret 取得
- GAS デプロイ、Webhook URL を Channel に登録
- staff_master シート作成、列マッピング・在職フラグ事前設定

#### Day -3 (リハーサル)
- 工藤陸が 1 人で全パターン実機テスト
- 1-2 名のスタッフに先行参加してもらい、QR で友だち追加→ userId 採取 → staff_master に転記 → テスト送信

#### Day 0 (切替日)
- 全スタッフに口頭 + LINE で説明（5 分程度の説明文 §10.2）
- 全員 QR で友だち追加 → 工藤陸が staff_master に userId 転記
- **当日〜Day +3 はノート併用許容**（§10.3）
- ノートは Day +3 まで継続、Day +4 以降は撤去

#### Day +7 (チェックポイント)
- 1 週間の audit_log を確認
  - Anthropic レイテンシ p95 が 4 秒以下か（超過なら非同期化検討）
  - パース精度（confidence < 0.5 の割合）
  - エラー / 退職者警告の有無
- スタッフにヒアリング
- 必要なら Phase 2 計画策定

### 10.2 切替スクリプト（説明文テンプレ）

```
お疲れ様です。
本日 5/X から出退勤の記録方法が変わります。

【新しいやり方】
1. QR コードで LINE 公式アカウント「RICE CREAM 勤怠 Bot」を友だち追加
2. 退勤後（または出勤時と退勤時）に時間を Bot に送信
   例: 「9-17」「9:00-17:30」「朝9時から夕方5時まで」「19-26（夜跨ぎ）」
3. Bot が確認メッセージを送るので「OK」と返信
4. これだけで月末の集計まで自動で完了します

【修正・例外】
- 過去日の修正: 「先週月曜 17:30 に直して」のように自然文で OK
- 休日: 何も送らなくて OK
- Bot が反応しない / おかしい時: ノートに書いて工藤に LINE で直接お伝えください
  （切替後 3 日間はノート併用 OK）

【締切】
- 月の打刻修正は 翌月 4 日 23:59 まで

質問があれば工藤までお気軽にどうぞ。
```

### 10.3 Day 0 切替時の fallback

- GAS / LINE / Anthropic のいずれかが Day 0 当日に落ちた場合
- 工藤陸の個人 LINE に「時間を直接送信してください」を §10.2 説明文に明記
- 切替後 **3 日間はノート併用許容**（誰でも「Bot まだ慣れない」と言える期間）
- 4 日目以降はノート撤去、Bot 一本化

### 10.4 退職時オペレーション

```
1. 最終出勤日: 通常通り運用
2. 最終出勤日翌日: 工藤陸が staff_master.D を FALSE に切替
3. 最終出勤月の月末締めまで（5 日 GAS 実行までは）staff_master は変更しない
4. 月次給与計算後: G 列に退職日を記入（記録保持）
5. 以降、退職者 userId からの送信は audit_log に warning 記録、reply なし
6. 工藤陸に push 通知（退職者からの不正打刻試行検知）
```

---

## 11. コスト試算

| 項目 | 単価 | 月間消費 | 月額 |
|---|---|---|---|
| LINE Messaging API（reply） | 無料 | 全スタッフ送信に対する確認・確定 reply | 0 円 |
| LINE Messaging API（push） | 月200通まで無料 | オーナー通知 10-30 通 | 0 円 |
| Claude Haiku 4.5（パース） | 入力 $1/MTok / 出力 $5/MTok | 1リクエスト ≒ 200 in / 100 out tokens × 月 700 回 | 約 80 円 |
| GAS 実行時間 | 1日 6 時間まで無料 | 1リクエスト 2-3 秒 × 月 700 回 ≒ 40 分 | 0 円 |
| Google Drive 容量 | 15GB まで無料 | スプシ追記のみ | 0 円 |
| **合計** | | | **約 80 円/月** |

上振れリスクと保険:
- Anthropic コンソールで月 $5 上限を設定（暴走時の自動停止）
- LINE Messaging API は reply 主体なので暴走しても課金リスクなし
- push 200 通超過時の課金は LINE 公式アカウントプラン次第 → 通知量を月 100 通以下に抑える設計

レイテンシ実測後の再設計シナリオ:
- Haiku p95 > 4 秒が頻発したら、即 200 + 非同期 push 設計に切替（push 月 350-400 通 → LINE 公式アカウント Light プラン月 5,000 円 or 通知整理）

---

## 12. 残課題 / Phase 2 候補

### 12.1 Phase 1 で扱わない（明示的に外す）

- シフト希望提出（Bot からシフト希望を出す機能）
- 出勤忘れリマインド（シフト時刻過ぎても打刻なしならリマインド push）
- 月次集計レポートのスタッフ送信（給与明細 PDF の自動配信）

### 12.2 Phase 2 で検討

- シフト予定との差分検知 → Slack/メール通知
- マルチ言語対応（外国人スタッフ採用時）
- 写真添付（領収書を一緒に送る等の業務連絡用途）
- レイテンシ実測結果次第で非同期 push 設計へ移行

---

## 13. 決定済み事項サマリ（v2 反映）

| 論点 | 決定 |
|---|---|
| ホスティング | GAS（Google Apps Script）単独 |
| LINE アカウント | 新規専用 Channel（同 Business ID 配下） |
| 自然言語パース | Claude Haiku 4.5 + tool_use 強制 |
| 同期 / 非同期 | **同期 reply 完結**（doPost 内 2-4 秒、実測後再設計判断） |
| 並列制御 | **LockService.tryLock(5000) 必須** |
| 署名検証 | UTF-8 byte 列で HMAC-SHA256 |
| 休憩時間 | スタッフは総拘束時間で送信、GAS で労基準拠控除（6h超=45分、8h超=60分） |
| 送信タイミング | 出退勤時の 2 回送信が基本、後日まとめ送信も許容 |
| 訂正フロー | Bot に自然文で訂正依頼、月跨ぎはシート動的選択 |
| 夜跨ぎ | スプシ表記 `19:00-26:00`（24h+） |
| 同日 2 回送信 | confirmed あれば add/edit/cancel の 3 択分岐 |
| 退職時運用 | D 列 FALSE 切替 → 翌月 G 列退職日記入 |
| follow event | userId 採取 + オーナー push 通知 + 手動 staff_master 転記 |
| 休日 | 何も送らなくて OK（空欄=休日） |
| 移行 | Day 0 全員切替、Day 0-3 ノート併用許容、Day 4 から Bot 一本化 |
| pending_state TTL | **24 時間**（v1 の 30 分から延長） |
| 確認ループ | 必須（誤入力防止のため OK/再入力で 1 ターン挟む） |
| 月コスト目標 | 100 円未満（試算 80 円） |

---

## 14. 用語

- **拘束時間**: 出勤から退勤までの総時間（休憩を含む）
- **実労働時間**: 拘束時間から休憩を引いた時間
- **pending state**: スタッフが時間を送信した後、「OK」確定が来るまでの待機状態
- **allowlist**: 受け付ける userId の許可リスト。staff_master 在職フラグ TRUE のスタッフのみ
- **24h+ 表記**: 夜跨ぎ勤務を 1 セルで表す表記法。`19:00-26:00` = 19:00 出勤、翌 02:00 退勤

---

## 関連リファレンス

- 既存 GAS: `outputs/clients/rice-cream/payroll-automation/`
- 出退勤・給与計算スプシ: `1CUJOC4i_OOYUAtcBUoDfRVg6apIdzO8I6CixLlN3aoA`
- 給与明細フォーマット: `feedback_payslip_template_cells.md` / `reference_rice_cream_drive_resources.md`
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/) — webhook 仕様、reply / push の使い分け
- [LINE 署名検証](https://developers.line.biz/en/reference/messaging-api/#signature-validation)
- [Claude モデル一覧](https://platform.claude.com/docs/en/about-claude/models/overview) — Haiku 4.5 価格・スペック
- [Apps Script LockService](https://developers.google.com/apps-script/reference/lock/lock-service)
- 失敗事例: `2026-05-22-money-bot-design.md`（Claude Agent SDK + Vercel の組み合わせを避ける根拠）
