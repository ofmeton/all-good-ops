export interface Activity {
  dedupId: string;   // r= フル値を正規化（同一リクエスト判定）
  name: string;      // 例: 棚田米アイスづくりと野草茶体験
  date: string;      // 例: 2026-08-13
  time: string;      // 例: 15:40~17:00 （取れなければ ""）
  fee: number | null; // 円。欠損は null
}

export interface Customer { name: string; phone: string; email: string; }
export interface Stay { facility: string; period: string; headcount: string; }

export interface ParsedReservation {
  reservationKey: string; // 例: ac23a431
  customer: Customer;
  stay: Stay;
  activity: Activity;
  participants: string;   // 参加人数（例: 大人3名 / 小学生1名 (合計4名)）
  approvalUrl: string;    // 承認/NG リンク（r= を含む）
  dashboardUrl: string;
  messageId: string;
  receivedAt: string;     // ISO8601
}

export interface RawMail {
  messageId: string;
  subject: string;
  body: string;
  receivedAt: string;     // ISO8601
}
