/* =====================================================================
 * TERRA HAYAMA — サイト文言（コピー）一元管理ファイル
 * ---------------------------------------------------------------------
 * このファイルの文字列を書き換えて保存すると、そのままサイトに反映されます。
 * コード（.tsx）側を触る必要はありません。
 *
 *   ・配列の順番 = 画面での表示順
 *   ・"\n" = 改行位置（見出しリード文などで使用）
 *   ・img / src のパスを変えると写真も差し替わります
 *   ・EN 版を作るときは、このファイルを複製して翻訳すれば OK
 * ===================================================================== */

/* ------------------------------------------------------------------
 * サイト全体で共通の文言・URL・住所
 * ------------------------------------------------------------------ */
export const SITE = {
  airbnbUrl: "https://www.airbnb.com/h/terrahayama",
  postalAddress: "〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5",
  operator: "運営: 株式会社 BEAT ICE",
  // Google Maps の検索クエリ（埋め込み地図とリンク先の両方で使用）
  mapQuery: "神奈川県三浦郡葉山町一色1759-1-5",
  footerBrand: "TERRA",
  footerArea: "Hayama, Isshiki",
  copyright: "© 2026 TERRA HAYAMA. All rights reserved.",
  reserveDock: "空き状況を見る", // 画面右下に浮いている予約ボタン（/reserve へ）
  reserveButton: "Airbnb で予約する", // ページ内の予約ボタン（/reserve ページのフッターのみ、Airbnb 直リンク）
  footerReserveCta: "空き状況を確認する", // フッター共通CTA（/reserve ページ以外、/reserve へのリンク）
};

/* ------------------------------------------------------------------
 * グローバルナビ（ヘッダー）
 * ------------------------------------------------------------------ */
export const NAV = [
  { label: "Home", href: "/" },
  { label: "Rooms", href: "/rooms" },
  { label: "Stay", href: "/stay" },
  { label: "Owner", href: "/owner" },
  { label: "Access", href: "/access" },
  { label: "Reserve", href: "/reserve" },
];

/* ------------------------------------------------------------------
 * メタ情報（ブラウザタブ・検索結果・SNS シェア時の表示）
 * ------------------------------------------------------------------ */
export const META = {
  siteTitle: "TERRA HAYAMA — 葉山・一色の宿",
  titleTemplate: "%s · TERRA HAYAMA",
  description:
    "葉山一色海岸まで徒歩 8 分。葉山アイスの BEAT ICE が営む、一軒家の二階をまるごと貸し切る宿。",
  twitterDescription:
    "葉山一色海岸まで徒歩 8 分。BEAT ICE が営む、一軒家の二階をまるごと貸し切る宿。",
  ogImageAlt: "TERRA HAYAMA — リビングダイニング",
  ogImage: "/images/library/terra-005.jpg", // SNS シェア時のサムネイル画像
};

/* ------------------------------------------------------------------
 * TOP: FV（ファーストビュー）
 * ------------------------------------------------------------------ */
export const OPENING = {
  tag: "Concept",
  scrollLabel: "scroll",
  // コンセプト文（原文）。段落ごとに 1 要素、"\n" は段落内の改行。
  stanzas: [
    "TERRAは、葉山への愛から生まれました。",
    "海越しに望む富士山、\n棚田が広がる里山。",
    "この土地に暮らして十年、\n私たちは今もなお、\nこの町の風景に魅了され続けています。",
    "風景とはきっと、\n人の営みと自然がゆっくりと重なり合い、\n時間をかけて育まれてきたもの。",
    "ここでは、訪れる人と葉山との距離が、\nゆっくりとほどけていきます。",
    "海と山が織りなす自然のリズム、\nここに息づく人々の物語。",
  ],
};

/* ------------------------------------------------------------------
 * TOP: ページ本体
 * ------------------------------------------------------------------ */
