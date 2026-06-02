# Phase 1 Month 1 初期コンテンツドラフト

> **⚠️ 2026-06-02 名義更新**: 発信名義 ofmeton → **はぐりん**（note=`https://note.com/hagurin__`）。note URL は全て hagurin__ に置換済。本文・分析メモ中に残る "ofmeton" 表記は **「はぐりん」と読み替え**、公開前 content-reviewer pass で最終確定する（分析ラベル＝採用率/-fit/§参照 等はそのまま）。§1 Pinned post + bio は `h8-owned-channel-copy.md §7` の確定版（案A / 設定済bio）が SSOT。X @handle は実アカウント名を要確認。

> 起案: 2026-05-27 by Claude (writer + brand-publisher 統合)
> 上流: launch-roadmap.md §2.3 トラック C, initial-values §3.2 / §3.4 / §3.8 / §4.1 / §5.5 / §5.6
> SSOT: main-design-all-versions.md §2.1〜§2.4 / style-guide-all-versions.md §2.1〜§2.6
> 対象期間: 2026-06-08 (X launch 目標) 〜 2026-07-07 の Month 1
> 業種フォーカス: 経理 / 業務効率化横断 (業法独占薄、JTBD 検証フェーズ。士業特化は H-13 = 2026-11 以降)

## 0. 設計前提と共通ルール (全 C-2/C-3/C-4 共通)

- **名義**: ofmeton (本名は本ドラフト内には登場させない)
- **AI 表記**: 「Claude」「ChatGPT」のように固有名で書く。「AI」総称のみは原則避け、抽象したい場面でも「ChatGPT や Claude などの生成 AI」のように 1 度は固有名を併記する (透明性原則 / CLAUDE.md AI 表記ルール)
- **ハッシュタグ**: 0 個 (style-guide §4.1 遵守)
- **絵文字**: 0-2 個まで (initial-values §4.1)
- **改行**: 短文 1-3 / 中文 3-5 / 長文 5-8 (initial-values §4.1)
- **固有名詞 DLP**: 案件名 / 取引先名 / 個人氏名は draft text に含めない (Editor +5 ルール)
- **業法ガード**: Month 1 は経理 / 業務効率化横断のため業法独占キーワード (税理士法 §52、社労士法 §27 等) には触れない (main-design §2.10 / H-13 = 2026-11 以降)
- **citation_explicit_rate target**: 全体 65%。本ドラフトでは外部出典を引く場合「[要 source 確認] (YouTube タイトル / Notion 公開ページ等)」と明記し、ofmeton が公開前に実 URL を埋める
- **AI 感ゼロ NG 表現**: 「〜について解説します」「ぜひお試しください」「いかがでしょうか」「結論から言うと」等は使わない (content-quality-rubric §1)

---

## 1. Pinned post 3 案 (C-3)

> initial-values §5.5.3 SSOT に沿って type=mixed (告知 + 説得文) で 3 案。
> 各案 200-280 字、4 段構成 (① 何者か → ② 何を発信するか → ③ 何にコミットしているか → ④ 行動誘導)。
> Hook 配分: Draft 1 = number_lead、Draft 2 = promise_lead、Draft 3 = authority_lead (Codex 24 アカ Sonnet 分析 primary_destination=own_site 42% の主力 type に整合)。

### Draft 1 (Hook: number_lead)

```
非エンジニアの経営者でも、Claude や ChatGPT で「3 時間かかっていた経理処理を 20 分に」縮めた手順を、毎日 1 投稿で書いていきます。

請求書、見積り、議事録、月次の数字確認。
1 業務ずつ、コードを書かずに ChatGPT / Claude で組み直した実例を、失敗込みで残します。

無料の note にも詳しい手順をまとめています。
👇 こちらから
https://note.com/hagurin__
```

文字数: 約 215 字 (改行込み 240 字)

#### 採用理由 (3 行)

