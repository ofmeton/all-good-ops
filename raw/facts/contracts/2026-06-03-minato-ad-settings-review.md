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
