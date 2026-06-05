# H-8 owned channel 導線 copy 案 + 人間アクション手順

> **⚠️ 2026-06-02 更新**: 発信名義を **ofmeton → はぐりん** に改称（`note.com/hagurin__`）。本文 §1-2 の旧 ofmeton ドラフトは **superseded**。実際にデプロイした確定値・確定コピーは末尾 **§7「確定版（2026-06-02 デプロイ）」** を参照。
>
> 起案: 2026-05-30 by Claude (brand-publisher)
> 上流: handson-h1-to-h10.md §8 (H-8) / launch-roadmap.md トラック C
> SSOT: main-design-all-versions.md (funnel = X 投稿 → プロフィール → note) / style-guide-all-versions.md
> 対象: Phase 1 X soft launch (2026-06-08) までに owned channel 3 導線を設置
> 注意: Pinned post 3 案は `phase1-month1-initial-content.md §1` に既存。本ファイルは **X bio / note プロフィール / 各媒体への導線文言** を新規起案

## 0. 共通ルール (phase1-month1 §0 継承)

- 名義 **ofmeton**（本名なし）/ AI は固有名併記（ChatGPT / Claude）/ ハッシュタグ 0 / 絵文字 0-2
- 固有名詞 DLP（案件名・取引先名・個人氏名なし）/ 業法独占キーワードなし（Month 1 は経理・業務効率化横断）
- AI 感 NG 表現（「〜について解説します」「ぜひお試しください」「いかがでしょうか」「結論から言うと」）不使用
- funnel 規約: X 投稿に URL は載せない（URL 課金回避）。**送客は全てプロフィール経由** → bio / 固定ポストに note・LINE リンクを集約

---

## 1. X bio 3 案（各 160 字以内）

> X bio 上限 160 字。website 欄（別枠）に note URL を入れる前提で、bio 本文は positioning + 「固定ポスト / プロフィールの note へ」で締める。
> Hook 配分は Pinned post と揃える: Draft 1 = number_lead / Draft 2 = promise_lead(翻訳者ポジション) / Draft 3 = authority_lead。

### Draft 1（number_lead・実益型）

```
非エンジニアの経営者が ChatGPT / Claude で事務作業を毎日少しずつ減らす実例を発信。3時間の経理処理を20分に、など。コードは書きません。手順の詳細は固定ポストの note へ。
```
約 90 字。

- **採用理由**: 数字（3時間→20分）を冒頭に置き number_lead を踏襲。「コードは書きません」で非エンジニア読者の心理的ハードルを先に下げる。
- **リスク**: 数値は phase1-month1 Pinned Draft 1 と同一値で整合。DLP / 業法 / AI 感 該当なし。

### Draft 2（promise_lead・翻訳者ポジション型）

```
エンジニアだけど、非エンジニアの言葉で AI を翻訳する実装者。中小事業者・士業・コンサル向けに、ChatGPT / Claude を実務へ組み込む手順を毎日1投稿。新ツール契約ゼロ。詳しくは固定ポストの note。
```
約 100 字。

- **採用理由**: CLAUDE.md 発信戦略のポジション文（「エンジニアだけど、非エンジニアの言葉で翻訳する実装者」）をそのまま bio の核に。3 ターゲット（中小事業者・士業・コンサル）を明示。「新ツール契約ゼロ」で導入コストの壁を先回り。
- **リスク**: 士業は Month 1 では industry_sop の 1 セグメント扱い（業法独占キーワードは出さない）。bio の「士業」表記は対象提示のみで業法抵触なし。

### Draft 3（authority_lead・実績型）

```
業務自動化を5年（Python / GAS / VBA）。今は Claude Code で「非エンジニアでも再現できる形」に落とし込み中。経理・総務のあの手作業を AI に任せる手順を、失敗込みで発信。note は固定ポストから。
```
約 100 字。

- **採用理由**: 本人実績（自動化 5 年）を自前 authority に。他人の権威を借りずに成立するため ofmeton-fit 高。「失敗込みで」で誠実さ signal。
- **リスク**: 「5 年」は事実情報（本人フリーランス実績）。誇張なし。