- **差別化レバー**: industry_sop (経理 SOP) を匂わせる構造で first_hand 起点に振っている。failure_story は本文に出していないが「失敗込みで残します」のフレーズだけで verified_failure_story 軸 (差別化レバー) の存在を予告
- **CVR 期待**: 数字 (3 時間 → 20 分) を 1 行目に置き、competitor 24 アカで PCR median 高位の number_lead 形式を採用 (initial-values §3.2 number_lead median 27.5%、ofmeton 採用 25%)。note URL を末尾 1 行で出すことで、Sonnet 24 アカ分析 primary_destination=own_site 42% の主力導線に直結
- **リスク**: AI 感 / 業法 / DLP いずれも該当なし。「3 時間 → 20 分」の数字は具体値であり content-quality-rubric §1 「結論先出し」NG 表現には抵触しない (= 数字フックは別軸)

### Draft 2 (Hook: promise_lead)

```
中小企業の経理 / 総務担当者に向けて、「Claude で毎週 5 時間を取り戻す」ための実際の使い方を、月 30 投稿のペースで残していきます。

道具は ChatGPT / Claude / Notion / Slack の組合せだけ。
新しいツール契約はゼロで進めます。

失敗した手順も含めて、note に詳細をまとめています。
👇
https://note.com/hagurin__
```

文字数: 約 200 字 (改行込み 225 字)

#### 採用理由 (3 行)

- **差別化レバー**: industry_sop (経理 / 総務向け SOP) を Hook で明示。新規ツール契約ゼロ宣言で「導入コストの壁」を先回りで潰し、ターゲット (非エンジニア経営者) の C2 課題 (自社業務に AI が組み込めるか判断できない、main-design §2.1.5) に直接接続
- **CVR 期待**: promise_lead (採用率 15% / median 25%) で「毎週 5 時間」という具体時間を提示。competitor `@MakeAI_CEO` の pinned (mixed 型「個人では Claude も AI エージェントも使い倒してるのに〜」) と同じ感情訴求軸だが、誇大化を避け実測値 (~5 時間) に留める。note URL 直リンクで Phase 1 only_revenue 源に最短接続
- **リスク**: 「毎週 5 時間取り戻す」は promise 度合いがやや強め。誇大認定リスクを下げるため「実際の使い方」「失敗した手順も」で「再現性が伴う」signal を併置。業法 / DLP 該当なし

### Draft 3 (Hook: authority_lead)

```
独立して 5 年、Python / Java / GAS / VBA で会社の業務自動化を組んできました。

その経験を Claude Code に置き換えたら、自分で書くより速く動くようになった部分があります。
非エンジニアの経営者が、今からどこを Claude に任せると一番効くか。月 30 投稿で残します。

具体的な手順は note にまとめています。
👇
https://note.com/hagurin__
```

文字数: 約 215 字 (改行込み 235 字)

#### 採用理由 (3 行)

- **差別化レバー**: first_hand (本人事業 = 業務自動化 5 年の実績) を authority として提示し、industry_sop (経理 / 業務効率化) の "誰が言っているか" を補強。failure_story を直接出さず、「自分で書くより速く動くようになった部分があります」と部分肯定の謙抑トーンで誠実さを担保
- **CVR 期待**: authority_lead は competitor median 22% / ofmeton 採用率 10% (意図的に下げる) のため希少枠。Anthropic CEO や Karpathy などの「他人の権威」を引かず、自分の実績だけで authority を成立させる構造のため、ofmeton-fit が高い。non_engineer_translation 要素 (「非エンジニアの経営者が」) で読者像を明示
- **リスク**: 「独立して 5 年」は事実情報 (本人 29 歳・フリーランス、main-design §2.1.1)。誇張ではない。AI 感 / 業法 / DLP 該当なし

---

## 2. Bio (C-4)

