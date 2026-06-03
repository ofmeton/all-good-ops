---
date: 2026-06-03
category: contracts
source: session
---
ミナト（minato-ltd.com）広告設定の見直し・整理依頼。2026-05-28 の GTM CV タグ診断の続き。

## 見直し（CV 設定の生死確認）
- Meta / Yahoo のコンバージョン設定が生きているか確認
- ユーザー所感: 死んでそう → 死んでいれば整備し直し

## 整理（GTM コンテナ統合）
- 現状: Google / Yahoo / Meta で GTM コンテナを分けているらしい（3 コンテナ想定）
- ゴール: Google のコンテナに Yahoo・Meta を移植して 1 コンテナに集約

## 追加スコープ・確定事項（2026-06-03）
- GA4 も繋ぎたい（新規）
- Yahoo・Meta のコンテナは Google と別（3 コンテナ確定）
- 対象は LP。ドメインは共通（minato-ltd.com）
- 実行モード: ハイブリッド（調査・確認は工藤 Claude / 確定変更は工藤手動）
- サイト編集（スニペット差し替え）: やりとり中の担当者が実施 → 指示書を渡す形
- Claude in Chrome MCP は本セッション未接続。公開 LP の実タグ調査は Playwright で可能

## 実測インベントリ（2026-06-03 Playwright・公開LP）
LP は2つ・同ドメイン。コンテナは LP ごとに1つ（計2 GTM）。

| LP | 内容 | GTM | GA4 | Google Ads | Meta | Yahoo |
|---|---|---|---|---|---|---|
| kc/lp1 | キッチン | GTM-N9QMLZTX | G-M42JR0G90H ✅発火 | AW-18178517432 ✅発火 | ❌無 | ❌無 |
| ub/lp1 | ユニットバス | GTM-M2WZBHHF | ❌無 | ❌無 | px 1429820785583320 ✅ロード | ytag.js ✅ロード |

- thanks URL: /kc/lp1/thanks/ ・ /ub/lp1/thanks/
- **Meta**: ベースピクセルは生きてる（PageView 発火）が、thanks で **CV イベント(Lead等)が飛んでいない** → CV 計測が死。※直接 thanks 訪問のため実送信時トリガー未確認、管理画面で要確定
- **Yahoo**: ytag ベースはロードされるが thanks で **CV ビーコン無し** → CV 死の可能性大、管理画面要確定
- **統合の実体**: ユーザーの「g のコンテナに y,meta を移植」= ub の GTM-M2WZBHHF にある Meta+Yahoo を Google コンテナ GTM-N9QMLZTX に集約し、両 LP に N9QMLZTX を展開する形
- **GA4「ub も見たい」**= ub/lp1 に GA4(G-M42JR0G90H) が無いので追加したい
- **統合ゴール確定（2026-06-03）**: 全タグを Google コンテナ GTM-N9QMLZTX に集約し両 LP に1本展開（ユーザー承認済）

## 既知の前提（5/28 時点）
- GTM 編集権限あり / Preview モード使用可
- LP: https://minato-ltd.com/kc/lp1/ ・Thanks: https://minato-ltd.com/kc/lp1/thanks/

---

## 【根因確定】GTM コンテナ深掘り（2026-06-03 夕方・chrome-devtools MCP / 個人Chromeアタッチ）

個人Chrome（ログイン済み）に remote debugging + chrome-devtools MCP `--auto-connect` でアタッチし、GTM 管理画面と両 thanks の実発火ネットワークを実測。

### コンテナ ID（GTM home 実測）
| コンテナ | LP | account | container | workspace |
|---|---|---|---|---|
| GTM-N9QMLZTX | minato-ltd.com/kc | 6356775932 | 253236439 | 4 (Default) |
| GTM-M2WZBHHF | minato-ltd.com/ub(Yahoo・Meta) | 6356775932 | 253430643 | 5 (Default) |
| GTM-PC6J4Z8 (memo) | 無関係 | 6006363560 | 61824663 | - |

### thanks 実発火ネットワーク
- **kc/lp1/thanks/**: GTM-N9QMLZTX ✅ / GA4 g/collect(page_view+scroll) ✅ / Google Ads 変換エンドポイント(label `NSVLCIWq8LAcELjTmNxD`) ✅ → 全正常
- **ub/lp1/thanks/**: GTM-M2WZBHHF ✅ / Meta `facebook.com/tr?ev=PageView` のみ（Lead 無し）/ Yahoo `ytag.js` のみ（CV ビーコン無し） → ベース生存・CVだけ死

### N9QMLZTX(kc) タグ構成（6本・全て正常）
GA4(G-M42JR0G90H, Init) / Google タグ(AW-18178517432, Init) / コンバージョンリンカー(All Pages) / Google Ads CV「LPフォーム送信完了」(trigger: PV - KCLP Thanks) /「電話番号タップ」(trigger: Click - Tel 0364547797) /「リードフォームの送信_フォーム送信」(trigger: Form submit - KCLP Thanks)。Meta/Yahoo は無し。
- ⚠️ workspace に未公開変更1件 + 新バージョン利用可の表示あり（ライブと差分の可能性。公開状態は要確認）

### M2WZBHHF(ub) タグ構成（4本・全てカスタムHTML）
Meta_Pixel_PageView(All Pages) / Yahoo_サイトジェネラルタグ(All Pages) / **Meta Pixel Lead**(trigger: PV_問い合わせ完了ページ) / **Yahoo_CV_問い合わせ完了**(trigger: PV_問い合わせ完了ページ)
- コンテナ品質「非常に良い」・公開バージョン4（minatolp@minato-ltd.com が6日前公開）・未公開変更0

### ★真の根因（決定的）
CV タグ（Meta Pixel Lead / Yahoo_CV_問い合わせ完了）は**正しく存在**するが、両方が参照するトリガー **「PV_問い合わせ完了ページ」の条件が間違っている**:

- ub トリガー「PV_問い合わせ完了ページ」: ページビュー / **Page Path 等しい `/ub/lp1/mail.php`** ← 誤り
- kc トリガー「PV - KCLP Thanks」(正常): ページビュー / **Page Path 等しい `/kc/lp1/thanks/`** + Referrer 含む `minato-ltd.com/kc/lp1` + Referrer 含まない `/thanks/`

`mail.php` はフォーム送信処理（PHP）で、ブラウザに描画されずに `/ub/lp1/thanks/` へリダイレクトする中継URL。よって PageView トリガーが永久に一致せず、Meta Lead と Yahoo CV が発火しない。**＝「CV だけ死」の正体。**

### 修正方針（確定）
1. **【緊急/最小】ub の CV 即復活**: M2WZBHHF トリガー「PV_問い合わせ完了ページ」の Page Path を `/ub/lp1/mail.php` → `/ub/lp1/thanks/` に変更し公開。これだけで Meta Lead + Yahoo CV が復活。新規タグ作成は不要。
   - 任意で堅牢化: kc と同様に Referrer 条件（含む `minato-ltd.com/ub/lp1`）を追加。
2. **【整理/Phase2】N9QMLZTX 集約**: N9QMLZTX に Meta(PageView+Lead) + Yahoo(general+CV) を移植し、ub スニペットを M2WZBHHF→N9QMLZTX へ差替（先方担当者へ指示書）。これで ub にも GA4(G-M42JR0G90H)+Google Ads が自動で乗る。トリガーは ub URL 用に別途用意が必要。
- 実行は GTM 公開＝本番計測への外部影響のため人間確認必須。工藤手動 or 先方担当者。
