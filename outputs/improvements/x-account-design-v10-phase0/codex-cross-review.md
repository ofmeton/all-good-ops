# v10.1 Codex MCP クロスレビュー (2026-05-25)

> 対象: `x-account-design-v10-1.md`、`competitor-report.md`、`self-review-v10-1.md` を全読した上で評価。
> v10.1 が継承参照する `x-account-design-v10.md` の該当節と、根拠データ・検証記録も必要範囲で確認した。
> 方針: Claude セルフレビューの再掲ではなく、実装・測定・プラットフォーム・データ責任の盲点を優先する。
> 外部仕様は 2026-05-25 時点で確認可能な公式情報を根拠にした。法的結論ではなく設計レビューである。
## 0. Executive Summary

1. **Phase 0 の表現集計は「刺さる Hook」の根拠になっていない。**
   `competitor-report.md` は結論先出し 33% と数字 42% を足して 75% の hit と扱うが、分類は重複可能で、Hook 別成果集計もない。ここから配分を固定するのは測定設計の誤りである。

2. **月額 ¥5,504-5,704 は主要生成処理を含まない可能性が高い。**
   MA ¥357 は Interviewer 60 回と Optimizer 4 回のみの試算で、Writer / Editor / Hook Analyzer の月間投稿生成・判定が明示的に計上されていない。Opus 実測も extended thinking 無効である。

3. **X 規約対処に反する「バックアップアカウント」が残っている。**
   公式 Automation Rules は同一アカウント内および複数アカウント間の同一・実質類似投稿を禁止し、同じ用途の自動化複数アカウントも禁じる。ban 保険アカウントは削除すべきである。

4. **OAuth / 投稿許諾は Phase 1 の開始条件になっていない。**
   X の PKCE は `offline.access` scope がなければ refresh token が出ない。設計は「月次 refresh」とだけ記し、scope、暗号化保管、refresh failure 時の停止条件がない。

5. **素材が案件メモ・音声メモ・Claude Code 履歴なのに、個人情報と秘密保持の設計がない。**
   投稿生成前に、顧客名・従業員情報・契約条件・認証情報を Anthropic / OpenAI / Supabase / 公開媒体へ流す危険がある。景表法・業法以前のブロッカーである。

6. **「業種横断翻訳者」は競争仮説であり、検証済みポジションではない。**
   handle を発見できなかった領域を空白市場とみなし、税理士領域の既存競合には横断で棲み分けるとしているが、買い手インタビューも問い合わせ比較もない。

7. **v10.1 は new main を名乗るが実装可能な単独仕様ではない。**
   MA、PSM、Optimizer、X / Meta 規約、OAuth を旧 v10 参照に委ねた結果、`6+2` と `6+4` など差分適用ミスを実装時に生む。v10.2 は全文統合版にすべきである。

8. **自動改善が「売上」より先に文章表面を最適化する。**
   PCR はプロフィールクリックであり、月 ¥260,000 の生活費確保や有償相談成約の代理として弱い。Style Guide 自動更新は、問い合わせ品質・成約・提供能力の計測後に限定すべきである。
## 1. コスト試算の現実性
### 独立指摘 1-1: MA ¥357 は「全 MA」月額ではない

- `x-account-design-v10-1.md` §3.3 は Managed Agents を月 ¥357 と置く。
- 根拠 `B3-ma-cost-result.md` の再算定対象は Interviewer 60 回と Optimizer Phase 2 週 1 回だけである。
- しかしアーキテクチャ上は Writer、Visualizer 制御、Hook Analyzer、Editor も生成・判定レイヤーで稼働する。
- X だけでも週 31 投稿相当、IG 1 本/日、note 4-6 本/月があり、draft / edit / retry / reject 再生成の LLM token が未積算である。
- 例として Sonnet の出力が投稿派生 240 件/月 x 3,000 output tokens なら、公式 $15/MTok の output だけで `$10.80 = 約 ¥1,685` となり、MA 表の 4.7 倍である。入力・再生成は別途である。

**修正案**:
- `cost_model.csv` 相当の workload 表を作り、agent 別に `runs/month`, `input_tokens`, `output_tokens`, `retry_rate`, `tool_calls`, `runtime` を積み上げる。
- Phase 1 の予算判定は low / expected / p95 の 3 本で行い、p95 が ¥10,000 を超えるなら投稿本数を先に抑える。

### 独立指摘 1-2: Opus weekly の測定条件が本番仕様と違う

