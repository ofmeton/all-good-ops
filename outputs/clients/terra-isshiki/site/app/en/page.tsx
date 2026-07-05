import { HomeView } from "../_pages/HomeView";
import { getCopy } from "../copy";
import { alternatesFor, openGraphFor } from "../i18n/metadata";

/* English home. Delegates to _pages/HomeView.tsx with the English copy.
   title は absolute で ja 既定テンプレートを上書きし、OG/Twitter も英語に差し替える。 */

const copy = getCopy("en");

export const metadata = {
  title: { absolute: copy.META.siteTitle },
  description: copy.META.description,
  alternates: alternatesFor("/", "en"),
  openGraph: {
    ...openGraphFor("en", "/"),
    title: copy.META.siteTitle,
    description: copy.META.description,
  },
  twitter: {
    title: copy.META.siteTitle,
    description: copy.META.twitterDescription,
  },
};

export default function HomePageEn() {
  return <HomeView copy={copy} locale="en" />;
}
