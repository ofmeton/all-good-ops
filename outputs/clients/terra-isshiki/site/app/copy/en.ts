/* =====================================================================
 * TERRA HAYAMA — English copy (EN)
 * ---------------------------------------------------------------------
 * Mirrors the structure of copy/ja.ts. The `: SiteCopy` annotation makes
 * any missing/renamed field a compile error, so translation gaps surface
 * in tsc.
 *
 * Term policy (per owner):
 *   ・Left in romaji with a first-mention gloss: TANADA (terraced rice
 *     fields), Satoyama, Amazake, Shikkui — glossed on first appearance
 *     within each page, romaji-only thereafter.
 *   ・Romaji, no gloss: place names (Hayama, Isshiki, Zushi, Morito,
 *     Kamiyamaguchi) and brand names (TERRA HAYAMA, BEAT ICE).
 *   ・Everything else translated naturally (charred cedar, alcove, etc.).
 * ===================================================================== */
import type { SiteCopy } from "./types";

// ja.ts では SITE / NOTICES を各所から参照している。en は自己参照できないため
// ローカル定数に切り出して差し込む（値は英語表記）。
const postalAddress = "1759-1-5 Isshiki, Hayama, Miura District, Kanagawa 240-0111";

const NOTICES = [
  "You enter the second-floor rooms by an outdoor stair, not the front door. Please note there is no elevator.",
  "The rooms are entirely non-smoking. Smoking is permitted outdoors, but no ashtrays are provided; please bring a portable ashtray and take your cigarette ends with you. A cleaning fee will be charged if indoor smoking is found.",
  "Out of consideration for our neighbours, please refrain from loud conversation or playing music outdoors at night.",
  "Hayama is rich in nature, so insects may occasionally find their way in through small gaps. Please be aware if this troubles you.",
  "If fixtures are damaged or bedding is significantly soiled, an additional cleaning or compensation fee may apply.",
  "Sleepwear is not provided; please bring your own.",
  "We ask that towels and bedding be used as one set per guest.",
  "If you are travelling with children aged 6 or under who will not use bedding, please let us know in advance.",
];