export const TOP = {
  // FV 背景のスライドショー（建物の外観・内観が伝わる写真のみ）
  heroSlides: [
    { src: "/images/hero/hero-exterior-01.jpg", alt: "TERRA HAYAMA 外観 — 白漆喰と焼杉の蔵のような佇まい" },
    { src: "/images/hero/hero-02-bedroom.jpg", alt: "TERRA HAYAMA 寝室" },
    { src: "/images/library/terra-027.jpg", alt: "TERRA HAYAMA ダイニングとキッチン" },
    { src: "/images/library/terra-034.jpg", alt: "TERRA HAYAMA 和モダンの空間" },
    { src: "/images/library/terra-034.jpg", alt: "" },
    { src: "/images/library/terra-034.jpg", alt: "" },
  ],

  // 6 章の帯（タイトル → 写真 → 本文 → リンク）
  // 新順序: ①部屋と空間 ②設備と備品 ③過ごし方 ④周辺とアクセス ⑤営むのは、BEAT ICE ⑥予約と空き状況
  bands: [
    {
      href: "/rooms",
      title: "お部屋について",
      body: "ファミリーでもゆったり過ごせる75 ㎡の広さを、まるごと貸し切りいただけます。",
      img: "/images/rooms/rooms-hero.jpg",
      cta: "", // 空 = 帯にリンクを出さない（ストリップ末尾の「部屋の詳細を見る」に一本化）
    },
    {
      href: "/rooms#overview",
      title: "設備・備品",
      body: "",
      img: "/images/library/terra-122.jpg",
      cta: "", // 空 = 帯にリンクを出さない（セクション末尾の「設備の詳細を見る」に一本化）
    },
    {
      href: "/stay",
      title: "過ごし方",
      body: "歩いて 8 分の一色海岸へ。空気が澄んだ日には、海の向こうに富士山が見えることもあります。お部屋では、挽きたての抹茶と、ウェルカムサービスの葉山アイスをお楽しみください。",
      slides: [
        { src: "/images/stay/stay-fuji.jpg", alt: "一色海岸の向こうに望む富士山" },
        { src: "/images/stay/stay-matcha.jpg", alt: "お部屋で味わう挽きたての抹茶" },
        { src: "/images/owner/owner-icecream.webp", alt: "ウェルカムサービスの葉山アイス" },
        { src: "/images/stay/stay-tanada-tools.jpg", alt: "棚田の営みの道具" },
      ],
      cta: "過ごし方を見る",
    },
    // mapEmbed: true の帯はヘッド写真の代わりに Google マップを埋め込む（false にすると img の写真に戻る）
    {
      href: "/access",
      title: "周辺とアクセス",
      mapEmbed: true,
      body: "一色海岸まで徒歩 8 分、路線バスの停留所までは 1 分。歩いて 30 秒のコンビニと徒歩 5 分の地元スーパーで、滞在中の買い出しには困りません。観光にも出かけやすい場所です。",
      img: "/images/access/access-balcony.jpg",
      cta: "", // 空 = 帯にリンクを出さない（ストリップ末尾の「アクセスを見る」に一本化）
    },
    {
      href: "/owner",
      title: "私たちについて",
      body: "私たちBEAT ICEは、葉山の棚田で育てたお米からアイスクリームをつくっています。地域の学校給食にアイスを届けたり、教室で授業をすることもあります。この宿も、そんな夫婦の葉山愛から生まれました。",
      img: "/images/owner/owner-couple.jpg",
      cta: "BEAT ICE について",
    },
    {
      href: "/reserve",
      title: "ご予約について",
      body: "空き状況をご確認のうえ、Airbnb からご予約いただけます。",
      img: "/images/access/access-entrance.jpg",
      cta: "", // 空 = 帯自体（写真・タイトル）が /reserve へのリンク。ストリップの重複ボタンは撤去
    },
  ],

  // 01 部屋と空間 — 章直下の要約（定員・広さ + 写真マーキー）
  roomsDetail: {
    specs: [
      { label: "定員", value: "最大 8 名", note: "ゆったり過ごすなら 6 名まで" },
      { label: "広さ", value: "75 ㎡", note: "居室 43 ㎡・寝室 32 ㎡" },
    ],
    // 緩やかに横へ流れる部屋写真
    marquee: [
      { src: "/images/rooms/ldk-01.jpg", alt: "リビング・ダイニング" },
      { src: "/images/rooms/bedroom-01.jpg", alt: "寝室" },
      { src: "/images/rooms/kitchen-01.jpg", alt: "キッチン" },
      { src: "/images/rooms/bath.jpg", alt: "ひのきのバスルーム" },
      { src: "/images/rooms/ldk-03.jpg", alt: "リビングからの眺め" },
      { src: "/images/rooms/laundry.jpg", alt: "ランドリー" },
      { src: "/images/rooms/ldk-05.jpg", alt: "リビング" },
      { src: "/images/rooms/bedroom-02.jpg", alt: "寝室" },
    ],
    moreCta: "部屋の詳細を見る",
    moreHref: "/rooms",
  },

  // 05 BEAT ICE — 章直下のストリップは無し。詳細は帯の「BEAT ICE について」→ /owner へ
  // 04 周辺とアクセス — 章直下の要約（たどり着くための情報 + 地図の埋め込み）
  accessDetail: {
    rows: [
      { label: "住所", value: SITE.postalAddress },
      { label: "電車・バス", value: "JR 逗子駅から路線バスで約 25 分。「旧役場前」で下車、徒歩 1 分です。" },
      { label: "お車", value: "横浜横須賀道路「逗子IC」から約20分（交通状況による）。" },
      { label: "駐車場", value: "2 台（1 階の駐車スペース）" },
      { label: "チェックイン", value: "16:00 – 23:00" },
      { label: "チェックアウト", value: "11:00" },
    ],
    // iframeTitle は帯の地図 iframe の title 属性として使われる
    iframeTitle: "TERRA HAYAMA — 葉山町一色の地図",
    moreCta: "アクセスを見る",
    moreHref: "/access",
  },

  // 02 設備と備品 — 章直下の要約（4 行の一覧）
  amenitiesDetail: {
    rows: [
      { label: "キッチン", value: "2 口 IH・冷蔵庫・炊飯器・オーブンレンジ。調理器具は一式、食器は人数分。" },
      { label: "洗濯", value: "ドラム式洗濯機。洗剤と、室内干し用のハンガーラックも用意しています。" },
      { label: "室内", value: "Wi-Fi、TV（YouTube / Netflix 等）、スピーカー。エアコンは LDK と寝室に 1 台ずつ。" },
      { label: "アメニティ", value: "タオル、歯ブラシ、シャンプー・コンディショナー、化粧水・乳液、ドライヤーなど。" },
    ],
    note: "調味料は塩こしょう・油をご用意しています。足りない分は、徒歩圏内のスーパー・コンビニでどうぞ。",
    moreCta: "設備の詳細を見る",
    moreHref: "/rooms#overview",
  },

  // 06 予約と空き状況 — 章直下の要約（info/Airbnbボタンは帯・/reserveと重複するため撤去。
  // ご利用にあたって + その下に /reserve への入口リンクを1つだけ残す）
  reservationDetail: {
    notesTitle: "ご利用にあたって", // アコーディオンの見出し（中身は NOTICES）
    availabilityCta: "空き状況を見る",
    availabilityHref: "/reserve",
  },
};