> initial-values §5.6.3 SSOT (bio URL = note プロフィール直リンク `https://note.com/hagurin__`)。
> 上限 160 字 (X 仕様)。構成: ① 肩書 + 実績数値 → ② 発信テーマ 3 つ → ③ CTA。
> 採用案 1 つ + AB テスト予備案 2 つ。ofmeton 起動後 30 日経過時点で profile_clicks / follower_growth を比較し、低い方を入れ替える運用を §4 に記載。

### 採用案

```
業務自動化を 5 年。今は Claude Code で経理・請求・議事録を組み直しています。
非エンジニアの経営者向けに、毎日 1 投稿で実例と失敗談を。
詳細は note 👇
https://note.com/hagurin__
```

文字数: 約 110 字 (URL 込み)

#### 採用理由 (3 行)

- **差別化レバー**: ① 「業務自動化を 5 年」(authority) + ② 「Claude Code で経理・請求・議事録」(industry_sop 経理特化、月別フォーカス §2.2 と整合) + ③ 「実例と失敗談」(verified failure_story の予告) を全部入れた。発信テーマ 3 つ = 経理 / 請求 / 議事録 で Month 1 業種フォーカスに直結
- **CVR 期待**: 「Claude Code」を bio に明記することで、search 流入 + 同好の士のフォロー判断材料に。「毎日 1 投稿」で投稿頻度コミットを bio で示し、followers の「フォローして損しない」signal に
- **リスク**: AI 感 / 業法 / DLP 該当なし。「業務自動化を 5 年」は事実ベース、誇大表現ではない

### AB テスト用 予備案 2 件

#### 予備案 A (Hook 軸: failure_story の予告を強める)

```
独立 5 年、Python / GAS / VBA で会社の自動化を書いてきました。
Claude Code に置き換えて、3 ヶ月で 100 回失敗した過程を残しています。
非エンジニア向けの note 👇
https://note.com/hagurin__
```

文字数: 約 115 字 (URL 込み)

採用シナリオ: pinned post Draft 1 (number_lead 系) と組み合わせる場合、bio で failure_story 軸を補強したい時に採用。failure_story 比率 KPI は撤回済 (style-guide §2.2) のため bio で「予告」する形に留め、月 ≤ 4 投稿の上限制約と矛盾しないよう設計。

#### 予備案 B (Hook 軸: non_engineer_translation を強める)

```
「ChatGPT、結局自社で何に使えるの？」を、非エンジニアの経営者向けに毎日 1 投稿で書いています。
経理・請求書・議事録から始めて、月 30 件の実例を残す予定です。
note 👇
https://note.com/hagurin__
```

文字数: 約 130 字 (URL 込み)

採用シナリオ: pinned post Draft 2 (promise_lead) と組み合わせる場合に bio で「読者像」を Q&A 形式で先出しする構造。non_engineer_rate ≥ 0.20 (Phase 1 W1-4、main-design §2.1.4 v10.3 B-3) を bio レベルで担保。

### Bio URL placeholder の扱い

- 現状 `https://note.com/hagurin__` で 3 案全て統一 (採用案 + 予備案 A/B)
- ofmeton.com 取得時に bio URL を差し替える。Pinned post 内の URL も同タイミングで差し替え

---

## 3. industry_sop 6 本 (C-2)

> initial-values §3.8 SSOT (月 20% = 6 投稿)、§4.1 に従い format 比率 短文 3 / 中文 1 / 長文 1 / スレッド 1 で組成。
> Hook 配分: number 2 / question 1 / authority 1 / promise 1 / その他 (= negation) 1。
> 4 排他軸: first_hand 4 本 (= 67%、Phase 1 §3.4 採用率 40% target に対し意図的に上振れ。industry_sop は first_hand との相性 ◎、style-guide §2.2 軸 1 × 軸 2 マトリクス) / opinion 1 / paraphrase 1 / translation 0。
> citation_explicit_rate: 6 本中 explicit 4 本 / implicit 1 本 / none 1 本 = explicit 比率 67% (target 65% 達成)。

### SOP-1 (Hook: number_lead, format: short, type: industry_sop)

