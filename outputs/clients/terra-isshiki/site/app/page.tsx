import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./_components/SiteHeader";
import { OpeningHero } from "./_components/OpeningHero";
import { RevealRoot } from "./_components/RevealRoot";
import { ParallaxLayer } from "./_components/ParallaxLayer";

// FV は「建物の外観・内観が伝わる写真」のみ（世界観カットは不使用）。
// 外観 → 内観を交互に並べ、第一印象で建物が伝わる構成。
const HERO_SLIDES = [
  { src: "/images/hero/hero-exterior-01.jpg", alt: "TERRA HAYAMA 外観 — 白漆喰と焼杉の蔵のような佇まい" },
  { src: "/images/hero/hero-01-living.jpg", alt: "TERRA HAYAMA リビングダイニング" },
  { src: "/images/hero/hero-02-bedroom.jpg", alt: "TERRA HAYAMA 寝室" },
  { src: "/images/hero/hero-exterior-02.jpg", alt: "TERRA HAYAMA 外観 — 葉山一色の住宅地に建つ一軒家" },
  { src: "/images/hero/hero-03-dining.jpg", alt: "TERRA HAYAMA ダイニングとキッチン" },
  { src: "/images/hero/hero-04-arch.jpg", alt: "TERRA HAYAMA 和モダンの空間" },
];

