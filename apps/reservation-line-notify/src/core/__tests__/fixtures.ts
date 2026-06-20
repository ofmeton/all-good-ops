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