/* ------------------------------------------------------------------
 * ご利用にあたって（注意事項の原文）— TOP と部屋ページで共通
 * ------------------------------------------------------------------ */
export const NOTICES = [
  "正面玄関ではなく、外階段を上って 2 階のお部屋にお入りいただきます。エレベーターはございませんのでご注意ください。",
  "室内は全面禁煙です。屋外では喫煙可能ですが灰皿のご用意はございません。携帯灰皿をご持参のうえ、吸い殻の処理をお願いいたします。室内での喫煙が発覚した場合、クリーニング費用をご請求させていただきます。",
  "近隣のお住まいの方々のご迷惑となりますので、夜間、屋外での大声での会話や音楽再生はお控えください。",
  "葉山は自然豊かな町なので、隙間から虫が侵入する可能性がございます。苦手な方はご注意ください。",
  "設備を損傷したり、寝具を著しく汚した場合、追加の清掃費・賠償費用をご請求させていただく場合があります。",
  "寝間着のご用意はございませんのでご持参ください。",
  "タオル・寝具はお一人様 1 セットずつのご利用をお願いしております。",
  "寝具類を使わない 6 歳以下のお子様がいらっしゃる場合はご相談ください。",
];

/* ------------------------------------------------------------------
 * 周辺スポット一覧（アクセスページで使用）
 * ------------------------------------------------------------------ */