const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";
const ADDRESS = "〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5";
const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "神奈川県三浦郡葉山町一色1759-1-5",
)}`;

/* ---------------------------------------------------------------
 * 章ごとの要約データ。
 * 出典はすべて各下層ページ（/rooms /stay /owner /access）の記載事実。
 * TOP はその要約であり、値を変えるときは下層ページと揃えること。
 * --------------------------------------------------------------- */

// 01 Rooms — 宿の基本情報（/rooms「House Info」と同値）
const HOUSE_SPECS: { label: string; en: string; value: string; note?: string }[] = [
  { label: "チェックイン", en: "Check-in", value: "16:00 – 23:00" },
  { label: "チェックアウト", en: "Check-out", value: "11:00" },
  { label: "定員", en: "Capacity", value: "最大 8 名", note: "快適の目安は 6 名まで" },
  { label: "広さ", en: "Room size", value: "75 ㎡", note: "居室 43 ㎡・寝室 32 ㎡" },
  { label: "駐車場", en: "Parking", value: "2 台" },
];

// 01 Rooms — 3 つの空間（/rooms ギャラリーの要約）
const ROOM_SPACES: { en: string; jp: string; body: string; img: string }[] = [
  {
    en: "LDK",
    jp: "リビング・ダイニング・キッチン",
    body: "木の天井と一面の窓。ソファと楕円のダイニングテーブルを囲んで。",
    img: "/images/rooms/ldk-01.jpg",
  },
  {
    en: "Bedroom",
    jp: "最大 8 名の寝室",
    body: "二段ベッド 2 台・セミダブル 1 台・布団 2 組。家族や友人グループでまとまって。",
    img: "/images/rooms/bedroom-01.jpg",
  },
  {
    en: "Bath & Laundry",
    jp: "お風呂と水まわり",
    body: "ひのきに包まれたバスルームと、真鍮の洗面ボウル。",
    img: "/images/rooms/bath.jpg",
  },
];

// 02 Stay — 過ごし方（/stay の 4 項目の要約）
const STAY_MOMENTS: { no: string; jp: string; body: string }[] = [
  {
    no: "01",
    jp: "まずは、一色海岸へ",
    body: "宿から海まで徒歩 8 分。朝の散歩に、夕方の寄り道に。",
  },
  {
    no: "02",
    jp: "海越しの富士山",
    body: "空気が澄んだ日は、一色海岸の向こうに富士山が見えることも。",
  },
  {
    no: "03",
    jp: "抹茶を、気軽に",
    body: "キッチンに抹茶マシーンを置いてあります。滞在中のひと息に。",
  },
  {
    no: "04",
    jp: "棚田と BEAT ICE",
    body: "棚田で育てたお米がアイスクリームになる。その営みが宿の背景にあります。",
  },
];

// 03 Owner — BEAT ICE の営み（/owner「Our work」の要約）
const OWNER_WORKS: { en: string; jp: string; body: string; img: string }[] = [
  {
    en: "Ice Cream",
    jp: "棚田米のアイスクリーム",
    body: "自分たちで育てたお米からつくる、米麹由来のやさしい甘み。",
    img: "/images/owner/owner-icecream.webp",
  },
  {
    en: "School Lunch",
    jp: "学校給食の提供",
    body: "つくったアイスを、地域の学校の給食に。教室で授業をすることも。",
    img: "/images/owner/owner-school-lunch.jpg",
  },
  {
    en: "Rice Field",
    jp: "田んぼでの営み",
    body: "棚田で土にふれ、季節とともに米を育てる暮らし。",
    img: "/images/owner/owner-tanada-work.jpg",
  },
  {
    en: "Our Family",
    jp: "夫婦のものづくり",
    body: "2015 年に葉山へ。暮らしも、ものづくりも、ふたりで。",
    img: "/images/owner/owner-family.jpg",
  },
];

// 04 Neighborhood — 周辺への距離（/access「Map」の一覧と同値）
const POINTS: { name: string; time: string; note: string }[] = [
  { name: "一色海岸", time: "徒歩 8 分", note: "CNN 世界の厳選ビーチ 100 選" },
  { name: "セブンイレブン 葉山一色店", time: "徒歩 30 秒", note: "日用品・夜食のちょっとした買い出しに" },
  { name: "スズキヤ 葉山店", time: "徒歩 5 分", note: "地元の食材が揃う地域のスーパー。滞在中の自炊に" },
  { name: "森戸海岸", time: "車 8 分", note: "海水浴と夕陽のスポット" },
  { name: "上山口の棚田", time: "車 12 分", note: "葉山アイスのお米を育てる棚田" },
  { name: "旧役場前 バス停", time: "徒歩 1 分", note: "葉山〜JR 逗子駅を結ぶ路線バスの最寄り停留所" },
  { name: "JR 逗子駅", time: "車 15 分 / バス 25 分", note: "横須賀線・湘南新宿ライン" },
];

// 05 Amenities — 設備・備品の要約（完全なリストは /rooms#overview）
const AMENITY_GROUPS: { jp: string; en: string; body: string }[] = [
  {
    jp: "キッチン",
    en: "Kitchen",
    body: "2 口 IH・冷蔵庫・炊飯器・オーブンレンジ・電気ケトル。抹茶マシーンも置いてあります。",
  },
  {
    jp: "調理器具・食器",
    en: "Cookware",
    body: "フライパン、鍋、包丁、ボウルなど調理器具は一式。食器とカトラリーは人数分。",
  },
  {
    jp: "洗濯",
    en: "Laundry",
    body: "ドラム式洗濯機。洗剤と、室内干し用のハンガーラックを用意しています。",
  },
  {
    jp: "TV・音楽・Wi-Fi",
    en: "Media",
    body: "TV（地上波 / YouTube / Netflix 等）、スピーカー、Wi-Fi 完備。",
  },
  {
    jp: "冷暖房",
    en: "Climate",
    body: "LDK と寝室に、エアコンを 1 台ずつ。",
  },
  {
    jp: "アメニティ",
    en: "Toiletries",
    body: "タオル、歯ブラシ、シャンプー・コンディショナー、化粧水・乳液、ドライヤーなど。",
  },
];

// 06 Reservation — 予約の基本（/rooms・/access と同値）
const RESERVE_INFO: { label: string; en: string; value: string }[] = [
  { label: "ご予約", en: "Booking", value: "Airbnb の物件ページから" },
  { label: "チェックイン", en: "Check-in", value: "16:00 – 23:00" },
  { label: "チェックアウト", en: "Check-out", value: "11:00" },
  { label: "空き状況", en: "Availability", value: "サイト内のカレンダーで確認できます" },
];

// 06 Reservation — 到着前に知っておきたいこと（/rooms「ご利用にあたって」の要点）
const RESERVE_NOTES: string[] = [
  "外階段から 2 階のお部屋へ上がる造りです。エレベーターはありません。",
  "室内は全面禁煙です。屋外での喫煙は、携帯灰皿をご持参ください。",
  "静かな住宅地のため、夜間の屋外での大声・音楽再生はお控えください。",
  "寝間着のご用意はありません。ご持参ください。",
];

/* ---------------------------------------------------------------
 * 章の要約ストリップ（帯の直下に置く paper 背景のまとまり）
 * --------------------------------------------------------------- */

function DetailShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-(--color-base-dark)/8 bg-(--color-paper) px-6 py-[clamp(64px,6.3vw,104px)] md:px-12">
      <div className="mx-auto max-w-[1480px]">
        <div data-reveal className="reveal">
          <p className="font-garamond italic text-[clamp(10.25px,0.55vw,17.08px)] tracking-[0.42em] uppercase text-(--color-base-dark)/55 mb-4">
            {eyebrow}
          </p>
          <h3 className="font-serif text-[17px] md:text-[clamp(16.8px,1.2vw,30.8px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark)">
            {title}
          </h3>
        </div>
        <div data-reveal className="reveal mt-10 md:mt-14" style={{ transitionDelay: "120ms" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function RoomsDetail() {
  return (
    <DetailShell eyebrow="House Info" title="宿の基本情報。">
      {/* Specs — nagare 型の一覧バー。詳細は /rooms#overview と同値 */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-(--color-base-dark)/15 pt-8 sm:grid-cols-3 md:grid-cols-5">
        {HOUSE_SPECS.map((spec) => (
          <div key={spec.label}>
            <dt className="flex flex-col">
              <span className="font-serif text-[12.8px] md:text-[clamp(11.9px,0.71vw,18.2px)] tracking-[0.08em] text-(--color-base-dark)">
                {spec.label}
              </span>
              <span className="mt-1 font-garamond italic text-[9.4px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.28em] uppercase text-(--color-base-dark)/45">
                {spec.en}
              </span>
            </dt>
            <dd className="mt-3 font-mincho text-[13.5px] md:text-[clamp(11.9px,0.71vw,18.2px)] tracking-[0.06em] text-(--color-base-dark)/90">
              {spec.value}
              {spec.note ? (
                <span className="mt-1 block text-[10.7px] md:text-[clamp(9.1px,0.49vw,12.6px)] text-(--color-base-dark)/55">
                  {spec.note}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {/* 3 つの空間 — /rooms ギャラリーの入口 */}
      <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-3 md:mt-20">
        {ROOM_SPACES.map((space) => (
          <Link
            key={space.en}
            href="/rooms"
            aria-label={`${space.jp}の写真を Rooms ページで見る`}
            className="group block"
          >
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-(--color-base-dark)/8">
              <ParallaxLayer>
                <Image
                  src={space.img}
                  alt={`TERRA HAYAMA — ${space.jp}`}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  quality={84}
                  className="object-cover object-center"
                />
              </ParallaxLayer>
            </div>
            <p className="mt-5 font-garamond italic text-[9.4px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.32em] uppercase text-(--color-base-dark)/45">
              {space.en}
            </p>
            <h4 className="mt-2 font-serif text-[14.5px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.04em] text-(--color-base-dark)">
              {space.jp}
            </h4>
            <p className="mt-2 font-mincho text-[12px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/80">
              {space.body}
            </p>
          </Link>
        ))}
      </div>
    </DetailShell>
  );
}

function StayDetail() {
  return (
    <DetailShell eyebrow="How to Spend Time" title="過ごし方、四つ。">
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {STAY_MOMENTS.map((m) => (
          <div key={m.no} className="border-t border-(--color-base-dark)/15 pt-5">
            <p className="font-garamond italic text-[10.7px] md:text-[clamp(9.1px,0.49vw,12.6px)] tracking-[0.28em] text-(--color-base-dark)/45">
              {m.no}
            </p>
            <h4 className="mt-3 font-serif text-[14.5px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.04em] text-(--color-base-dark)">
              {m.jp}
            </h4>
            <p className="mt-3 font-mincho text-[12px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/80">
              {m.body}
            </p>
          </div>
        ))}
      </div>
    </DetailShell>
  );
}

function OwnerDetail() {
  return (
    <DetailShell eyebrow="Our Work" title="アイスと田畑の日々。">
      <p className="max-w-[820px] font-mincho text-[13px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[2.05] tracking-[0.07em] text-(--color-base-dark)/85">
        田んぼでの米づくりから、学校給食への提供、料理教室やマルシェの主催まで。
        2015 年に葉山へ移り住んでから、暮らしとものづくりをふたりで続けてきました。
        この町で好きになったものを、訪れる人にも見つけてもらえたら。
        そんな気持ちで、この宿を営んでいます。
      </p>

      <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-16 md:gap-x-8 lg:grid-cols-4">
        {OWNER_WORKS.map((work) => (
          <div key={work.en}>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-(--color-base-dark)/8">
              <ParallaxLayer>
                <Image
                  src={work.img}
                  alt={`TERRA HAYAMA Owner — ${work.jp}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  quality={84}
                  className="object-cover object-center"
                />
              </ParallaxLayer>
            </div>
            <p className="mt-4 font-garamond italic text-[9.4px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.32em] uppercase text-(--color-base-dark)/45">
              {work.en}
            </p>
            <h4 className="mt-2 font-serif text-[13.5px] md:text-[clamp(13.3px,0.82vw,21px)] tracking-[0.04em] text-(--color-base-dark)">
              {work.jp}
            </h4>
            <p className="mt-2 font-mincho text-[11.5px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.9] tracking-[0.06em] text-(--color-base-dark)/80">
              {work.body}
            </p>
          </div>
        ))}
      </div>
    </DetailShell>
  );
}