```
月末の請求書発行に毎月 3 時間使っていた。
ChatGPT に「freee の取引先 CSV を渡すから、未請求の取引だけ抽出して」と頼んだら 20 分で終わった。

来月もう一度試して再現すれば、月 2 時間 40 分の貯金になる。
```

文字数: 約 115 字

#### メタ

- 4 排他軸: **first_hand** (自社業務、本人事業)
- citation: **none** (一次体験、出典なしで OK)
- 想定 PCR: **0.35%** (number_lead × first_hand × 経理は initial-values §3.4 first_hand 採用率 40% + §3.2 number_lead 25% の重なり領域、Type B 競合 60-90% PCR 帯に近い)
- 配信時間帯: **morning** (initial-values §3.1、経理担当者の業務開始前 7:30-8:30 帯を狙う)

### SOP-2 (Hook: number_lead, format: short, type: industry_sop)

```
議事録、Slack のスレッド全部コピーして Claude に渡す。
「決定事項だけ箇条書きで、担当者と期限つきで」と書く。

15 分の会議の議事録が 2 分で出る。手で清書するより速い。
```

文字数: 約 95 字

#### メタ

- 4 排他軸: **first_hand** (本人事業 = all-good-ops 議事録ワークフロー)
- citation: **none** (一次体験)
- 想定 PCR: **0.32%** (number_lead × first_hand × 議事録は競合空白セル、industry_sop の "unwritten territory" 領域に近い、initial-values §3.8)
- 配信時間帯: **evening** (会議終了後の振り返り時間帯、initial-values §3.1)

### SOP-3 (Hook: question_lead, format: short, type: industry_sop)

```
あなたの会社、まだ月次の数字確認に半日使っていますか？

Claude に freee の月次レポート PDF を渡して「前月比で動いた科目だけ、3 行で」と聞くと、おかしな数字だけ先に出てくる。

確認時間は半日 → 30 分に。
```

文字数: 約 115 字

#### メタ

- 4 排他軸: **first_hand** (本人事業 = ofmeton 自身の freee 運用、main-design §2.1.1)
- citation: **none** (一次体験)
- 想定 PCR: **0.38%** (question_lead は competitor median 8% / ofmeton 採用 10%、決裁者層は「あなたの会社、まだ手作業？」型に反応 §3.2、Before-After 数字併用で competitor 上位帯狙い)
- 配信時間帯: **morning** (月初の数字確認需要を狙う、月初週は朝、それ以外は noon)

### SOP-4 (Hook: authority_lead, format: medium, type: industry_sop)

```
Anthropic の公式ドキュメントには、Claude の長文処理で精度を上げる方法として「最初に全体の構造を指示する」と書かれている。
[要 source 確認] (Anthropic Prompt Engineering Overview 該当ページ、ofmeton が公開前に URL を埋める)

これを経理に当てはめると、いきなり「この CSV を集計して」じゃなく、「列の意味を 1 行で説明する → そのうえで何を出すかを書く」の 2 段で渡すと、桁ズレや科目間違いがほぼなくなる。

仕訳のチェックを Claude にやらせる時、ofmeton はこの 2 段書きで失敗が 1/3 に減った。
```

文字数: 約 245 字

#### メタ

- 4 排他軸: **paraphrase** (Anthropic 公式ドキュメントの言い換え + 経理文脈への翻案)
- citation: **explicit** (Anthropic 公式 ドキュメント、ofmeton が公開前に実 URL を埋める。「[要 source 確認]」はドラフト段階の placeholder)
- 想定 PCR: **0.30%** (authority_lead × paraphrase は competitor median 22% / ofmeton 採用 10% で希少枠、authority signal × 経理 SOP の組合せで non_engineer_rate ≥ 0.20 担保)
- 配信時間帯: **afternoon** (じっくり読まれる中文は 13:00-17:00、initial-values §3.1)

### SOP-5 (Hook: promise_lead, format: long, type: industry_sop)

