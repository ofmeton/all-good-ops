# LINE 開設依頼文ドラフト（クライアント送付用）

> **これは工藤陸からクライアントへ送るメッセージのドラフト。** 送信前にユーザー確認必須。送信は手動で別経路（LINE/メール/Slack）で行う。

---

## 背景説明（メッセージ冒頭）

```
お疲れさまです、工藤です。
民泊清掃管理アプリ、本番デプロイ準備に入っています。

LINE通知部分なんですが、調べてみたら **LINEの通知用Channel（Botの中身）は、後から別アカウントへ譲渡することができない仕様** でした。
（公式仕様: https://developers.line.biz/en/docs/messaging-api/）

将来◯◯さん（クライアント名）側にシステム一式をお渡しすることを見越して、
**最初からLINEだけは◯◯さん名義で開設しておきたい** ので、ひとつお願いがあります。

下記の手順で、LINE Developers Console での開設だけお願いできますか？
所要時間は15分程度です。開設後、こちらで運用は全部巻き取ります。
```

---

## 手順（クライアントが行う作業）

```
【手順1】 https://developers.line.biz/console/ にアクセスし、
       普段使っているLINEアカウントでログイン
       （個人LINEで大丈夫です。会社用LINEがあればそちらでもOK）

【手順2】 「Create a new provider」をクリック
       Provider name に「<会社名>」または「minpaku-cleaning」など、
       管理しやすい名前を入れて作成

【手順3】 作成したProviderを開いて「Create a Messaging API channel」をクリック
       下記のとおり入力:
         - Channel name: 民泊清掃管理アプリ通知
         - Channel description: 清掃スタッフへの依頼通知
         - Category: ライフスタイル
         - Subcategory: (適当なものでOK)
       規約に同意して作成

【手順4】 作成したChannelを開き、「Messaging API」タブで
       「Channel access token (long-lived)」の「Issue」ボタンを押し、
       表示されたトークン（eyJ... で始まる長い文字列）を控えておく
       ※このトークンは「BotのAPI鍵」です。第三者に渡さないでください。

【手順5】 LINE Official Account Manager (https://manager.line.biz/) を開き、
       同じChannelに対応する公式アカウントを選択
       → 設定 → 応答設定 で:
         - あいさつメッセージ: オフ
         - 応答メッセージ: オフ
         - Webhook: オン
       （通知のみで使うため、自動返信はすべて切ります）

【手順6】 同じく LINE Official Account Manager で:
       設定 → 権限管理 → メンバーを追加
       → 工藤陸（off.me.ton@gmail.com）を「運用担当者」または「管理者」として追加
       （こちらで通知の動作確認・障害対応をするため）
```

---

## 共有してほしい情報（メッセージ末尾）

```
開設が完了したら、下記2点をお知らせください:

1. Channel ID（LINE Developers Console の Basic settings で確認できる数字列）
2. 友だち追加用のQRコードまたはURL
   （LINE Official Account Manager → ホーム → 友だち追加 から取得可能）

Channel access token は機密情報なので、できれば下記のいずれかで:
  - 1Password等の共有メモ で共有
  - 直接お会いした時に画面を見ながら一緒にVercelへ登録
  - もしくは こちら（off.me.ton@gmail.com）に LINE のトークルームで直送

不明点あればいつでも聞いてください。
よろしくお願いします！

工藤陸
```

---

## 補足（このドラフトに対する社内メモ）

- LINE 開設後、クライアントが工藤を Official Account Manager の管理者に追加してくれれば、こちらで「あいさつメッセージ等のオフ確認」「友だち追加 QR の取得」も代行可能。手順5・6 をクライアント自身で行うのが難しそうなら、工藤が代行する旨を追記する余地あり。
- Channel access token の受け渡しは、`feedback_credential_disclosure_warning` メモリに従い「チャットに直接貼らない」を案内に含めた。
- クライアントが LINE Developer Account そのものを作るのが面倒そうなら、口頭/通話で一緒に画面共有しながら進める提案に切り替える。
- 文中の「<業者名>」は送付前に実名へ置換。
