// ヘッダー・グローバルナビ・ハンバーガー

const NAV_LINKS = [
  { href:"#top", label:"TOP" },
  { href:"#features", label:"特長" },
  { href:"#services", label:"サービス" },
  { href:"#works", label:"施工事例" },
  { href:"#voices", label:"お客様の声" },
  { href:"#steps", label:"家づくりの流れ" },
  { href:"#staff", label:"スタッフ" },
  { href:"#faq", label:"よくある質問" },
];

function Header({onMenuToggle, menuOpen}){
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(()=>{
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
    return () => window.removeEventListener('scroll', onScroll);
  },[]);

  return (
    <header className={`site-header ${scrolled?'scrolled':''}`}>
      <div className="header-inner">
        <a href="#top" className="logo">
          <img src="assets/logo/01.png" className="logo-img" alt="みどり工務店"/>
          <div className="logo-text">
            <div className="lt-1">みどり工務店</div>
            <div className="lt-2">自然素材の家づくり</div>
          </div>
        </a>
        <nav className="gnav">
          {NAV_LINKS.map(l=>(
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>
        <div className="header-cta">
          <a href="#contact" className="btn btn-outline btn-sm">
            <DocIcon size={16}/><span>資料請求</span>
          </a>
          <a href="#contact" className="btn btn-orange btn-sm">
            <CalendarIcon size={16}/><span>見学予約</span>
          </a>
          <button className={`hamburger ${menuOpen?'open':''}`} onClick={onMenuToggle} aria-label="メニュー">
            <span/>
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({open, onClose}){
  React.useEffect(()=>{
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  },[open]);
  return (
    <div className={`mobile-menu ${open?'open':''}`}>
      {NAV_LINKS.map(l=>(
        <a key={l.href} href={l.href} className="mm-link" onClick={onClose}>
          <span>{l.label}</span><Arrow size={16}/>
        </a>
      ))}
      <div className="mm-cta">
        <OutlineBtn href="#contact" icon={<DocIcon size={16}/>}>無料で資料請求する</OutlineBtn>
        <OrangeBtn href="#contact" icon={<CalendarIcon size={16}/>}>モデルハウス見学予約</OrangeBtn>
      </div>
    </div>
  );
}

Object.assign(window, { Header, MobileMenu, NAV_LINKS });
