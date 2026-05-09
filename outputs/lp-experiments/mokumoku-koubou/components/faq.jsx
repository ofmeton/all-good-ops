// FAQ アコーディオン

function FaqSection(){
  const [openIdx, setOpenIdx] = React.useState(0);

  return (
    <section className="faq section-pad" id="faq">
      <img src="assets/decor/01.png" className="decor" style={{top:60,right:"6%",width:60,opacity:.7}} alt=""/>
      <img src="assets/decor/22.png" className="decor" style={{bottom:80,left:"4%",width:80}} alt=""/>

      <div className="container">
        <SectionHead
          label="FAQ"
          title='よくある<span class="accent">ご質問</span>'
          lead="多くいただくご質問にお答えします。ここに無いご質問もお気軽にどうぞ。"
        />

        <div className="faq-wrap">
          {FAQS.map((f,i)=>(
            <div key={i} className={`faq-item fade-in visible ${openIdx===i?'open':''}`}>
              <button className="faq-q" onClick={()=>setOpenIdx(openIdx===i?-1:i)}>
                <span className="qmark">Q</span>
                <span className="qtxt">{f.q}</span>
                <span className="toggle">＋</span>
              </button>
              <div className="faq-a">
                <div>
                  <div className="ainner">
                    <span className="amark">A</span>
                    <span>{f.a}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { FaqSection });
