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
  airbnbUrl: "https://www.airbnb.jp/rooms/1399746059557999139",
  postalAddress: "〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5",
  operator: "運営: 株式会社 BEAT ICE",
  // Google Maps の検索クエリ（埋め込み地図とリンク先の両方で使用）
  mapQuery: "神奈川県三浦郡葉山町一色1759-1-5",
  footerBrand: "TERRA",
  footerArea: "Hayama, Isshiki",
  copyright: "© 2026 TERRA HAYAMA. All rights reserved.",
  reserveDock: "ご予約はこちら", // 画面右下に浮いている予約ボタン
  reserveButton: "Airbnb で予約する", // ページ内の予約ボタン
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
];

/* ------------------------------------------------------------------
 * メタ情報（ブラウザタブ・検索結果・SNS シェア時の表示）
 * ------------------------------------------------------------------ */
export const META = {
  siteTitle: "TERRA HAYAMA — 葉山一棟貸しの宿",
  titleTemplate: "%s · TERRA HAYAMA",
  description:
    "葉山一色海岸まで徒歩 8 分。葉山アイス屋 BEAT ICE が営む、海と山の風景に溶ける一棟貸しの宿。",
  twitterDescription:
    "葉山一色海岸まで徒歩 8 分。BEAT ICE が営む、海と山の風景に溶ける一棟貸し。",
  ogImageAlt: "TERRA HAYAMA — リビングダイニング",
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
    { src: "/images/hero/hero-01-living.jpg", alt: "TERRA HAYAMA リビングダイニング" },
    { src: "/images/hero/hero-02-bedroom.jpg", alt: "TERRA HAYAMA 寝室" },
    { src: "/images/hero/hero-exterior-02.jpg", alt: "TERRA HAYAMA 外観 — 葉山一色の住宅地に建つ一軒家" },
    { src: "/images/hero/hero-03-dining.jpg", alt: "TERRA HAYAMA ダイニングとキッチン" },
    { src: "/images/hero/hero-04-arch.jpg", alt: "TERRA HAYAMA 和モダンの空間" },
  ],

  // 6 章の帯（タイトル → 写真 → 本文 → リンク）
  bands: [
    {
      href: "/rooms",
      title: "部屋と空間",
      body: "一軒家の二階を、まるごと貸し切りで。LDK、ひのきのバス、フルキッチンが揃う 75 ㎡ です。定員は最大 8 名、ゆったり過ごすなら 6 名までが目安です。",
      img: "/images/rooms/rooms-hero.jpg",
      cta: "部屋を見る",
    },
    {
      href: "/stay",
      title: "過ごし方",
      body: "歩いて 8 分の一色海岸へ。空気が澄んだ日には、海の向こうに富士山が見えることもあります。お部屋では、挽きたての抹茶と、ウェルカムサービスの葉山アイスをお楽しみください。",
      img: "/images/access/access-balcony.jpg",
      cta: "過ごし方を見る",
    },
    {
      href: "/owner",
      title: "営むのは、BEAT ICE",
      body: "葉山の棚田で育てたお米から、アイスクリームをつくっています。地域の学校給食にアイスを届け、教室で授業をすることもあります。この宿も、そんな夫婦の暮らしの続きにあります。",
      img: "/images/about-hero-tanada.jpg",
      cta: "BEAT ICE について",
    },
    {
      href: "/access",
      title: "周辺とアクセス",
      body: "一色海岸まで徒歩 8 分、路線バスの停留所までは 1 分。歩いて 30 秒のコンビニと徒歩 5 分の地元スーパーで、滞在中の買い出しもすぐに済みます。海のそばの、静かな住宅地です。",
      img: "/images/access/access-balcony.jpg",
      cta: "アクセスを見る",
    },
    {
      href: "/rooms#overview",
      title: "設備と備品",
      body: "調理器具は一式、食器は人数分。ドラム式洗濯機は洗剤つきで、自宅と同じように洗濯ができます。タオルや歯ブラシ、シャンプーなどのアメニティも揃えました。",
      img: "/images/rooms/kitchen-01.jpg",
      cta: "設備を見る",
    },
    {
      href: "/access#reservation",
      title: "予約と空き状況",
      body: "ご予約は Airbnb から。チェックインは 16 時から 23 時、チェックアウトは 11 時です。空き状況のカレンダー、住所と地図も、サイト内でそのまま確認できます。",
      img: "/images/access/access-entrance.jpg",
      cta: "空き状況を見る",
    },
  ],

  // 01 部屋と空間 — 章直下の要約（基本情報 + 写真マーキー）
  roomsDetail: {
    title: "宿の基本情報",
    specs: [
      { label: "チェックイン", value: "16:00 – 23:00" },
      { label: "チェックアウト", value: "11:00" },
      { label: "定員", value: "最大 8 名", note: "ゆったり過ごすなら 6 名まで" },
      { label: "広さ", value: "75 ㎡", note: "居室 43 ㎡・寝室 32 ㎡" },
      { label: "駐車場", value: "2 台" },
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
      { src: "/images/rooms/kitchen-03.jpg", alt: "キッチン" },
    ],
    moreCta: "部屋の写真をもっと見る",
    moreHref: "/rooms",
  },

  // 02 過ごし方 — 章直下の写真スライドショー（ちょい見せ）。写真上に文字は載せない
  stayDetail: {
    slideshow: [
      { src: "/images/stay/stay-fuji.jpg", alt: "一色海岸の向こうに望む富士山" },
      { src: "/images/stay/stay-matcha.jpg", alt: "お部屋で味わう挽きたての抹茶" },
      { src: "/images/owner/owner-icecream.webp", alt: "ウェルカムサービスの葉山アイス" },
      { src: "/images/stay/stay-tanada-tools.jpg", alt: "棚田の営みの道具" },
    ],
  },

  // 03 オーナー — 章直下の要約
  ownerDetail: {
    title: "アイスをつくる、私たちのこと",
    intro:
      "田んぼでの米づくりから、学校給食への提供、料理教室やマルシェの主催まで。2015 年に葉山へ移り住んでから、暮らしとものづくりをふたりで続けてきました。この町で好きになったものを、訪れる人にも見つけていただけたら嬉しくて、この宿を営んでいます。",
    works: [
      {
        title: "棚田米のアイスクリーム",
        body: "自分たちで育てたお米からつくる、米麹由来のやさしい甘み。",
        img: "/images/owner/owner-icecream.webp",
      },
      {
        title: "学校給食の提供",
        body: "つくったアイスを地域の学校給食に届け、教室で授業をすることもあります。",
        img: "/images/owner/owner-school-lunch.jpg",
      },
      {
        title: "田んぼでの営み",
        body: "棚田で土にふれ、季節とともに米を育てる暮らし。",
        img: "/images/owner/owner-tanada-work.jpg",
      },
      {
        title: "夫婦のものづくり",
        body: "2015 年に葉山へ移り住み、暮らしもものづくりも、ふたりで続けています。",
        img: "/images/owner/owner-family.jpg",
      },
    ],
  },

  // 04 周辺とアクセス — 章直下の要約
  neighborhoodDetail: {
    title: "住所と、周辺への距離",
    addressLabel: "住所",
    mapsCta: "Google マップで見る",
  },

  // 05 設備と備品 — 章直下の要約
  amenitiesDetail: {
    title: "主な設備と備品",
    groups: [
      {
        title: "キッチン",
        body: "2 口 IH・冷蔵庫・炊飯器・オーブンレンジ・電気ケトル。抹茶メーカーもあります。",
      },
      {
        title: "調理器具・食器",
        body: "フライパン、鍋、包丁、ボウルなど調理器具は一式。食器とカトラリーは人数分。",
      },
      {
        title: "洗濯",
        body: "ドラム式洗濯機。洗剤と、室内干し用のハンガーラックを用意しています。",
      },
      {
        title: "TV・音楽・Wi-Fi",
        body: "TV（地上波 / YouTube / Netflix 等）、スピーカー、Wi-Fi 完備。",
      },
      {
        title: "冷暖房",
        body: "LDK と寝室に、エアコンを 1 台ずつ。",
      },
      {
        title: "アメニティ",
        body: "タオル、歯ブラシ、シャンプー・コンディショナー、化粧水・乳液、ドライヤーなど。",
      },
    ],
    note: "調味料は塩こしょう・油をご用意しています。足りない分は、徒歩圏内のスーパー・コンビニでどうぞ。",
  },

  // 06 予約と空き状況 — 章直下の要約
  reservationDetail: {
    title: "ご予約の前に",
    info: [
      { label: "ご予約", value: "Airbnb の物件ページから" },
      { label: "チェックイン", value: "16:00 – 23:00" },
      { label: "チェックアウト", value: "11:00" },
      { label: "空き状況", value: "サイト内のカレンダーで確認できます" },
    ],
    notesTitle: "ご利用にあたって",
    notes: [
      "外階段から 2 階のお部屋へ上がる造りです。エレベーターはありません。",
      "室内は全面禁煙です。屋外での喫煙は、携帯灰皿をご持参ください。",
      "静かな住宅地のため、夜間の屋外での大声・音楽再生はお控えください。",
      "寝間着のご用意はありません。ご持参ください。",
    ],
    allNotesCta: "注意事項をすべて見る",
    allNotesHref: "/rooms#overview",
    availabilityCta: "空き状況を見る",
    availabilityHref: "/access#reservation",
  },
};