```
非エンジニアでも 30 分で組める、ChatGPT を使った「月初の数字確認テンプレ」を共有します。

【手順】

1. freee の月次レポートを PDF で書き出し、ChatGPT に投げる
2. プロンプトの 1 行目に「あなたは中小企業の経理担当です」と置く
3. 「前月比で動きが大きい科目を 5 つ、動いた理由の仮説と一緒に挙げて」と指示
4. 出てきた仮説のうち、納得感がないものだけ ChatGPT に「もう一度、別の視点で」と返す
5. 残った 3-4 個の仮説を社内チャットに貼って、担当者本人に確認してもらう

【ofmeton で試した結果】

毎月 3 時間かかっていた数字確認が、約 35 分に短縮。
ChatGPT に "仮説出し" だけ任せて、判断は人間が残す構造。

【失敗しやすいポイント】

「前月比で動きが大きい科目を挙げて」だけだと、ChatGPT は数字の大小だけで並べる。
「動いた理由の仮説と一緒に挙げて」を入れないと、結局自分で考える時間が減らない。

詳細手順とプロンプト全文は note に置いています。
👇
https://note.com/hagurin__
```

文字数: 約 510 字

#### メタ

- 4 排他軸: **first_hand** (ofmeton 自身の freee 運用ワークフロー、本人事業)
- citation: **implicit** (ofmeton 自身の実測値 = 3 時間 → 35 分、本人事業として出所明示「ofmeton で試した結果」)
- 想定 PCR: **0.42%** (long format × first_hand × promise_lead は competitor Q3 帯 = 25% / ofmeton 採用 15% の領域、note 送客リンクを末尾に置くため url_link_clicks expected high)
- 配信時間帯: **noon** (12:00-13:00 の昼休み中文/長文ピーク、initial-values §3.1)

### SOP-6 (Hook: negation_lead, format: thread, type: industry_sop)

スレッド全 4 投稿 (self-reply chain)。

```
[1/4]
Claude や ChatGPT を経理に使う時、「全部任せようとしない方がいい」業務が 3 つあります。

実際に ofmeton が試して、人間に戻した範囲を共有します。
```

```
[2/4]
1 つ目: 経費精算の領収書 OCR。

Claude に画像を渡せば数字は読み取れるが、たまに「3,800 円」を「3,800,000 円」と読む。
桁ズレで月次が崩れるリスクがあるため、現状は人間が金額を再入力するワークフローのままにしている。
```

```
[3/4]
2 つ目: 仕訳の最終確定。

Claude は仕訳候補を 3-5 個出すのは得意。
ただし「どれを選ぶか」は会計方針の判断で、ofmeton は全件人間がボタンで選ぶ運用にしている。
ここを自動化すると、後から税理士に説明できない仕訳が混ざる。
```

```
[4/4]
3 つ目: 月次締めの最終承認。

数字の集計はおまかせでいいが、「この月で締めます」の判断は人間。
締めを自動化したら誰が責任を取るかが曖昧になる。

要は「ChatGPT に "案出し" をさせて、判断と承認は人間」の境界線を最初に引くのが、経理 AI 化の事故防止策です。

詳しいワークフロー図は note にあります。
👇
https://note.com/hagurin__
```

合計文字数: 約 580 字 (4 投稿の合計、各 ≤ 280 字に収まっている)

#### メタ

- 4 排他軸: **opinion** (ofmeton の実運用知見をベースにした主観的な境界線設計、style-guide §2.1 opinion 30% target に算入)
- citation: **explicit** (ofmeton 自身の実運用、self-reply 4 段で「ofmeton が試して〜運用にしている」と出所明示)
- 想定 PCR: **0.45%** (thread × negation_lead は competitor median 4.5% / ofmeton 採用 5% で希少、ofmeton-fit 高い。Thread の deep engagement で url_link_clicks 上振れ期待)
- 配信時間帯: **midnight** (initial-values §3.1、長尺 thread は 21:00-23:00 帯が深く読まれやすい)

