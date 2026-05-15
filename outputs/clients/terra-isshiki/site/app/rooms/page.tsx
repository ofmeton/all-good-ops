import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { RoomsGallery } from "../_components/RoomsGallery";

export const metadata = {
  title: "Rooms",
  description:
    "TERRA HAYAMA の部屋と空間。LDK・寝室・バスルーム・ランドリー・キッチン詳細をご紹介します。",
};

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

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-20 md:px-12 md:py-28 text-center">
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