- v10 継承 §4.8 は Opus 4.7 の `extended thinking` による weekly 仮説検証を前提とする。
- B-3 実測は明示的に extended thinking **無効** の 1.3 分実行で `$0.353` だった。
- B-3 自身が thinking 有効化で 2-5 倍を上方リスクとして残している。
- したがって Optimizer 部分だけで `¥219/月` ではなく、同じ頻度で概算 `¥438-1,095/月` を予算シナリオに置くべきである。

**修正案**:
- 本番 prompt、対象 1 週分データ、thinking 設定を固定した 4 回分の dry-run 後まで「Opus weekly 自動運用」を開始しない。

### 独立指摘 1-3: 画像費用は画質 mix が未定義

- OpenAI 公式 Pricing は `gpt-image-2` image output を `$30/MTok` と表示する。
- 公式 image guide の 1024x1024 token 数では low 272 tokens、medium 1,056 tokens、high 4,160 tokens である。
- 出力部分のみで low は `$0.00816/枚`、medium は `$0.03168/枚`、high は `$0.1248/枚` となる。
- 月 150 枚すべて low でも約 `$1.22 = ¥191`、すべて medium なら約 `$4.75 = ¥741`、high なら約 `$18.72 = ¥2,920` であり、入力 token と edit 用参照画像はさらに増える。
- v10.1 の ¥300-500 は「low 中心」の比率・リトライ・edit 率がないため再現不能である。

**修正案**:
- Phase 1 は `low 120枚 / medium 30枚 / high 0枚 / edit 0枚` のように上限を設定し、medium 以上は承認対象にする。
- Instagram 品質テストまでは月 30 枚に限定し、X 用画像を一律生成しない。

### 独立指摘 1-4: X API 単価は設計時点で証拠がない

- 継承元 B-2 自身が URL 付き `$0.200/req` の課金実体を「要追検」として残している。
- 公式 X 公開ページでは pay-per-usage の存在は確認できるが、レビュー時に公開取得できた本文から URL 有無別の単価までは確認できなかった。
- 未検証の単価が X 月額 ¥1,287 の大半を決めている。

**修正案**:
- Developer Console の購入画面または請求 export を Phase 1 gate の証跡にし、1 URL 投稿 + 1 URL 無し投稿 + analytics read の実請求で再算定する。

### セルフレビュー一致点 (短く)
- 人間承認 8 時間/月はセルフレビュー D-2 / R-11 と一致する。
- 本節の主指摘は、承認時間ではなく生成・画像・本番 Opus・X 単価の予算欠落である。

## 2. MA (Managed Agents) ベータ依存リスク

### 独立指摘 2-1: fallback の契約が薄すぎる

- v10 §3.4 の `AgentRunner.run_task(input) -> {artifact, cost, trace_id, retryable, confidence}` は返り値形式であって、移植可能性の保証ではない。
- MA session は state、archive、runtime billing、内部 cache を持つ一方、Messages API fallback では session resume、tool permission、idempotent side effect、途中成果物 checkpoint を別途実装する必要がある。
- 投稿処理では「生成は成功したが API 投稿結果を受け取れない」場合の重複投稿防止が最重要で、単なる `idempotency key` 記述では不足する。

**修正案**:
- AgentRunner の対象を生成系だけに限定し、投稿 side effect は別 `Publisher` が `draft_id + platform + scheduled_at` の一意制約で管理する。
- MA 停止時に Messages API で必ず完走できる smoke test を Writer と Editor の各 1 経路で CI 化する。

### 独立指摘 2-2: ベータ撤退時の復旧時間目標がない

- 「fallback がある」だけでは、発信中断が 1 時間なのか 2 週間なのか分からない。
- ofmeton は生活費確保が目標であり、販売導線停止は機能不具合ではなく事業リスクである。

**修正案**:
- RTO を `X scheduled drafts は 24 時間以内に手動投稿継続、LLM 生成は 72 時間以内に fallback 稼働` と定める。
- MA API header / model / pricing / archive behavior の変更検知を週次ではなく deploy 前 contract test とする。

### 独立指摘 2-3: Anthropic 中心の構造変更判定に自己強化バイアスがある

- 同じベンダの MA が生成し、同じ Claude Opus が「MA を含む骨組みは妥当か」を weekly 評価する。
- プロバイダ障害、価格変更、特定モデル癖の影響は、自己レビューだけでは過小評価されやすい。

**修正案**:
- 月次の構造レビュー入力に、費用 ledger、障害履歴、手動差戻し率、別モデルによる blinded 判定を含める。
- プロバイダ切替は Opus が提案する対象ではなく、人間の四半期決定事項とする。