function NeighborhoodDetail() {
  return (
    <DetailShell eyebrow="Location" title="住所と、周辺への距離。">
      <div className="border-t border-(--color-base-dark)/15">
        <div className="grid grid-cols-[110px_1fr] gap-x-6 py-5 md:grid-cols-[140px_1fr]">
          <p className="font-garamond uppercase text-[clamp(9.39px,0.43vw,13.66px)] tracking-[0.32em] text-(--color-base-dark)/55 pt-[3px]">
            Address
          </p>
          <div>
            <p className="font-mincho text-[12.8px] md:text-[clamp(11.2px,0.6vw,15.4px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90">
              {ADDRESS}
            </p>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-3 inline-flex items-center gap-3 font-garamond text-[9.8px] md:text-[clamp(8.4px,0.49vw,12.6px)] tracking-[0.32em] uppercase text-(--color-base-dark)/70"
            >
              <span className="relative">
                View on Google Maps
                <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/25 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
              </span>
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>

      <ul className="mt-6 grid gap-y-3 md:grid-cols-2 md:gap-x-12 md:gap-y-4">
        {POINTS.map((p) => (
          <li
            key={p.name}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-(--color-base-dark)/10 py-3"
          >
            <div>
              <p className="font-serif text-[14px] md:text-[clamp(13.3px,0.82vw,21px)] tracking-[0.04em] text-(--color-base-dark)">
                {p.name}
              </p>
              <p className="mt-1.5 font-mincho text-[11px] md:text-[clamp(9.8px,0.49vw,12.6px)] tracking-[0.06em] text-(--color-base-dark)/65">
                {p.note}
              </p>
            </div>
            <p className="font-garamond text-[11px] md:text-[clamp(9.8px,0.49vw,12.6px)] tracking-[0.32em] uppercase text-(--color-base-dark)/70 whitespace-nowrap">
              {p.time}
            </p>
          </li>
        ))}
      </ul>
    </DetailShell>
  );
}

