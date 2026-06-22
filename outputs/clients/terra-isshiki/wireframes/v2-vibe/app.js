(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s,c=document)=>[...c.querySelectorAll(s)];

  /* nav パネル：リンク選択 / Esc で閉じる */
  const navt = document.getElementById('navt');
  if (navt) {
    $$('.nav__panel a').forEach(a=>a.addEventListener('click',()=>{navt.checked=false;}));
    addEventListener('keydown',e=>{ if(e.key==='Escape') navt.checked=false; });
  }

  /* Intro が視界にある間だけ上部ヴェイルを出す（暗い没入区間限定） */
  const introEl = document.querySelector('.intro');
  if (introEl) {
    new IntersectionObserver((es)=>{
      document.body.classList.toggle('at-intro', es[0].isIntersecting);
    }, {threshold:0}).observe(introEl);
  }

  /* reveal / 畔 */
  const io = new IntersectionObserver((es)=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  }), {threshold:0.16, rootMargin:'0px 0px -8% 0px'});
  $$('.reveal, .aze-wrap').forEach(el=>io.observe(el));

  /* k. オープニング: 写真 → ロゴ → （幕が晴れて）ヒーローコピー（shuku式の溜め） */
  if (!reduce && window.gsap) {
    gsap.set('.opening__logo',{autoAlpha:0,scale:.92});
    gsap.timeline()
      .to('.opening__logo',{autoAlpha:1,scale:1,duration:1.2,ease:'power2.out'},.35)    /* 写真の上にロゴ浮上 */
      .to('.opening__logo',{autoAlpha:0,scale:1.04,duration:.7,ease:'power2.in'},'+=.9') /* ロゴ退場 */
      .to('.opening',{autoAlpha:0,duration:1.0,ease:'power2.inOut'},'-=.35')             /* 幕が晴れてFVへ */
      .set('.opening',{display:'none'});
  } else { const op=document.querySelector('.opening'); if(op) op.style.display='none'; }

  if (reduce || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  const wide = matchMedia('(min-width:781px)').matches;

  /* INTRO：背景固定で FV→Concept 入替 */
  /* ピン留めはCSS sticky。外観を少しホールド→前景フェード→外観→内観クロスフェード→暗転。本文はその上を自然スクロールで上がってくる */
  gsap.to('.intro__hero',{autoAlpha:0,yPercent:-8,ease:'none',
    scrollTrigger:{trigger:'.intro',start:'top top',end:'+=70%',scrub:true}});
  gsap.to('.intro__bg2',{autoAlpha:1,ease:'none',
    scrollTrigger:{trigger:'.intro',start:'8% top',end:'+=70%',scrub:true}});
  gsap.to('.intro__dark',{opacity:.55,ease:'none',
    scrollTrigger:{trigger:'.intro',start:'top top',end:'+=88%',scrub:true}});
  gsap.to('.intro__scroll',{autoAlpha:0,ease:'none',
    scrollTrigger:{trigger:'.intro',start:'top top',end:'+=12%',scrub:true}});

  if (!wide) return; /* 以降の大きな動きはデスクトップ限定 */

  /* 写真の登場＝「滲み出る（ぼかし暗→クリア）」で全ページ統一。
     住まいの概要の写真／ROOMSギャラリー／寝床写真を同一パラメータで浮かび上がらせる */
  const emerge = (el, trig, start) => { if(!el) return;
    gsap.set(el,{filter:'blur(22px) brightness(.55)',scale:1.05});
    gsap.to(el,{filter:'blur(0px) brightness(1)',scale:1,ease:'power2.out',duration:1.8,
      scrollTrigger:{trigger:trig||el,start:start||'top 80%'}}); };
  emerge(document.querySelector('.info__photo'), '.info', 'top 64%');
  $$('.gal__item img').forEach(img=>emerge(img, img.closest('.gal__item'), 'top 84%'));
  emerge(document.querySelector('.sleep__ph img'), '.sleep__ph', 'top 84%');
  $$('.xp__ph img').forEach(img=>emerge(img, img.closest('.xp__ph'), 'top 84%'));

  /* ROOMS：横スクロールで巡る（pin） */
  document.body.classList.add('pinmode');
  $$('.tour').forEach(sec=>{
    const track=sec.querySelector('.tour__track');
    const dist=()=>Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track,{x:()=>-dist(),ease:'none',
      scrollTrigger:{trigger:sec,start:'top top',end:()=>'+='+dist(),pin:true,scrub:0.5,invalidateOnRefresh:true,anticipatePin:1}});
  });

  /* 縦に流れる控えめ視差（STAY / ROOMS ギャラリー共通：data-para を持つ要素） */
  $$('[data-para]').forEach(el=>{
    const sp=parseFloat(el.dataset.para)||0.05;
    gsap.fromTo(el.querySelector('.fr'),{yPercent:sp*60},{yPercent:-sp*60,ease:'none',
      scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:true}});
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>ScrollTrigger.refresh());
  addEventListener('load',()=>ScrollTrigger.refresh());
})();