### セルフレビュー一致点 (短く)
- セルフレビューは AgentRunner の実装詳細を掘っていない。v10 の E-10 / E-11 は問いとして残るだけであり、上記は解消策である。

## 3. X / Meta 規約と OAuth の現状

### 独立指摘 3-1: 「公式 API + 5 投稿/日」は安全判定ではない

- X Automation Rules は、自動投稿の本数に一律安全枠を示すのではなく、spam、同一または実質類似投稿、誤認リンク、重複アカウントを禁止する。
- v10.1 の 17:00 元投稿を 17:30 と 21:00 に引用 RT + 補足する固定構造は、生成が薄い場合に「substantially similar」な自動反復として評価される余地がある。
- `cos 類似度` が直近 2 週だけを見る構成では、当日 3 投稿の意味的反復チェックが保証されない。

**修正案**:
- 投稿前に当日導線チェーンの全本文をまとめて比較し、同一 CTA / 同一 claim / 同一 link の再掲は 1 日 1 回までにする。
- 1 日 5 本を規約安全性ではなく実験上限と表現し、警告・削除・reach 急落時は投稿本数を自動的に 1 本/日に下げる。

### 独立指摘 3-2: バックアップアカウント方針は削除必須

- v10 §10.3 は ban 時の保険としてバックアップアカウントを用意する。
- X 公式 rules は「duplicative or substantially similar use cases」の複数自動化アカウントを禁止する。
- ban 後に同じ発信をバックアップで継続する設計は、規約回避として説明不能である。

**修正案**:
- 保険はアカウントではなく、note のメール購読・所有ドメイン・顧客同意済み連絡先に置き換える。
- X 障害時は自動投稿停止と appeal / 人手確認を定める。

### 独立指摘 3-3: X token refresh は scope と障害処理が欠落

- X 公式 OAuth 2.0 PKCE 文書は、`offline.access` scope を指定した場合のみ refresh token が発行されると記す。
- X の OAuth 2.0 access token は公式 tutorial 上 2 時間有効であり、「月次 refresh」では投稿ジョブを維持できない。
- `tweet.read`, `tweet.write`, `users.read`, `offline.access` の最小 scope、refresh token の暗号化保存、refresh rotation、再認可時の停止動作が必要である。

**修正案**:
- Phase 1 前に実機で token 取得、2 回連続 refresh、失効時停止、`non_public_metrics` read を検証する。
- refresh 失敗時は投稿も analytics も retry 連打せず、`auth_blocked` として人間へ通知する。

### 独立指摘 3-4: Meta は「Graph API」と書くだけでは実装承認にならない

- 設計には IG の app review、publish permission、プロアカウント条件、token lifecycle、公開前審査の gate がない。
- Meta / Instagram の公式規約は、明示的許諾なしの自動アクセス・収集を禁じる。API 経路で必要な許諾を得た範囲だけが安全である。

**修正案**:
- Phase 1 を `X launch` と `IG launch` に分離し、IG は publish permission と token refresh の実機確認後のみ開始する。

### 参照した公式情報
- 料金: https://developers.openai.com/api/docs/pricing / https://platform.claude.com/docs/en/about-claude/pricing
- X Automation Rules: https://help.x.com/en/rules-and-policies/x-automation
- X OAuth 2.0 PKCE: https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- Instagram Terms of Use: https://www.facebook.com/help/instagram/581066165581870

### セルフレビュー一致点 (短く)
- 業法はセルフレビュー F-2 の既出論点である。本節の独立指摘は X の禁止事項、PKCE 実装条件、Meta launch gate である。

## 4. Phase 1 の「1 投稿/日 人間承認」運用継続性

### 独立指摘 4-1: 慣らし運用のデータでは full-auto 判定ができない

- v10.1 §8 は Week 1-2 に人間承認つき X 1 本/日、つまり最大 14 投稿で開始する。
- 一方、切替判定は 5 投稿/日を前提に PCR 3 週連続や Hook 類型特定を要求する。
- 14 投稿では Hook、時間帯、URL、業種、フォーマットのいずれも分離できず、自動投稿移行の根拠にならない。

**修正案**:
- Month 1 の目的を成果最適化ではなく `承認 SLA / factual error / policy reject / 素材供給数` の運用検証に限定する。
- 自動投稿許可は、PCR ではなく `重大誤り 0件 / 規約差戻し 0件 / 承認滞留 p95 < 24h / token refresh 正常` を 4 週満たした後にする。

### 独立指摘 4-2: ADHD/ASD 配慮を「まとめ承認」に寄せるだけでは危険

