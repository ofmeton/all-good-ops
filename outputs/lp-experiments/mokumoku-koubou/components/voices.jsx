// お客様の声 横方向マーキー（無限ループ）

function VoicesSection(){
  // VOICES を 2 セット連結することで、translateX(-50%) で seamless にループ
  const loop = [...VOICES, ...VOICES];

  return (
    <section className="voices section-pad" id="voices">
      <img src="assets/decor/01.png" className="decor" style={{top:60,left:"5%",width:60,opacity:.7}} alt=""/>
      <img src="assets/decor/19.png" className="decor" style={{top:120,right:"6%",width:80}} alt=""/>
      <img src="assets/decor/20.png" className="decor" style={{bottom:40,left:"10%",width:90}} alt=""/>

      <div className="container">
        <SectionHead
          label="VOICE"
          title='お客様の<span class="accent">声</span>'
          lead="家を建てた・リフォームしたお客様から、リアルな声をいただきました。"
        />
      </div>

      {/* マーキー本体は container の外に置いて画面端まで流す */}
      <div className="voices-marquee" aria-label="お客様の声">
        <div className="voice-track-marquee">
          {loop.map((v,i)=>(
            <div className="voice-card" key={i} aria-hidden={i >= VOICES.length}>
              <div className="stars">{"★★★★★".slice(0,v.rating)}</div>
              <div className="speech">「{v.speech}」</div>
              <div className="author">
                <img src={v.avatar} alt=""/>
                <div className="author-info">
                  <div className="name">{v.name}</div>
                  <div className="meta">{v.meta}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { VoicesSection });
