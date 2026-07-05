import { ReserveView } from "../../_pages/ReserveView";
import { getCopy } from "../../copy";
import { alternatesFor, openGraphFor } from "../../i18n/metadata";

const copy = getCopy("en");

export const metadata = {
  title: copy.RESERVE_PAGE.metaTitle,
  alternates: alternatesFor("/reserve", "en"),
  openGraph: {
    ...openGraphFor("en", "/reserve"),
    title: copy.RESERVE_PAGE.metaTitle,
  },
  twitter: {
    title: copy.RESERVE_PAGE.metaTitle,
  },
};

export default function ReservePageEn() {
  return <ReserveView copy={copy} locale="en" />;
}