- まとめ作業は開始障壁を減らせる一方、未承認 draft の山を生み、締切前に一括判断を迫る。
- 売上導線の投稿では数字・顧客秘匿・業法・リンク確認が必要であり、疲労時の batch approval はリスクを上げる。

**修正案**:
- 承認画面を `数字あり / 顧客由来 / 資格業ワード / 有料導線` の高リスクと、それ以外に分ける。
- 高リスクは 1 件ずつ承認、低リスクだけ週次 batch にする。未承認は投稿せず期限切れにする。

### セルフレビュー一致点 (短く)
- 月 8 時間負担、まとめ承認案は R-11 と一致する。
- 独立追加は「PCR で自動化を解禁しない」「リスク別承認」を gate にする点である。

## 5. 業種特化勢との競合構造

### 独立指摘 5-1: 横断は差別化ではなく販売上の不利にもなる

- 小規模事業者や士業が買うのは「同業の帳票・責任・例外まで理解した自動化」であり、複数業種の発信量そのものではない。
- 税理士月に見込み客を獲得しても、翌月から社労士投稿が続くとフォロー理由と相談導線が弱くなる。
- 畠山氏に対して「広さ」で棲み分けるだけでは、深い実績証拠を要する購入段階で負ける。

**修正案**:
- 業種ではなく反復可能な job-to-be-done を一つ選ぶ。例: `証憑回収 -> 転記 -> 確認依頼` のような非資格業務を複数業種に横展開する。
- 月別テーマは業種交替ではなく、同一業務課題の税理士版 / 店舗版 / 教室版という証拠の積み上げにする。

### 独立指摘 5-2: 「見つからない = 空白市場」は無効

- Phase 0 Report §3.3 は WebSearch で handle を特定できなかった領域を空白として扱う。
- これは競合不在ではなく、検索語・媒体・匿名運用・コミュニティ内販売を観測できていない可能性を表す。

**修正案**:
- 発信者探索より先に、非エンジニア経営者 5-10 人への課題インタビューと、既に購入している支援サービスの把握を実施する。
- 「業種横断を継続する条件」は PCR ではなく、同一課題の相談が 2 業種以上から合計 3 件発生することとする。

### セルフレビュー一致点 (短く)
- 競合の深さに負ける懸念は R-12 と一致する。
- 本節では競争軸を「業種の広さ」から「非資格業務の再利用可能な解決」に置き換えることを提案する。

## 6. note 競合の差別化漏れ

### 独立指摘 6-1: タイトル発見だけで差別化を設計している

- Phase 0 Report §7 は note 補完 8 アカについて URL 確認のみで、記事数、価格、本文、購入導線、コメント、販売実績を未取得と明記する。
- その状態で「業種横断 x 数字 ROI x 非エンジニア x 失敗談」が差分になるとは証明できない。
- 既存競合が本文や有料部分で既に同じ要素を扱っている可能性を排除していない。

**修正案**:
- Phase 1 の paid note 投入前に、競合の無料記事上位 20 本を `課題 / 成果証拠 / 配布物 / CTA / 購入価格` でコード化する。
- paid 内容を買って確認しないなら、「未観測の有料部分との差別化は主張しない」を明記する。

### 独立指摘 6-2: note をリード主導線にするには取得できる conversion が不足

- X の `url_link_clicks` は note 訪問までで、購入または個別相談成約を示さない。
- note 売上目標 ¥30,000 と X PCR の間に、UTM、商品別 purchase、相談フォーム、lead source の設計がない。

**修正案**:
- note 商品ごとに専用 CTA と相談フォーム識別子を用意し、`paid_article_purchase`, `consultation_request`, `qualified_lead` を KPI に加える。

### セルフレビュー一致点 (短く)
- note の構成重複懸念は R-13 と一致する。本節は競合観測が本文・販売成果を欠くことを指摘する。

## 7. Hook 13 類型の心理学的妥当性

### 独立指摘 7-1: 分類器が重複カテゴリを独立比率として扱う

- `analyze_50items.py` の Hook 判定は、一つの投稿について全ルールを走査し、複数ラベルを同時に加算する。
- 「30分 -> 3分。最初は失敗しました」は数字、Before-After、経験談、結論先出しを同時に取りうる。
- それにもかかわらず report は `33% + 42% = 75%` と残りカテゴリとの配分のように説明している。
- これは心理カテゴリの独立性以前に、集計の分母・排他性が崩れている。

