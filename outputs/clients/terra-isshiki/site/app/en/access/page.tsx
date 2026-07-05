import { AccessView } from "../../_pages/AccessView";
import { getCopy } from "../../copy";
import { alternatesFor, openGraphFor } from "../../i18n/metadata";

const copy = getCopy("en");

export const metadata = {
  title: copy.ACCESS_PAGE.metaTitle,
  description: copy.ACCESS_PAGE.metaDescription,
  alternates: alternatesFor("/access", "en"),
  openGraph: {
    ...openGraphFor("en", "/access"),
    title: copy.ACCESS_PAGE.metaTitle,
    description: copy.ACCESS_PAGE.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: copy.ACCESS_PAGE.metaTitle,
    description: copy.ACCESS_PAGE.metaDescription,
    images: [copy.META.ogImage],
  },
};

export default function AccessPageEn() {
  return <AccessView copy={copy} locale="en" />;
}
