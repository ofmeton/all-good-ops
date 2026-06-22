# StayClean スプリント2 実機テスト結果（本番・devtools）

- 実施日: 2026-06-21（JST）
- 対象: 本番 `https://minpaku-cleaning.vercel.app` / Supabase `cdqtypyasyhwbpuibhtb`
- 方法: chrome-devtools 実機操作＋API/DB（notifications_log・property_ical_feeds）裏取り
- シナリオ: `2026-06-21-sprint2-e2e-scenarios.md`（v2・Codexレビュー反映済）
- テストデータ: `E2E-` 接頭辞（オーナーA改/B、物件A、スタッフX/Y/Z、依頼#1-3）。**テスト後クリーンアップ対象**

## サマリ
本番DBはクリーン（実クライアントデータ無し＝納品前）。**Sprint2の新機能中核を実機で検証し、確定アルゴリズム・複数人依頼・除外・SSRF・cron認証・通知レイヤーまで期待通り動作**を確認。重大バグなし。要確認の軽微所見3件（下記★）。

## 判定一覧

| ID | シナリオ | 判定 | 根拠 |
|---|---|---|---|
| S-R-1 | 管理者ダッシュボード（カレンダー＋一覧・空状態） | ✓ | 描画・サマリ0件・空状態文言OK |
| S-P0-1 | オーナー編集の永続 | ✓ | 名前変更→API再取得で反映 |
| S-P0-2 | オーナー削除（紐づき無し） | ✓ | 確認ダイアログ→4→3名、消失 |
| S-P0-3 | 物件紐づきオーナー削除ブロック | ✓ | **HTTP 409**＋friendlyエラー、500/生エラー無し、cascade無し |
| S-P0-4 | 物件オーナー変更の保存（旧バグ回帰） | ✓ | A→Bに変更→再読込で永続。owner_id無視バグ再発せず |
| S-P0-5 | スタッフ自己編集（メール／LINE導線） | ✓ | スタッフURLでメール編集可、LINEは手入力でなくLogin導線 |
| S-P0-7 | トークン自動発行 | ✓ | 物件・スタッフ作成時にURL自動発行 |
| S-P0-8a/b | 再発行・無効化ボタン存在 | ◯(UI確認) | スタッフ・物件URLに再発行/無効化あり（実押下は未） |
| S-P3-1 | 複数人依頼＋除外 | ✓ | request_created が X,Yのみ・**Zには一切送られず**（notifications_log実証） |
| S-P3-2 | offset0先着即確定 | ✓ | X が checkout当日回答→即 assigned・clean_confirmed発火・回答即締切 |
| S-P3-6 | 全員不可→管理者アラート | ✓ | X,Y不可→unassigned_alert を管理者へ・依頼は未割当維持（自動キャンセルせず） |
| S-P3-8 | 単一勝者ガード（TOCTOU） | ✓ | 確定後、他スタッフの回答ページが404＝再割当不可 |
| S-P3-10 | 確定後ライフサイクル | ✓ | 割当済→清掃中→reported→confirmed 全遷移OK |
| S-P3-13 | 有効清掃日ウィンドウ | ✓ | 次予約無し→offer=[checkout, checkout+3]（6/24→6/27, 6/28→7/01で実証） |
| S-P3-15 | 回答日の範囲制限 | ✓ | 回答ドロップダウンが window内日付のみ提示（範囲外選択不可） |
| S-P1-3 | 新kind通知の発火 | ✓ | request_created/clean_confirmed/report_submitted/request_confirmed/unassigned_alert を実発火 |
| S-P4-7 | LINE未連携→メールfallback | ✓ | 全通知が email チャネル（line_user_id無→fallback） |
| S-P2-8 | SSRF（内部IP）拒否 | ✓ | 169.254.169.254 を同期時 `error: blocked_host` でブロック（fetch到達せず） |
| S-P4-1 | LINE Login start | ✓ | access.line.me へ302・client_id=2010459309・redirect正・state nonce・scope=profile openid・**bot_prompt=aggressive** |
| S-P5-1 | ical-sync 周期 | ◯ | cron稼働 `*/15`（★要件は*/30と差分） |
| S-P5-2 | finalize-offers 周期 | ✓ | `*/10` |
| S-P5-3 | cron無認証拒否 | ✓ | /api/cron/* が secret無で **401 unauthorized** |
| S-R-4 | 報告→管理者通知→確認→オーナー通知 | ✓ | report_submitted→admin（sent）、request_confirmed→owner（連絡先無でskip＝正） |

## ★要確認の所見（軽微・クライアント判断）
1. **完了報告が写真0枚で送信できる**: 報告フォームで写真0枚でも「完了報告を送信しました」。設計書は報告に写真を想定するが**必須化されていない**。意図的ならOK、写真添付を必須にしたい場合は要改修。
2. **ical-sync 実周期が `*/15`**（改修要件plan記載は`*/30`）。コスト/鮮度の意図確認（Supabase Cron無料枠内なので実害は小）。
3. SSRF防御は**登録時でなく同期(fetch)時**。内部ホストへ到達しない点で実効的だが、登録時バリデーションを足すと一段堅牢。

## 実機未検証（時間依存・外部依存・本番不可）
- S-P3-3/4/5（24h暫定→当日優先／cron確定）: 24h経過・時刻依存。ロジックはvitestでカバー、本番は時間待ち要。
- S-P2-1〜9（iCal正常取込・TZ・cancel・人数非破壊・UID分離・予約→依頼）: 公開hosted `.ics` fixture要。取込配管（feed登録・sync・blocked判定）は稼働確認済。
- S-P4-2〜6 完全round-trip（consent→callback→bind）・nonce二重消費・署名検証・open redirect・IDOR: 実LINEログイン／細工リクエスト要。startの配線は検証済。
- S-R-7/8（前日リマインド・写真3ヶ月削除）: cron時刻依存。
- S-R-3/6/9/10（連続予約警告・閲覧境界・無効化URL・レスポンシブ）: 部分のみ。

## 結論
Sprint2 の新規実装（CRUD修正・複数人依頼ライフサイクル・確定アルゴリズム・通知刷新・iCal配管・LINE Login配線・Supabase Cron）は**本番で期待通り動作**。ブロッカー無し。残りは時間/外部依存のため、実スタッフ連携時の最終確認に委ねる。★所見3件のみクライアント意思確認を推奨。