/* ------------------------------------------------------------------
 * 周辺スポット一覧（TOP の要約とアクセスページで共通）
 * ------------------------------------------------------------------ */
export const POINTS = [
  { name: "一色海岸", time: "徒歩 8 分", note: "CNN 世界の厳選ビーチ 100 選" },
  { name: "セブンイレブン 葉山一色店", time: "徒歩 30 秒", note: "日用品・夜食のちょっとした買い出しに" },
  { name: "スズキヤ 葉山店", time: "徒歩 5 分", note: "地元の食材が揃う地域のスーパー。滞在中の自炊に" },
  { name: "森戸海岸", time: "車 8 分", note: "海水浴と夕陽のスポット" },
  { name: "上山口の棚田", time: "車 12 分", note: "葉山アイスのお米を育てる棚田" },
  { name: "旧役場前 バス停", time: "徒歩 1 分", note: "葉山〜JR 逗子駅を結ぶ路線バスの最寄り停留所" },
  { name: "JR 逗子駅", time: "車 15 分 / バス 25 分", note: "横須賀線・湘南新宿ライン" },
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
    "TERRA HAYAMA での過ごし方。歩いて 8 分の一色海岸、海越しの富士山、お部屋の抹茶、ウェルカムの葉山アイス。",
  hero: {
    img: "/images/hero/hero-06-137.jpg",
    alt: "TERRA HAYAMA 過ごし方 — 床の間に飾られた棚田のアート",
    titleLines: ["葉山の一日を、", "軽やかに"],
    lead: "一色海岸、海越しの富士山、抹茶、葉山アイス。",
  },
  // icon: 写真が無い項目に表示する線画（wave / sun / leaf）
  // accent: 番号の色味（mist=青灰 / pine=松緑 / soil=土色）
  items: [
    {
      no: "01",
      title: "一色海岸へ",
      body: "宿から海までは歩いて 8 分。朝の散歩や、夕方の寄り道にどうぞ。TERRA の過ごし方は、この海から始まります。",
      image: null as string | null,
      icon: "wave",
      accent: "mist",
    },
    {
      no: "02",
      title: "海越しの富士山",
      body: "空気が澄んだ日は、一色海岸の向こうに富士山が見えることもあります。海越しに望む、静かな稜線です。",
      image: "/images/stay/stay-fuji.jpg" as string | null,
      accent: "mist",
    },
    {
      no: "03",
      title: "お部屋で味わう抹茶",
      body: "お部屋では、挽きたての抹茶を味わえます。滞在中のひと息を、ゆっくりお楽しみください。",
      image: "/images/stay/stay-matcha.jpg" as string | null,
      accent: "pine",
    },
    {
      no: "04",
      title: "お部屋で楽しむ葉山アイス",
      body: "オーナーがつくる葉山アイスを、ウェルカムサービスとしてお部屋でお楽しみいただけます。",
      image: "/images/owner/owner-icecream.webp" as string | null,
      accent: "soil",
    },
  ],
  next: { title: "海まで、徒歩 8 分", cta: "アクセスを見る", href: "/access" },
};