**修正案**:
- Hook を `primary_hook` 1 つと `devices` 複数に分割する。primary は人手ラベル 100 件で分類精度を検証する。
- Phase 1 配分は primary のみで制御し、数字や共感は修辞 device として別に記録する。

### 独立指摘 7-2: 日本語対象への転用根拠が競合頻度だけ

- 頻繁に使われる表現が、非エンジニア経営者に信頼される表現とは限らない。
- 「数字インパクト」「逆張り」はクリックを増やしても、士業・経営者向けの信頼と購入意向を毀損しうる。

**修正案**:
- 初月は投稿成果に加えて 5 名の対象読者に `信頼できる / 売り込み感 / 自社相談したい` の 3 評価を取る。

### セルフレビュー一致点 (短く)
- 未使用類型の検証コストは R-14 と一致する。
- 本節の新規論点は「13 類型が排他的でないため、比率制御自体が成立しない」ことである。

## 8. Phase 0 から Phase 1 のメトリクスゲート

### 独立指摘 8-1: PCR 閾値に denominator と business outcome がない

- `PCR = profile clicks / impressions` であり、低表示数の 1 click による跳ねを受ける。
- `PCR >= 0.3-0.5%` を採用しても、プロフィールから note、note から購入、購入から相談・代行受注に進むかは未計測である。
- 月生活費 ¥260,000 が目的なのに、Phase 1 KPI はフォロワーと note 月 ¥30,000 で、成約までの容量計画がない。

**修正案**:
- PCR gate は最低 impressions を伴わせる。例: `直近28日 impressions >= 20,000 かつ profile clicks >= 60`。
- auto-post gate と事業 gate を分け、後者は `qualified consultation >= 3/月` または `paid revenue` で判断する。

### 独立指摘 8-2: 複数比較で偽陽性が増える

- Hook、format、時間、媒体、導線、画像 mode、業種を週次に横断して最良候補を探すと比較数が増える。
- 月 30-150 件のデータで Mann-Whitney / Kruskal-Wallis を多数回使うと「偶然の勝ち」を Style Guide に反映しやすい。

**修正案**:
- Phase 1 の変更可能変数は一度に一つまでとし、事前登録した 2 群比較だけを行う。
- 週次は記述統計、設定反映は 28 日窓 + 人間承認とする。

### セルフレビュー一致点 (短く)
- PCR 条件の AND 明示は C-4 と重なる。本節では impressions 下限、成約 KPI、複数比較制御を追加する。

## 9. Style Guide v1 の数値妥当性

### 独立指摘 9-1: 文字数の定義が重複している

- Style Guide は `short: 100-280字` と `medium: 141-280字` を同時に定義するため、141-280 字の投稿は両方に入る。
- v10.1 本文 §4.3.2 は短文を `<=140`、中文を `141-280` としており、SSOT と本文が矛盾する。

**修正案**:
- `short: 1-140`, `medium: 141-280`, `long: 281-1000` に統一し、生成と分析で同一 schema を使う。

### 独立指摘 9-2: 競合平均は生成制約に変換できない

- 敬体、括弧、絵文字、改行密度の数値は競合のスタイル分布であって、ofmeton の購入者反応や信頼性との関係を示さない。
- とくに敬体検出は「です」「ます」が一度でも含まれる投稿率であり、文章中の敬体比率ではない。
- `keigo_rate: 0.40-0.55` を Writer が実現しても、元指標との比較が成立しない。

**修正案**:
- v1 は「禁止・許可の定性ガイド + 文字数上限」だけに縮退し、敬体等は観測タグとして保持する。
- 数値制約への昇格は自アカの信頼評価または conversion との関係を確認した後にする。

### 独立指摘 9-3: report の標本は均質でない

- `analysis-50items.json` では own posts が `ai_jitan=6`、`umiyuki_ai=93` で大きく異なる。
- 観測期間も 1 日から 71 日までばらつき、「投稿頻度中央値 4.7 件/日」を初期頻度にする根拠が弱い。

**修正案**:
- 競合比較は同じ観測窓と最低投稿数で再抽出するか、アカウント単位ではなく対象読者が近い 3-5 アカに絞る。

### セルフレビュー一致点 (短く)

- 敬体率を上げるべきかという B-1 の議論より前に、測定定義と生成制約の一致を直す必要がある。

## 10. 業法・景表法・ステマ以外の法務リスク

### 独立指摘 10-1: 個人情報保護法と顧客秘密情報

