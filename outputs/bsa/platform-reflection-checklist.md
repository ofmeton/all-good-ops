# 各媒体 手動反映チェックリスト

> 作成日: 2026-04-23
> 目的: Lancers / Coconala / CrowdWorks / portfolio（Vercel）への手動反映作業を1本化
> 正本: `wiki/business/bsa/pricing-catalog.md`（SSOT）/ `outputs/bsa/` 配下のドラフト
> 備考: ユーザーのWeb画面操作が必須。秘書は反映状況のチェックと文言整合の確認のみ担当

---

## 0. 作業順序（推奨）

1. **Lancers プロフィール反映**（15分）— Day 1 朝の提案投下に必須
2. **Coconala 出品 最低1件公開**（30分）— Day 1-2 中に L1 or L4 を先行公開
3. **portfolio デプロイ**（5分）— git push → Vercel 自動反映
4. **Coconala 残り3-4商品 + L3-C 独立出品**（Week 2）
5. **CrowdWorks プロフィール**（Week 2-3）

---

## 1. Lancers（🔴 最優先）

### 1.1 プロフィール本文

- **URL**: https://www.lancers.jp/mypage/ofmeton
- **反映元**: `outputs/bsa/lancers-profile-draft.md`
- **担当**: ユーザー（Web画面コピペ）

#### 反映項目

- [ ] 自己紹介文（メイン）
- [ ] キャッチコピー
- [ ] 対応可能な業務
- [ ] 実績・ポートフォリオ欄
- [ ] 得意スキル（タグ付与）
- [ ] 稼働可能時間帯
- [ ] プロフィール画像（顔写真 or ロゴ）

#### 反映時の確認事項

- [ ] **AI表記**: 「AI活用」のみ使用。「Claude」「Claude Opus」等の固有名詞が含まれていないか
- [ ] **名義**: 「工藤陸」で統一。「ofmeton」は portfolio URL のみ
- [ ] **メールアドレス**: off.me.ton@gmail.com
- [ ] **portfolio URL**: https://portfolio-fawn-eight-63.vercel.app/
- [ ] **実績 CPA84%削減**: 差別化の主軸として記載
- [ ] **価格整合**: L1 ¥30k / L2 ¥80k / L3 ¥100k / L4 ¥10k〜

### 1.2 提供サービス欄

- **反映元**: `outputs/bsa/lancers-profile-draft.md` 提供サービスセクション
- **担当**: ユーザー

#### 反映項目

- [ ] L1 Rapid LP（¥30,000 / 72h）
- [ ] L2 Corporate 5P（¥80,000 / 7日）
- [ ] L3 LP + 広告運用（¥100,000 / 96h + 翌日配信）
- [ ] L4 Express 修正・改修（¥10,000〜）
- [ ] **L3-C 継続運用（広告費の20%/月）** — Week 2 で独立追加

---

## 2. Coconala（🔴 最優先：1件先行）

### 2.1 全体設定

- **URL**: https://coconala.com/users/[ユーザーID]/services
- **反映元**: `outputs/bsa/coconala-services-draft.md`
- **担当**: ユーザー（Web画面操作）

### 2.2 出品リスト

| # | 商品 | 価格 | タイトル例 | Week |
|---|---|---|---|---|
| P3 | L1 Rapid LP | ¥30,000〜 | 「72時間で公開！低単価で急ぎのLP制作します」 | W1 Day 1 |
| P6 | L4 Express 修正 | ¥10,000〜 | 「24時間以内着手！既存HP/LPの軽修正承ります」 | W1 Day 1 |
| P4 | L2 Corporate 5P | ¥80,000〜 | 「7日納品の中小企業コーポレートサイト Next.js」 | W1 Day 2-3 |
| P5 | L3 LP + 広告運用 | ¥100,000〜 | 「LP制作＋Google広告運用セット／96時間公開」 | W2 |
| 新 | L3-C 継続運用 | 広告費の20%/月 | 「広告運用 月額継続プラン／広告側から順番に打ちきる運用設計」 | W2-3 |

### 2.3 各出品の必須項目（Coconala フォーマット）

- [ ] サービスタイトル（最大 30文字）
- [ ] カテゴリ選択（Web制作 / LP制作 / ランディングページ）
- [ ] サービス内容本文（2000-5000文字）
- [ ] お届け日数（例: 3日・7日・14日）
- [ ] 商品画像（サムネイル画像）
- [ ] 購入にあたっての注意事項
- [ ] よくある質問（FAQ）3-5個
- [ ] オプション設定

