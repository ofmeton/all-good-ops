import { RoomsView } from "../../_pages/RoomsView";
import { getCopy } from "../../copy";
import { alternatesFor, openGraphFor } from "../../i18n/metadata";

const copy = getCopy("en");

export const metadata = {
  title: copy.ROOMS_PAGE.metaTitle,
  description: copy.ROOMS_PAGE.metaDescription,
  alternates: alternatesFor("/rooms", "en"),
  openGraph: {
    ...openGraphFor("en", "/rooms"),
    title: copy.ROOMS_PAGE.metaTitle,
    description: copy.ROOMS_PAGE.metaDescription,
  },
};

export default function RoomsPageEn() {
  return <RoomsView copy={copy} locale="en" />;
}
