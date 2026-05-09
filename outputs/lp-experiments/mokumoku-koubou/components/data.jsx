// データ定義（コピー、施工事例、お客様の声、ステップ、スタッフ、FAQ、特長 など）

const SERVICES = [
  {
    num: "01",
    title: "注文住宅",
    sub: "ORDER HOUSE",
    desc: "土地探しから資金計画、間取りのご提案まで。\nご家族のこれからを、ひとつずつ一緒に考えていく家づくりです。",
    feats: ["土地探しからOK", "自然素材", "耐震・断熱", "長期保証"],
    icon: "assets/icons/02.png",
    photo: "assets/services/order-house.webp",
  },
  {
    num: "02",
    title: "リフォーム・リノベーション",
    sub: "RENOVATION",
    desc: "今ある住まいに、新しい時間を。\n部分リフォームから全面リノベまで、暮らしに寄り添ってご提案します。",
    feats: ["小さな工事もOK", "無垢材リノベ", "水まわり", "断熱改修"],
    icon: "assets/icons/05.png",
    photo: "assets/services/renovation.webp",
  },
  {
    num: "03",
    title: "土地探し・資金相談",
    sub: "LAND & MONEY",
    desc: "「まだ土地もないし、予算もこれから…」\nそんな段階のご相談こそ、いちばん大切。気兼ねなくお話しください。",
    feats: ["無料相談", "ローン相談", "土地情報", "中立アドバイス"],
    icon: "assets/icons/03.png",
    photo: "assets/services/land-money.webp",
  },
];

const FEATURES = [
  {n:"01", title:"自然素材で、<br>深呼吸できる家", desc:"無垢材・漆喰・自然塗料。家族の毎日に、やさしい呼吸を。", icon:"assets/icons/12.png"},
  {n:"02", title:"耐震+断熱で、<br>長く安心", desc:"耐震等級3＋HEAT20 G2クラス。性能で守る、これからの住まい。", icon:"assets/icons/06.png"},
  {n:"03", title:"土地探しから<br>一緒に", desc:"地域を知り尽くしたスタッフが、あなたの暮らしに合う土地を。", icon:"assets/icons/04.png"},
  {n:"04", title:"資金計画も<br>お任せ", desc:"無理のない返済計画を、ファイナンシャルプランナー監修で。", icon:"assets/icons/03.png"},
];

