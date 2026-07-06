import { ReserveView } from "../_pages/ReserveView";
import { getCopy } from "../copy";
import { alternatesFor, openGraphFor } from "../i18n/metadata";

/* 文言は app/copy.ts（RESERVE_PAGE / SITE / NOTICES）で編集できます。
   このページは _pages/ReserveView.tsx へ薄く委譲するだけです。 */

const copy = getCopy("ja");

export const metadata = {
  title: copy.RESERVE_PAGE.metaTitle,
  alternates: alternatesFor("/reserve", "ja"),
  openGraph: openGraphFor("ja", "/reserve"),
};

export default function ReservePage() {
  return <ReserveView copy={copy} locale="ja" />;
}
