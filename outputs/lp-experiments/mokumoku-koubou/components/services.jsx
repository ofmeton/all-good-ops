// 特長 + 信頼の数字

function FeaturesSection(){
  return (
    <section className="features section-pad" id="features">
      <img src="assets/decor/01.png" className="decor deco-bob delay-1" style={{top:60, left:"4%", width:80, opacity:.85}} alt=""/>
      <img src="assets/decor/02.png" className="decor deco-bob" style={{top:120, right:"5%", width:90, opacity:.9}} alt=""/>
      <img src="assets/decor/22.png" className="decor deco-bob delay-2" style={{bottom:40, left:"8%", width:70}} alt=""/>

      <div className="container">
        <SectionHead
          label="OUR FEATURES"
          title='みどり工務店の<span class="accent">4つのこだわり</span>'
          lead="自然素材、性能、土地、お金。家づくりで大切な4つのことを、私たちは妥協しません。"
        />
        <div className="feature-grid">
          {FEATURES.map((f,i)=>(
            <div className="feature-card fade-in" key={f.n} style={{transitionDelay:`${i*80}ms`}}>
              <div className="num">{f.n}</div>
              <div className="icon-wrap"><img src={f.icon} alt=""/></div>
              <h3 dangerouslySetInnerHTML={{__html:f.title}}/>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>

        <NumbersOfTrust/>
      </div>
    </section>
  );
}

function NumbersOfTrust(){
  return (
    <div className="num-trust-wrap fade-in" style={{
      marginTop:80,
      padding:"36px 24px",
      background:"#fff",
      border:"1.5px dashed var(--green-3)",
      borderRadius:"24px",
      position:"relative",
    }}>
      <img src="assets/decor/04.png" className="decor" style={{top:-30,left:30,width:50,transform:"rotate(-15deg)"}} alt=""/>
      <img src="assets/decor/12.png" className="decor cloud" style={{top:-20,right:60,width:60}} alt=""/>
      <div style={{
        textAlign:"center",
        marginBottom:24,
      }}>
        <span className="pill pill-green" style={{fontSize:13}}>数字でみる、みどり工務店</span>
      </div>
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(4,1fr)",
        gap:24,
      }}
      className="num-trust-grid">
        {NUMBERS_OF_TRUST.map(n=>(
          <div key={n.label} style={{textAlign:"center"}}>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:4}}>
              <span className="num-display" style={{fontSize:"clamp(40px,5vw,64px)",lineHeight:1}}>{n.num}</span>
              <span style={{fontFamily:"Zen Maru Gothic, serif",fontWeight:700,color:"var(--green-2)",fontSize:18}}>{n.suf}</span>
            </div>
            <div style={{fontSize:13,color:"var(--ink-2)",marginTop:6,fontFamily:"Zen Maru Gothic, serif",fontWeight:500}}>{n.label}</div>
          </div>
        ))}
      </div>
      <style>{`
        @media(max-width:720px){
          .num-trust-grid{grid-template-columns:repeat(2,1fr) !important; gap:24px 16px !important;}
        }
      `}</style>
    </div>
  );
}

Object.assign(window, { FeaturesSection, NumbersOfTrust });