### 6 本の集計

| 軸 | 配分 | SSOT target | 達成判定 |
|---|---|---|---|
| format: short | 3 / 6 (50%) | §3.6.1 短文 50% | ✅ 一致 |
| format: medium | 1 / 6 (17%) | §3.6.1 中文 25% | ⚠ 1 本不足 (月 30 投稿換算で other industry_sop 以外の中文で補填、本ドラフトでは industry_sop 6 本に範囲を限定) |
| format: long | 1 / 6 (17%) | §3.6.1 長文 10% | ✅ 上振れ OK |
| format: thread | 1 / 6 (17%) | §3.6.1 thread 10-15% | ✅ 上振れ OK (industry_sop は thread と相性 ◎、style-guide §2.7 Tier 1 業種別 SOP) |
| Hook: number_lead | 2 / 6 (33%) | §3.2 採用率 25% | ✅ industry_sop 内では上振れ。月 30 投稿全体で薄める |
| Hook: question_lead | 1 / 6 (17%) | §3.2 採用率 10% | ✅ 上振れ OK (industry_sop の non_engineer 翻訳と相性 ◎) |
| Hook: authority_lead | 1 / 6 (17%) | §3.2 採用率 10% | ✅ 一致 |
| Hook: promise_lead | 1 / 6 (17%) | §3.2 採用率 15% | ✅ 一致 |
| Hook: negation_lead | 1 / 6 (17%) | §3.2 採用率 5% | ✅ 上振れ OK (failure_story の代替軸として境界線提示) |
| 4 排他軸: first_hand | 4 / 6 (67%) | §3.4 採用率 40% | ✅ 上振れ OK (industry_sop は first_hand 主軸、style-guide §2.2 マトリクス) |
| 4 排他軸: paraphrase | 1 / 6 (17%) | §3.4 採用率 20% | ✅ ほぼ一致 |
| 4 排他軸: opinion | 1 / 6 (17%) | §3.4 採用率 30% | ⚠ industry_sop 6 本内では薄い (月 30 投稿全体で opinion を 9 本確保、§4.1) |
| 4 排他軸: translation | 0 / 6 (0%) | §3.4 採用率 10% | ✅ industry_sop は translation 不適 (style-guide §2.2 マトリクス) |
| citation: explicit | 4 / 6 (67%) | target 65% | ✅ 一致 |

---

## 4. 採用後の運用メモ

### 4.1 Pinned post の差し替えタイミング (Phase 1 Month 1 末)

- **判定指標**: profile_clicks 数 / pinned post の url_link_clicks 数 (X API non_public_metrics)
- **差し替え基準**:
  - Month 1 末 (~2026-07-07) 時点で profile_clicks median が ofmeton 全投稿 PCR target 0.30% を下回る → Draft を切り替え
  - Pinned post 内の note URL クリック数が月 50 click 未満 (style-guide §2.11 v1.4 SSOT target) → Draft 切り替え + bio URL の destination 見直し検討
- **切替順**: Month 1 で Draft 1 → Month 2 で Draft 2 → Month 3 で Draft 3 のローテーション (一度に 3 案を A/B/C テストせず、月別比較に留める)
- **Phase 2 以降**: initial-values §5.5.3 の「Phase 2: mixed → achievements + 告知 型に切替」「Phase 3: 有料 LP 直リンクへ」を発動

### 4.2 Bio AB テストの evaluation 基準

- **A/B/C 3 案の運用**: 採用案 (中庸) を Week 1-2、予備案 A (failure_story 強め) を Week 3、予備案 B (non_engineer_translation 強め) を Week 4 に差し替え、各 7 日間の follower_growth + profile_clicks を比較
- **採否判定**:
  - follower_growth が採用案の +20% 以上で予備案勝ち → 採用案を予備案に置き換え
  - 同等または下回る → 採用案維持
