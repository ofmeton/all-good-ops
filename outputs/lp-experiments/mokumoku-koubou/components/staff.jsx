// スタッフ紹介

function StaffSection(){
  return (
    <section className="staff section-pad" id="staff">
      <img src="assets/decor/19.png" className="decor" style={{top:80, right:"6%", width:90}} alt=""/>

      <div className="container">
        <SectionHead
          label="STAFF"
          title='ご家族と一緒に歩む、<span class="accent">頼れる仲間たち</span>'
          lead="それぞれの専門スタッフが、ご相談から完成・アフターまでチームで伴走します。"
        />
        <div className="staff-grid">
          {STAFF.map((s,i)=>(
            <div className="staff-card fade-in" key={s.name} style={{transitionDelay:`${i*60}ms`}}>
              <div className="avatar"><img src={s.avatar} alt=""/></div>
              <div className="role">{s.role}</div>
              <div className="name">{s.name}<small>{s.subname}</small></div>
              <p className="bio">{s.bio}</p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop:48,
          textAlign:"center",
          fontSize:13.5,
          color:"var(--ink-2)",
        }}>
          ※ スタッフはイメージです。実際のスタッフ写真とプロフィールは見学会等でご紹介します。
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { StaffSection });
