import { HomeView } from "../_pages/HomeView";
import { getCopy } from "../copy";
import { alternatesFor, openGraphFor } from "../i18n/metadata";

/* English home. Delegates to _pages/HomeView.tsx with the English copy.
   Title/description fall back to the root layout defaults. */

const copy = getCopy("en");

export const metadata = {
  alternates: alternatesFor("/", "en"),
  openGraph: openGraphFor("en", "/"),
};

export default function HomePageEn() {
  return <HomeView copy={copy} locale="en" />;
}
