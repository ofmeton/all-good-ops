import { RoomsView } from "../_pages/RoomsView";
import { getCopy } from "../copy";
import { alternatesFor, openGraphFor } from "../i18n/metadata";

/* 文言・写真パスは app/copy.ts（ROOMS_PAGE）で編集できます。
   このページは _pages/RoomsView.tsx へ薄く委譲するだけです。 */

const copy = getCopy("ja");

export const metadata = {
  title: copy.ROOMS_PAGE.metaTitle,
  description: copy.ROOMS_PAGE.metaDescription,
  alternates: alternatesFor("/rooms", "ja"),
  openGraph: openGraphFor("ja", "/rooms"),
};

export default function RoomsPage() {
  return <RoomsView copy={copy} locale="ja" />;
}