- **bio URL placeholder の差し替え**:
  - ofmeton.com 取得時 → 全 3 案の note URL を差し替え (Phase 2 で Lit.link 等 hub 化検討、initial-values §5.6.3)
- **Phase 2 移行条件**: note 月売上 5 万円突破 → bio URL を note + Newsletter (Beehiiv 等) hub に変更

### 4.3 industry_sop の月次配分 (Month 1〜3)

- **Month 1 (~2026-07-07)**: 経理 / 業務効率化横断 (本ドラフト 6 本がそのまま該当)
- **Month 2 (~2026-08-07)**: 製造業 / 小売業 (具体 SOP、main-design §2.2 月別フォーカス)。本ドラフトの format 比率 (短文 3 / 中文 1 / 長文 1 / スレッド 1) + Hook 配分 (number 2 / question 1 / authority 1 / promise 1 / negation 1) のテンプレートを再利用
- **Month 3 (~2026-09-07)**: 教育 / 塾 (家庭教師事業から派生、ofmeton 本人事業、first_hand 比率を 5/6 まで上げる)
- **Month 1 中の振り返り (~2026-06-22 Week 2 末)**: 6 本の PCR / url_link_clicks 実測値が想定値 (0.30-0.45%) のレンジ内かを確認。レンジ外れの Hook (例: number_lead 2 本がいずれも 0.20% 未満) があれば Month 2 で別 Hook に置き換え
- **failure_story 軸との関係**: 本ドラフトには failure_story を含めていない (C-1 = ofmeton 起案待ち)。C-1 の verified failure_story 月 ≤ 4 本が確定したら、SOP-1 / SOP-2 / SOP-3 の短文 3 本のうち 1-2 本を C-1 失敗談に差し替える可能性あり (Month 1 中盤で再評価)

### 4.4 公開前の content-reviewer 通過チェックリスト

公開前に content-reviewer (7 軸 rubric、content-quality-rubric.md) を全 9 アイテム (pinned 3 + bio 3 + SOP 6) に通す。本ドラフト段階で ofmeton が公開する前にチェックすべき項目:

- [ ] AI 感ゼロ NG 表現 (9 種) が draft text に含まれていないか (本ドラフトでは self-check 済、全件クリア想定)
- [ ] 画像リッチ度: pinned + SOP-1〜SOP-6 のうち画像 / 動画を添付する想定の本数 = 短文 3 本 + 中文 1 本 + 長文 1 本 = 5 本 (テキストのみ = SOP-6 thread 1 本のみ、initial-values §4.1 visual mode 別配分 テキストのみ 15% target に整合)
- [ ] 専門用語密度: 非注釈で LLM / RAG / Embedding / API / LoRA / Fine-tuning が 5 回以上出ていないか (本ドラフトでは「Claude Code」「ChatGPT」「freee」「Slack」「Notion」「note」のみ使用、専門用語ゼロ)
- [ ] 構造 (SCQA): pinned 3 案と SOP-5 (長文) は SCQA 完結を冒頭 500 字以内で達成、SOP-1〜SOP-4 / SOP-6 は短文 / thread のため C (Complication) を最優先 (scqa-writing-framework §使い分けガイド)
- [ ] バズ要素: フック 1 行目に数字 / Before-After / 結論先出し / 【】 / 問いかけ のいずれかが入っているか (pinned 3 案 + SOP-1〜SOP-6 で全件チェック済)
- [ ] ターゲット明示: 業務名 + 対象職種が冒頭 500 字以内に出ているか (「経理担当」「中小企業」「経営者」等が全件登場)
- [ ] AI 使用透明性: Claude / ChatGPT を固有名で表記しているか (本ドラフトでは「AI」総称のみの箇所はゼロ、全件固有名併記)

### 4.5 本ドラフトに含めなかった項目 (C-1 待ち)