function AmenitiesDetail() {
  return (
    <DetailShell eyebrow="Facility" title="主な設備と備品。">
      <dl className="grid gap-y-8 md:grid-cols-2 md:gap-x-16 md:gap-y-10">
        {AMENITY_GROUPS.map((group) => (
          <div key={group.jp} className="border-t border-(--color-base-dark)/15 pt-5">
            <dt className="flex items-baseline gap-4 mb-3">
              <span className="font-serif text-[14.5px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.06em] text-(--color-base-dark)">
                {group.jp}
              </span>
              <span className="font-garamond italic text-[9.4px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.32em] uppercase text-(--color-base-dark)/45">
                {group.en}
              </span>
            </dt>
            <dd className="font-mincho text-[12px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
              {group.body}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 font-mincho text-[11.5px] md:text-[clamp(10.5px,0.55vw,14px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/60 md:mt-12">
        調味料は塩こしょう・油をご用意しています。足りない分は、徒歩圏内のスーパー・コンビニでどうぞ。
      </p>
    </DetailShell>
  );
}

function ReservationDetail() {
  return (
    <DetailShell eyebrow="Booking Notes" title="ご予約の前に。">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        {/* 予約の基本 */}
        <dl className="border-t border-(--color-base-dark)/15 divide-y divide-(--color-base-dark)/10">
          {RESERVE_INFO.map((info) => (
            <div
              key={info.label}
              className="grid grid-cols-[112px_1fr] gap-x-6 py-5 md:grid-cols-[160px_1fr]"
            >
              <dt className="flex flex-col">
                <span className="font-serif text-[12.8px] md:text-[clamp(11.9px,0.71vw,18.2px)] tracking-[0.08em] text-(--color-base-dark)">
                  {info.label}
                </span>
                <span className="mt-1 font-garamond italic text-[9.4px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.28em] uppercase text-(--color-base-dark)/45">
                  {info.en}
                </span>
              </dt>
              <dd className="font-mincho text-[12.8px] md:text-[clamp(11.2px,0.66vw,16.8px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90 pt-[3px]">
                {info.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* 到着前に知っておきたいこと */}
        <div>
          <p className="flex items-baseline gap-4 border-t border-(--color-base-dark)/15 pt-5 mb-2">
            <span className="font-serif text-[14.5px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.06em] text-(--color-base-dark)">
              ご利用にあたって
            </span>
            <span className="font-garamond italic text-[9.4px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.32em] uppercase text-(--color-base-dark)/45">
              Notes
            </span>
          </p>
          <ol>
            {RESERVE_NOTES.map((text, i) => (
              <li
                key={text}
                className="grid grid-cols-[32px_1fr] gap-x-4 border-b border-(--color-base-dark)/10 py-4"
              >
                <span className="font-garamond italic text-[10.7px] md:text-[clamp(9.8px,0.49vw,12.6px)] tracking-[0.24em] text-(--color-base-dark)/40 pt-[2px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-mincho text-[12px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                  {text}
                </p>
              </li>
            ))}
          </ol>
          <Link
            href="/rooms#overview"
            className="group mt-6 inline-flex items-center gap-3 font-garamond text-[9.8px] md:text-[clamp(8.4px,0.49vw,12.6px)] tracking-[0.32em] uppercase text-(--color-base-dark)/70"
          >
            <span className="relative">
              View All Notices
              <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/25 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
            </span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-10 md:mt-16">
        <a
          href={AIRBNB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-4 bg-(--color-base-dark) text-(--color-base-light) font-garamond text-[11.1px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase px-8 py-4 hover:bg-(--color-base-dark)/85 transition-colors"
        >
          <span>Book on Airbnb</span>
          <span aria-hidden>→</span>
        </a>
        <Link
          href="/access#reservation"
          className="group inline-flex items-center gap-4 font-garamond text-[11.1px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
        >
          <span className="relative">
            View Availability
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </DetailShell>
  );
}

/* ---------------------------------------------------------------
 * 6 章の帯 + 要約ストリップ。
 * TOP は「下までスクロールすれば主要な情報が揃う」構成。
 * 帯 = 章の入口（写真 + 導入文 + 詳細ページへのリンク）、
 * ストリップ = その章の実用情報の要約。深掘りは各ページへ。
 * --------------------------------------------------------------- */
const BANDS = [
  {
    href: "/rooms",
    num: "01",
    en: "Rooms",
    jp: "部屋と空間",
    body: "一軒家の二階を、一棟まるごと。木の天井の LDK、ひのきのバス、フルキッチンが揃う 75 ㎡ です。定員は最大 8 名、ゆったり過ごすなら 6 名までが目安。",
    img: "/images/rooms/rooms-hero.jpg",
    cta: "View Rooms",
  },
  {
    href: "/stay",
    num: "02",
    en: "Stay",
    jp: "過ごし方",
    body: "まずは、歩いて 8 分の一色海岸へ。空気が澄んだ日には、海の向こうに富士山が見えることもあります。宿に戻ったら、キッチンの抹茶マシーンで一服を。",
    img: "/images/access/access-balcony.jpg",
    cta: "View Stay",
  },
  {
    href: "/owner",
    num: "03",
    en: "Owner",
    jp: "営むのは、BEAT ICE",
    body: "葉山の棚田で育てたお米から、植物性のアイスクリームをつくっています。地域の学校給食にアイスを届け、教室で授業をすることも。この宿も、そんな夫婦の暮らしの続きにあります。",
    img: "/images/about-hero-tanada.jpg",
    cta: "About BEAT ICE",
  },
  {
    href: "/access",
    num: "04",
    en: "Neighborhood",
    jp: "周辺とアクセス",
    body: "一色海岸まで徒歩 8 分、路線バスの停留所までは 1 分。歩いて 30 秒のコンビニと徒歩 5 分の地元スーパーで、滞在中の買い出しもすぐに済みます。海のそばの、静かな住宅地です。",
    img: "/images/access/access-balcony.jpg",
    cta: "View Access",
  },
  {
    href: "/rooms#overview",
    num: "05",
    en: "Amenities",
    jp: "設備と備品",
    body: "調理器具は一式、食器は人数分。ドラム式洗濯機は洗剤つきで、自宅と同じように洗濯ができます。タオルや歯ブラシ、シャンプーなどのアメニティも揃えました。",
    img: "/images/rooms/kitchen-01.jpg",
    cta: "View Amenities",
  },
  {
    href: "/access#reservation",
    num: "06",
    en: "Reservation",
    jp: "予約と空き状況",
    body: "ご予約は Airbnb から。チェックインは 16 時から 23 時、チェックアウトは 11 時です。空き状況のカレンダー、住所と地図も、サイト内でそのまま確認できます。",
    img: "/images/access/access-entrance.jpg",
    cta: "Check Availability",
  },
];

// 帯と同じ並び順で対応する要約ストリップ
const DETAILS = [
  RoomsDetail,
  StayDetail,
  OwnerDetail,
  NeighborhoodDetail,
  AmenitiesDetail,
  ReservationDetail,
];

export default function Home() {
  return (
    <main className="bg-(--color-base-light)">
      {/* SiteHeader は hero section の外（main 直下）に置く。
          hero section の `isolate` が作るスタッキングコンテキストに
          fixed ヘッダーを閉じ込めると、スクロールで後続セクションが
          ヘッダーを覆い、ハンバーガーが押せなくなるため。 */}
      <SiteHeader variant="hero" current="Home" />

      <OpeningHero slides={HERO_SLIDES}>
      {/* Section bands — 6 chapters: Rooms / Stay / Owner / Neighborhood / Amenities / Reservation */}
      <section className="relative bg-(--color-base-light)">
        {BANDS.map((band, i) => {
          const imageFirst = i % 2 === 1; // 交互レイアウト
          const Detail = DETAILS[i];
          return (
            <div key={band.href}>
              <div
                className={`grid items-stretch border-t border-(--color-base-dark)/8 md:grid-cols-2 ${
                  imageFirst ? "" : "md:[&>a]:order-2"
                }`}
              >
                <Link
                  href={band.href}
                  aria-label={`${band.jp}（${band.en}）を見る`}
                  data-reveal
                  className="reveal group relative aspect-[4/3] md:aspect-auto md:min-h-[68svh] w-full overflow-hidden bg-(--color-base-dark)/10"
                >
                  <ParallaxLayer>
                    <Image
                      src={band.img}
                      alt={band.jp}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      quality={84}
                      className="object-cover object-center"
                    />
                  </ParallaxLayer>
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(26,20,16,0.04) 0%, rgba(26,20,16,0.18) 100%)",
                    }}
                  />
                </Link>

                <div
                  data-reveal
                  className="reveal px-6 py-[clamp(56px,7vw,112px)] md:px-12 lg:px-20 flex flex-col justify-center"
                  style={{ transitionDelay: "120ms" }}
                >
                  <p className="font-garamond italic text-[11px] md:text-[clamp(9.1px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil) mb-5">
                    {band.num} — {band.en}
                  </p>
                  <h2 className="font-serif text-[21px] md:text-[clamp(20.16px,1.74vw,44.8px)] leading-[1.3] tracking-[0.04em] text-(--color-base-dark) mb-7">
                    {band.jp}
                  </h2>
                  <p className="font-mincho text-[13.5px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[2.0] tracking-[0.07em] text-(--color-base-dark)/85 md:max-w-[460px] mb-10">
                    {band.body}
                  </p>
                  <Link
                    href={band.href}
                    className="group inline-flex items-center gap-4 font-garamond text-[11px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
                  >
                    <span className="relative">
                      {band.cta}
                      <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
                    </span>
                    <span aria-hidden className="text-[12px]">→</span>
                  </Link>
                </div>
              </div>

              {/* 章の要約ストリップ — TOP だけで主要情報を追える密度に */}
              {Detail ? <Detail /> : null}
            </div>
          );
        })}
      </section>

      {/* Footer */}
      <footer className="bg-(--color-base-dark) text-(--color-base-light) px-6 py-[clamp(64px,7vw,112px)] md:px-12">
        <div className="mx-auto max-w-[1640px] grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-serif text-[20px] md:text-[clamp(21px,1.53vw,39.2px)] tracking-[0.18em] mb-3">TERRA</p>
            <p className="font-garamond text-[9.5px] md:text-[clamp(8.4px,0.55vw,14px)] tracking-[0.42em] uppercase opacity-75 mb-6 md:mb-10">
              Hayama, Isshiki
            </p>
            <p className="font-mincho text-[11.5px] md:text-[clamp(9.8px,0.6vw,15.4px)] leading-[1.85] tracking-[0.06em] opacity-80">
              〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5<br />
              運営: 株式会社 BEAT ICE
            </p>
          </div>
          <a
            href={AIRBNB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 font-garamond text-[10.5px] md:text-[clamp(9.1px,0.49vw,12.6px)] tracking-[0.32em] uppercase border border-(--color-base-light)/20 px-7 py-4 md:px-[clamp(28px,2.19vw,56px)] md:py-[clamp(16px,1.09vw,28px)] hover:bg-(--color-base-light)/8 transition-colors"
          >
            <span>Reserve on Airbnb</span>
            <span aria-hidden className="cta-arrow group-hover:[animation-play-state:paused]">→</span>
          </a>
        </div>
        <p className="mt-12 md:mt-16 font-garamond text-[8.5px] md:text-[7.7px] lg:text-[8.4px] tracking-[0.32em] uppercase opacity-55 text-center md:text-left">
          © 2026 TERRA HAYAMA. All rights reserved.
        </p>
      </footer>
      </OpeningHero>

      <RevealRoot />
    </main>
  );
}