export const POINTS = [
  { name: "一色海岸", time: "徒歩 8 分", note: "静かな遠浅の浜。朝の散歩にも、夕暮れの海にもどうぞ。" },
  { name: "セブンイレブン 葉山一色店", time: "徒歩 30 秒", note: "日用品・夜食のちょっとした買い出しに" },
  { name: "スズキヤ 葉山店", time: "徒歩 5 分", note: "1902 年創業、逗子・葉山の老舗スーパー。地元の鮮魚とお惣菜が評判です。" },
  { name: "森戸海岸", time: "車 8 分", note: "海水浴と夕陽のスポット" },
  { name: "上山口の棚田", time: "車 12 分", note: "オーナー夫妻が季節を通してお米を育てる棚田。葉山アイスは、ここのお米から生まれます。" },
  { name: "旧役場前 バス停", time: "徒歩 1 分", note: "葉山〜JR 逗子駅を結ぶ路線バスの最寄り停留所" },
  { name: "JR 逗子駅", time: "バス 25 分", note: "横須賀線・湘南新宿ライン" },
];

/* ------------------------------------------------------------------
 * 予約バンド（各下層ページ下部の共通 CTA セクション）
 * ------------------------------------------------------------------ */
export const CTA = {
  title: "予約は Airbnb から",
  body: "空き状況のご確認・お問い合わせ・ご予約は、Airbnb の物件ページから直接ご利用いただけます。",
};

/* ------------------------------------------------------------------
 * 過ごし方ページ（/stay）
 * ------------------------------------------------------------------ */
export const STAY_PAGE = {
  metaTitle: "過ごし方",
  metaDescription:
    "TERRA HAYAMA での過ごし方。歩いて 8 分の一色海岸と海越しの富士山、お部屋で楽しむ抹茶と葉山アイス。",
  hero: {
    img: "/images/library/terra-135.jpg",
    focal: "59% 27%", // 切り抜きの中心
    alt: "TERRA HAYAMA 過ごし方 — 床の間に飾られた棚田のアート",
    titleLines: ["葉山の一日を", "軽やかに過ごす。"],
    lead: "海辺の散歩と、富士の景色と、お部屋で一息。",
  },
  // icon: 写真が無い項目に表示する線画（wave / sun / leaf）
  // accent: 番号の色味（mist=青灰 / pine=松緑 / soil=土色）
  items: [
    {
      no: "01",
      title: "一色海岸と、海越しの富士山",
      body: "宿から海までは歩いて 8 分。朝の散歩や、夕方の寄り道にもちょうどいい距離です。空気が澄んだ日には、海の向こうに富士山の稜線が浮かびます。",
      image: "/images/stay/stay-fuji.jpg" as string | null,
      accent: "mist",
    },
    {
      no: "02",
      title: "お部屋で、抹茶と葉山アイス",
      body: "ウェルカムサービスの葉山アイスと、挽きたての抹茶をお部屋でお楽しみいただけます。散歩から戻って、ゆっくり一息どうぞ。",
      image: "/images/stay/stay-matcha.jpg" as string | null,
      accent: "pine",
    },
    {
      no: "03",
      title: "足を伸ばせば、上山口の棚田",
      body: "時間に余裕があれば、オーナーたちがお米を育てる上山口の棚田まで。海とはまた違う、葉山の里山の風景に出会えます。",
      image: "/images/stay/stay-tanada.jpg" as string | null,
      accent: "soil",
    },
  ],
  next: { title: "私たちについて", cta: "BEAT ICE について", href: "/owner" },
};

/* ------------------------------------------------------------------
 * オーナーページ（/owner）
 * ------------------------------------------------------------------ */
