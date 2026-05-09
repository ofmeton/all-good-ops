// メインアプリ

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroCopy": "warm",
  "decorLevel": "rich",
  "primaryGreen": "#6F8556",
  "accentOrange": "#D99A4E"
}/*EDITMODE-END*/;

function App(){
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // CSS variables for theme tweaks
  React.useEffect(()=>{
    document.documentElement.style.setProperty('--green-1', tweaks.primaryGreen);
    document.documentElement.style.setProperty('--orange-1', tweaks.accentOrange);
  }, [tweaks.primaryGreen, tweaks.accentOrange]);

  // 装飾レベル
  React.useEffect(()=>{
    const lvl = tweaks.decorLevel;
    document.body.dataset.decor = lvl;
    if(lvl==="minimal"){
      document.body.classList.add("decor-minimal");
    } else {
      document.body.classList.remove("decor-minimal");
    }
  }, [tweaks.decorLevel]);

  useFadeIn();

  return (
    <>
      <Header onMenuToggle={()=>setMenuOpen(!menuOpen)} menuOpen={menuOpen}/>
      <MobileMenu open={menuOpen} onClose={()=>setMenuOpen(false)}/>

      <main>
        <Hero copyKey={tweaks.heroCopy}/>
        <FeaturesSection/>
        <ServiceLineupSection/>
        <WorksSection/>
        <VoicesSection/>
        <StepsSection/>
        <StaffSection/>
        <FaqSection/>
        <ContactSection/>
      </main>

      <Footer/>
      <SpCta/>

      <TweaksPanel>
        <TweakSection label="ファーストビュー キャッチコピー"/>
        <TweakRadio label="コピー方向性"
          value={tweaks.heroCopy}
          options={[
            {value:"warm", label:"あたたかい"},
            {value:"bold", label:"性能訴求"},
            {value:"poetic", label:"詩的"},
            {value:"family", label:"子育て"},
          ]}
          onChange={v=>setTweak('heroCopy', v)}/>

        <TweakSection label="装飾の量"/>
        <TweakRadio label="装飾レベル"
          value={tweaks.decorLevel}
          options={[
            {value:"rich", label:"たっぷり"},
            {value:"minimal", label:"控えめ"},
          ]}
          onChange={v=>setTweak('decorLevel', v)}/>

        <TweakSection label="カラー"/>
        <TweakColor label="メイングリーン" value={tweaks.primaryGreen}
          onChange={v=>setTweak('primaryGreen', v)}/>
        <TweakColor label="アクセント" value={tweaks.accentOrange}
          onChange={v=>setTweak('accentOrange', v)}/>
      </TweaksPanel>

      <style>{`
        .decor-minimal .decor:not(.hero-bunting):not(.hero-cloud-1):not(.hero-cloud-2){display:none}
      `}</style>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
