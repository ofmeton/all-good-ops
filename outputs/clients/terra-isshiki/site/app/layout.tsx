import type { Metadata } from "next";
import { Noto_Serif_JP, Zen_Old_Mincho, EB_Garamond } from "next/font/google";
import { MobileStickyReserve } from "./_components/MobileStickyReserve";
import { SideReserve } from "./_components/SideReserve";
import { META } from "./copy";
import "./globals.css";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const zenOldMincho = Zen_Old_Mincho({
  variable: "--font-zen-old-mincho",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

/* タイトル・説明文は app/copy.ts（META）で編集できます。 */
export const metadata: Metadata = {
  title: {
    default: META.siteTitle,
    template: META.titleTemplate,
  },
  description: META.description,
  metadataBase: new URL("https://site-eosin-one-44.vercel.app"),
  openGraph: {
    title: META.siteTitle,
    description: META.description,
    url: "/",
    siteName: "TERRA HAYAMA",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: META.ogImage,
        width: 1440,
        height: 958,
        alt: META.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: META.siteTitle,
    description: META.twitterDescription,
    images: [META.ogImage],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${notoSerifJP.variable} ${zenOldMincho.variable} ${ebGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* reveal はJS有効時のみ隠す。ペイント前に html へ class を付与し、
            no-JS では本文を常に表示（コンテンツが消えないように）。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('js-reveal');" +
              "if(location.pathname==='/en'||location.pathname.indexOf('/en/')===0){document.documentElement.lang='en';}",
          }}
        />
        {children}
        <SideReserve />
        <MobileStickyReserve />
        {/* web-ui-bridge: dev 限定。クリック→Claude Code 橋渡し overlay。本番ビルドには出力されない。 */}
        {process.env.NODE_ENV === "development" && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script src="http://localhost:7331/overlay.js" async />
        )}
      </body>
    </html>
  );
}
