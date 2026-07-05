import { RoomsView } from "../_pages/RoomsView";
import { getCopy } from "../copy";

/* 文言・写真パスは app/copy.ts（ROOMS_PAGE）で編集できます。
   このページは _pages/RoomsView.tsx へ薄く委譲するだけです。 */

const copy = getCopy("ja");

export const metadata = {
  title: copy.ROOMS_PAGE.metaTitle,
  description: copy.ROOMS_PAGE.metaDescription,
};

export default function RoomsPage() {
  return <RoomsView copy={copy} locale="ja" />;
}
