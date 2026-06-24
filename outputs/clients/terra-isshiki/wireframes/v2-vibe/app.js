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

  /* k. opening 幕: 白幕の上に黒ロゴだけ浮上（ナビ非表示）→ 幕がじんわり晴れると同時にロゴが黒→白へ溶け、ナビが現れる（ロゴは終始ひとつ・固定位置＝ズレなし） */
  if (!reduce && window.gsap) {
    gsap.set('.intro__logo',{autoAlpha:0});
    gsap.timeline()
      .to('.intro__logo',{autoAlpha:1,duration:1.6,ease:'power2.out'},.6)   /* 白幕の上に黒ロゴだけがじんわり浮上（ナビは非表示） */
      .addLabel('open','+=.9')
      .to('.intro__curtain',{autoAlpha:0,duration:2.4,ease:'sine.inOut'},'open') /* 白幕がじんわり晴れる（溶暗のみ・せり上がりなし） */
      .to('.intro__logo',{filter:'invert(1)',duration:2.4,ease:'sine.inOut'},'open')         /* 同時にロゴが黒→白へ溶ける（光なし） */
      .set('.intro__curtain',{display:'none'});
  } else { const c=document.querySelector('.intro__curtain'); if(c) c.style.display='none'; }

  /* ナビは FV の間は完全に隠し、FV を抜けてから現れる（FVページ=.intro を持つ場合のみ。下層ページは常時表示） */
  (function(){
    const nav=document.querySelector('.nav'); if(!nav) return;
    if(!document.querySelector('.intro')) return;            /* 下層ページは has-fv を付けず常時表示 */
    document.body.classList.add('has-fv');
    const thr=()=>innerHeight*0.85;                          /* FV(ヒーロー約1画面)を過ぎたら出す */
    const upd=()=>nav.classList.toggle('is-shown', scrollY>thr());
    addEventListener('scroll',upd,{passive:true});
    addEventListener('resize',upd); upd();
  })();
  /* FV背景スライドショー（複数写真を時間でクロスフェード。reduced時は1枚目固定） */
  (function(){
    const slides=$$('.intro__slide');
    if(reduce || slides.length<2) return;
    let i=0;
    setInterval(()=>{ slides[i].classList.remove('is-on'); i=(i+1)%slides.length; slides[i].classList.add('is-on'); }, 5000);
  })();

  if (reduce || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  const wide = matchMedia('(min-width:781px)').matches;

  /* INTRO：背景固定で FV→Concept 入替 */
  /* ピン留めはCSS sticky。外観を少しホールド→前景フェード→外観→内観クロスフェード→暗転。本文はその上を自然スクロールで上がってくる */
  gsap.to('.intro__hero',{autoAlpha:0,yPercent:-8,ease:'none',
    scrollTrigger:{trigger:'.intro',start:'top top',end:'+=70%',scrub:true}});
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

  /* TOP の ROOMS横スクロール / STAY / OWNER の写真も「滲み出る」で統一（transform競合回避でフィルタのみ） */
  const emergeF = (el, trig, start) => { if(!el) return;
    gsap.set(el,{filter:'blur(22px) brightness(.55)'});
    gsap.to(el,{filter:'blur(0px) brightness(1)',ease:'power2.out',duration:1.8,
      scrollTrigger:{trigger:trig||el,start:start||'top 80%'}}); };
  $$('.tour__card img').forEach(img=>emergeF(img, '.tour', 'top 72%'));
  $$('.stay .exp img').forEach(img=>emergeF(img, img.closest('.exp'), 'top 84%'));
  emergeF(document.querySelector('.owner__ph img'), '.owner__ph', 'top 80%');
  emergeF(document.querySelector('.access__map'), '.access', 'top 80%');

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

  /* 画像内パン視差（object-position をスクロールで動かす＝枠内で画像が流れる・端の隙間なし）。
     GSAPは object-position を直接tween不可のため、プロキシ値をonUpdateでinline反映 */
  $$('[data-paraimg]').forEach(img=>{
    const o={p:38};
    img.style.objectPosition='50% 38%';
    gsap.to(o,{p:62,ease:'none',
      scrollTrigger:{trigger:img.closest('section')||img,start:'top bottom',end:'bottom top',scrub:true},
      onUpdate:()=>{ img.style.objectPosition='50% '+o.p.toFixed(2)+'%'; }});
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>ScrollTrigger.refresh());
  addEventListener('load',()=>ScrollTrigger.refresh());
})();
