import { StayView } from "../../_pages/StayView";
import { getCopy } from "../../copy";
import { alternatesFor, openGraphFor } from "../../i18n/metadata";

const copy = getCopy("en");

export const metadata = {
  title: copy.STAY_PAGE.metaTitle,
  description: copy.STAY_PAGE.metaDescription,
  alternates: alternatesFor("/stay", "en"),
  openGraph: openGraphFor("en", "/stay"),
};

export default function StayPageEn() {
  return <StayView copy={copy} locale="en" />;
}