/* ------------------------------------------------------------------
 * オーナーページ（/owner）
 * ------------------------------------------------------------------ */
export const OWNER_PAGE = {
  metaTitle: "オーナー",
  metaDescription:
    "TERRA HAYAMA を営む BEAT ICE のこと。棚田で育てたお米からつくるアイスクリーム、学校給食への提供、田んぼでの米づくりを紹介します。",
  hero: {
    img: "/images/about-hero-tanada.jpg",
    alt: "TERRA HAYAMA — BEAT ICE が育てる葉山の棚田、夕陽の風景",
    titleLines: ["お米のアイスをつくる、", "私たちのこと"],
  },
  sideLabel: "葉山に暮らす", // PC で縦書き表示される添え書き
  intro: [
    "TERRA HAYAMA を営むのは、葉山の BEAT ICE です。棚田で育てたお米からアイスクリームをつくり、海と里山を行き来しながら暮らしています。",
    "田んぼでの米づくりから、学校給食への提供、料理教室やマルシェの主催まで。そうした暮らしの延長に、この宿があります。",
    "葉山に移り住んで、十年。この町で私たちが好きになったものを、訪れる人にも見つけてもらえたらと願いながら、TERRA HAYAMA を営んでいます。",
  ],
  worksTitle: "葉山での、私たちの営み",
  activities: [
    {
      title: "棚田米のアイスクリーム",
      body: "自分たちで育てたお米からつくる、米麹由来のやさしい甘みのアイスクリームです。",
      image: "/images/owner/owner-icecream.webp",
    },
    {
      title: "学校給食の提供",
      body: "つくったアイスクリームを地域の学校給食に届けています。招かれて、教室で授業をすることもあります。",
      image: "/images/owner/owner-school-lunch.jpg",
    },
    {
      title: "田んぼでの営み",
      body: "棚田で土にふれ、季節とともに米を育てています。",
      image: "/images/owner/owner-tanada-work.jpg",
    },
    {
      title: "夫婦のものづくり",
      body: "2015 年に葉山へ移り住みました。暮らしも、ものづくりも、ふたりで続けています。",
      image: "/images/owner/owner-family.jpg",
    },
  ],
  sns: {
    body: "アイスづくりや棚田の様子は、SNS でも発信しています。",
    note: "※ アカウントリンクは準備中です。",
  },
  next: { title: "部屋と空間", cta: "部屋を見る", href: "/rooms" },
};

