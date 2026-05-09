// 家づくりの流れ（STEP）

function StepsSection(){
  return (
    <section className="steps section-pad" id="steps">
      <img src="assets/decor/01.png" className="decor" style={{top:60, left:"6%", width:80, opacity:.7}} alt=""/>
      <img src="assets/decor/12.png" className="decor cloud" style={{top:140, right:"7%", width:80}} alt=""/>
      <img src="assets/decor/22.png" className="decor" style={{bottom:60, right:"5%", width:70}} alt=""/>

      <div className="container">
        <SectionHead
          label="STEP"
          title='はじめての家づくりも、<span class="accent">7ステップ</span>でわかる'
          lead="ご相談から、お引き渡し、その後のサポートまで。すべての段階で、ご家族の伴走者として一緒に進みます。"
        />

        <div className="steps-track">
          {STEPS.map((s,i)=>(
            <div className="step-item fade-in" key={s.n} style={{transitionDelay:`${i*60}ms`}}>
              <div className="step-num">STEP {s.n}</div>
              <div className="step-icon"><img src={s.icon} alt=""/></div>
              <h4>{s.title.split("\n").map((line,j)=>(<React.Fragment key={j}>{line}<br/></React.Fragment>))}</h4>
            </div>
          ))}
        </div>

        <div style={{
          marginTop:64,
          padding:"28px 32px",
          background:"var(--base-3)",
          borderRadius:"24px",
          border:"1.5px dashed var(--orange-2)",
          display:"grid",
          gridTemplateColumns:"auto 1fr auto",
          gap:24,
          alignItems:"center"
        }}
        className="step-cta-card"
        >
          <img src="assets/characters/05.png" alt="" style={{width:80,height:80,borderRadius:"50%",background:"#fff"}}/>
          <div>
            <div style={{fontFamily:"Zen Maru Gothic, serif",fontWeight:700,fontSize:18,marginBottom:4}}>
              「まずは話を聞いてみたい」だけでも歓迎です
            </div>
            <div style={{fontSize:13.5,color:"var(--ink-2)",lineHeight:1.8}}>
              無理な営業は一切いたしません。ご家族のペースで、ゆっくり進めましょう。
            </div>
          </div>
          <OrangeBtn href="#contact" icon={<MailIcon size={18}/>}>無料相談する</OrangeBtn>
        </div>

        <style>{`
          @media(max-width:720px){
            .step-cta-card{grid-template-columns:1fr !important; text-align:center;}
            .step-cta-card img{margin:0 auto}
          }
        `}</style>
      </div>
    </section>
  );
}

Object.assign(window, { StepsSection });
