import { HomeView } from "./_pages/HomeView";
import { getCopy } from "./copy";

/* 文言・写真パスはすべて app/copy.ts で編集できます。
   このページは _pages/HomeView.tsx へ薄く委譲するだけです（言語別ルートの土台）。 */

const copy = getCopy("ja");

export default function HomePage() {
  return <HomeView copy={copy} locale="ja" />;
}
