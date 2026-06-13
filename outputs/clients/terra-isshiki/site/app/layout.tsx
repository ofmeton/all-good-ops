import type { Metadata } from "next";
import { Noto_Serif_JP, Zen_Old_Mincho, EB_Garamond } from "next/font/google";
import { MobileStickyReserve } from "./_components/MobileStickyReserve";
import { SideReserve } from "./_components/SideReserve";
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

export const metadata: Metadata = {
  title: {
    default: "TERRA HAYAMA — 葉山一棟貸しの宿",
    template: "%s · TERRA HAYAMA",
  },
  description:
    "葉山一色海岸まで徒歩 8 分。葉山アイス屋 BEAT ICE が営む、海と山の風景に溶ける一棟貸しの宿。",
  metadataBase: new URL("https://terra-hayama.example.com"),
  openGraph: {
    title: "TERRA HAYAMA — 葉山一棟貸しの宿",
    description:
      "葉山一色海岸まで徒歩 8 分。葉山アイス屋 BEAT ICE が営む、海と山の風景に溶ける一棟貸しの宿。",
    url: "/",
    siteName: "TERRA HAYAMA",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/images/hero/hero-01-living.jpg",
        width: 1440,
        height: 958,
        alt: "TERRA HAYAMA — リビングダイニング",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TERRA HAYAMA — 葉山一棟貸しの宿",
    description:
      "葉山一色海岸まで徒歩 8 分。BEAT ICE が営む、海と山の風景に溶ける一棟貸し。",
    images: ["/images/hero/hero-01-living.jpg"],
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
            __html: "document.documentElement.classList.add('js-reveal')",
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
