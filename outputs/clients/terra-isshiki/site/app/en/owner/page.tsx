import { OwnerView } from "../../_pages/OwnerView";
import { getCopy } from "../../copy";
import { alternatesFor, openGraphFor } from "../../i18n/metadata";

const copy = getCopy("en");

export const metadata = {
  title: copy.OWNER_PAGE.metaTitle,
  description: copy.OWNER_PAGE.metaDescription,
  alternates: alternatesFor("/owner", "en"),
  openGraph: {
    ...openGraphFor("en", "/owner"),
    title: copy.OWNER_PAGE.metaTitle,
    description: copy.OWNER_PAGE.metaDescription,
  },
  twitter: {
    title: copy.OWNER_PAGE.metaTitle,
    description: copy.OWNER_PAGE.metaDescription,
  },
};

export default function OwnerPageEn() {
  return <OwnerView copy={copy} locale="en" />;
}
