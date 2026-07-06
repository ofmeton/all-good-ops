import { HomeView } from "./_pages/HomeView";
import { getCopy } from "./copy";
import { alternatesFor, openGraphFor } from "./i18n/metadata";

/* 文言・写真パスはすべて app/copy.ts で編集できます。
   このページは _pages/HomeView.tsx へ薄く委譲するだけです（言語別ルートの土台）。
   タイトル・説明はルート layout の既定（META）を使うため、ここでは付けない。 */

const copy = getCopy("ja");

export const metadata = {
  alternates: alternatesFor("/", "ja"),
  openGraph: openGraphFor("ja", "/"),
};

export default function HomePage() {
  return <HomeView copy={copy} locale="ja" />;
}