export const OWNER_PAGE = {
  metaTitle: "オーナー",
  metaDescription:
    "TERRA HAYAMA を営む BEAT ICE のこと。棚田で育てたお米からつくるアイスクリーム、学校給食への提供、田んぼでの米づくりを紹介します。",
  hero: {
    img: "/images/owner/owner-family.jpg",
    focal: "30% 46%", // 切り抜きの中心
    alt: "TERRA HAYAMA — 宿を営む BEAT ICE のふたり",
    titleLines: ["", "BEAT ICE について"],
  },
  sideLabel: "葉山に暮らす", // PC で縦書き表示される添え書き
  intro: [
    "TERRA HAYAMA を営む私たち BEAT ICE は、棚田で育てたお米からアイスクリームをつくっています。",
    "田んぼでの米づくりから、学校給食への提供、料理教室やマルシェの主催まで。さまざまな営みの延長に、この宿があります。",
    "葉山に移り住んで、十年。この町で私たちが好きになったものを、訪れる人にも見つけてもらえたらと願いながら、TERRA HAYAMA を営んでいます。",
  ],
  // 公式サイトへの導線（導入文の下に表示）
  officialCta: { label: "BEAT ICE 公式サイト", href: "https://www.beatice.jp/pages/about-us" },
  worksTitle: "私たちの営み",
  // 各カード: images は 2 枚をずらして重ねる（1 枚目が手前）。href は BEAT ICE 公式の関連ページ
  activities: [
    {
      title: "棚田米のアイスクリーム",
      body: "自分たちで育てたお米からつくる、甘酒由来のやさしい甘みのアイスクリームです。",
      images: [
        { src: "/images/owner/owner-icecream.webp", alt: "器に盛った葉山アイス" },
        { src: "/images/library/icecream-01.jpg", alt: "葉山アイスのパッケージ" },
      ],
      href: "https://www.beatice.jp/products/hayama-ice-12",
      linkLabel: "葉山アイスを公式サイトで見る",
    },
    {
      title: "学校給食の提供",
      body: "つくったアイスクリームを地域の学校給食に届けています。教室で棚田について授業をさせていただくこともあります。",
      images: [
        { src: "/images/owner/owner-school-lunch.jpg", alt: "学校給食に届く葉山アイス" },
        { src: "/images/library/school-class.jpg", alt: "教室での授業のようす" },
      ],
      href: "https://www.beatice.jp/pages/about-us",
      linkLabel: "BEAT ICE の歩みを見る",
    },
    {
      title: "田んぼでの営み",
      body: "仲間たちと棚田で土にふれ、季節とともに米を育てています。",
      images: [
        { src: "/images/library/taue-02.jpg", alt: "田植えのようす" },
        { src: "/images/owner/owner-tanada-work.jpg", alt: "棚田での米づくり" },
      ],
      href: "https://www.beatice.jp/pages/terraced-rice-field",
      linkLabel: "棚田のことを読む",
    },
  ],
  sns: {
    body: "アイスづくりや棚田の様子は、Instagram でも発信しています。",
    links: [
      { label: "Instagram", href: "https://www.instagram.com/beatice0923/" },
      { label: "BEAT ICE 公式サイト", href: "https://www.beatice.jp" },
    ],
  },
  next: { title: "周辺とアクセス", cta: "アクセスを見る", href: "/access" },
};

/* ------------------------------------------------------------------
 * 部屋と空間ページ（/rooms）
 * ------------------------------------------------------------------ */
