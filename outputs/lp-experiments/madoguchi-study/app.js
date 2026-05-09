/* =====================================================
   Hidamari Lab. — madoguchi.inc 表現技法の再現
   - Lenis 慣性スクロール
   - GSAP ScrollTrigger でヒーロー pin + シーン切替
   - SVG-like 文字 reveal（ここでは1行ずつ blur+opacity）
   - 粒子＋接続線 canvas
   - マウスストーカー
   - セクション横断ヘッダー色トグル
   - js-fade-up / js-bleedTitle の IO 監視
   ===================================================== */

(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------- 1. Lenis 慣性スクロール -------- */
  let lenis;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* -------- 2. GSAP ScrollTrigger 同期 -------- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* -------- 3. ヒーロー pin + 3シーン -------- */
  const hero = document.querySelector('.js-hero');
  const heroPin = document.querySelector('.js-heroPin');
  const scenes = [...document.querySelectorAll('.js-scene')];

  if (hero && heroPin && window.gsap && window.ScrollTrigger) {
    // 初期表示: scene1
    if (scenes[0]) scenes[0].classList.add('is-on');

    const HERO_END = '+=220%'; // 220vh 分のスクロールで 3 シーン消化

    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: HERO_END,
      pin: heroPin,
      pinSpacing: true,
    });

    // シーンの出し分け: スクロール進捗に対して 0–.33 / .33–.66 / .66–1
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: HERO_END,
      onUpdate: (self) => {
        const p = self.progress;
        const idx = p < 0.33 ? 1 : p < 0.66 ? 2 : 3;
        scenes.forEach(s => {
          const on = parseInt(s.dataset.scene, 10) === idx;
          s.classList.toggle('is-on', on);
        });
      },
    });

    // シーン1の文字 stroke reveal を起動時に発火
    requestAnimationFrame(() => {
      revealStrokes(document.querySelector('.hero__scene--1'));
    });

    // シーン切替時の reveal トリガー
    let lastIdx = 1;
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: HERO_END,
      onUpdate: (self) => {
        const p = self.progress;
        const idx = p < 0.33 ? 1 : p < 0.66 ? 2 : 3;
        if (idx !== lastIdx) {
          const next = document.querySelector(`.hero__scene--${idx}`);
          if (next) revealStrokes(next);
          lastIdx = idx;
        }
      },
    });
  }

  function revealStrokes(scope) {
    if (!scope) return;
    const lines = scope.querySelectorAll('.js-strokeLine');
    lines.forEach((el, i) => {
      el.style.setProperty('--strokeDelay', (0.05 + i * 0.18 + Math.random() * 0.1).toFixed(2) + 's');
      requestAnimationFrame(() => el.classList.add('is-on'));
    });
  }

  /* -------- 4. js-fade-up / js-bleedTitle IO監視 -------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        // 同一親内に複数あるとき少しずつディレイをずらす
        const siblings = [...(e.target.parentElement?.querySelectorAll('.js-fade-up') || [])];
        const idx = Math.max(0, siblings.indexOf(e.target));
        e.target.style.setProperty('--d', (idx * 0.06).toFixed(2) + 's');
        e.target.classList.add('is-active');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll('.js-fade-up, .js-bleedTitle').forEach(el => io.observe(el));

  /* -------- 5. ヘッダー色トグル（ScrollTrigger） -------- */
  const header = document.querySelector('.js-header');
  function applyHeader(color) {
    if (!header) return;
    if (color === 'light') header.classList.add('is-light');
    else header.classList.remove('is-light');
  }
  if (header && window.ScrollTrigger) {
    document.querySelectorAll('[data-color]').forEach(sec => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 64px',
        end: 'bottom 64px',
        onEnter: () => applyHeader(sec.dataset.color === 'light' ? 'light' : 'dark'),
        onEnterBack: () => applyHeader(sec.dataset.color === 'light' ? 'light' : 'dark'),
      });
    });
  }

  /* -------- 6. 粒子＋接続線 canvas（network particles） -------- */
  const particleCanvases = document.querySelectorAll('canvas[data-particle]');
  particleCanvases.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, particles = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
      const target = Math.max(28, Math.round((w * h) / 7000));
      particles = [];
      for (let i = 0; i < target; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);

    function step() {
      if (document.hidden) { requestAnimationFrame(step); return; }
      ctx.clearRect(0, 0, w, h);
      // particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      // links
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 110 * 110) {
            const op = (1 - d2 / (110 * 110)) * 0.5;
            ctx.strokeStyle = `rgba(216,200,164,${op})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // dots
      ctx.fillStyle = 'rgba(216,200,164,.85)';
      for (const p of particles) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(step);
    }
    if (!reduce) requestAnimationFrame(step);
  });

  /* -------- 7. マウスストーカー -------- */
  const cursor = document.querySelector('.js-cursor');
  if (cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let tx = -100, ty = -100, cx = -100, cy = -100;
    window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const labTxt = cursor.querySelector('.cursor__labTxt');
    document.querySelectorAll('.js-stalker').forEach(el => {
      el.addEventListener('pointerenter', () => {
        cursor.classList.add('is-stalk');
        if (labTxt) labTxt.textContent = el.dataset.stalkerText || '';
      });
      el.addEventListener('pointerleave', () => {
        cursor.classList.remove('is-stalk');
        if (labTxt) labTxt.textContent = '';
      });
    });
  }

  /* -------- 8. ヘッダー初期表示 -------- */
  if (header) {
    requestAnimationFrame(() => header.classList.add('is-ready'));
  }

  /* -------- 8.5. ScrollTrigger refresh (pin spacer 反映) -------- */
  if (window.ScrollTrigger) {
    // pin spacer が DOM に挿入された後の座標で他 ST を再計算
    window.addEventListener('load', () => {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    // フォントロード完了でも再計算
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }

  /* -------- 9. ヘッダーリンクの label/data-label 同期 -------- */
  document.querySelectorAll('.hd__navA').forEach(a => {
    const span = a.querySelector('span');
    if (span && span.dataset.lab) a.setAttribute('data-label', span.dataset.lab);
  });

})();