/* ------------------------------------------------------------------
 * 部屋と空間ページ（/rooms）
 * ------------------------------------------------------------------ */
export const ROOMS_PAGE = {
  metaTitle: "部屋と空間",
  metaDescription:
    "TERRA HAYAMA の部屋と空間。LDK・寝室・バスルーム・ランドリー・キッチン詳細をご紹介します。",
  hero: {
    img: "/images/hero/hero-05-135.jpg",
    alt: "TERRA HAYAMA 部屋と空間 — 押し花と詩のしつらえ",
    title: "部屋と空間",
    lead: "一軒家の二階を、まるごと貸し切り。\n最大 8 名まで滞在できる、ゆとりの間取り。",
  },
  // 写真ギャラリー（自動送りカルーセル）
  gallery: [
    {
      caption: "リビング・ダイニング・キッチン",
      description:
        "木の天井と一面の窓。ソファ、楕円のダイニングテーブル、テレビが揃う、家族で集う空間。",
      items: [
        "/images/rooms/ldk-01.jpg",
        "/images/rooms/ldk-02.jpg",
        "/images/rooms/ldk-03.jpg",
        "/images/rooms/ldk-04.jpg",
      ],
    },
    {
      caption: "最大 8 名の寝室",
      description:
        "二段ベッド 2 台 / セミダブル 1 台 / 布団 2 組。家族・友人グループでまとまって泊まれます。",
      items: ["/images/rooms/bedroom-01.jpg", "/images/rooms/bedroom-02.jpg"],
    },
    {
      caption: "お風呂と水まわり",
      description:
        "ひのきに包まれたバスルーム。ドラム式洗濯機と真鍮の洗面ボウルが並ぶランドリー一体空間。",
      items: ["/images/rooms/bath.jpg", "/images/rooms/laundry.jpg"],
    },
  ],
  overviewTitle: "宿のご利用について",
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
      // フルキッチンの具体的な機材・スペックがオーナーから共有され次第、
      // コンロ口数・オーブン・食洗機などの型番/仕様をここに記載する。
      title: "キッチン設備（フルキッチン）",
      body: "自炊に十分なフルキッチンを完備しています。具体的な設備・スペックは準備中です。",
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
  notices: [
    "正面玄関ではなく、外階段を上って 2 階のお部屋にお入りいただきます。エレベーターはございませんのでご注意ください。",
    "室内は全面禁煙です。屋外では喫煙可能ですが灰皿のご用意はございません。携帯灰皿をご持参のうえ、吸い殻の処理をお願いいたします。室内での喫煙が発覚した場合、クリーニング費用をご請求させていただきます。",
    "近隣のお住まいの方々のご迷惑となりますので、夜間、屋外での大声での会話や音楽再生はお控えください。",
    "葉山は自然豊かな町なので、隙間から虫が侵入する可能性がございます。苦手な方はご注意ください。",
    "設備を損傷したり、寝具を著しく汚した場合、追加の清掃費・賠償費用をご請求させていただく場合があります。",
    "寝間着のご用意はございませんのでご持参ください。",
    "タオル・寝具はお一人様 1 セットずつのご利用をお願いしております。",
    "寝具類を使わない 6 歳以下のお子様がいらっしゃる場合はご相談ください。",
  ],
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
    img: "/images/access/access-entrance.jpg",
    alt: "TERRA HAYAMA — 玄関の赤土壁と組子の引き戸",
    title: "海まで、徒歩 8 分",
    lead: "住宅地に流れる、\n葉山らしい時間の中に佇む。",
  },
  location: {
    title: "葉山町、一色",
    rows: [
      { label: "住所", value: SITE.postalAddress },
      { label: "タイプ", value: "一棟貸し（一軒家の 2 階フロア）／最大 8 名" },
      { label: "駐車場", value: "1 階に駐車スペースあり" },
    ],
    sideImg: {
      src: "/images/access/access-balcony.jpg",
      alt: "TERRA HAYAMA バルコニーから望む葉山の町並み",
    },
  },
  map: {
    titleLines: ["一色海岸からほど近い、", "静かな住宅地に"],
    iframeTitle: "TERRA HAYAMA — 葉山町一色の地図",
    mapsCta: "Google マップで見る",
  },
  reservation: {
    titleLines: ["予約は Airbnb から", "空き状況はこちらで確認できます"],
  },
};
