import type { RawMail } from "../types";

const dashboard =
  "https://script.google.com/macros/s/AKfycbxoF3uqU9zCJ4DSH2GyTc4MYC3tR2rHEF8mBxM65DscDCHpxRX7bk2maRp_ZGcjfeBfCg/exec?dashboard=1&p=prov-beatice&t=dcf604b98117727ac644ada4976f8e61f56af6276f14609ee25e085036ac360f";

function build(activity: string, time: string, fee: string, rToken: string): string {
  return [
    "BEAT ICE 様",
    "",
    "下記のアクティビティ予約が入りました。ご確認の上、承認/NG のご回答をお願いします。",
    "",
    "【アクティビティ情報】",
    "■ 予約日時: 2026-06-17 21:24",
    `■ アクティビティ: ${activity}`,
    "■ 日付: 2026-08-13",
    `■ 開催時間: ${time}`,
    "■ 参加人数: 大人3名 / 小学生1名 (合計4名)",
    `■ 料金: ${fee}`,
    "■ ゲストからのメモ:",
    "",
    "【顧客情報】",
    "■ 氏名: Tanaka Asami",
    "■ 電話: +81 90 5536 7938",
    "■ メールアドレス: y.shino.earth@gmail.com",
    "",
    "【宿泊情報】",
    "■ 宿泊施設: わたや Roopt葉山上山口",
    "■ 宿泊期間: 2026-08-13 〜 2026-08-14",
    "■ 宿泊人数: 大人3 子供1 幼児0",
    "",
    "承認/NG はこちらから:",
    `https://script.google.com/macros/s/AKfycbxoF3uqU9zCJ4DSH2GyTc4MYC3tR2rHEF8mBxM65DscDCHpxRX7bk2maRp_ZGcjfeBfCg/exec?p=prov-beatice&r=${rToken}&t=e353cd4b513dc484c8b3c4fc835ebf16e4adcc7492842ed6ce2d19a2a0152ad6`,
    "",
    "■ 予約一覧・iCal 取得 (ダッシュボード)",
    dashboard,
    "— Roopt 運営",
  ].join("\n");
}

export const SUBJECT = "【Roopt】アクティビティ予約のご確認";

export const SAMPLE_ICE: RawMail = {
  messageId: "msg-ice-1",
  subject: SUBJECT,
  receivedAt: "2026-06-17T21:24:10+09:00",
  body: build("棚田米アイスづくりと野草茶体験", "15:40~17:00", "12,500円", "ac23a431_tanada-ice%20_20260813"),
};

export const SAMPLE_NOSAGYO: RawMail = {
  messageId: "msg-nosagyo-1",
  subject: SUBJECT,
  receivedAt: "2026-06-17T21:24:20+09:00",
  body: build("棚田と里山の農作業体験", "15:40~17:00", "12,500円", "ac23a431_tanada-nosagyo_20260813"),
};

export const SAMPLE_ICE_DUP: RawMail = {
  messageId: "msg-ice-2",
  subject: SUBJECT,
  receivedAt: "2026-06-17T21:24:25+09:00",
  body: build("棚田米アイスづくりと野草茶体験", "15:40~17:00", "12,500円", "ac23a431_tanada-ice%20_20260813"),
};

export const SAMPLE_SANSAKU: RawMail = {
  messageId: "msg-sansaku-1",
  subject: SUBJECT,
  receivedAt: "2026-06-17T21:24:30+09:00",
  body: build("棚田散策", "15:00~15:30", "（不明）", "ac23a431_tanada-sansaku_20260813"),
};

// 食体験（prov-joinearth）は件名テンプレが異なり、手動転送で届くと本文が
// 転送ヘッダと差出人の署名で挟まれる。個人情報はダミーに差し替えてある。
export const SUBJECT_FWD = "Fwd: [Roopt] 新しいアクティビティ予約: 三浦半島の魚介と棚田米のごちそう夕食 2026-08-12";

export const SAMPLE_FWD_DINNER: RawMail = {
  messageId: "msg-fwd-dinner-1",
  subject: SUBJECT_FWD,
  receivedAt: "2026-08-13T11:31:51+09:00",
  body: [
    "---------- Forwarded message ---------",
    "From: Roopt 運営 <info@roopt.jp>",
    "Date: 2026年8月8日(土) 21:59",
    "Subject: [Roopt] 新しいアクティビティ予約: 三浦半島の魚介と棚田米のごちそう夕食 2026-08-12",
    "To: <provider@example.com>",
    "",
    "Join Earth 様",
    "",
    "下記のアクティビティ予約が入りました。ご確認の上、承認/NG のご回答をお願いします。",
    "",
    "【アクティビティ情報】",
    "■ 予約日時: 2026-08-08 21:59",
    "■ アクティビティ: 三浦半島の魚介と棚田米のごちそう夕食",
    "■ 日付: 2026-08-12",
    "■ 開催時間: 18時迄に受渡し",
    "■ 参加人数: 大人4名 (合計4名)",
    "■ 料金: 24,000円",
    "■ ゲストからのメモ:",
    "",
    "【顧客情報】",
    "■ 氏名: 山田 太郎",
    "■ 電話: 8000000000",
    "■ メールアドレス: guest@example.com",
    "",
    "【宿泊情報】",
    "■ 宿泊施設: わたや Roopt葉山上山口",
    "■ 宿泊期間: 2026-08-12 〜 2026-08-13",
    "■ 宿泊人数: 大人7 子供0 幼児0",
    "",
    "承認/NG はこちらから:",
    "https://script.google.com/macros/s/AKfycbxoF3uqU9zCJ4DSH2GyTc4MYC3tR2rHEF8mBxM65DscDCHpxRX7bk2maRp_ZGcjfeBfCg/exec?p=prov-joinearth&r=01f2bf14_dinner-wataya_20260812&t=f11b646c376d20ae5c01467fdae4141a8d6f0a98ccedd1b5b6978ee536bc3ffa",
    "",
    "■ 予約一覧・iCal 取得 (ダッシュボード)",
    "https://script.google.com/macros/s/AKfycbxoF3uqU9zCJ4DSH2GyTc4MYC3tR2rHEF8mBxM65DscDCHpxRX7bk2maRp_ZGcjfeBfCg/exec?dashboard=1&p=prov-joinearth&t=5a1f8fddb78f789f565d8d2491007af5b341591ef2d9a783e2773f8deef70e10",
    "※ 過去・今後の全予約の一覧、カレンダー購読用 iCal URL の取得ができます。ブックマーク推奨。",
    "",
    "— Roopt 運営",
    "",
    "--",
    "",
    "篠原祐太 / Yuta Shinohara",
    "",
    "株式会社Join Earth 代表取締役",
    "",
    "https://antcicada.com",
  ].join("\n"),
};
