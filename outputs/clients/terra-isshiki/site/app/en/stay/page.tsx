import { StayView } from "../../_pages/StayView";
import { getCopy } from "../../copy";
import { alternatesFor, openGraphFor } from "../../i18n/metadata";

const copy = getCopy("en");

export const metadata = {
  title: copy.STAY_PAGE.metaTitle,
  description: copy.STAY_PAGE.metaDescription,
  alternates: alternatesFor("/stay", "en"),
  openGraph: {
    ...openGraphFor("en", "/stay"),
    title: copy.STAY_PAGE.metaTitle,
    description: copy.STAY_PAGE.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: copy.STAY_PAGE.metaTitle,
    description: copy.STAY_PAGE.metaDescription,
    images: [copy.META.ogImage],
  },
};

export default function StayPageEn() {
  return <StayView copy={copy} locale="en" />;
}
