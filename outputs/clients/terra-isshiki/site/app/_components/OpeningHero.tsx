"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { HeroSlideshow } from "./HeroSlideshow";

type Slide = { src: string; alt: string };

const CONCEPT_STANZAS = [
  "TERRAは、葉山への愛から生まれました。",
  "海越しに望む富士山、\n棚田が広がる里山。",
  "この土地に暮らして十年、\n私たちは今もなお、\nこの町の風景に魅了され続けています。",
  "風景とはきっと、\n人の営みと自然がゆっくりと重なり合い、\n時間をかけて育まれてきたもの。",
  "ここでは、訪れる人と葉山との距離が、\nゆっくりとほどけていきます。",
  "海と山が織りなす自然のリズム、\nここに息づく人々の物語。",
];

export function OpeningHero({ slides }: { slides: Slide[] }) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [curtainDone, setCurtainDone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCurtainDone(true);
      return;
    }

    const timer = window.setTimeout(() => setCurtainDone(true), 5200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameId: number | null = null;

    const apply = () => {
      frameId = null;

      if (reduce) {
        const hidden = window.scrollY > 1 || curtainDone;
        hero.style.opacity = hidden ? "0" : "1";
        hero.style.transform = hidden ? "translateY(-8%)" : "translateY(0)";
        hero.style.pointerEvents = hidden ? "none" : "";
        return;
      }

      if (!curtainDone) {
        hero.style.opacity = "1";
        hero.style.transform = "translateY(0)";
        hero.style.pointerEvents = "";
        return;
      }

      const fadeDistance = window.innerHeight * 1.6;
      const progress = Math.min(Math.max(window.scrollY / fadeDistance, 0), 1);
      const opacity = 1 - progress;
      hero.style.opacity = String(opacity);
      hero.style.transform = `translateY(${-8 * progress}%)`;
      hero.style.pointerEvents = opacity <= 0.02 ? "none" : "";
    };

    const schedule = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [curtainDone]);

  return (
    <>
      <section className="intro" id="top">
        <div className="intro__sticky">
          <div className="intro__slides">
            <HeroSlideshow slides={slides} intervalMs={5000} fadeMs={1600} />
          </div>
          <div className="intro__scrim" aria-hidden />
          <div className="intro__dark" aria-hidden />
          <div
            className={`intro__curtain${curtainDone ? " intro__curtain--done" : ""}`}
            aria-hidden
          />
          <div ref={heroRef} className="intro__hero">
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

      <div className="fv-cover" aria-hidden>
        <svg className="fv-cut" viewBox="0 0 1400 90" preserveAspectRatio="none">
          <path className="fv-cut__fill" d="M0,90 L0,46 L1400,46 L1400,90 Z" />
          <path className="aze__line" d="M0,45 L1400,45" />
        </svg>
        <div className="fv-cover__pg" />
      </div>
    </>
  );
}
