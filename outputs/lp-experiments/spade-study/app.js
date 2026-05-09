/* ============================================================
   MERIDIAN — app.js
   A study after spade-co.jp's motion playbook.
   Implements: char-split + randomized delay fades, virtual smooth
   scroll (lerp), scroll-tied parallax, clip-path curtain reveals,
   long slide-ins, hover micro-interactions, and a three.js r144
   wave-field hero.
   ============================================================ */

import * as THREE from "https://unpkg.com/three@0.144.0/build/three.module.js";

const reduce =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  /Mobi/i.test(navigator.userAgent && "");

// ------------------------------------------------------------
// 1. Char/word split with randomized transition-delays.
//    Words stay glued (display:inline-block) so a word never
//    splits across a line — the "no orphan linebreak" rule.
// ------------------------------------------------------------
function splitChars(root) {
  const lines = root.querySelectorAll(".line");
  const targets = lines.length ? lines : [root];

  targets.forEach((target) => {
    // Walk text nodes only (preserve <em>, <span>, etc.)
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    textNodes.forEach((node) => {
      const text = node.nodeValue;
      if (!text.trim()) return;
      const frag = document.createDocumentFragment();
      const words = text.split(/(\s+)/);
      words.forEach((w) => {
        if (/^\s+$/.test(w)) {
          frag.appendChild(document.createTextNode(w));
          return;
        }
        const word = document.createElement("span");
        word.className = "word";
        for (const ch of w) {
          const c = document.createElement("span");
          c.className = "char";
          c.textContent = ch;
          // Spade-style: random delay scattered across ~0.05–0.6s.
          c.style.transitionDelay = (Math.random() * 0.55 + 0.05).toFixed(2) + "s";
          word.appendChild(c);
        }
        frag.appendChild(word);
      });
      node.parentNode.replaceChild(frag, node);
    });
  });
}

// ------------------------------------------------------------
// 2. js-fade — apply --fade-delay from data-fade-delay so the
//    CSS transition uses it. (Kicker, sub, defs, etc.)
// ------------------------------------------------------------
function applyFadeDelays() {
  document.querySelectorAll(".js-fade[data-fade-delay]").forEach((el) => {
    el.style.setProperty("--fade-delay", `${el.dataset.fadeDelay}s`);
  });
}

// ------------------------------------------------------------
// 3. Virtual smooth scroll.
//    The wrap is `position: fixed` and translated by JS. The body
//    height is set to match the wrap so the native scrollbar still
//    works (and accessibility / keyboard nav stays intact).
// ------------------------------------------------------------
const wrap = document.getElementById("js-wrap");
const vbar = document.getElementById("js-vbar");
let target = 0;
let current = 0;
const lerpFactor = 0.085;

function setBodyHeight() {
  // Measure intrinsic content height by temporarily releasing the
  // fixed transform offset — but in practice wrap.scrollHeight is
  // accurate even when fixed, since fixed positioning preserves
  // child layout sizing.
  document.body.style.height = wrap.scrollHeight + "px";
}

function onResize() {
  setBodyHeight();
}

function onScroll() {
  target = window.scrollY || window.pageYOffset || 0;
}

function rafStep() {
  current += (target - current) * lerpFactor;
  if (Math.abs(target - current) < 0.05) current = target;

  // Move the entire wrap up by `current` pixels.
  wrap.style.transform = `translate3d(0, ${(-current).toFixed(2)}px, 0)`;

  // Parallax — each .js-pos shifts by an extra factor of `current`.
  for (const el of parallaxEls) {
    const speed = el._posSpeed;
    const y = (-current * speed).toFixed(2);
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }

  // Decorative scrollbar thumb position.
  const docHeight = Math.max(1, document.body.scrollHeight - window.innerHeight);
  const ratio = current / docHeight;
  const trackHeight = window.innerHeight;
  const thumbHeight = Math.max(40, Math.min(120, (window.innerHeight / wrap.scrollHeight) * trackHeight));
  if (vbar) {
    vbar.style.height = thumbHeight + "px";
    vbar.style.transform = `translateY(${(ratio * (trackHeight - thumbHeight)).toFixed(2)}px)`;
  }

  // Trigger reveals — getBoundingClientRect already reflects the
  // wrap transform so the rect is the visual position.
  for (let i = triggers.length - 1; i >= 0; i--) {
    const el = triggers[i];
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.86) {
      el.classList.add("_in");
      triggers.splice(i, 1);
    }
  }

  requestAnimationFrame(rafStep);
}

