"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroSlideshow } from "./HeroSlideshow";

gsap.registerPlugin(ScrollTrigger);

type Slide = { src: string; alt: string };

const CONCEPT_STANZAS = [
  "TERRAは、葉山への愛から生まれました。",
  "海越しに望む富士山、\n棚田が広がる里山。",
  "この土地に暮らして十年、\n私たちは今もなお、\nこの町の風景に魅了され続けています。",
  "風景とはきっと、\n人の営みと自然がゆっくりと重なり合い、\n時間をかけて育まれてきたもの。",
  "ここでは、訪れる人と葉山との距離が、\nゆっくりとほどけていきます。",
  "海と山が織りなす自然のリズム、\nここに息づく人々の物語。",
];

export function OpeningHero({
  slides,
  children,
}: {
  slides: Slide[];
  children?: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // vibe-v2 (wireframes/v2-vibe/app.js) の opening 幕 + ScrollTrigger 連動を
  // GSAP でそのまま再現する。素の CSS animation / scroll ハンドラで再実装すると
  // ここのタイミングがズレやすいため、参照実装のロジックを踏襲する。
  useGSAP(
    () => {
      document.body.classList.add("has-fv");
      const threshold = () => window.innerHeight * 0.85;
      const updateFvPassed = () =>
        document.body.classList.toggle("fv-passed", window.scrollY > threshold());
      window.addEventListener("scroll", updateFvPassed, { passive: true });
      window.addEventListener("resize", updateFvPassed);
      updateFvPassed();

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        const curtain = document.querySelector(".intro__curtain") as HTMLElement | null;
        if (curtain) curtain.style.display = "none";
      } else {
        gsap.set(".intro__logo", { autoAlpha: 0 });
        gsap
          .timeline()
          .to(".intro__logo", { autoAlpha: 1, duration: 1.6, ease: "power2.out" }, 0.6)
          .addLabel("open", "+=.9")
          .to(".intro__curtain", { autoAlpha: 0, duration: 2.4, ease: "sine.inOut" }, "open")
          .to(".intro__logo", { filter: "invert(1)", duration: 2.4, ease: "sine.inOut" }, "open")
          .set(".intro__curtain", { display: "none" });

        gsap.to(".intro__hero", {
          autoAlpha: 0,
          yPercent: -8,
          ease: "none",
          scrollTrigger: { trigger: ".intro", start: "top top", end: "+=70%", scrub: true },
        });
        gsap.to(".intro__dark", {
          opacity: 0.55,
          ease: "none",
          scrollTrigger: { trigger: ".intro", start: "top top", end: "+=88%", scrub: true },
        });
        gsap.to(".intro__scroll", {
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: ".intro", start: "top top", end: "+=12%", scrub: true },
        });
      }

      return () => {
        window.removeEventListener("scroll", updateFvPassed);
        window.removeEventListener("resize", updateFvPassed);
        document.body.classList.remove("has-fv", "fv-passed");
      };
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef}>
      <section className="intro" id="top">
        <div className="intro__sticky">
          <div className="intro__slides">
            <HeroSlideshow slides={slides} intervalMs={5000} fadeMs={1600} />
          </div>
          <div className="intro__scrim" aria-hidden />
          <div className="intro__dark" aria-hidden />
          <div className="intro__curtain" aria-hidden />
          <div className="intro__hero">
            <Image
              className="intro__logo"
              src="/images/logo.png"
              alt="TERRA HAYAMA"
              width={660}
              height={660}
              priority
            />
          </div>
          <div className="intro__scroll" aria-hidden>
            scroll
          </div>
        </div>

        <div className="intro__read">
          <div className="intro__concept">
            <p className="intro__tag">Concept</p>
            {CONCEPT_STANZAS.map((stanza) => (
              <p key={stanza}>
                {stanza.split("\n").map((line, i, arr) => (
                  <span key={`${line}-${i}`}>
                    {line}
                    {i < arr.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </section>

      <div className="fv-cover">
        <svg className="fv-cut" viewBox="0 0 1400 90" preserveAspectRatio="none" aria-hidden>
          <path className="fv-cut__fill" d="M0,90 L0,46 L1400,46 L1400,90 Z" />
          <path className="aze__line" d="M0,45 L1400,45" />
        </svg>
        <div className="fv-cover__pg">{children}</div>
      </div>
    </div>
  );
}