export const en: SiteCopy = {
  SITE: {
    airbnbUrl: "https://www.airbnb.com/h/terrahayama",
    postalAddress,
    operator: "Operated by BEAT ICE Inc.",
    mapQuery: "神奈川県三浦郡葉山町一色1759-1-5",
    footerBrand: "TERRA",
    footerArea: "Hayama, Isshiki",
    copyright: "© 2026 TERRA HAYAMA. All rights reserved.",
    reserveDock: "Check availability",
    reserveButton: "Book on Airbnb",
    footerReserveCta: "Check availability",
  },

  NAV: [
    { label: "Home", href: "/" },
    { label: "Rooms", href: "/rooms" },
    { label: "Stay", href: "/stay" },
    { label: "Owner", href: "/owner" },
    { label: "Access", href: "/access" },
    { label: "Reserve", href: "/reserve" },
  ],

  META: {
    siteTitle: "TERRA HAYAMA — a guesthouse in Isshiki, Hayama",
    titleTemplate: "%s · TERRA HAYAMA",
    description:
      "An 8-minute walk from Isshiki Beach in Hayama. The whole second floor of a house to yourselves, hosted by BEAT ICE, the makers of Hayama ice cream.",
    twitterDescription:
      "An 8-minute walk from Isshiki Beach. A private second floor, hosted by BEAT ICE.",
    ogImageAlt: "TERRA HAYAMA — the living and dining room",
    ogImage: "/images/library/terra-005.jpg",
  },

  OPENING: {
    tag: "Concept",
    scrollLabel: "scroll",
    stanzas: [
      "TERRA was born from a love of Hayama.",
      "Mount Fuji beyond the sea,\nTANADA (terraced rice fields) spread across the hills.",
      "Ten years since we made this town our home,\nand still,\nits scenery holds us.",
      "Scenery, perhaps, is what forms\nwhen human life and nature slowly overlap,\ntended over time.",
      "Here, the distance between you and Hayama\ngently comes undone.",
      "The natural rhythm of sea and hills,\nthe stories of the people who live here.",
    ],
  },

  TOP: {
    heroSlides: [
      { src: "/images/hero/hero-exterior-01.jpg", alt: "TERRA HAYAMA exterior — a storehouse-like facade of white plaster and charred cedar" },
      { src: "/images/library/terra-005.jpg", alt: "TERRA HAYAMA dining and kitchen" },
      { src: "/images/library/terra-027.jpg", alt: "" },
      { src: "/images/library/terra-017.jpg", alt: "" },
      { src: "/images/library/terra-044.jpg", alt: "" },
      { src: "/images/library/terra-016.jpg", alt: "" },
    ],

    bands: [
      {
        href: "/rooms",
        title: "The Rooms",
        body: "The whole 75 m² — room enough for a family to spread out — is yours to yourselves.",
        img: "/images/rooms/rooms-hero.jpg",
        cta: "",
      },
      {
        href: "/rooms#overview",
        title: "Amenities",
        body: "",
        img: "/images/library/terra-122.jpg",
        cta: "",
      },
      {
        href: "/stay",
        title: "Your Stay",
        body: "Eight minutes on foot to Isshiki Beach. On clear days, Mount Fuji rises across the water. Back in your room, enjoy freshly ground matcha and a welcome serving of Hayama ice cream.",
        slides: [
          { src: "/images/stay/stay-fuji.jpg", alt: "Mount Fuji beyond Isshiki Beach" },
          { src: "/images/stay/stay-matcha.jpg", alt: "Freshly ground matcha in the room" },
          { src: "/images/owner/owner-icecream.webp", alt: "A welcome serving of Hayama ice cream" },
          { src: "/images/stay/stay-tanada-tools.jpg", alt: "Tools for the rice-field work" },
        ],
        cta: "About your stay",
      },
      {
        href: "/access",
        title: "Around & Access",
        mapEmbed: true,
        body: "Eight minutes on foot to Isshiki Beach, one minute to the bus stop. A convenience store 30 seconds away and a local supermarket five minutes on foot keep you well supplied, and day trips are easy from here.",
        img: "/images/access/access-balcony.jpg",
        cta: "",
      },
      {
        href: "/owner",
        title: "About Us",
        body: "We are BEAT ICE, and we make ice cream from rice we grow in Hayama's TANADA (terraced rice fields). We deliver it to local school lunches and sometimes teach classes at school. This guesthouse, too, grew out of a couple's love for Hayama.",
        img: "/images/owner/owner-couple.jpg",
        cta: "About BEAT ICE",
      },
      {
        href: "/reserve",
        title: "Reservations",
        body: "Check availability, then book directly through Airbnb.",
        img: "/images/access/access-entrance.jpg",
        cta: "",
      },
    ],

    roomsDetail: {
      specs: [
        { label: "Capacity", value: "Up to 8 guests", note: "6 for a relaxed stay" },
        { label: "Size", value: "75 m²", note: "Living 43 m² · Bedroom 32 m²" },
      ],
      marquee: [
        { src: "/images/rooms/ldk-01.jpg", alt: "Living and dining" },
        { src: "/images/rooms/bedroom-01.jpg", alt: "Bedroom" },
        { src: "/images/rooms/kitchen-01.jpg", alt: "Kitchen" },
        { src: "/images/rooms/bath.jpg", alt: "The Japanese cypress bath" },
        { src: "/images/rooms/ldk-03.jpg", alt: "View from the living room" },
        { src: "/images/rooms/laundry.jpg", alt: "Laundry" },
        { src: "/images/rooms/ldk-05.jpg", alt: "Living room" },
        { src: "/images/rooms/bedroom-02.jpg", alt: "Bedroom" },
      ],
      moreCta: "See the rooms",
      moreHref: "/rooms",
    },

    accessDetail: {
      rows: [
        { label: "Address", value: postalAddress },
        { label: "Train & bus", value: "About 25 minutes by local bus from JR Zushi Station. Get off at “Former Town Hall” — a 1-minute walk." },
        { label: "By car", value: "About 20 minutes from the Zushi IC exit of the Yokohama-Yokosuka Road (traffic permitting)." },
        { label: "Parking", value: "2 cars (ground-floor parking space)" },
        { label: "Check-in", value: "16:00 – 23:00" },
        { label: "Check-out", value: "11:00" },
      ],
      iframeTitle: "TERRA HAYAMA — map of Isshiki, Hayama",
      moreCta: "See access",
      moreHref: "/access",
    },

    amenitiesDetail: {
      rows: [
        { label: "Kitchen", value: "Two-burner IH, refrigerator, rice cooker, microwave oven. A full set of cookware, and tableware for everyone." },
        { label: "Laundry", value: "Front-loading washer. Detergent and an indoor drying rack are provided." },
        { label: "In-room", value: "Wi-Fi, TV (YouTube / Netflix, etc.), speaker. One air conditioner each in the living room and bedroom." },
        { label: "Amenities", value: "Towels, toothbrushes, shampoo and conditioner, toner and lotion, hair dryer, and more." },
      ],
      note: "For seasoning we provide salt, pepper, and oil. For anything more, the supermarket and convenience store are a short walk away.",
      moreCta: "See the amenities",
      moreHref: "/rooms#overview",
    },

    reservationDetail: {
      notesTitle: "Before your stay",
      availabilityCta: "Check availability",
      availabilityHref: "/reserve",
    },
  },

  NOTICES,

  POINTS: [
    { name: "Isshiki Beach", time: "8 min walk", note: "A quiet, shallow shore — lovely for a morning walk or the evening sea." },
    { name: "7-Eleven Hayama Isshiki", time: "30 sec walk", note: "For daily needs and a late-night snack." },
    { name: "Suzukiya Hayama", time: "5 min walk", note: "A supermarket founded in 1902, well loved in Zushi and Hayama for its fresh local fish and prepared foods." },
    { name: "Morito Beach", time: "8 min drive", note: "A spot for swimming and sunsets." },
    { name: "Kamiyamaguchi TANADA", time: "12 min drive", note: "The terraced rice fields where the owners grow rice through the seasons. Hayama ice cream begins with this rice." },
    { name: "Former Town Hall bus stop", time: "1 min walk", note: "The nearest stop on the bus line between Hayama and JR Zushi Station." },
    { name: "JR Zushi Station", time: "25 min by bus", note: "Yokosuka Line · Shonan-Shinjuku Line." },
  ],

  CTA: {
    title: "Reserve through Airbnb",
    body: "Check availability, ask a question, or book directly on our Airbnb listing.",
  },

  STAY_PAGE: {
    metaTitle: "Your Stay",
    metaDescription:
      "How to spend your days at TERRA HAYAMA — Isshiki Beach eight minutes away, Mount Fuji across the sea, and matcha and Hayama ice cream in your room.",
    hero: {
      img: "/images/library/terra-135.jpg",
      focal: "59% 27%",
      alt: "TERRA HAYAMA — terraced-rice-field artwork in the alcove",
      titleLines: ["Spend a day in Hayama,", "lightly."],
      lead: "A walk by the sea, a view of Fuji, a quiet moment in your room.",
    },
    items: [
      {
        no: "01",
        title: "Isshiki Beach, and Fuji across the sea",
        body: "The beach is an eight-minute walk from the house — just right for a morning stroll or an evening detour. On clear days, the ridgeline of Mount Fuji floats beyond the water.",
        image: "/images/stay/stay-fuji.jpg",
        accent: "mist",
      },
      {
        no: "02",
        title: "Hayama ice cream and matcha in your room",
        body: "A welcome serving of Hayama ice cream and freshly ground matcha wait for you in your room. Come back from your walk and take a slow breath.",
        image: "/images/library/icecream-02.jpg",
        accent: "pine",
      },
      {
        no: "03",
        title: "A little further: the TANADA of Kamiyamaguchi",
        body: "With time to spare, head to the TANADA (terraced rice fields) of Kamiyamaguchi, where the owners grow their rice — the Satoyama (where village meets mountain, and people and nature live in harmony) scenery of Hayama, quite different from the coast.",
        image: "/images/stay/stay-tanada.jpg",
        accent: "soil",
      },
    ],
    next: { title: "About Us", cta: "About BEAT ICE", href: "/owner" },
  },

  OWNER_PAGE: {
    metaTitle: "Owner",
    metaDescription:
      "About BEAT ICE, who run TERRA HAYAMA — ice cream made from rice grown in the terraced fields, deliveries to school lunches, and life in the paddies.",
    hero: {
      img: "/images/owner/owner-family.jpg",
      focal: "30% 46%",
      alt: "TERRA HAYAMA — the two of BEAT ICE, who host the guesthouse",
      titleLines: ["", "About BEAT ICE"],
    },
    sideLabel: "Living in Hayama",
    intro: [
      "We are BEAT ICE, and we make ice cream from rice we grow in TANADA (terraced rice fields).",
      "From growing rice in the paddies to delivering it to school lunches, and hosting cooking classes and markets.",
      "Ten years since we moved to Hayama. This guesthouse is one more branch of all that we do.",
    ],
    officialCta: { label: "BEAT ICE official site", href: "https://www.beatice.jp/pages/about-us" },
    worksTitle: "What we do",
    activities: [
      {
        title: "Ice cream from TANADA rice",
        body: "Ice cream made from rice we grow ourselves, gently sweetened with Amazake (a sweet fermented-rice drink).",
        images: [
          { src: "/images/owner/owner-icecream.webp", alt: "Hayama ice cream served in a bowl" },
          { src: "/images/library/icecream-01.jpg", alt: "Hayama ice cream packaging" },
        ],
        href: "https://www.beatice.jp/products/hayama-ice-12",
        linkLabel: "See Hayama ice cream on our site",
      },
      {
        title: "Serving school lunches",
        body: "We deliver the ice cream we make to local school lunches, and sometimes teach classes about the TANADA.",
        images: [
          { src: "/images/owner/owner-school-lunch.jpg", alt: "Hayama ice cream arriving at a school lunch" },
          { src: "/images/library/school-class.jpg", alt: "A class in session" },
        ],
        href: "https://www.beatice.jp/pages/about-us",
        linkLabel: "See the BEAT ICE story",
      },
      {
        title: "Life in the paddies",
        body: "With our friends, we work the TANADA soil and grow rice through the seasons.",
        images: [
          { src: "/images/library/taue-02.jpg", alt: "Planting the rice" },
          { src: "/images/owner/owner-tanada-work.jpg", alt: "Rice-field work in the TANADA" },
        ],
        href: "https://www.beatice.jp/pages/terraced-rice-field",
        linkLabel: "Read about the TANADA",
      },
    ],
    sns: {
      body: "We also share our ice cream and rice-field days on Instagram.",
      links: [
        { label: "Instagram", href: "https://www.instagram.com/beatice0923/" },
        { label: "BEAT ICE official site", href: "https://www.beatice.jp" },
      ],
    },
    next: { title: "Around & Access", cta: "See access", href: "/access" },
  },

  ROOMS_PAGE: {
    metaTitle: "The Rooms",
    metaDescription:
      "The rooms at TERRA HAYAMA — living room, bedroom, bath, laundry, and kitchen.",
    hero: {
      img: "/images/library/terra-005.jpg",
      focal: "50% 50%",
      alt: "TERRA HAYAMA rooms — pressed flowers and a verse",
      title: "The Rooms",
      lead: "The whole second floor of a house, to yourselves.\nRoom enough for up to 8 guests to stay in comfort.",
    },
    gallery: [
      {
        caption: "Living space",
        description:
          "An open space where living, dining, and kitchen flow together.\nWrapped in the warmth of wood and the texture of Shikkui (traditional lime plaster).",
        items: [
          "/images/rooms/ldk-01.jpg",
          "/images/rooms/ldk-02.jpg",
          "/images/rooms/ldk-03.jpg",
          "/images/rooms/ldk-04.jpg",
          "/images/library/terra-016.jpg",
        ],
      },
      {
        caption: "A bedroom for up to 8",
        description:
          "Two bunk beds / one semi-double / two futons. Comfortable for families and groups of friends.",
        items: [
          "/images/rooms/bedroom-01.jpg",
          "/images/rooms/bedroom-02.jpg",
          "/images/library/terra-048.jpg",
        ],
      },
      {
        caption: "Bath and washroom",
        description:
          "A bath with the warmth of wood. The changing area has a washbasin and a front-loading washer.",
        items: [
          "/images/rooms/bath.jpg",
          "/images/rooms/laundry.jpg",
          "/images/library/terra-068.jpg",
        ],
      },
    ],
    specsTitle: "Details",
    specs: [
      { label: "Check-in", value: "16:00 – 23:00" },
      { label: "Check-out", value: "11:00" },
      {
        label: "Capacity",
        value: "Up to 8 guests",
        note: "6 or fewer for a comfortable stay",
      },
      { label: "Size", value: "75 m² (living 43 m² / bedroom 32 m²)" },
      { label: "Parking", value: "2 cars" },
    ],
    facilitiesTitle: "Kitchen, facilities & amenities",
    facilityGroups: [
      {
        title: "Kitchen",
        body: "A full set of cookware is provided. For seasoning, we stock salt, pepper, and oil; please pick up anything else at the convenience store or supermarket within walking distance.",
      },
      {
        title: "Cookware",
        body: "Frying pan / pot / cutting board / knife / bowl / colander / cooking chopsticks / tongs / turner / ladle / slotted ladle / peeler / measuring spoons / cling film / aluminium foil",
      },
      {
        title: "Tableware",
        body: "Large, deep, and flat plates, rice bowls, soup bowls, wine glasses, mugs, tumblers, spoons, forks, chopsticks, a wine opener, and more — enough for everyone.",
      },
      {
        title: "Laundry",
        body: "A front-loading washer, with detergent provided, so you can do laundry just as you would at home. A drying rack is on hand for anything you'd rather not crease.",
      },
      {
        title: "Facilities",
        body: "TV (terrestrial / YouTube / Amazon Prime / Netflix, etc.) / two-burner IH cooktop / refrigerator / rice cooker / microwave oven / electric kettle / hair dryer / clothes rack and hangers / speaker / matcha maker / Wi-Fi throughout",
      },
      {
        title: "Heating & cooling",
        body: "Living room (one air conditioner) / bedroom (one air conditioner)",
      },
      {
        title: "Amenities",
        body: "Bath and face towels / toothbrush / body soap / shampoo / conditioner / face wash / toner / lotion / cotton swabs / laundry detergent, and more",
      },
    ],
    noticesTitle: "Before your stay",
    notices: NOTICES,
    next: { title: "Spending time in Hayama", cta: "About your stay", href: "/stay" },
  },

  ACCESS_PAGE: {
    metaTitle: "Access",
    metaDescription:
      "Getting to TERRA HAYAMA — an 8-minute walk from Isshiki Beach in Hayama. 1759-1-5 Isshiki, Hayama, Kanagawa.",
    hero: {
      img: "/images/library/terra-070.jpg",
      focal: "50% 50%",
      alt: "TERRA HAYAMA — the red-clay entrance wall and latticework sliding door",
      title: "Access & the neighbourhood",
      lead: "Hayama time,\nflowing through a quiet neighbourhood.",
    },
    location: {
      title: "Details",
      rows: [
        { label: "Address", value: postalAddress },
        { label: "Type", value: "The second floor of a house, booked whole / up to 8 guests" },
        { label: "Parking", value: "Parking space on the ground floor" },
      ],
      sideImg: {
        src: "/images/library/terra-131.jpg",
        alt: "The Hayama townscape from the TERRA HAYAMA balcony",
      },
    },
    map: {
      titleLines: ["Close to Isshiki Beach,", "a quiet neighbourhood"],
      iframeTitle: "TERRA HAYAMA — map of Isshiki, Hayama",
      mapsCta: "Open in Google Maps",
    },
    next: { title: "The Rooms", cta: "See the rooms", href: "/rooms" },
  },

  RESERVE_PAGE: {
    metaTitle: "Reserve",
    title: "Reservations & availability",
    lead: "Check availability on the calendar, then book through the Airbnb page.",
    liveLabel: "Synced with Airbnb (updated within 15 minutes)",
  },
};
