import { OwnerView } from "../../_pages/OwnerView";
import { getCopy } from "../../copy";
import { alternatesFor, openGraphFor } from "../../i18n/metadata";

const copy = getCopy("en");

export const metadata = {
  title: copy.OWNER_PAGE.metaTitle,
  description: copy.OWNER_PAGE.metaDescription,
  alternates: alternatesFor("/owner", "en"),
  openGraph: openGraphFor("en", "/owner"),
};

export default function OwnerPageEn() {
  return <OwnerView copy={copy} locale="en" />;
}
