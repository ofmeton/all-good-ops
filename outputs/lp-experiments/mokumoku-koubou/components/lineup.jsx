// サービス3本柱（注文住宅・リフォーム・土地探し）

function ServiceLineupSection(){
  return (
    <section className="services section-pad" id="services">
      <img src="assets/decor/12.png" className="decor cloud" style={{top:60, right:"8%", width:100}} alt=""/>

      <div className="container">
        <SectionHead
          label="SERVICE"
          title='私たちにできる<span class="accent">3つのこと</span>'
          lead='家族の段階や暮らし方によって、住まいの選択肢はさまざま。<br/>あなたに合った方法を、一緒に見つけましょう。'
        />

        {SERVICES.map((s,i)=>(
          <div className={`service-row fade-in ${i%2===1?'reverse':''}`} key={s.num}>
            <div className="service-img">
              {s.photo && (
                <img
                  src={s.photo}
                  alt={s.title}
                  className="service-photo"
                  loading="lazy"
                  onError={(e)=>{
                    e.target.style.display='none';
                    const ph = e.target.parentElement.querySelector('.ph');
                    if(ph) ph.style.display='flex';
                  }}
                />
              )}
              <div className="ph" style={{display: s.photo ? 'none' : 'flex'}}>
                <div className="ph-content">
                  <img src={s.icon} alt=""/>
                  <div style={{
                    fontFamily:"Zen Maru Gothic, serif",
                    fontWeight:700,
                    color:"var(--green-2)",
                    fontSize:18,
                    letterSpacing:".05em",
                  }}>{s.title}のイメージ</div>
                  <div style={{fontSize:11,color:"var(--ink-2)"}}>※ ここに写真が入ります</div>
                </div>
              </div>
            </div>
            <div className="service-text">
              <div className="num-tag">
                <span className="num">{s.num}</span>
                <span>{s.sub}</span>
              </div>
              <h3 className="heading">{s.title}</h3>
              <p>{s.desc.split("\n").map((line,j)=>(
                <React.Fragment key={j}>{line}<br/></React.Fragment>
              ))}</p>
              <ul className="feat-list">
                {s.feats.map(f=>(<li key={f}>{f}</li>))}
              </ul>
              <TextBtn href="#contact">{s.title}を相談する</TextBtn>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { ServiceLineupSection });
