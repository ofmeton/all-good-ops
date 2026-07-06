/* ------------------------------------------------------------------
 * UI 辞書 — copy（サイト運用者が studio で編集する文言）とは別に、
 * aria-label・カレンダー凡例・操作ラベルなど「機能側の UI 文字列」を
 * 言語別に持つ。関数フィールド（(n) => ...）を含むため Server→Client の
 * props で丸ごと渡せない。各コンポーネントで getDict(locale) を呼ぶこと。
 * ------------------------------------------------------------------ */
import type { Locale } from "./config";

export type Dict = {
  // SiteHeader
  langSwitchAria: string;
  openMenu: string;
  closeMenu: string;
  // AvailabilityCalendarUI（月名は英語で共通のため辞書に持たない）
  weekdays: readonly string[];
  monthTablistAria: string;
  bookedTitle: string;
  bookedDayAria: (day: number) => string;
  bookDayAria: (day: number) => string;
  legendBooked: string;
  legendOpen: string;
  lagNote: string;
  // RoomsGallery
  galleryZoomAria: (caption: string, n: number) => string;
  prevPhoto: string;
  nextPhoto: string;
  gotoPhotoAria: (n: number) => string;
  close: string;
  // rooms ページの注意事項アコーディオン開閉ラベル
  roomsNoticesToggle: (count: number) => string;
  // TOP の帯リンク aria（band.title は各言語のタイトルが入る）
  bandViewAria: (title: string) => string;
};

const ja: Dict = {
  langSwitchAria: "Language / 言語切替",
  openMenu: "メニューを開く",
  closeMenu: "メニューを閉じる",
  weekdays: ["日", "月", "火", "水", "木", "金", "土"],
  monthTablistAria: "表示する月",
  bookedTitle: "満室",
  bookedDayAria: (day) => `${day}日 満室`,
  bookDayAria: (day) => `${day}日 — Airbnb で予約`,
  legendBooked: "満室・チェックアウト前後",
  legendOpen: "空き・クリックで Airbnb 予約画面へ",
  lagNote: "※ Airbnb の予約状況と最大 1 時間のラグがあります。",
  galleryZoomAria: (caption, n) => `${caption} の写真 ${n} を拡大表示`,
  prevPhoto: "前の写真",
  nextPhoto: "次の写真",
  gotoPhotoAria: (n) => `${n} 枚目へ`,
  close: "閉じる",
  roomsNoticesToggle: (count) => `ご注意事項 全 ${count} 件をひらく`,
  bandViewAria: (title) => `${title}を見る`,
};

const en: Dict = {
  langSwitchAria: "Language",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  monthTablistAria: "Select month",
  bookedTitle: "Booked",
  bookedDayAria: (day) => `${day} — Booked`,
  bookDayAria: (day) => `${day} — Book on Airbnb`,
  legendBooked: "Booked or turnover day",
  legendOpen: "Available — book on Airbnb",
  lagNote: "* Availability may lag Airbnb by up to an hour.",
  galleryZoomAria: (caption, n) => `Enlarge photo ${n} of ${caption}`,
  prevPhoto: "Previous photo",
  nextPhoto: "Next photo",
  gotoPhotoAria: (n) => `Go to photo ${n}`,
  close: "Close",
  roomsNoticesToggle: (count) => `Open all ${count} notes`,
  bandViewAria: (title) => `View ${title}`,
};

const MAP: Record<Locale, Dict> = { ja, en };

export function getDict(locale: Locale): Dict {
  return MAP[locale] ?? ja;
}
