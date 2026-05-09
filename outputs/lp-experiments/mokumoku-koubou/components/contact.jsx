// お問い合わせフォーム

function ContactSection(){
  const [form, setForm] = React.useState({
    name:"", email:"", tel:"", purposes:[], message:"", privacy:false
  });
  const [errors, setErrors] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);

  const update = (k, v) => setForm(f => ({...f, [k]:v}));

  const togglePurpose = (v) => {
    setForm(f => ({
      ...f,
      purposes: f.purposes.includes(v) ? f.purposes.filter(x=>x!==v) : [...f.purposes, v]
    }));
  };

  const validate = () => {
    const e = {};
    if(!form.name.trim()) e.name = "お名前を入力してください";
    if(!form.email.trim()) e.email = "メールアドレスを入力してください";
    else if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "メールアドレスの形式が正しくありません";
    if(!form.tel.trim()) e.tel = "電話番号を入力してください";
    else if(!/^[0-9-+\s()]{10,}$/.test(form.tel)) e.tel = "電話番号の形式が正しくありません";
    if(form.purposes.length === 0) e.purposes = "ひとつ以上選択してください";
    if(!form.privacy) e.privacy = "プライバシーポリシーへの同意が必要です";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if(validate()){
      setSubmitted(true);
      setTimeout(()=>{
        document.querySelector('.form-success')?.scrollIntoView({behavior:"smooth",block:"center"});
      },50);
    }
  };

  return (
    <section className="contact section-pad" id="contact">
      <img src="assets/decor/14.png" className="decor cloud" style={{top:60,left:"6%",width:80}} alt=""/>
      <img src="assets/decor/12.png" className="decor cloud" style={{top:120,right:"4%",width:90}} alt=""/>

      <div className="container">
        <SectionHead
          label="CONTACT"
          title='まずは<span class="accent">お気軽に</span>ご相談ください'
          lead="資料請求・モデルハウス見学・無料相談、すべて費用はいただきません。お気軽にどうぞ。"
        />

        <div className="contact-grid">
          <div className="contact-side">
            <div className="lead-block">
              <h3>お電話・LINEでも<br/>受け付けています</h3>
              <p>「いきなりフォームはちょっと…」という方は、お電話やLINEでもどうぞ。</p>
              <div className="tel-block">
                <div className="label">お電話でのお問い合わせ</div>
                <div className="num">
                  <PhoneIcon size={26} color="var(--green-2)"/>
                  <span>0120-123-456</span>
                </div>
                <div className="hours">受付 9:00〜18:00（水曜定休）</div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:14}}>
                <a className="btn btn-outline btn-sm" href="#" style={{flex:1,padding:"12px 14px"}}>LINE で相談</a>
                <a className="btn btn-outline btn-sm" href="#" style={{flex:1,padding:"12px 14px"}}>来店予約</a>
              </div>
            </div>

            <div style={{
              padding:"22px",
              background:"var(--base-1)",
              borderRadius:"20px",
              border:"1px solid var(--line)",
              fontSize:13,
              color:"var(--ink-2)",
              lineHeight:1.9,
            }}>
              <div style={{fontFamily:"Zen Maru Gothic, serif",fontWeight:700,color:"var(--green-2)",marginBottom:8,fontSize:14}}>📍 ショールーム / 本社</div>
              〒999-0000<br/>
              ◯◯県◯◯市みどり町1-2-3<br/>
              ◯◯駅から車で5分・無料駐車場あり
            </div>
          </div>

          {submitted ? (
            <div className="form-card">
              <div className="form-success">
                <img className="icon" src="assets/icons/09.png" alt=""/>
                <h3>お問い合わせ<br/>ありがとうございます</h3>
                <p>2営業日以内にご連絡いたします。<br/>しばらくお待ちください。</p>
                <div style={{marginTop:24}}>
                  <button className="btn btn-outline btn-sm" onClick={()=>{
                    setSubmitted(false);
                    setForm({name:"",email:"",tel:"",purposes:[],message:"",privacy:false});
                    setErrors({});
                  }}>もう一度送信する</button>
                </div>
              </div>
            </div>
          ) : (
            <form className="form-card fade-in" onSubmit={submit} noValidate>
              <img src="assets/decor/11.png" className="decor" style={{top:-30,right:20,width:70}} alt=""/>

              <div className="field">
                <label>お名前 <span className="pill-must">必須</span></label>
                <input className="input" type="text" placeholder="例) 山田 太郎"
                  value={form.name}
                  onChange={e=>update('name', e.target.value)}/>
                {errors.name && <div className="err">{errors.name}</div>}
              </div>

              <div className="field">
                <label>メールアドレス <span className="pill-must">必須</span></label>
                <input className="input" type="email" placeholder="例) sample@example.com"
                  value={form.email}
                  onChange={e=>update('email', e.target.value)}/>
                {errors.email && <div className="err">{errors.email}</div>}
              </div>

              <div className="field">
                <label>電話番号 <span className="pill-must">必須</span></label>
                <input className="input" type="tel" placeholder="例) 090-1234-5678"
                  value={form.tel}
                  onChange={e=>update('tel', e.target.value)}/>
                {errors.tel && <div className="err">{errors.tel}</div>}
              </div>

              <div className="field">
                <label>ご希望の内容 <span className="pill-must">必須</span></label>
                <div className="check-row">
                  {CONTACT_OPTIONS.map(o=>(
                    <label className="check-pill" key={o.value}>
                      <input type="checkbox"
                        checked={form.purposes.includes(o.value)}
                        onChange={()=>togglePurpose(o.value)}/>
                      <span className="box"/>
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {errors.purposes && <div className="err">{errors.purposes}</div>}
              </div>

              <div className="field">
                <label>ご相談内容（任意）</label>
                <textarea className="textarea" placeholder="ご家族構成、ご希望のエリア、現在のお悩みなど、なんでもお書きください。"
                  value={form.message}
                  onChange={e=>update('message', e.target.value)}/>
              </div>

              <div className="field">
                <label className="check-pill" style={{cursor:"pointer", border:"1.5px solid var(--line)", background:"var(--base-3)", padding:"12px 18px"}}>
                  <input type="checkbox" checked={form.privacy} onChange={e=>update('privacy', e.target.checked)}/>
                  <span className="box"/>
                  <span style={{fontWeight:500,color:"var(--ink-1)"}}>
                    <a href="#" style={{textDecoration:"underline"}}>プライバシーポリシー</a>に同意する
                  </span>
                </label>
                {errors.privacy && <div className="err">{errors.privacy}</div>}
              </div>

              <div className="submit-row">
                <button type="submit" className="btn btn-primary btn-lg" style={{minWidth:240}}>
                  <MailIcon size={20} color="#fff"/>
                  <span>送信する</span>
                  <Arrow/>
                </button>
                <div className="privacy-note">
                  通常2営業日以内にご返信いたします
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { ContactSection });
