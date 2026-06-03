# ミナト LP 広告計測 修正指示書（2026-06-03）

対象: minato-ltd.com の2つのLP（kc=キッチン / ub=ユニットバス）の広告コンバージョン計測
診断: chrome-devtools MCP で GTM 管理画面と両 thanks ページの実発火を実測済み

---

## 結論（3行）

- **ub/lp1 の Meta・Yahoo コンバージョンが計測ゼロ**だった原因が確定。
- 原因は CV タグではなく、**トリガーの参照URLが間違っていた**（描画されない `mail.php` を指していた）。
- **トリガーのURLを1箇所直すだけ**で Meta・Yahoo CV が即復活する（新規タグ作成は不要）。

---

## 現状の実態

| LP | GTMコンテナ | GA4 | Google Ads | Meta | Yahoo |
|---|---|---|---|---|---|
| kc/lp1 | GTM-N9QMLZTX | ✅発火 | ✅発火 | 無 | 無 |
| ub/lp1 | GTM-M2WZBHHF | 無 | 無 | ⚠️PageViewのみ・**CV死** | ⚠️baseのみ・**CV死** |

ub の Meta Pixel（px `1429820785583320`）と Yahoo タグ（`ytag.js`）の**ベースは生きている**。
コンバージョンタグ（Meta Pixel Lead / Yahoo_CV_問い合わせ完了）も**存在する**。
しかし thanks ページで**発火していない**。

---

## 根本原因

ub コンテナ（GTM-M2WZBHHF）の CV タグ2本が参照するトリガー **「PV_問い合わせ完了ページ」** の条件が誤り:

```
現状（誤り）: ページビュー / Page Path 等しい  /ub/lp1/mail.php
正しい姿     : ページビュー / Page Path 等しい  /ub/lp1/thanks/
```

`mail.php` はフォーム送信を処理する PHP で、**ブラウザに表示されずに `/ub/lp1/thanks/` へリダイレクトする中継URL**。
そのため「Page Path が mail.php と等しい時に発火」という条件は永遠に成立せず、Meta Lead と Yahoo CV が一度も飛ばない。

※ 正常に動いている kc 側のトリガー「PV - KCLP Thanks」は `Page Path 等しい /kc/lp1/thanks/` を正しく指している（対照確認済み）。

---

## 修正手順 ①【緊急・最小】ub の CV を即復活させる

> GTM 公開は本番の広告計測に直接影響するため、実施前に人間が最終確認すること。

1. GTM で **GTM-M2WZBHHF**（account 6356775932 / container 253430643）を開く
2. 左メニュー「トリガー」→ **「PV_問い合わせ完了ページ」** を開く
3. 「このトリガーの発生場所」の条件を編集:
   - 変更前: `Page Path` `等しい` `/ub/lp1/mail.php`
   - 変更後: `Page Path` `等しい` `/ub/lp1/thanks/`
4. （任意・推奨）誤発火防止に条件を1行追加: `Referrer` `含む` `minato-ltd.com/ub/lp1`
5. 保存 → 右上「プレビュー」で `https://minato-ltd.com/ub/lp1/` から実際にフォーム送信し、Tag Assistant で **Meta Pixel Lead** と **Yahoo_CV_問い合わせ完了** が thanks で発火することを確認
6. 問題なければ「公開」

### 修正後の検証（公開後）
- thanks 到達時に `facebook.com/tr/?...&ev=Lead`（または設定したイベント名）が飛ぶこと
- Yahoo の CV ビーコンが飛ぶこと
- 翌日以降、Meta イベントマネージャ / Yahoo 広告 のコンバージョン件数が計上され始めること

これで ub の Meta・Yahoo CV 計測は復旧する（kc は元から正常なので変更不要）。

---

## 修正手順 ②【整理・Phase 2】全タグを Google コンテナ N9QMLZTX に集約（任意・後日）

目的: 2コンテナ運用をやめ **GTM-N9QMLZTX 1本に統合**し、両 LP に展開。ub にも GA4 と Google Ads を乗せる。

> ①でCVを復旧させてから、別タスクとして落ち着いて実施するのを推奨（①と②を同時にやるとリスク切り分けが難しい）。

1. **N9QMLZTX に Meta/Yahoo を移植**: M2WZBHHF の4タグ（Meta_Pixel_PageView / Meta Pixel Lead / Yahoo_サイトジェネラルタグ / Yahoo_CV_問い合わせ完了）と対応トリガーを N9QMLZTX に複製。
   - ベースタグ（PageView / ジェネラル）は All Pages のまま。
   - CV タグのトリガーは **ub 用 thanks**（`Page Path 等しい /ub/lp1/thanks/`）を新規作成して紐付け（kc 用とは別トリガー）。
2. **ub スニペット差替（先方サイト担当者へ依頼）**: ub/lp1 の全ページ（LP本体 + thanks）の GTM スニペットを `GTM-M2WZBHHF` → `GTM-N9QMLZTX` に差し替え。
   - これにより ub にも GA4(G-M42JR0G90H) と Google Ads(AW-18178517432) が自動で乗る（N9QMLZTX に含まれるため）。
   - ただし Google Ads CV / GA4 CV を ub でも計測したい場合、それらのトリガーも ub thanks 用に追加が必要。
3. 旧 M2WZBHHF は差替確認後に停止（即削除はせず一定期間並走 → 二重計測に注意、どちらかのCVは無効化）。

### Phase 2 の注意点
- 統合中は二重計測 / 計測欠損が起きやすい。プレビューで全タグの発火マトリクス（LP×イベント）を確認してから公開。
- N9QMLZTX workspace に未公開変更が1件残っていた（2026-06-03 時点）。統合作業前に現公開バージョンと workspace の差分を確認すること。

---

## 付録: 確定情報

- GTM コンテナ
  - GTM-N9QMLZTX (kc): account `6356775932` / container `253236439`
  - GTM-M2WZBHHF (ub): account `6356775932` / container `253430643`
- 計測ID: GA4 `G-M42JR0G90H` / Google Ads `AW-18178517432` / Meta Pixel `1429820785583320` / Yahoo `ytag.js`(サイトジェネラル)
- thanks URL: `/kc/lp1/thanks/` ・ `/ub/lp1/thanks/`
- フォーム送信処理URL（中継・非表示）: `/ub/lp1/mail.php`