---

## 2. note プロフィール（自己紹介）3 案（各 200-300 字）

> note プロフィールは X bio より長文可。冒頭 2 行で「何者か」、中段で「何を書くか」、末尾でメンバーシップ / 購読への導線。
> note の各記事末尾にも同じ購読 CTA を貼る（handson §8.2 Step 3）。

### Draft 1（実益・手順型）

```
ofmeton です。非エンジニアの経営者・担当者が、ChatGPT や Claude で日々の事務作業を減らすための「実際にやった手順」を書いています。

請求書、見積り、議事録、月次の数字確認 ──
1 業務ずつ、コードを書かずに組み直した実例を、失敗もそのまま残します。

新しいツールの契約は増やさず、いま使っている道具の組合せだけで進めるのが方針です。

→ 続きの手順や有料の詳細版は、このページのメンバーシップから読めます。
```
約 250 字。

### Draft 2（ポジション宣言型）

```
エンジニアとして 5 年、会社の業務自動化を組んできました。いまはその経験を「非エンジニアの言葉」に翻訳して届けています。

対象は、中小企業の経営者・経理 / 総務の担当者、士業やコンサルの方。
ChatGPT や Claude を、自社の実務にどう組み込むか。判断の入口から具体的な手順まで、毎週いくつか記事にしています。

無料記事で全体像を、メンバーシップで踏み込んだ手順とテンプレートを公開しています。気になる業務があれば、まず無料記事からどうぞ。
```
約 270 字。

### Draft 3（失敗談・誠実型）

```
ofmeton です。「AI で業務効率化」と言われても、自分の仕事のどこを任せられるのか分からない ── その状態を、実際に手を動かして埋めていく記録です。

うまくいった手順だけでなく、回り道や失敗した試行も残します。再現できることを一番大事にしているので、派手な結論より「その通りやれば動く」を優先しています。

道具は ChatGPT / Claude / Notion / Slack の組合せが中心。
詳しい手順とテンプレートはメンバーシップにまとめています。
```
約 250 字。

---

## 3. LINE 友達追加 導線文言（8C）

> 投稿 reach 経由で「LINE で詳細を聞きたい」誘導 → 友達追加 → consent_granted 自動記録（PR-A 実装済の publication_consent gate）。
> bio / note プロフィール / portfolio site に下記の短文 + URL を配置。

### bio / プロフィール追記用（1 行）

```
個別の相談・詳しい事例は LINE で受けています → （友だち追加 URL）
```

### note 記事末尾 CTA（2-3 行）

```
この手順をあなたの業務に当てはめると何が変わるか、個別に知りたい場合は LINE からどうぞ。
具体的な業務名を 1 つ送ってもらえれば、どこを AI に任せられそうか返します。
→ （友だち追加 URL）
```

- **設計意図**: 「業務名を 1 つ送って」と具体行動を指定し、友達追加後の最初の往復ハードルを下げる。consent gate（公開許諾）に自然接続。

---

## 4. 各媒体への link 配置マップ

| 配置先 | note 購読 URL | LINE 友達 URL | タイミング |
|---|---|---|---|
| X bio website 欄 | ✅ note | — | Phase 1 Day 1（launch 後） |
| X 固定ポスト末尾 | ✅ note | — | Day 1 |
| note プロフィール冒頭 | ✅ メンバーシップ | ✅ | 設置済次第すぐ（launch 前可） |
| note 各記事末尾 | ✅ 購読 | ✅ | 公開記事ごと |
| portfolio site (ofmeton.com 後) | ✅ | ✅ | Phase 1 後半（DNS 設定後） |

---

## 5. 人間アクション手順（残 3 件）

### 8A note 購読導線（Claude 側 copy は §1-2 で完了）
- [ ] note プロフィール冒頭に §2 から 1 案選んで貼る
- [ ] メンバーシップ / 購読 URL を控える → §6 handoff へ
- 注: メンバーシップは作成済（非公開）。公開 or 購読 form 有効化の要否を判断