- 素材源に案件メモ、音声メモ、Claude Code 履歴が含まれ、顧客担当者名、メール、業務ログ、契約額、従業員情報が入りうる。
- 個人情報保護委員会の生成 AI 注意喚起は、個人情報を含む prompt は特定した利用目的の必要範囲内であることを確認するよう求めている。
- 投稿ネタ化・embedding 化・外部 API 送信は、案件遂行目的とは別目的になりうる。

**修正案**:
- ingest 前に `pii`, `client_confidential`, `publication_consent`, `purpose` を必須属性とし、同意なし案件素材は投稿 pool へ入れない。
- 氏名、社名、ID、金額、画面、ログを redaction する DLP gate を Editor より前に置く。

### 独立指摘 10-2: Anthropic / OpenAI API への送信と retention

- Anthropic 公式 privacy center は標準 API 入出力を原則 30 日以内に削除すると説明するが、ZDR は別契約であり、beta 製品に適用されない場合がある。
- OpenAI 公式 API data usage policy も、適格な例外を除き API input/output を最大 30 日保持しうると説明する。
- 顧客秘密を投入するなら、「学習に使われない」だけでは足りず、保管・再利用・削除・委託先開示が必要である。

**修正案**:
- 顧客素材は初期 Phase では投入禁止、本人の事業運用ログだけを利用する。
- 将来投入する場合は同意文面、委託先一覧、retention、ZDR 可否、削除手順を明文化する。

### 独立指摘 10-3: note の特商法表示と取引責任

- note の公式表示は、クリエイターと購入者の取引契約について note が当事者ではなく、問い合わせ・苦情は当事者間で解決すると記す。
- note 規約はクリエイターが特商法その他法令に従った表示を行うことを求める。
- 有料 note、月額マガジン、個別相談、代行を階段化するなら、提供内容、価格、解約・返品、連絡方法の表示責任が ofmeton に生じる。

**修正案**:
- 販売開始前 gate に特商法表記、返金方針、個別相談の提供条件、問い合わせ対応時間を入れる。

### 独立指摘 10-4: note 公開コンテンツの機械学習提供設定

- note 規約は、プラットフォーム上のコンテンツ等を機械学習の学習データとして第三者に提供でき、クリエイターが有償提供を止める設定を行える旨を定める。
- 有料記事へ再利用可能な SOP や顧客由来の例を載せる設計なら、公開後の二次利用方針を無視できない。

**修正案**:
- note 発行 checklist に学習データ提供設定確認と、顧客素材を公開しないルールを含める。

### 独立指摘 10-5: X / Meta 取得コンテンツのデータ利用範囲

- X 由来投稿を `raw/publishing/inspirations/` に保存し翻案する設計は、著作権だけでなく API データ保存・再配布・用途申告の規約管理を必要とする。
- Meta 側も許諾なしの自動収集は規約上禁止されるため、IG 競合取得を将来足す場合に同じ ingest 管理を流用できない。

**修正案**:
- source ごとに `permitted_storage`, `retention`, `derived_use`, `deletion` を定め、元本文を長期保存する設計と URL / post ID だけ保存する設計を分ける。

### 公式参照
- 個人情報保護委員会: https://www.ppc.go.jp/news/careful_information/230602_AI_utilize_alert/
- Anthropic data retention: https://privacy.anthropic.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
- OpenAI API data usage: https://openai.com/policies/api-data-usage-policies/
- note 規約: https://terms.help-note.com/hc/ja/articles/44943817565465
- note 特商法表示: https://note.com/terms/specified

### セルフレビュー一致点 (短く)
- 業法と ROI 表示はセルフレビュー F-1 / F-2 で指摘済みであり、本節では重ねない。

## 11. Optimizer の「そもそも論 weekly レビュー」

### 独立指摘 11-1: モデルに構造改善を頼む前に観測が不足する

- weekly 入力は PCR 等の短期成果と Style Guide / 設定履歴であり、売上、相談品質、誤情報差戻し、素材負荷、規約イベントを欠く。
- この入力でエージェント分割や媒体取捨選択まで提案すると、クリックの短期変動を構造原因と誤認する。

**修正案**:
- Month 1-2 は weekly review を `異常・運用詰まり・追加計測の提案` のみに限定する。
- 骨組み変更は 90 日窓、business KPI、変更前後の評価計画を含む decision memo がない限り採用不可とする。

### 独立指摘 11-2: Opus の提案品質を評価する仕組みがない

- 「反例なし -> A」は、検索範囲や prompt が弱ければ容易に A を量産する。
- 採用されなかった提案、撤回された提案、適用後に悪化した提案の precision を測っていない。

