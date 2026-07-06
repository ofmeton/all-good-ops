import { OwnerView } from "../_pages/OwnerView";
import { getCopy } from "../copy";
import { alternatesFor, openGraphFor } from "../i18n/metadata";

/* 文言・写真パスは app/copy.ts（OWNER_PAGE）で編集できます。
   このページは _pages/OwnerView.tsx へ薄く委譲するだけです。 */

const copy = getCopy("ja");

export const metadata = {
  title: copy.OWNER_PAGE.metaTitle,
  description: copy.OWNER_PAGE.metaDescription,
  alternates: alternatesFor("/owner", "ja"),
  openGraph: openGraphFor("ja", "/owner"),
};

export default function OwnerPage() {
  return <OwnerView copy={copy} locale="ja" />;
}