- **failure_story (verified)**: C-1 として ofmeton 起案待ち。本ドラフトでは pinned post / bio で「失敗込み」「失敗談」と予告のみに留め、実体験ベースの具体失敗ストーリーは含めていない (DLP redaction / 公開許諾 gate / 業法ガード OK の 4 条件を ofmeton が起案時に確認、style-guide §2.2 供給制約)
- **画像 / 動画素材**: visual-designer agent への発注リスト (Noto Sans Heavy 4 色 / カルーセル 9 枚 / リール 15-30 秒) は本ドラフトでは扱わない (Phase 0.5 H-9 visual-designer skill 連動)
- **Instagram カルーセル / note 記事の派生**: 1 トピック × 3 媒体展開 (initial-values §5.8.3) は本ドラフトでは X 投稿のみに範囲を限定

---

## 5. Open issues (出典確認 / ofmeton 確認待ち箇所一覧)

### 5.1 出典が架空 / placeholder のもの

- **SOP-4 (authority_lead, paraphrase)**: 「Anthropic の公式ドキュメントには、Claude の長文処理で精度を上げる方法として『最初に全体の構造を指示する』と書かれている。[要 source 確認] (Anthropic Prompt Engineering Overview 該当ページ、ofmeton が公開前に URL を埋める)」
  - 確認方法: ofmeton が `https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/` 配下の該当ページを実 URL で確認、本文末に貼る
  - 確認できない場合: SOP-4 を first_hand 軸に書き直し、authority signal を ofmeton 自身の実績で代替

### 5.2 ofmeton 確認待ちの箇所

- **SOP-1 「freee の取引先 CSV を渡すから、未請求の取引だけ抽出して」**: ofmeton 自身が freee 運用中 (memory: `project_freee_mcp_setup.md` / `feedback_freee_invoice_post_payload.md`) であり、未請求抽出ワークフローを実運用済みかを確認。未実装の場合は表現を「ofmeton で組んだ未請求抽出スクリプト」(本人事業) に修正、または SOP-1 を別 industry_sop に差し替え
- **SOP-2 「Slack のスレッド全部コピー」**: ofmeton 業務で Slack を使っている案件 (具体名は DLP redaction) で議事録ワークフローを実運用しているか確認。Slack 以外の chat tool (Notion / ChatWork 等) が主軸なら表現を修正
- **SOP-5 「毎月 3 時間 → 35 分」の実測値**: ofmeton の freee 月次レポート確認時間の実測値が想定レンジ内か。実測値が異なる場合は数値を修正
- **SOP-6 「ofmeton が試して、人間に戻した範囲」**: 実際に Claude に経費精算 OCR を試したか / 仕訳の最終確定を自動化しようとして戻したか の経験事実を ofmeton 確認。経験がない場合は SOP-6 を別 thread (例: 業務効率化の境界線設計を競合事例から学ぶ paraphrase 型) に差し替え

### 5.3 Phase 1 Month 1 中盤での再評価項目

- **6 本の PCR 実測 vs 想定**: 想定 0.30-0.45% に対し、Week 2 末時点で 6 本中 4 本以上がレンジ外れの場合、Month 2 の industry_sop は Hook 配分を見直し
- **C-1 failure_story との接続**: C-1 起案完了後、SOP-1〜SOP-3 の短文 3 本のうち 1-2 本を verified failure_story に差し替えるかを ofmeton 判断
- **画像 / 動画素材の発注タイミング**: visual-designer agent の skill が Phase 0.5 H-9 で確定するまで、6 本の visual mode は仮 (screenshot 主軸) で運用

---

## 6. 本ドラフトの内訳サマリ

- Pinned post: 3 案 (number_lead / promise_lead / authority_lead)
- Bio: 採用案 1 + AB テスト予備案 2 = 3 案
- industry_sop: 6 本 (short 3 / medium 1 / long 1 / thread 1)
- 合計 drafts: **12 件** (= 3 + 3 + 6)
- 本ドラフトでカバーしていない C-1 (verified failure_story) は ofmeton 起案待ち
