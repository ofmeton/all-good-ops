import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { RoomsGallery } from "../_components/RoomsGallery";
import { ReservationCTA } from "../_components/ReservationCTA";

export const metadata = {
  title: "Rooms",
  description:
    "TERRA HAYAMA の部屋と空間。LDK・寝室・バスルーム・ランドリー・キッチン詳細をご紹介します。",
};

const SPECS: { label: string; en: string; value: React.ReactNode }[] = [
  { label: "チェックイン", en: "Check-in", value: "16:00 – 23:00" },
  { label: "チェックアウト", en: "Check-out", value: "11:00" },
  {
    label: "定員",
    en: "Capacity",
    value: (
      <>
        最大 8 名様
        <span className="block mt-1 text-[13px] md:text-[clamp(13px,0.7vw,18px)] text-(--color-base-dark)/55">
          快適にお過ごしいただける目安は 6 名様以下
        </span>
      </>
    ),
  },
  {
    label: "サイズ",
    en: "Room size",
    value: "75 ㎡（居室 43 ㎡ / 寝室 32 ㎡）",
  },
  { label: "駐車場", en: "Parking", value: "2 台" },
];

const FACILITY_GROUPS: { title: string; en: string; body: React.ReactNode }[] = [
  {
    title: "キッチン",
    en: "Kitchen",
    body: (
      <>
        各種調理器具を備えています。調味料は、醤油・酒・みりん・塩こしょう・油をご用意。足りない分は徒歩圏内のコンビニ・スーパーで調達をお願いいたします。
      </>
    ),
  },
  {
    title: "調理器具",
    en: "Cookware",
    body: "フライパン／鍋／まな板／包丁／ボウル／ザル／菜箸／トング／フライ返し／お玉／穴あきお玉／ピーラー／計量スプーン／ラップ／アルミホイル",
  },
  {
    title: "食器",
    en: "Tableware",
    body: "大皿・深皿・平皿・茶碗・汁椀・ワイングラス・マグカップ・グラス・スプーン・フォーク・箸・ワインオープナーなど、人数分揃えています。",
  },
  {
    title: "洗濯",
    en: "Laundry",
    body: "ドラム式洗濯機を備えています。洗剤も用意していますので、ご自宅と同じように洗濯ができます。皺の気になる衣類は室内干し用のハンガーラックでどうぞ。",
  },
  {
    title: "設備",
    en: "Amenities",
    body: "TV（地上波 / YouTube / Amazon Prime / Netflix 等）／2 口 IH コンロ／冷蔵庫／炊飯器／オーブンレンジ／電気ケトル／ドライヤー／ハンガーラック・ハンガー／スピーカー／抹茶マシーン／Wi-Fi 完備",
  },
  {
    title: "冷暖房器具",
    en: "Climate",
    body: "LDK（エアコン 1 台）／寝室（エアコン 1 台）",
  },
  {
    title: "アメニティ",
    en: "Toiletries",
    body: "バスタオル・フェイスタオル／歯ブラシ／ボディソープ／シャンプー／コンディショナー／洗顔フォーム／化粧水／乳液／綿棒／洗濯用洗剤 等",
  },
];

const NOTICES: string[] = [
  "正面玄関ではなく、外階段を上って 2 階のお部屋にお入りいただきます。エレベーターはございませんのでご注意ください。",
  "室内は全面禁煙です。屋外では喫煙可能ですが灰皿のご用意はございません。携帯灰皿をご持参のうえ、吸い殻の処理をお願いいたします。室内での喫煙が発覚した場合、クリーニング費用をご請求させていただきます。",
  "近隣のお住まいの方々のご迷惑となりますので、夜間、屋外での大声での会話や音楽再生はお控えください。",
  "葉山は自然豊かな町なので、隙間から虫が侵入する可能性がございます。苦手な方はご注意ください。",
  "設備を損傷したり、寝具を著しく汚した場合、追加の清掃費・賠償費用をご請求させていただく場合があります。",
  "寝間着のご用意はございませんのでご持参ください。",
  "タオル・寝具はお一人様 1 セットずつのご利用をお願いしております。",
  "寝具類を使わない 6 歳以下のお子様がいらっしゃる場合はご相談ください。",
];