**修正案**:
- `optimizer_proposal` に `accepted`, `implemented`, `rollback`, `business_effect`, `reviewer_reason` を記録する。
- 3 件以上の採用履歴が溜まるまでは Opus を助言のみとし、設定自動変更へ接続しない。

### セルフレビュー一致点 (短く)
- セルフレビューは transfer ingest やプロンプト固定を扱うが、Optimizer 自身の提案精度評価は扱っていない。

## 12. HDBSCAN `min_cluster_size=5` の妥当性

### 独立指摘 12-1: 未知候補の n は月 150 投稿ではなく、その一部である

- HDBSCAN 入力は全投稿ではなく `max_sim < 0.55` の未知候補だけである。
- Phase 1 導入準備は 1 投稿/日であり、月 30 投稿から未知候補が 20% 出ても 6 件しかない。
- `min_cluster_size=5` では、類似していない未知投稿を無理に一群にするか、常に noise になるかのどちらかである。
- 加えて平均 PCR +10% は、5 投稿の 1 click 差に支配される。

**修正案**:
- Phase 1 はクラスタ認定を停止し、未知投稿は月次に人手でラベル付けする。
- 自動 clustering は `unknown >= 50` かつ各候補 `impressions >= 1,000` の後に検討する。

### セルフレビュー一致点 (短く)
- R-10 は閾値が厳しすぎると見るが、独立評価は逆で、少標本で閾値を緩めるほど誤認定が増えると判断する。

## 13. Visualizer モード自動切替

### 独立指摘 13-1: PSM を適用する前提を満たさない

- v10 §4.4 は各 mode 10 件以上で `theme, hour, format` の PSM を行う。
- 画像 mode はトピックの見せやすさ、素材有無、写真品質、CTA、媒体、曜日、フォロワー増加局面にも左右される。
- 10 対 10 件で 3 変数以上を matching すれば十分な pair が残らず、未観測交絡も解けない。

**修正案**:
- PSM を削除し、同一 core idea から作る画像バリエーションのランダム割当、または週単位 switchback を採用する。
- 評価対象をまず IG の save / profile actions に限定し、X PCR と混ぜない。

### 独立指摘 13-2: self-only が本人の追加労働を要求する

- ai-only と self-only の比較は表示成果だけでなく、撮影待ちによる遅延・本人負荷・投稿欠落を伴う。
- PSM の目的変数に負荷が含まれないため、成果が少し高い self-only へ切り替えて運用を壊しうる。

**修正案**:
- `minutes_ofmeton`, `publish_delay_hours`, `asset_failure_rate`, `cost_per_publish` を mode 判定に含める。

### セルフレビュー一致点 (短く)
- この観点は v10 自身が E-6 として問いを残したが、self-review では解決していない。

## 14. 失敗談先行型 25-30% の継続供給可能性

### 独立指摘 14-1: 失敗談はネタ在庫より公開許諾がボトルネック

- 案件の失敗は、本人が経験した事実でも顧客の業務情報、期待未達、内部手順、第三者評価を含みうる。
- source ID の存在確認は「本当にあった」ことしか保証せず、「公開してよい」ことを保証しない。
- 投稿数を満たす pressure は、匿名化不足または過度に否定的なブランド形成を誘発する。

**修正案**:
- `fail_rate >= 15%` の下限 KPI を撤回し、`verified_failure_story <= 4/月` の供給上限から開始する。
- source に `publication_allowed`, `redaction_reviewed`, `client_impacted` を追加し、案件由来は明示許諾なしで公開不可とする。

### セルフレビュー一致点 (短く)
- B-4 は月 22-23 件のネタ枯れと再使用を扱う。本節は秘密保持・ブランド負荷により、供給できても公開すべきでない点を追加する。

## 15. 既出 R-1〜R-15 で拾い切れていない後悔予測

