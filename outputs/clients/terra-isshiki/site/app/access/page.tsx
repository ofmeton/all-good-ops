import Image from "next/image";
import { SiteHeader } from "../_components/SiteHeader";
import { AvailabilityCalendar } from "../_components/AvailabilityCalendar";

export const metadata = {
  title: "Access",
  description:
    "TERRA HAYAMA のアクセスと立地。葉山一色海岸まで徒歩 8 分。神奈川県三浦郡葉山町一色 1759-1-5。",
};

const ADDRESS = "〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5";
const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";
// 葉山町一色 1759-1-5 周辺の地図（OpenStreetMap embed）
const MAP_LAT = 35.272;
const MAP_LNG = 139.585;
const MAP_BBOX = "139.575,35.265,139.595,35.279";
const MAPS_EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
  MAP_BBOX
)}&layer=mapnik&marker=${MAP_LAT}%2C${MAP_LNG}`;
const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${MAP_LAT}%2C${MAP_LNG}`;

const POINTS = [
  { name: "一色海岸", time: "徒歩 8 分", note: "CNN 世界の厳選ビーチ 100 選" },
  { name: "葉山御用邸", time: "徒歩 12 分", note: "皇室の別邸を擁する一色エリアの中心" },
  { name: "セブンイレブン 葉山一色店", time: "徒歩 30 秒", note: "日用品・夜食のちょっとした買い出しに" },
  { name: "スズキヤ 葉山店", time: "徒歩 5 分", note: "食材調達・滞在中の自炊に" },
  { name: "森戸海岸", time: "車 8 分", note: "葉山きっての海水浴と日没スポット" },
  { name: "上山口の棚田", time: "車 12 分", note: "葉山アイスのお米を育てる棚田" },
  { name: "JR 逗子駅", time: "車 15 分 / バス 25 分", note: "横須賀線・湘南新宿ライン" },
];

