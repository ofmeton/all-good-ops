// 共通の小さなビルディングブロック

// 矢印
const Arrow = ({size=18}) => (
  <svg className="arrow" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7"/>
  </svg>
);

// ボタン
const PrimaryBtn = ({children, href="#contact", arrow=true, size, ...rest}) => (
  <a href={href} className={`btn btn-primary ${size==='lg'?'btn-lg':size==='sm'?'btn-sm':''}`} {...rest}>
    <span>{children}</span>{arrow && <Arrow/>}
  </a>
);

const OrangeBtn = ({children, href="#contact", arrow=true, icon, ...rest}) => (
  <a href={href} className="btn btn-orange" {...rest}>
    {icon}<span>{children}</span>{arrow && <Arrow/>}
  </a>
);

const OutlineBtn = ({children, href="#contact", arrow=true, icon, ...rest}) => (
  <a href={href} className="btn btn-outline" {...rest}>
    {icon}<span>{children}</span>{arrow && <Arrow/>}
  </a>
);

const TextBtn = ({children, href="#"}) => (
  <a href={href} className="btn-text"><span>{children}</span><Arrow size={14}/></a>
);

// セクションヘッダー
const SectionHead = ({label, title, lead, leafLeft, leafRight}) => (
  <div className="sec-head">
    {leafLeft && <img src={leafLeft} className="deco-leaf" style={{left:"-8px",top:"-30px",transform:"rotate(-25deg)"}} alt=""/>}
    {leafRight && <img src={leafRight} className="deco-leaf" style={{right:"-8px",top:"-20px",transform:"rotate(20deg)"}} alt=""/>}
    {label && <span className="label">{label}</span>}
    <h2 dangerouslySetInnerHTML={{__html:title}}/>
    {lead && (typeof lead === 'string' && lead.includes('<')
      ? <p className="lead" dangerouslySetInnerHTML={{__html:lead}}/>
      : <p className="lead">{lead}</p>)}
  </div>
);

// fade in observer hook
const useFadeIn = () => {
  React.useEffect(() => {
    const els = document.querySelectorAll('.fade-in:not(.visible)');
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },{threshold:.12, rootMargin:"0px 0px -60px 0px"});
    els.forEach(el=>io.observe(el));
    return ()=>io.disconnect();
  });
};

// アイコン: 電話
const PhoneIcon = ({size=22, color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
  </svg>
);

// アイコン: メール
const MailIcon = ({size=20, color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7 12 13 2 7"/>
  </svg>
);

// アイコン: カレンダー
const CalendarIcon = ({size=20, color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);

const DocIcon = ({size=20, color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
  </svg>
);

// 装飾物配置ヘルパー
const Decor = ({src, style, animate, alt=""}) => (
  <img
    src={src}
    alt={alt}
    className={`decor ${animate?`deco-bob ${animate}`:''}`}
    style={style}
  />
);

Object.assign(window, {
  Arrow, PrimaryBtn, OrangeBtn, OutlineBtn, TextBtn,
  SectionHead, useFadeIn,
  PhoneIcon, MailIcon, CalendarIcon, DocIcon,
  Decor
});