### 8B ofmeton.com ドメイン取得（人間のみ・年 ¥1,500 前後）
- [ ] Cloudflare Dashboard → Domain Registration → `ofmeton.com` 検索
- [ ] available なら購入（WHOIS privacy ON / クレカ登録）
- [ ] 取得済なら skip。DNS 設定は Phase 1 後半（Astro blog deploy 時）で OK
- 代替: 取得済の場合 `ofmeton.dev` / `.io`（`.jp` は年 ¥3,000 で高め）

### 8C LINE 友達追加 URL（人間のみ）
- [ ] https://manager.line.biz/account/<channel-id>/setting/url で友だち追加 URL + QR を取得
- [ ] 値を控える → §6 handoff へ
- consent gate（publication_consent）は PR-A 実装済 → Claude 側追加実装は不要

---

## 6. Claude への引き渡しテンプレ（取得後に埋めて貼り付け）

```
[H-8 完了]
NOTE_SUBSCRIBE_URL=<note 購読 or メンバーシップ URL>
OFMETON_DOMAIN=ofmeton.com（取得済、DNS 後追い）
LINE_FRIEND_ADD_URL=https://line.me/R/ti/p/@<basic-id>
採用 bio = Draft <1|2|3>
採用 note プロフィール = Draft <1|2|3>
```

→ 上記が揃えば、Claude が各媒体への実 link 埋め込み版（bio / 固定ポスト / note プロフィール最終形）を確定する。

---

## 7. 確定版（2026-06-02 デプロイ）

> 名義 = **はぐりん** / note = `https://note.com/hagurin__` / LINE = `https://lin.ee/QQWV0yD`
> §1-2 の ofmeton ドラフトは superseded。以下がユーザー設定済 or 採用確定の実コピー。

### 7.1 X bio（✅ ユーザー設定済）
```
非エンジニアの経営者が Claude Code / Codex で一人でも生産を爆上げするための情報を発信。
業務自動化を5年（Python / GAS / VBA）。
今はClaude Codeを活用してHP制作、飲食店MGR業務自動化、WEB広告周り、アプリ開発を行っています。
詳しくは固定ポストの note。
```

### 7.2 X 固定ポスト（採用: 案 A / launch 6/8 投稿）
```
はぐりんです。
非エンジニアの経営者が、Claude Code や Codex で「一人でも生産を爆上げする」ための実例を、毎日1投稿で残していきます。

業務自動化を5年（Python / GAS / VBA）。
今は Claude Code で、HP制作・飲食店マネージャー業務の自動化・WEB広告まわり・アプリ開発を、コードを一から書かずに回しています。

その手順を、失敗込みで note にまとめています。
👇
https://note.com/hagurin__
```

### 7.3 note プロフィール（✅ ユーザー設定済 / 140字制限）
```
はぐりんです。非エンジニアの経営者が、ClaudeなどのAIで業務効率化や「できなかったことをできるように」する実例を発信。メンバーシップでは収益につながる詳細な手順をまとめます。
```

### 7.4 確定値
| key | value | 状態 |
|---|---|---|
| 名義 | はぐりん | ✅ |
| NOTE_TOP_URL | `https://note.com/hagurin__` | ✅ |
| NOTE_MEMBERSHIP_URL | `https://note.com/hagurin__/membership` | ✅ |
| LINE_FRIEND_ADD_URL | `https://lin.ee/QQWV0yD` | ✅ |
| DOMAIN | hagurin 系（`hagurin.dev` 等）で取得予定。`hagurin.com` は要空き確認 | ⏸ 未取得 |

### 7.5 残タスク
- [ ] ドメイン: Cloudflare で `hagurin.dev` / `.blog` / `.me` の空き確認 → 取得（年¥1,500前後、人間）
- [ ] note プロフィール / 記事末尾に LINE 導線（`https://lin.ee/QQWV0yD`）を任意配置
- [ ] X 固定ポスト（§7.2）を launch 6/8 に投稿