export default function AccessPage() {
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Access" />

      {/* Hero */}
      <section className="relative h-[64svh] min-h-[420px] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        <Image
          src="/images/access/access-entrance.jpg"
          alt="TERRA HAYAMA — 玄関の赤土壁と組子の引き戸"
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
            Access
          </p>
          <h1
            className="fade-up font-serif font-medium text-[clamp(16px,4.8vw,24px)] leading-[1.2] md:text-[clamp(26px,2.3vw,56px)] md:leading-[1.14] tracking-[0.02em]"
            style={{ animationDelay: "0.55s" }}
          >
            <span className="block whitespace-nowrap">海まで、徒歩 8 分。</span>
          </h1>
          <p
            className="fade-up mt-5 md:mt-8 font-mincho text-[14px] md:text-[clamp(16px,1.02vw,26px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/85"
            style={{ animationDelay: "0.85s" }}
          >
            住宅地に流れる、<br />
            葉山らしい時間の中に佇む。
          </p>
        </div>
      </section>

      {/* Address & POI */}
      <section className="relative">
        <div className="grid md:grid-cols-2 items-stretch">
          <div className="px-6 py-[clamp(80px,7.3vw,112px)] md:px-16 lg:px-24 flex flex-col justify-center">
            <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-4">
              Location
            </p>
            <h2 className="font-serif text-[28px] md:text-[clamp(34px,2.81vw,72px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-8">
              <span className="block">葉山町、</span>
              <span className="block">一色。</span>
            </h2>
            <dl className="border-t border-(--color-base-dark)/15 divide-y divide-(--color-base-dark)/10 mb-10">
              <div className="grid grid-cols-[110px_1fr] md:grid-cols-[140px_1fr] py-5">
                <dt className="font-garamond uppercase text-[clamp(11px,0.62vw,16px)] tracking-[0.32em] text-(--color-base-dark)/55 pt-[3px]">
                  Address
                </dt>
                <dd className="font-mincho text-[15px] md:text-[clamp(16px,0.86vw,22px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90">
                  {ADDRESS}
                </dd>
              </div>
              <div className="grid grid-cols-[110px_1fr] md:grid-cols-[140px_1fr] py-5">
                <dt className="font-garamond uppercase text-[clamp(11px,0.62vw,16px)] tracking-[0.32em] text-(--color-base-dark)/55 pt-[3px]">
                  Type
                </dt>
                <dd className="font-mincho text-[15px] md:text-[clamp(16px,0.86vw,22px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90">
                  一棟貸し（一軒家の 2 階フロア）／最大 8 名
                </dd>
              </div>
              <div className="grid grid-cols-[110px_1fr] md:grid-cols-[140px_1fr] py-5">
                <dt className="font-garamond uppercase text-[clamp(11px,0.62vw,16px)] tracking-[0.32em] text-(--color-base-dark)/55 pt-[3px]">
                  Parking
                </dt>
                <dd className="font-mincho text-[15px] md:text-[clamp(16px,0.86vw,22px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90">
                  1 階に駐車スペースあり
                </dd>
              </div>
            </dl>

            <a
              href={AIRBNB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-4 font-garamond text-[13px] md:text-[clamp(14px,0.86vw,22px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
            >
              <span className="relative">
                Reserve on Airbnb
                <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
              </span>
              <span aria-hidden>→</span>
            </a>
          </div>

          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[82svh] w-full overflow-hidden">
            <Image
              src="/images/access/access-balcony.jpg"
              alt="TERRA HAYAMA バルコニーから望む葉山の町並み"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              quality={88}
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="bg-(--color-paper) px-6 py-[clamp(96px,8.34vw,128px)] md:px-12">
        <div className="mx-auto max-w-[1480px]">
          <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-4">
            Map
          </p>
          <h2 className="font-serif text-[26px] md:text-[clamp(32px,2.5vw,64px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
            <span className="block">一色海岸からほど近い、</span>
            <span className="block">静かな住宅地に。</span>
          </h2>

          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden border border-(--color-base-dark)/10 bg-(--color-base-light)">
            <iframe
              src={MAPS_EMBED}
              loading="lazy"
              className="w-full h-full"
              style={{ border: 0, filter: "grayscale(0.4) sepia(0.05)" }}
              title="TERRA HAYAMA — 葉山町一色の地図"
            />
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-3 bottom-3 inline-flex items-center gap-2 bg-(--color-base-light)/95 backdrop-blur px-4 py-2 text-(--color-base-dark) font-garamond text-[11px] tracking-[0.32em] uppercase border border-(--color-base-dark)/15 hover:bg-(--color-base-light)"
            >
              View on Google Maps
              <span aria-hidden>→</span>
            </a>
          </div>

          <ul className="mt-12 grid gap-y-3 md:grid-cols-2 md:gap-x-12 md:gap-y-4">
            {POINTS.map((p) => (
              <li
                key={p.name}
                className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-(--color-base-dark)/10 py-3"
              >
                <div>
                  <p className="font-serif text-[17px] md:text-[clamp(20px,1.17vw,30px)] tracking-[0.04em] text-(--color-base-dark)">
                    {p.name}
                  </p>
                  <p className="mt-1.5 font-mincho text-[13px] md:text-[clamp(14px,0.7vw,18px)] tracking-[0.06em] text-(--color-base-dark)/65">
                    {p.note}
                  </p>
                </div>
                <p className="font-garamond text-[13px] md:text-[clamp(14px,0.7vw,18px)] tracking-[0.32em] uppercase text-(--color-base-dark)/70 whitespace-nowrap">
                  {p.time}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Reservation: Availability calendar */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(96px,8.34vw,128px)] md:px-12 bg-(--color-base-light)">
        <div className="mx-auto max-w-[1480px]">
          <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-4">
            Reservation
          </p>
          <h2 className="font-serif text-[28px] md:text-[clamp(36px,3.12vw,80px)] leading-[1.36] tracking-[0.04em] text-(--color-base-dark) mb-12 md:mb-16">
            <span className="block">予約は Airbnb から。</span>
            <span className="block">空き状況はこちらで確認できます。</span>
          </h2>

          <AvailabilityCalendar monthCount={3} />

          <div className="mt-14 md:mt-20 text-center md:text-left">
            <a
              href={AIRBNB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-4 bg-(--color-base-dark) text-(--color-base-light) font-garamond text-[13px] md:text-[clamp(14px,0.86vw,22px)] tracking-[0.32em] uppercase px-8 py-4 hover:bg-(--color-base-dark)/85 transition-colors"
            >
              <span>Book on Airbnb</span>
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
