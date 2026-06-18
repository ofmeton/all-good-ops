# 振り返り: doda 求人応募代行（2026-06-19 00:03）

対象: 2026-06-18〜19 セッション。doda で工藤陸のスキルに合う求人2件を chrome-devtools で探し、書類応募代行＋会社名/電話/前回選考状況を Mac メモ記録。

## 経緯サマリ
- doda求人検索（URLパラメータ不発→フォーム操作で279,631→476件）→ React/Next.js経験にマッチする2件選定（チームラボ webアプリエンジニア／セレス 自社開発上流エンジニア）
- 応募代行: 未ログイン→空欄ブロッカーを順に検出。本人が doda ログイン＋携帯080-6998-7355/〒240-0115 提供→充足
- 不可逆な書類応募を最終ゲート1回（AskUserQuestion「両社とも送信」）で確認→送信完了（チームラボ=本人クリック／セレス=代行クリック）
- Mac メモ（AppleScript Notes）に会社名・電話・送信した応募情報・前回選考状況を記録
- 前回応募分の選考状況: Gmail調査で自分発の応募・選考スレッドは未確認（エージェント案件紹介の受信が中心）

## 良かった点
1. doda検索URL（j_fw__/ek=）の無視・403を早期に切り上げ、フォーム直接操作（fill＋検索ボタン）に切替えて絞り込み成功。
2. 不可逆な外部送信を最終ゲートで1回だけ AskUserQuestion 確認。停止2回は確認でなく実ブロッカー（未ログイン／必須空欄）で過剰確認ではない。
3. 応募フォームを一度「空」と誤判定したが innerText でなく input.value で精査し直し自己訂正。
4. 携帯・郵便の空欄を送信前に検出し、捏造せず本人に要求。

## 詰まった/二度手間
| # | 事象 | 原因 | 本来 |
|---|---|---|---|
| 1 | 応募フォームを「空」と誤報告→訂正 | innerText を読んだ（value/選択値は出ない） | 充足判定は input.value/select/checked を照会 |
| 2 | 代行が2回別理由で停止（未ログイン→空欄）、間に本人手動操作 | 着手時にログイン＋必須項目を通しで点検せず逐次発見 | 外部UI代行は①ログイン②必須空欄③不可逆性を一括下見 |
| 3 | take_snapshot 148K字で上限超過（再発3回目） | 求人ページの a11y ツリー巨大 | 大規模ページは初手 evaluate_script |

## key insight
- フォームの充足判定は表示テキストでなく値（value/selectedIndex/checked）で見る。
- 外部UI代行は「ログイン／必須空欄／不可逆性」を着手時に一括下見し、ブロッカーの逐次発見を避ける。
- doda検索はURLパラメータ無視のフォームPOST式。検索系SPAはフォーム1回が確実。

## 反映（SAFE・承認不要で即適用済み）
- memory/user_basic_profile.md: 連絡先（携帯/メール/現住所〒）を追加・description更新
- memory/project_job_search_2026.md: 「直接応募実績（doda）」セクション追加（正社員2社・方針すり合わせフラグ付き）
- memory/feedback_chrome_devtools_fill_limitations.md: 「充足判定は innerText でなく value で見る」を1行追記
- raw/facts/situations/2026-06-19-doda-job-applications.md: 新規（§0事実保存）
- data/improvement-log.jsonl: 追記（status=applied）
- wiki/hot.md: 更新

## open（監視/保留）
- doda応募代行のスキル化は crowdworks 代理入力と同型だが30日2回発火の確証弱く保留。
- take_snapshot-token-cost 3回目: 大規模ページは snapshot 封印・evaluate_script 初手を着手前想起で実践。
- 本応募は正社員フルコミット＝確定方針（週3・顧問化）と不整合。次キャリアセッションで本人とすり合わせ。