| ID | 3 ヶ月後に起きる後悔 | 根拠 | 予防策 |
|---|---|---|---|
| R-16 | 「Hook 頻度を成果と誤読して主軸を固定した」 | 重複分類、Hook 別成果なし | primary Hook 再ラベル + 実験 |
| R-17 | 「Writer / Editor の API 費用が予算を超え brownout した」 | MA 表に生成本数積算なし | agent 別 p95 予算 |
| R-18 | 「バックアップ X が規約回避と見られた」 | 公式 duplicate-account rule | 所有導線へ代替 |
| R-19 | 「朝に token が切れて予約投稿が落ちた」 | `offline.access` / refresh 処理なし | auth gate と停止通知 |
| R-20 | 「実案件メモの情報を匿名化不足で投稿した」 | publication consent / DLP なし | 非公開素材隔離 |
| R-21 | 「note 有料販売を始めたが表示・返金対応がない」 | 取引責任は creator 側 | 販売 checklist |
| R-22 | 「横断発信で閲覧は取れたが相談は一件も来ない」 | buyer 課題検証なし | JTBD 単位の検証 |
| R-23 | 「PSM が好成績の画像 mode を選んだが撮影負荷で停止した」 | 負荷を目的変数に含めない | switchback + 負荷 KPI |
| R-24 | 「Optimizer が偶然の差を Style Guide に永続化した」 | 多重比較 / 少標本 | 事前登録 + 承認 |
| R-25 | 「note に公開した SOP の二次 ML 利用方針を後で知った」 | note 規約の設定確認なし | 公開前設定確認 |

## 16. v10.2 で必須追加すべき修正項目 (重要度順)

| 順位 | 必須修正 | 完了条件 |
|---:|---|---|
| 1 | 個人情報・顧客秘密・公開許諾 gate を新設 | consent / DLP / redaction / retention schema 記載 |
| 2 | X §10.3 のバックアップアカウントを削除 | owned channel fallback と停止手順に置換 |
| 3 | Phase 0 数値の因果主張を撤回 | Hook 排他ラベルと成果検証まで配分を仮説扱い |
| 4 | 全 agent の月額費用を再算定 | Writer / Editor / retry / Opus thinking / image mix / p95 含む |
| 5 | X OAuth 2.0 実装 gate を追加 | `offline.access`、refresh、metrics read、失敗停止を実測 |
| 6 | v10.1 を単独で読める統合仕様へ再生成 | 旧版参照なし、`6+4` 等の整合 test 済み |
| 7 | IG / Meta launch を独立 gate 化 | permission、token、publish test 完了まで未開始 |
| 8 | note 販売 compliance を追加 | 特商法表記、返金・提供条件、ML 設定確認 |
| 9 | auto-post 移行基準を品質・運用 gate に変更 | 重大誤り、規約差戻し、承認滞留、auth 正常で評価 |
| 10 | PCR から売上までの計測を設計 | impression 下限、purchase、qualified lead、受注記録 |
| 11 | Visualizer PSM を停止 | ランダム割当 / switchback と負荷 KPI を記載 |
| 12 | HDBSCAN 自動認定を保留 | unknown 十分数まで人手 label の運用を記載 |
| 13 | 失敗談の下限 KPI を撤回 | 公開許諾済み在庫を上限にする |

## 17. Claude セルフレビューと一致する指摘 (一覧、短く)

| Self-review 項目 | 一致する判断 | Codex での扱い |
|---|---|---|
| A-1 | 内容カテゴリと Hook 軸を分離すべき | 同意。加えて Hook 自体を排他的 primary に直す |
| A-2 | fmat と日次タイムテーブルが不整合 | 同意 |
| A-3 / C-1 | 実体験 source ID の判定仕様が不足 | 同意。ただし公開許諾を追加必須 |
| B-2 / D-2 / R-11 | 人間承認負担が重い | 同意。ただし PCR 自動化 gate を認めない |
| B-4 | 失敗談の供給が不安定 | 同意。さらに案件秘密の公開リスクを重視 |
| C-4 | Phase 2 移行判定が曖昧 | 同意。business outcome を追加 |
| D-1 / R-12 | 横断ポジションの根拠が薄い | 同意。JTBD に再定義を提案 |
| R-13 | note 差別化が薄い | 同意。本文・販売成果の観測不足を追加 |
| R-15 | 翻案の権利リスク | 同意 |
| F-2 | 業法ガードが必須 | 同意。本稿では業法以外の五領域を追加 |

## 18. Codex の独立評価まとめ (300-500 字)

v10.1 は、投稿を量産する構成の精緻さに対して、何を証拠として採用し、何を外部へ送信し、どの条件で販売と自動化を解禁するかが弱い。特に Phase 0 の Hook 分析は重複ラベルと不均質標本を成果根拠に読み替えており、数値化した Style Guide がむしろ誤学習を固定する。さらに、全生成処理を含まない予算、X 規約に反するバックアップアカウント、refresh token 条件の欠落、案件メモ等の公開許諾・個人情報処理欠落は Phase 1 前に止めるべき問題である。Claude 中心の生成と自己改善を急ぐ前に、対象顧客の課題確認、一次導線の成約計測、公開可能素材だけの小規模手動運用を実施し、その観測に基づいて自動化範囲を増やす設計へ組み替えるべきである。