const WORKS = [
  { id:1, cat:"order", catLabel:"注文住宅", title:"家族がつながる、自然素材のやさしい家", desc:"木のぬくもりを感じる、家族が安心して末永く暮らせる自然の住まい。", tags:["自然素材","子育て世帯","30坪台"], color:"linear-gradient(135deg,#d8c8a0,#bfa97a)", icon:"assets/icons/02.png", photo:"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80" },
  { id:2, cat:"renov", catLabel:"リノベ", title:"築40年の実家を、二世帯リノベ", desc:"思い出はそのままに、暮らしやすさを大幅にアップデート。", tags:["二世帯","断熱改修","フル改装"], color:"linear-gradient(135deg,#cdb892,#a89472)", icon:"assets/icons/01.png", photo:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80" },
  { id:3, cat:"order", catLabel:"注文住宅", title:"森と暮らす、平屋のちいさな家", desc:"敷地の樹木を活かした、自然と一体の30坪台プラン。", tags:["平屋","自然素材","30坪台"], color:"linear-gradient(135deg,#bdc89c,#8fa372)", icon:"assets/icons/02.png", photo:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80" },
  { id:4, cat:"reform", catLabel:"リフォーム", title:"水まわり一新、毎日の家事をらくに", desc:"キッチン・浴室・洗面をまとめて。家事動線をすっきりと。", tags:["水まわり","部分工事","2週間"], color:"linear-gradient(135deg,#e0d4ad,#c0a575)", icon:"assets/icons/05.png", photo:"https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=900&q=80" },
  { id:5, cat:"order", catLabel:"注文住宅", title:"光と風が抜ける、土間のある家", desc:"土間リビングを中心に、内と外がゆるやかにつながる住まい。", tags:["土間","平屋","ペット可"], color:"linear-gradient(135deg,#d4c89a,#a89260)", icon:"assets/icons/02.png", photo:"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80" },
  { id:6, cat:"renov", catLabel:"リノベ", title:"古民家の梁を活かした、和モダンリノベ", desc:"100年の梁と、新しい設備が共存する、唯一無二の住まい。", tags:["古民家","和モダン","フル改装"], color:"linear-gradient(135deg,#c0a978,#8e7547)", icon:"assets/icons/01.png", photo:"https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=900&q=80" },
];

const VOICES = [
  {
    speech:"無理に急がされることがなく、私たちのペースで相談できたのが安心でした。土地探しから一緒に動いてくれて本当に心強かったです。",
    name:"K様ご家族",
    meta:"30代 ご家族（注文住宅）",
    rating:5,
    avatar:"assets/characters/06.png",
  },
  {
    speech:"自然素材へのこだわりが伝わってきて、毎日帰宅するのが楽しみな家になりました。子どもの咳も減ったように感じます。",
    name:"S様ご家族",
    meta:"40代 ご夫婦＋お子様2人",
    rating:5,
    avatar:"assets/characters/06.png",
  },
  {
    speech:"小さなリフォームでしたが、丁寧に向き合ってくださいました。次は浴室もお願いするつもりです。",
    name:"T様",
    meta:"60代 部分リフォーム",
    rating:5,
    avatar:"assets/characters/05.png",
  },
  {
    speech:"資金計画の相談が一番不安でしたが、何度も一緒に試算してくれて、無理のない予算で家を建てられました。",
    name:"M様ご家族",
    meta:"30代 ご夫婦",
    rating:5,
    avatar:"assets/characters/03.png",
  },
  {
    speech:"営業されるのが苦手でしたが、無理な勧誘が一切なくて驚きました。じっくり考える時間をくれて感謝しています。",
    name:"H様",
    meta:"50代 ご夫婦",
    rating:5,
    avatar:"assets/characters/04.png",
  },
];

const STEPS = [
  { n:"01", title:"資料請求・\n見学予約", icon:"assets/icons/09.png" },
  { n:"02", title:"初回相談", icon:"assets/icons/07.png" },
  { n:"03", title:"プラン提案", icon:"assets/icons/10.png" },
  { n:"04", title:"ご契約", icon:"assets/icons/11.png" },
  { n:"05", title:"着工", icon:"assets/icons/05.png" },
  { n:"06", title:"お引き渡し", icon:"assets/icons/01.png" },
  { n:"07", title:"アフター\nサポート", icon:"assets/icons/12.png" },
];

const STAFF = [
  { name:"大工 たくみ", subname:"棟梁・現場監督", role:"現場監督・職人", bio:"創業から30年、家づくりひとすじ。", avatar:"assets/characters/01.png" },
  { name:"案内 みどり", subname:"営業・案内係", role:"暮らしの案内人", bio:"ご家族の暮らしに寄り添ってご提案。", avatar:"assets/characters/02.png" },
  { name:"設計 りすか", subname:"一級建築士", role:"プラン・設計担当", bio:"敷地と家族構成から、最適なプランを。", avatar:"assets/characters/03.png" },
  { name:"うさぎ さん", subname:"インテリア", role:"内装コーディネーター", bio:"色や素材、家具のご提案までサポート。", avatar:"assets/characters/04.png" },
  { name:"ふくろう先生", subname:"FP・税理士", role:"資金計画の相談役", bio:"ローンと税金のことなら何でも。", avatar:"assets/characters/05.png" },
];

const FAQS = [
  { q:"まだ土地がなくても相談できますか？", a:"はい、土地探しから一緒にご相談いただけます。地域の不動産会社とも連携しており、ご希望に合った土地をご提案します。資金計画とあわせてのご相談も多いです。" },
  { q:"予算が決まっていなくても大丈夫ですか？", a:"もちろん大丈夫です。年収・ご家族構成・将来設計をうかがいながら、無理のない返済計画を一緒に考えます。FP（ファイナンシャルプランナー）相談は無料です。" },
  { q:"相談したら営業されませんか？", a:"無理な営業は一切いたしません。「いま検討中なので連絡控えてください」のご要望もOKです。ご家族のペースを何より大切にしています。" },
  { q:"小さなリフォームでもお願いできますか？", a:"はい、水栓1つの交換から大規模リノベまで対応しています。「これって工務店に頼むべき…？」と迷ったら、まずはお気軽にご相談ください。" },
  { q:"アフターサポートはどうなっていますか？", a:"お引き渡し後も、3ヶ月・1年・3年・5年・10年と定期点検にお伺いします。長期保証（最長60年）もご用意していますので、長く安心してお住まいいただけます。" },
  { q:"見学だけでも可能ですか？", a:"はい、もちろん歓迎です。完成見学会・モデルハウス・現場見学など、お好きなタイミングでご予約ください。お子様連れ大歓迎です。" },
];

const NUMBERS_OF_TRUST = [
  { num:"30", suf:"年", label:"創業からの実績" },
  { num:"480", suf:"棟＋", label:"これまでの施工実績" },
  { num:"98", suf:"%", label:"お客様の満足度" },
  { num:"60", suf:"年", label:"最長の長期保証" },
];

const CONTACT_OPTIONS = [
  { value:"shiryou", label:"資料請求", required:false },
  { value:"kengaku", label:"モデルハウス見学予約", required:false },
  { value:"soudan", label:"無料相談", required:false },
  { value:"tochi", label:"土地探し相談", required:false },
];

Object.assign(window, {
  SERVICES, FEATURES, WORKS, VOICES, STEPS, STAFF, FAQS, NUMBERS_OF_TRUST, CONTACT_OPTIONS
});