export default function RoomsPage() {
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Rooms" />

      {/* Hero */}
      <section className="relative h-[64svh] min-h-[420px] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        <Image
          src="/images/rooms/rooms-hero.jpg"
          alt="TERRA HAYAMA Rooms — リビングと寝室をつなぐ空間"
          fill
          priority
          sizes="100vw"
          quality={88}
          className="object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,20,16,0.30) 0%, rgba(26,20,16,0.05) 35%, rgba(26,20,16,0.55) 100%)",
          }}
        />
        <div className="absolute bottom-12 left-6 md:bottom-20 md:left-12 z-10 max-w-[88%] md:max-w-[760px]">
          <p
            className="fade-up font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] text-(--color-base-light)/80 mb-5"
            style={{ animationDelay: "0.3s" }}
          >
            Rooms
          </p>
          <h1
            className="fade-up font-serif font-medium text-[34px] leading-[1.2] md:text-[clamp(46px,3.91vw,100px)] md:leading-[1.14] tracking-[0.02em]"
            style={{ animationDelay: "0.55s" }}
          >
            <span className="block whitespace-nowrap">部屋と空間。</span>
          </h1>
          <p
            className="fade-up mt-5 md:mt-8 font-mincho text-[14px] md:text-[clamp(16px,1.02vw,26px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/85"
            style={{ animationDelay: "0.85s" }}
          >
            一軒家の二階を一棟貸し。<br />
            最大 8 名まで滞在できる、ゆとりの間取り。
          </p>
        </div>
      </section>

      {/* Sections with lightbox */}
      <RoomsGallery />

      {/* Overview — Specs / Facilities / Notices */}
      <section
        id="overview"
        className="relative bg-(--color-paper) px-6 py-[clamp(96px,8.34vw,128px)] md:px-12"
      >
        <div className="mx-auto max-w-[1480px]">
          <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-4">
            Overview
          </p>
          <h2 className="font-serif text-[26px] md:text-[clamp(32px,2.5vw,64px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-14 md:mb-20">
            宿のご利用について。
          </h2>

          {/* Specs table */}
          <div className="mb-20 md:mb-28">
            <p className="font-garamond italic text-[clamp(12px,0.78vw,20px)] tracking-[0.42em] uppercase text-(--color-base-dark)/55 mb-6">
              House Info
            </p>
            <dl className="border-t border-(--color-base-dark)/15 divide-y divide-(--color-base-dark)/10">
              {SPECS.map((spec) => (
                <div
                  key={spec.label}
                  className="grid grid-cols-[112px_1fr] md:grid-cols-[200px_1fr] gap-x-6 py-5 md:py-6"
                >
                  <dt className="flex flex-col">
                    <span className="font-serif text-[15px] md:text-[clamp(17px,1.02vw,26px)] tracking-[0.08em] text-(--color-base-dark)">
                      {spec.label}
                    </span>
                    <span className="mt-1 font-garamond italic text-[11px] md:text-[clamp(12px,0.62vw,16px)] tracking-[0.28em] uppercase text-(--color-base-dark)/45">
                      {spec.en}
                    </span>
                  </dt>
                  <dd className="font-mincho text-[15px] md:text-[clamp(16px,0.94vw,24px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90 pt-[3px]">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Facilities */}
          <div className="mb-20 md:mb-28">
            <p className="font-garamond italic text-[clamp(12px,0.78vw,20px)] tracking-[0.42em] uppercase text-(--color-base-dark)/55 mb-6">
              Facility
            </p>
            <h3 className="font-serif text-[22px] md:text-[clamp(26px,1.95vw,50px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10 md:mb-14">
              キッチン・設備・備品。
            </h3>
            <dl className="grid gap-y-10 md:gap-y-12 md:grid-cols-2 md:gap-x-16">
              {FACILITY_GROUPS.map((group) => (
                <div
                  key={group.title}
                  className="border-t border-(--color-base-dark)/15 pt-5"
                >
                  <dt className="flex items-baseline gap-4 mb-3">
                    <span className="font-serif text-[18px] md:text-[clamp(20px,1.17vw,30px)] tracking-[0.06em] text-(--color-base-dark)">
                      {group.title}
                    </span>
                    <span className="font-garamond italic text-[11px] md:text-[clamp(12px,0.62vw,16px)] tracking-[0.32em] uppercase text-(--color-base-dark)/45">
                      {group.en}
                    </span>
                  </dt>
                  <dd className="font-mincho text-[14px] md:text-[clamp(15px,0.86vw,22px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                    {group.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Notices */}
          <div>
            <p className="font-garamond italic text-[clamp(12px,0.78vw,20px)] tracking-[0.42em] uppercase text-(--color-base-dark)/55 mb-6">
              Important
            </p>
            <h3 className="font-serif text-[22px] md:text-[clamp(26px,1.95vw,50px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10 md:mb-14">
              ご利用にあたって。
            </h3>

            {/* Mobile: collapsed by default to save scroll */}
            <details className="md:hidden group border-t border-(--color-base-dark)/15">
              <summary className="list-none cursor-pointer flex items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
                <span className="font-mincho text-[14px] tracking-[0.06em] text-(--color-base-dark)">
                  ご注意事項 全 {NOTICES.length} 件をひらく
                </span>
                <span
                  aria-hidden
                  className="font-garamond text-[16px] text-(--color-base-dark)/60 transition-transform duration-300 group-open:rotate-45"
                >
                  ＋
                </span>
              </summary>
              <ol className="border-t border-(--color-base-dark)/15">
                {NOTICES.map((text, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[36px_1fr] gap-x-4 border-b border-(--color-base-dark)/10 py-5"
                  >
                    <span className="font-garamond italic text-[13px] tracking-[0.24em] text-(--color-base-dark)/40 pt-[2px]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="font-mincho text-[14px] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                      {text}
                    </p>
                  </li>
                ))}
              </ol>
            </details>

            {/* Desktop: always expanded */}
            <ol className="hidden md:block border-t border-(--color-base-dark)/15">
              {NOTICES.map((text, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[60px_1fr] gap-x-8 border-b border-(--color-base-dark)/10 py-6"
                >
                  <span className="font-garamond italic text-[clamp(14px,0.78vw,20px)] tracking-[0.24em] text-(--color-base-dark)/40 pt-[2px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-mincho text-[clamp(15px,0.86vw,22px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <ReservationCTA tone="dark" />

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12 text-center">
        <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-6">
          Next
        </p>
        <h3 className="font-serif text-[26px] md:text-[clamp(34px,2.81vw,72px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
          葉山で過ごす一日。
        </h3>
        <Link
          href="/stay"
          className="group inline-flex items-center gap-4 font-garamond text-[13px] md:text-[clamp(14px,0.86vw,22px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
        >
          <span className="relative">
            View Stay
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden className="text-[14px]">→</span>
        </Link>
      </section>
    </main>
  );
}
