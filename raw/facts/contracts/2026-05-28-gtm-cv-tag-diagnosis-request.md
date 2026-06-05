---
date: 2026-05-28
category: contracts
source: session
---
広告運用者の知人から GTM の CV タグ発火診断依頼。

- 症状: CV タグが意図より緩い条件で発火し、ノイズ CV が大量発生（実際より多くの CV が計上）
- 知人は自分で計測回りを全部やっている広告運用者
- 依頼内容: 工藤のメアドに権限付与してもらい、GTM の中身を見て原因特定
- 現状: 権限付与待ち

## 追加情報 (2026-05-28)
- 計測先: Google Ads
- 発火条件: thanks page view
- ノイズ発生時期: 不明
- アクセス権限: 読み取りのみ想定
- thanks URL: 後で取得
- 本物 CV の定義: フォーム送信完了
- ノイズ規模: 不明
- Google Ads 管理画面: 見れない想定
- GA4 リンク: 不明

## 追加情報 (2026-05-28 その2)
- LP URL: https://minato-ltd.com/kc/lp1/ （末尾にフォーム）
- Thanks URL: https://minato-ltd.com/kc/lp1/thanks/
- 権限: 編集権限あり（読み取りのみ想定から変更）
- Preview モード: 使用可
- 現状のトリガー: `{{Page Path}} equals /kc/lp1/thanks/`
- Preview モードで thanks page view 時の発火確認済み
