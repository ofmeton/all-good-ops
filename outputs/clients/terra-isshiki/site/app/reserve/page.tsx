import { ReserveView } from "../_pages/ReserveView";
import { getCopy } from "../copy";

/* 文言は app/copy.ts（RESERVE_PAGE / SITE / NOTICES）で編集できます。
   このページは _pages/ReserveView.tsx へ薄く委譲するだけです。 */

const copy = getCopy("ja");

export const metadata = {
  title: copy.RESERVE_PAGE.metaTitle,
};

export default function ReservePage() {
  return <ReserveView copy={copy} locale="ja" />;
}