export const ROOMS_PAGE = {
  metaTitle: "お部屋について",
  metaDescription:
    "TERRA HAYAMA のお部屋。LDK・寝室・バスルーム・ランドリー・キッチンをご紹介します。",
  hero: {
    img: "/images/library/terra-005.jpg",
    focal: "50% 50%", // 切り抜きの中心（画面幅で見切れるときにこの点へ寄る）
    alt: "TERRA HAYAMA お部屋 — 押し花と詩のしつらえ",
    title: "お部屋について",
    lead: "一軒家の二階を、まるごと貸し切りで。\n最大 8 名まで泊まれる、ゆとりの間取りです。",
  },
  // 写真ギャラリー（自動送りカルーセル）
  gallery: [
    {
      caption: "居室",
      description:
        "リビング・ダイニング・キッチンがつながる、広々とした空間。\n木の温かみと漆喰の手触りに包まれながらおくつろぎいただけます。",
      items: [
        "/images/rooms/ldk-01.jpg",
        "/images/rooms/ldk-02.jpg",
        "/images/rooms/ldk-03.jpg",
        "/images/rooms/ldk-04.jpg",
        "/images/library/terra-016.jpg",
      ],
    },
    {
      caption: "最大 8 名の寝室",
      description:
        "二段ベッド 2 台 / セミダブル 1 台 / 布団 2 組。家族・友人グループでご利用いただけます。",
      items: [
        "/images/rooms/bedroom-01.jpg",
        "/images/rooms/bedroom-02.jpg",
        "/images/library/terra-048.jpg",
      ],
    },
    {
      caption: "お風呂と水まわり",
      description:
        "木のぬくもりを感じる浴室。脱衣所には洗面台とドラム式洗濯機を備えています。",
      items: [
        "/images/rooms/bath.jpg",
        "/images/rooms/laundry.jpg",
        "/images/library/terra-068.jpg",
      ],
    },
  ],
  specsTitle: "基本情報",
  specs: [
    { label: "チェックイン", value: "16:00 – 23:00" },
    { label: "チェックアウト", value: "11:00" },
    {
      label: "定員",
      value: "最大 8 名様",
      note: "快適にお過ごしいただける目安は 6 名様以下",
    },
    { label: "サイズ", value: "75 ㎡（居室 43 ㎡ / 寝室 32 ㎡）" },
    { label: "駐車場", value: "2 台" },
  ],
  facilitiesTitle: "キッチン・設備・備品",
  facilityGroups: [
    {
      title: "キッチン",
      body: "各種調理器具を備えています。調味料は、塩こしょう・油をご用意。足りない分は徒歩圏内のコンビニ・スーパーで調達をお願いいたします。",
    },
    {
      title: "調理器具",
      body: "フライパン／鍋／まな板／包丁／ボウル／ザル／菜箸／トング／フライ返し／お玉／穴あきお玉／ピーラー／計量スプーン／ラップ／アルミホイル",
    },
    {
      title: "食器",
      body: "大皿・深皿・平皿・茶碗・汁椀・ワイングラス・マグカップ・グラス・スプーン・フォーク・箸・ワインオープナーなど、人数分揃えています。",
    },
    {
      title: "洗濯",
      body: "ドラム式洗濯機を備えています。洗剤も用意していますので、ご自宅と同じように洗濯ができます。皺の気になる衣類は室内干し用のハンガーラックでどうぞ。",
    },
    {
      title: "設備",
      body: "TV（地上波 / YouTube / Amazon Prime / Netflix 等）／2 口 IH コンロ／冷蔵庫／炊飯器／オーブンレンジ／電気ケトル／ドライヤー／ハンガーラック・ハンガー／スピーカー／抹茶メーカー／Wi-Fi 完備",
    },
    {
      title: "冷暖房器具",
      body: "LDK（エアコン 1 台）／寝室（エアコン 1 台）",
    },
    {
      title: "アメニティ",
      body: "バスタオル・フェイスタオル／歯ブラシ／ボディソープ／シャンプー／コンディショナー／洗顔フォーム／化粧水／乳液／綿棒／洗濯用洗剤 等",
    },
  ],
  noticesTitle: "ご利用にあたって",
  notices: NOTICES,
  next: { title: "葉山での過ごし方", cta: "過ごし方を見る", href: "/stay" },
};

/* ------------------------------------------------------------------
 * アクセスページ（/access）
 * ------------------------------------------------------------------ */
export const ACCESS_PAGE = {
  metaTitle: "アクセス",
  metaDescription:
    "TERRA HAYAMA のアクセスと立地。葉山一色海岸まで徒歩 8 分。神奈川県三浦郡葉山町一色 1759-1-5。",
  hero: {
    img: "/images/library/terra-070.jpg",
    focal: "50% 50%", // 切り抜きの中心
    alt: "TERRA HAYAMA — 玄関の赤土壁と組子の引き戸",
    title: "アクセスと周辺情報",
    lead: "住宅地に流れる、\n葉山時間。",
  },
  location: {
    title: "基本情報",
    rows: [
      { label: "住所", value: SITE.postalAddress },
      { label: "タイプ", value: "一軒家の 2 階フロアを貸し切り／最大 8 名" },
      { label: "駐車場", value: "1 階に駐車スペースあり" },
    ],
    sideImg: {
      src: "/images/library/terra-131.jpg",
      alt: "TERRA HAYAMA バルコニーから望む葉山の町並み",
    },
  },
  map: {
    titleLines: ["一色海岸からほど近い、", "静かな住宅地"],
    iframeTitle: "TERRA HAYAMA — 葉山町一色の地図",
    mapsCta: "Google マップで見る",
  },
  next: { title: "お部屋について", cta: "お部屋を見る", href: "/rooms" },
};

/* ------------------------------------------------------------------
 * ご予約ページ（/reserve）— 空き状況カレンダー + Airbnb への導線
 * ------------------------------------------------------------------ */
export const RESERVE_PAGE = {
  metaTitle: "ご予約",
  title: "ご予約と空き状況",
  lead: "空き状況をカレンダーでご確認のうえ、Airbnb のページからご予約ください。",
};
