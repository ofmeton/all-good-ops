// FV (ファーストビュー)

const HERO_COPIES = {
  warm: {
    eyebrow: "地域に根ざして30年・自然素材の家づくり",
    h1: ["家族のこれからを、", "いっしょに育てる", <span className="accent" key="a">家づくり。</span>],
    sub: "地元で相談できる、ちょうどいい住まいのパートナー。土地探し・資金計画・間取り相談まで、はじめての家づくりを、ひとつずつ一緒に。"
  },
  bold: {
    eyebrow: "創業30年・地域密着の工務店",
    h1: [<span key="a">つくる、</span>, "守る、", <span className="accent" key="b">ずっと住む。</span>],
    sub: "見た目だけじゃない、暮らしを支える性能と素材を。耐震等級3＋HEAT20 G2、無垢材と漆喰の家。長く愛せる、性能でも選ばれる住まい。"
  },
  poetic: {
    eyebrow: "自然素材・無垢の家",
    h1: ["木のぬくもりと、", <span className="accent" key="a">深呼吸できる</span>, "毎日を。"],
    sub: "無垢の床に裸足で立つ、その気持ちよさから。素材の力を信じて、ご家族の毎日にやさしい呼吸を届けます。"
  },
  family: {
    eyebrow: "子育て世帯に選ばれて30年",
    h1: ["子どもが、", <span className="accent" key="a">のびのび育つ</span>, "家。"],
    sub: "走れる土間、家族がつながる吹き抜け、安心の自然素材。お子さまの成長と一緒に育っていく住まいを、ご家族と。"
  }
};

function Hero({ copyKey = "warm" }) {
  const c = HERO_COPIES[copyKey] || HERO_COPIES.warm;
  return (
    <section className="hero" id="top">
      <div className="container hero-inner">
        <img src="assets/decor/13.png" className="decor hero-bunting" alt="" />
        <img src="assets/decor/14.png" className="decor hero-cloud-1 cloud" alt="" />
        <img src="assets/decor/12.png" className="decor hero-cloud-2 cloud" alt="" />

        <div className="hero-content">
          <div className="hero-text">
            <div className="eyebrow-row">
              <span className="eyebrow">
                <img src="assets/logo/01.png" alt="" />
                {c.eyebrow}
              </span>
              <div className="hero-trust">
                <img src="assets/badges/01.png" alt="土地探しからOK" />
                <img src="assets/badges/03.png" alt="無理な営業なし" />
              </div>
            </div>
            <h1 className="heading">
              {c.h1.map((piece, i) =>
              <span className="row" key={i}>{piece}</span>
              )}
            </h1>
            <p className="hero-sub">{c.sub}</p>
            <div className="hero-cta">
              <OrangeBtn href="#contact" icon={<CalendarIcon size={20} />}>モデルハウスを見学する</OrangeBtn>
              <OutlineBtn href="#contact" icon={<DocIcon size={18} />}>無料で資料請求する</OutlineBtn>
            </div>
          </div>
        </div>
      </div>
    </section>);

}

Object.assign(window, { Hero, HERO_COPIES });
