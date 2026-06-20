# 振り返り 2026-06-18 22:06 — クラウドワークス ヒアリングフォーム代理入力

**対象**: クラウドワークス エージェントの全14ページ Google フォームを chrome-devtools で代理入力 + 完了後にクラウドワークス関連メール確認（非コーディング・操作代行セッション）

## §0.5 前回フォローアップ（再計測）
- **`react-controlled-input-e2e`（前回 applied）→ partial**: 「chrome-devtools fill は非ネイティブ input を更新しない／検証は evaluate_script 優先」が今回ど真ん中で該当。検証は evaluate_script を活用できた（◎）が、fill が listbox/date で空振りし試行錯誤＋巨大 snapshot を数回（△）。→ memory `feedback_chrome_devtools_fill_limitations` に一般化。
- **`take_snapshotトークンコスト`（watch）→ 再発**: page5 ~470行 snapshot を複数回。dropdown 選択を keyboard 方式に早く切替で回避できた。
- **`askuserquestion-fuuin` → verified** / **外部送信の人間確認 → verified**（送信ボタンを自動で押さなかった）。

## §1 良かった点
- 復元下書きを上書きせず検証してから進行
- 推測不可項目（稼働条件・希望分野・経験年数・制作本数）は AskUserQuestion で本人決定を取得
- memory の NDA 抽象化方針を適用（ファストリテ／NELL）
- 文字化け（寝→寢、寄→嬄）を検出修正し、同バッチ全テキストを戻って全数再検証
- 外部送信ゲートを遵守

## §2 詰まった瞬間・二度手間
| # | 事象 | 原因（構造） | 本来すべき動き |
|---|---|---|---|
| 1 | fill_form が listbox/date で timeout | Forms は role=listbox / カスタム date で fill 非対応 | 最初から dropdown=click-open+keyboard、date=click+type を既定に |
| 2 | 時間帯プルダウンが Chrome autofill で勝手に補完 | fill 後に空 select をブラウザ自動補完 | 任意 select は触前後で value 確認 |
| 3 | 巨大 snapshot 多用 | option uid 取得に snapshot 必須と誤判断 | keyboard 確立後は snapshot 不要 |
| 4 | JS .click() で option 誤選択 | 閉じた listbox への JS click 無効・座標なし dispatch が別 option 命中 | chrome click+keyboard のみ使う |
| 5 | 文字化け 寝→寢 / 寄→嬄 | chrome fill で特定漢字が異体字置換 | fill 直後に evaluate_script で原文一致検証 |

## §3 自動化・効率化
- Google Forms 操作の型（email/radio/checkbox=fill_form｜dropdown=click-open+ArrowDown×index+Enter｜date=click+type YYYYMMDD｜検証=evaluate_script｜巨大 snapshot 回避）は再利用価値あり。ただしフォーム代理入力の 30日2回発火の確証が弱く**スキル化は保留**（improvement-log status=open）。

## §5 観点レンズ
- 🪙 トークンコスパ: 巨大 snapshot を数回。dropdown を keyboard に早く切替で節約できた。
- 🔧 未活用資産: chrome-devtools fill の知見が web-ui-bridge / mf-finance E2E 文脈に閉じ、フォーム代理入力でも同じと気づくのが遅れた → memory feedback で横断 recall 可能に。

## §6 反映（SAFE・即反映）
- raw/facts/situations/2026-06-18-crowdworks-agent-registration.md（求職登録の状況）
- memory `feedback_chrome_devtools_fill_limitations.md`（新規）
- memory `project_job_search_2026.md`（新規）
- memory MEMORY.md 索引 2行追加
- data/improvement-log.jsonl 追記（再計測＋今回）
- wiki/hot.md 更新

RISKY 該当なし。