### 2.4 反映時の確認事項

- [ ] AI表記ルール準拠（「AI活用」のみ）
- [ ] 名義=工藤陸
- [ ] portfolio URL 挿入
- [ ] D2C寝具 CPA84%削減 実績記載（許可範囲内で）
- [ ] SLA 文言（20%返金 or 翌日以内追い込み納品）
- [ ] 広告運用は**稼働保証のみ、成果保証なし**を明記（L3/L3-C）

---

## 3. portfolio（🟡 本日中にデプロイ推奨）

### 3.1 現状

- **リポジトリ**: `/Users/rikukudo/Projects/portfolio/`
- **ローカル build/lint**: 通過済
- **URL**: https://portfolio-fawn-eight-63.vercel.app/
- **デプロイ**: Vercel 自動（main への push で反映）

### 3.2 デプロイ手順

```bash
cd /Users/rikukudo/Projects/portfolio
git status
git add -A  # ユーザー確認
git commit -m "portfolio 整合性修正: hero-meta 5件 / hiyori Next.js / footer 継続運用追加"
git push
```

- [ ] git status 確認
- [ ] git add / commit（ユーザー承認）
- [ ] git push（**ユーザー指示必須**: 外部公開への push）
- [ ] Vercel ビルド完了確認
- [ ] 本番URL で表示確認

### 3.3 反映時の確認事項

- [ ] hero-meta: Works 5件（6件 ではない）
- [ ] hiyori の tag に WordPress が含まれていない（Next.js になっている）
- [ ] footer Services に「継続運用」が含まれている
- [ ] 継続運用セクション（kudo-continuous）の文面が「広告から順番に、打ちきる設計」でポジティブ表現
- [ ] 派生LP料金 ¥15,000〜 と表記
- [ ] 「成果保証ではなく稼働保証」note 記載
- [ ] メールアドレス off.me.ton@gmail.com

### 3.4 portfolio 未解決事項

- [ ] プロフィール写真（現状 `[ PORTRAIT · PROFILE PHOTO ]` プレースホルダ）
- [ ] nav「受付中 · 残り2枠」の数字は現状と合っているか
- [ ] portfolio に SLA 明記箇所追加（FAQ or 契約ページ）

---

## 4. CrowdWorks（🟢 Week 2-3）

### 4.1 プロフィール反映

- **URL**: https://crowdworks.jp/mypage
- **反映元**: `outputs/bsa/lancers-profile-draft.md` を CrowdWorks 用に微調整
- **担当**: ユーザー

- [ ] 自己紹介文（Lancers から転載・CW 向け微調整）
- [ ] スキル登録
- [ ] ポートフォリオ URL 登録
- [ ] 稼働時間登録
- [ ] プロフィール画像

### 4.2 反映時の確認事項

- [ ] AI表記 / 名義 / メールアドレス / portfolio URL の整合
- [ ] Lancers のコピペにならないよう、CW独自の書き換え
- [ ] CPA84%削減実績の表記

---

## 5. 週次チェックリスト（Week 1-2 中）

毎週日曜 21:00 に秘書が本ファイルの反映状況を走査し、未反映項目をレポート。

- [ ] Lancers プロフィール反映済
- [ ] Lancers 提供サービス欄反映済
- [ ] Coconala L1/L4 出品済
- [ ] Coconala L2/L3 出品済
- [ ] Coconala L3-C 独立出品済
- [ ] portfolio デプロイ済
- [ ] CrowdWorks プロフィール反映済

---

## 6. pricing-catalog §6 Index との対応

| 本ファイルの項目 | pricing-catalog §6 Index |
|---|---|
| Lancers プロフィール | P1 |
| Lancers 提供サービス欄 | P2 |
| Coconala L1 | P3 |
| Coconala L2 | P4 |
| Coconala L3 | P5 |
| Coconala L4 | P6 |
| Coconala L3-C | （新設・P8 として追加予定） |
| CrowdWorks プロフィール | P7 |

反映完了時、pricing-catalog §6 の「反映状況」列を「反映済」に更新する。

---

## 7. 反映完了後の更新ルール

1. ユーザーが本ファイルのチェックボックスを更新
2. 秘書が週次で走査し、未反映を集計
3. 全項目完了後、pricing-catalog §6 の該当行を「反映済（日付）」に更新
4. data/usage-log.jsonl に `platform_reflection_completed` イベントを記録

---

*本チェックリストは Week 1-2 の反映作業完了後、月次で整合性の再確認に使う。*
