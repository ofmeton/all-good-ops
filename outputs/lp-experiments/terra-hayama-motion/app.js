/* TERRA HAYAMA — motion (quiet). 宣言的ハイブリッド: JSはclass付替/座標のみ、見た目はCSS. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---- Hero: クロスフェード スライドショー + lead 出現 ---- */
  const hero = $('.hero');
  const slides = $$('.hero__img');
  if (hero) requestAnimationFrame(() => hero.classList.add('loaded'));
  if (slides.length > 1 && !reduce) {
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      // 再付与で Ken Burns を再生
      void slides[i].offsetWidth;
      slides[i].classList.add('is-active');
    }, 4500);
  }

  /* ---- Header: スクロールで出現 → 本文域で solid ---- */
  const hdr = $('.hdr');
  const onScrollHdr = () => {
    const y = window.scrollY;
    hdr.classList.toggle('show', y > 60);
    hdr.classList.toggle('solid', y > window.innerHeight * 0.82);
  };
  if (hdr) { onScrollHdr(); addEventListener('scroll', onScrollHdr, { passive: true }); }

  /* ---- 縦書き見出しを1文字spanに分割（墨にじみフェード用） ---- */
  $$('.tate[data-split]').forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, n) => {
      const s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch;
      s.style.transitionDelay = (n * 0.05).toFixed(2) + 's';
      el.appendChild(s);
    });
  });

  /* ---- リビール: IntersectionObserver で is-in 付与（出したら解除） ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .tate').forEach(el => io.observe(el));

  /* ---- ずらしパララックス（控えめ・transformのみ・passive） ---- */
  const paraEls = reduce ? [] : $$('[data-speed]');
  let ticking = false;
  const applyParallax = () => {
    const vh = window.innerHeight;
    paraEls.forEach(el => {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const off = (center - vh / 2) * parseFloat(el.dataset.speed) * -1;
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  if (paraEls.length) {
    paraEls.forEach(el => { el.style.willChange = 'transform'; });
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(applyParallax); } }, { passive: true });
    addEventListener('resize', applyParallax, { passive: true });
    applyParallax();
  }

  /* ---- Rooms: ピン留め横スクロール・ギャラリー（PC + motion可のみ・GSAP） ---- */
  const canPin = !reduce && window.matchMedia('(min-width:1024px)').matches && window.gsap && window.ScrollTrigger;
  if (canPin) {
    gsap.registerPlugin(ScrollTrigger);
    document.body.classList.add('has-pin');
    const track = $('#galleryTrack');
    const gallery = $('#gallery');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 40);
    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: gallery,
        start: 'center center',
        end: () => '+=' + distance(),
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });
    // フォント確定後に座標再計算
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
