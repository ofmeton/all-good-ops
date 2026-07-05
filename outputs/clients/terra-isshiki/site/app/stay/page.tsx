import { StayView } from "../_pages/StayView";
import { getCopy } from "../copy";

/* 文言・写真パスは app/copy.ts（STAY_PAGE）で編集できます。
   このページは _pages/StayView.tsx へ薄く委譲するだけです。 */

const copy = getCopy("ja");

export const metadata = {
  title: copy.STAY_PAGE.metaTitle,
  description: copy.STAY_PAGE.metaDescription,
};

export default function StayPage() {
  return <StayView copy={copy} locale="ja" />;
}
