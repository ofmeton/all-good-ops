// 施工事例 (フィルタ付き)

function WorksSection(){
  const [filter, setFilter] = React.useState("all");
  const filters = [
    {key:"all", label:"すべて"},
    {key:"order", label:"注文住宅"},
    {key:"renov", label:"リノベ"},
    {key:"reform", label:"リフォーム"},
  ];
  const filtered = filter==="all" ? WORKS : WORKS.filter(w => w.cat===filter);

  // フィルタ切替直後の card は IntersectionObserver の visible 判定が遅れて表示されないため
  // フィルタ変更時に即座に visible 化する
  React.useEffect(()=>{
    requestAnimationFrame(()=>{
      document.querySelectorAll('.works-grid .fade-in').forEach(el=>el.classList.add('visible'));
    });
  }, [filter]);

  return (
    <section className="works section-pad" id="works">
      <img src="assets/decor/04.png" className="decor" style={{top:50,right:"6%",width:90,opacity:.7,transform:"rotate(15deg)"}} alt=""/>
      <img src="assets/decor/15.png" className="decor" style={{bottom:60,left:"4%",width:90}} alt=""/>

      <div className="container" style={{position:"relative", zIndex:2}}>
        <SectionHead
          label="WORKS"
          title='これまでの<span class="accent">施工事例</span>'
          lead="家族の数だけ、住まいのカタチがあります。私たちが手がけたお家を、ぜひご覧ください。"
        />

        <div className="filter-bar">
          {filters.map(f=>(
            <button key={f.key}
              className={`filter-btn ${filter===f.key?'active':''}`}
              onClick={()=>setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="works-grid">
          {filtered.map((w,i)=>(
            <article className="work-card fade-in visible" key={w.id} style={{transitionDelay:`${i*60}ms`}}>
              <div className="thumb" style={{background:w.color}}>
                {w.photo && (
                  <img
                    src={w.photo}
                    alt={w.title}
                    className="thumb-photo"
                    loading="lazy"
                    onError={(e)=>{
                      e.target.style.display='none';
                      const dec = e.target.parentElement.querySelector('.thumb-decor');
                      if(dec) dec.style.display='flex';
                    }}
                  />
                )}
                <span className="thumb-tag">{w.catLabel}</span>
                <div className="thumb-decor" style={{display: w.photo ? 'none' : 'flex'}}>
                  <img src={w.icon} alt=""/>
                </div>
              </div>
              <div className="body">
                <h4>{w.title}</h4>
                <p>{w.desc}</p>
                <div className="meta">
                  {w.tags.map(t=>(
                    <span className="pill" key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div style={{textAlign:"center",marginTop:48}}>
          <OutlineBtn href="#">すべての施工事例を見る</OutlineBtn>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { WorksSection });
