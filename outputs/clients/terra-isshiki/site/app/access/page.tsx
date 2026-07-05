import { AccessView } from "../_pages/AccessView";
import { getCopy } from "../copy";
import { alternatesFor, openGraphFor } from "../i18n/metadata";

/* 文言・写真パスは app/copy.ts（ACCESS_PAGE / POINTS / SITE）で編集できます。
   このページは _pages/AccessView.tsx へ薄く委譲するだけです。 */

const copy = getCopy("ja");

export const metadata = {
  title: copy.ACCESS_PAGE.metaTitle,
  description: copy.ACCESS_PAGE.metaDescription,
  alternates: alternatesFor("/access", "ja"),
  openGraph: openGraphFor("ja", "/access"),
};

export default function AccessPage() {
  return <AccessView copy={copy} locale="ja" />;
}