// ------------------------------------------------------------
// 4. Element registries (parallax + trigger lists).
// ------------------------------------------------------------
const parallaxEls = [];
function registerParallax() {
  document.querySelectorAll(".js-pos").forEach((el) => {
    el._posSpeed = parseFloat(el.dataset.posSpeed || "0");
    parallaxEls.push(el);
  });
}

const triggers = [];
function registerTriggers() {
  const sel = ".js-fade, .js-split, .js-slide, .js-curtain, .js-row";
  document.querySelectorAll(sel).forEach((el) => triggers.push(el));
}

// ------------------------------------------------------------
// 5. Three.js wave-field (data-engine="three.js r144").
//    A grid of LineSegments displaced by a sum-of-sines field.
//    No shaders, no external libs beyond three.
// ------------------------------------------------------------
function initThree() {
  const canvas = document.getElementById("js-engine");
  if (!canvas || reduce) return;

  canvas.dataset.engine = "three.js r" + THREE.REVISION;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: window.devicePixelRatio < 2,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 2.4, 6.4);
  camera.lookAt(0, 0.2, 0);

  const lineCount = 56;
  const segCount = 96;
  const sizeX = 14;
  const sizeZ = 12;
  const lines = [];

  // Two color tones — vermillion and ink — alternating.
  const matInk = new THREE.LineBasicMaterial({
    color: 0x0e0f0c,
    transparent: true,
    opacity: 0.42,
  });
  const matRed = new THREE.LineBasicMaterial({
    color: 0xc8412b,
    transparent: true,
    opacity: 0.55,
  });

  for (let i = 0; i < lineCount; i++) {
    const positions = new Float32Array(segCount * 3);
    const z = (i / (lineCount - 1) - 0.5) * sizeZ;
    for (let j = 0; j < segCount; j++) {
      positions[j * 3] = (j / (segCount - 1) - 0.5) * sizeX;
      positions[j * 3 + 1] = 0;
      positions[j * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const m = i % 9 === 4 ? matRed : matInk;
    const line = new THREE.Line(g, m);
    scene.add(line);
    lines.push({ line, positions, z });
  }

  // Optional sparse points for grain.
  const pCount = 200;
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * sizeX;
    pPositions[i * 3 + 1] = Math.random() * 0.6;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * sizeZ;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x0e0f0c,
    size: 0.018,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  function fitRenderer() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  fitRenderer();
  window.addEventListener("resize", fitRenderer);

  let t0 = performance.now();
  let visible = true;
  document.addEventListener("visibilitychange", () => (visible = !document.hidden));

  function frame() {
    if (visible) {
      const t = (performance.now() - t0) * 0.0006;
      for (let i = 0; i < lines.length; i++) {
        const { line, positions, z } = lines[i];
        for (let j = 0; j < segCount; j++) {
          const x = (j / (segCount - 1) - 0.5) * sizeX;
          // Sum of sines — cheap, smooth topographic field.
          const y =
            Math.sin(x * 0.55 + t * 1.4) * 0.42 +
            Math.sin(z * 0.85 + t * 0.9 + x * 0.1) * 0.32 +
            Math.cos(x * 0.32 + z * 0.42 + t * 0.7) * 0.22 +
            Math.sin((x + z) * 0.22 + t * 1.6) * 0.14;
          positions[j * 3 + 1] = y;
        }
        line.geometry.attributes.position.needsUpdate = true;
      }
      // Slow camera drift.
      const drift = Math.sin(t * 0.25) * 0.6;
      camera.position.x = drift;
      camera.lookAt(drift * 0.4, 0.2, 0);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  frame();
}

// ------------------------------------------------------------
// 6. Hover label-roll for header links is pure CSS;
//    nothing to JS-init here. (Kept hook for future.)
// ------------------------------------------------------------

// ------------------------------------------------------------
// 7. Boot.
// ------------------------------------------------------------
function boot() {
  // Split text targets.
  document.querySelectorAll(".js-split").forEach(splitChars);
  applyFadeDelays();

  registerParallax();
  registerTriggers();

  setBodyHeight();
  // Re-measure after fonts/canvas size settle.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setBodyHeight);
  }
  setTimeout(setBodyHeight, 350);
  setTimeout(setBodyHeight, 1200);
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });

  initThree();

  // Reveal: kick in shortly so the page lands "live".
  requestAnimationFrame(rafStep);
  document.body.classList.remove("is-loading");

  // Force first-trigger pass on hero (otherwise rect.top is 0 and
  // they all fire at once anyway, but make sure CSS class flips
  // before the first frame paints).
  setTimeout(() => {
    document
      .querySelectorAll(".hero .js-fade, .hero .js-split, .hero .js-slide")
      .forEach((el) => el.classList.add("_in"));
  }, 60);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
