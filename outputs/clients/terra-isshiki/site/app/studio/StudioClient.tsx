"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CopyField } from "./lib";
import { ImagePicker } from "./ImagePicker";

type Gallery = {
  path: string;
  elementKind: "object" | "string";
  images: string[];
};

type Props = {
  fields: CopyField[];
  images: string[];
  galleries: Gallery[];
};

/* ------------------------------------------------------------------
 * ラベル辞書 — path 末尾のキー（配列 index の場合はその親キー）→ 日本語。
 * 未登録キーはキー名をそのまま表示する。
 * ------------------------------------------------------------------ */
const LABELS: Record<string, string> = {
  title: "タイトル",
  body: "本文",
  cta: "リンク文言",
  moreCta: "リンク文言",
  img: "写真",
  src: "写真",
  focal: "切り抜きの中心",
  alt: "写真の説明",
  label: "項目名",
  value: "内容",
  note: "注記",
  summary: "紹介文",
  stanzas: "段落",
  lead: "リード文",
  tag: "タグ",
  scrollLabel: "スクロール表示",
  metaTitle: "ページ名",
  metaDescription: "ページ説明（検索用）",
  siteTitle: "サイト名",
  description: "説明文",
  titleTemplate: "タブ表示テンプレート",
  twitterDescription: "SNS用説明",
  ogImageAlt: "OG画像の説明",
  ogImage: "OG画像",
  reserveDock: "予約ボタン（右下）",
  reserveButton: "予約ボタン",
  airbnbUrl: "Airbnb URL",
  postalAddress: "住所",
  operator: "運営表記",
  mapQuery: "地図検索クエリ",
  footerBrand: "フッターブランド",
  footerArea: "フッター地名",
  copyright: "コピーライト",
  notesTitle: "注意事項の見出し",
  availabilityCta: "空き状況リンク文言",
  iframeTitle: "地図タイトル（読み上げ用）",
  name: "名称",
  time: "所要時間",
  href: "リンク先",
  titleLines: "タイトル行",
  caption: "キャプション",
  items: "写真",
  worksTitle: "見出し",
  sideLabel: "縦書き添え字",
  specsTitle: "見出し",
  facilitiesTitle: "見出し",
  noticesTitle: "見出し",
  overviewTitle: "見出し",
  gallery: "ギャラリー",
  marquee: "流れる写真",
  image: "写真",
  heroSlides: "スライド写真",
  slides: "スライド写真",
  intro: "導入文",
  no: "番号",
  icon: "アイコン種別",
  accent: "アクセント色",
  moreHref: "リンク先",
  availabilityHref: "リンク先",
  // NOTICES はトップレベルの文字列配列（辞書外の定数名）なので個別に補う。
  NOTICES: "注意事項",
};

function labelForPath(path: string): string {
  const tokens = path.split(".");
  const last = tokens[tokens.length - 1];
  const isIndex = /^\d+$/.test(last);

  if (isIndex) {
    const parentKey = tokens[tokens.length - 2] ?? last;
    const base = LABELS[parentKey] ?? parentKey;
    return `${base} ${Number(last) + 1}`;
  }

  return LABELS[last] ?? last;
}

/* ------------------------------------------------------------------
 * セクショングルーピング
 * ------------------------------------------------------------------ */
type FieldSection = {
  id: string;
  title: string;
  fields: CopyField[];
  galleries: Gallery[];
};

const STRIP_SECTIONS: { prefix: string; title: string }[] = [
  { prefix: "TOP.roomsDetail.", title: "部屋と空間・詳細" },
  { prefix: "TOP.amenitiesDetail.", title: "設備と備品・詳細" },
  { prefix: "TOP.stayDetail.", title: "過ごし方・スライド写真" },
  { prefix: "TOP.accessDetail.", title: "アクセス・詳細" },
  { prefix: "TOP.reservationDetail.", title: "予約・詳細" },
];

const CHILD_PAGE_SECTIONS: { prefix: string; title: string }[] = [
  { prefix: "ROOMS_PAGE.", title: "部屋と空間ページ" },
  { prefix: "STAY_PAGE.", title: "過ごし方ページ" },
  { prefix: "OWNER_PAGE.", title: "オーナーページ" },
  { prefix: "ACCESS_PAGE.", title: "アクセスページ" },
];

const COMMON_PREFIXES = ["SITE.", "NAV.", "META.", "CTA.", "POINTS."];

/* gallery.path 配下（例 "TOP.heroSlides.0.src"）を指す field は、ギャラリー編集ブロックが
 * 描画を引き受けるため、通常フィールド一覧から除外する。 */
function isGalleryOwnedField(fieldPath: string, galleries: Gallery[]): boolean {
  return galleries.some((g) => fieldPath.startsWith(`${g.path}.`));
}

function buildSections(allFields: CopyField[], galleries: Gallery[]): FieldSection[] {
  const fields = allFields.filter((f) => !isGalleryOwnedField(f.path, galleries));

  const consumedFields = new Set<CopyField>();
  const consumedGalleries = new Set<Gallery>();
  const sections: FieldSection[] = [];

  const take = (predicate: (f: CopyField) => boolean) => {
    const matched = fields.filter((f) => !consumedFields.has(f) && predicate(f));
    matched.forEach((f) => consumedFields.add(f));
    return matched;
  };

  const takeGalleries = (predicate: (g: Gallery) => boolean) => {
    const matched = galleries.filter((g) => !consumedGalleries.has(g) && predicate(g));
    matched.forEach((g) => consumedGalleries.add(g));
    return matched;
  };

  // 1. コンセプト文（FV）
  const opening = take((f) => f.path.startsWith("OPENING."));
  if (opening.length > 0) {
    sections.push({ id: "sec-opening", title: "コンセプト文（FV）", fields: opening, galleries: [] });
  }

  // 2. FV スライド写真（TOP.heroSlides は今やギャラリー1つ）
  const heroGalleries = takeGalleries((g) => g.path.startsWith("TOP.heroSlides"));
  if (heroGalleries.length > 0) {
    sections.push({ id: "sec-hero-slides", title: "FV スライド写真", fields: [], galleries: heroGalleries });
  }

  // 3. 帯ごとに 1 セクション（見出しは TOP.bands.N.title の値を使う）
  const bandIndexes = new Set<number>();
  for (const f of fields) {
    const m = f.path.match(/^TOP\.bands\.(\d+)\./);
    if (m) bandIndexes.add(Number(m[1]));
  }
  for (const g of galleries) {
    const m = g.path.match(/^TOP\.bands\.(\d+)\./);
    if (m) bandIndexes.add(Number(m[1]));
  }
  const sortedBandIndexes = Array.from(bandIndexes).sort((a, b) => a - b);
  for (const idx of sortedBandIndexes) {
    const bandFields = take((f) => f.path.startsWith(`TOP.bands.${idx}.`));
    const bandGalleries = takeGalleries((g) => g.path.startsWith(`TOP.bands.${idx}.`));
    if (bandFields.length === 0 && bandGalleries.length === 0) continue;
    const titleField = bandFields.find((f) => f.path === `TOP.bands.${idx}.title`);
    const bandTitle = titleField?.value ?? `帯 ${idx + 1}`;
    const num = String(idx + 1).padStart(2, "0");
    sections.push({
      id: `sec-band-${idx}`,
      title: `${num} ${bandTitle}`,
      fields: bandFields,
      galleries: bandGalleries,
    });
  }

  // 4. 各ストリップ
  for (const strip of STRIP_SECTIONS) {
    const stripFields = take((f) => f.path.startsWith(strip.prefix));
    const stripGalleries = takeGalleries((g) => g.path.startsWith(strip.prefix));
    if (stripFields.length > 0 || stripGalleries.length > 0) {
      sections.push({
        id: `sec-strip-${strip.prefix}`,
        title: strip.title,
        fields: stripFields,
        galleries: stripGalleries,
      });
    }
  }

  // 5. 子ページ
  for (const page of CHILD_PAGE_SECTIONS) {
    const pageFields = take((f) => f.path.startsWith(page.prefix));
    const pageGalleries = takeGalleries((g) => g.path.startsWith(page.prefix));
    if (pageFields.length > 0 || pageGalleries.length > 0) {
      sections.push({
        id: `sec-page-${page.prefix}`,
        title: page.title,
        fields: pageFields,
        galleries: pageGalleries,
      });
    }
  }

  // 6. ご利用にあたって（注意事項）
  const notices = take((f) => f.path.startsWith("NOTICES."));
  if (notices.length > 0) {
    sections.push({ id: "sec-notices", title: "ご利用にあたって（注意事項）", fields: notices, galleries: [] });
  }

  // 7. サイト共通（まとめて）
  const common = take((f) => COMMON_PREFIXES.some((prefix) => f.path.startsWith(prefix)));
  if (common.length > 0) {
    sections.push({ id: "sec-common", title: "サイト共通", fields: common, galleries: [] });
  }

  // どのグループにも入らないフィールド・ギャラリーは最後に「その他」
  const restFields = fields.filter((f) => !consumedFields.has(f));
  const restGalleries = galleries.filter((g) => !consumedGalleries.has(g));
  if (restFields.length > 0 || restGalleries.length > 0) {
    sections.push({ id: "sec-other", title: "その他", fields: restFields, galleries: restGalleries });
  }

  return sections;
}

/* ------------------------------------------------------------------
 * 保存 API 呼び出し
 * ------------------------------------------------------------------ */
type SaveStatus = "idle" | "saving" | "saved" | "error";

async function saveField(path: string, value: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "保存に失敗しました" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "通信に失敗しました。ネットワークをご確認ください。" };
  }
}

async function appendGalleryImage(
  arrayPath: string,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "append", arrayPath, value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "追加に失敗しました" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "通信に失敗しました。ネットワークをご確認ください。" };
  }
}

async function removeGalleryImage(
  arrayPath: string,
  index: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "remove", arrayPath, index }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "削除に失敗しました" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "通信に失敗しました。ネットワークをご確認ください。" };
  }
}

async function reorderGalleryImage(
  arrayPath: string,
  fromIndex: number,
  toIndex: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "reorder", arrayPath, fromIndex, toIndex }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "並び替えに失敗しました" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "通信に失敗しました。ネットワークをご確認ください。" };
  }
}

/* ------------------------------------------------------------------
 * text フィールド編集
 * ------------------------------------------------------------------ */
function TextFieldEditor({ field }: { field: CopyField }) {
  const [initial, setInitial] = useState(field.value);
  const [value, setValue] = useState(field.value);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const dirty = value !== initial;
  // 改行数 + 1（= 行数）を基準に、長文（1 行あたり ~28 文字超で折り返す想定）はさらに行数を積む。
  const lineBasedRows = initial.split("\n").length;
  const wrapBasedRows = Math.ceil(initial.length / 28);
  const initialRows = Math.max(1, lineBasedRows, wrapBasedRows);

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    setValue(el.value);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  async function handleSave() {
    setStatus("saving");
    setErrorMsg("");
    const result = await saveField(field.path, value);
    if (result.ok) {
      setInitial(value);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mincho text-[13px] text-(--color-mist)">{labelForPath(field.path)}</label>
      <textarea
        className="font-mincho w-full resize-none rounded-sm border border-(--color-sand) bg-white/70 px-3 py-2 text-[14px] leading-relaxed text-(--color-base-dark) outline-none focus:border-(--color-soil)"
        rows={initialRows}
        defaultValue={initial}
        onInput={handleInput}
      />
      <div className="flex min-h-[28px] items-center justify-between gap-2">
        <p className="break-all font-mono text-[10px] text-(--color-mist)/70">{field.path}</p>
        <div className="flex shrink-0 items-center gap-2">
          {status === "error" && <span className="text-[12px] text-red-700">{errorMsg}</span>}
          {status === "saved" && <span className="text-[12px] text-(--color-pine)">✓ 保存しました</span>}
          {dirty && status !== "saved" && (
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "saving"}
              className="rounded-sm bg-(--color-soil) px-3 py-1 text-[12px] text-(--color-base-light) transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "saving" ? "保存中…" : "保存"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * image フィールド編集
 * ------------------------------------------------------------------ */
function ImageFieldEditor({ field, images }: { field: CopyField; images: string[] }) {
  const [value, setValue] = useState(field.value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSelect(path: string) {
    setStatus("saving");
    setErrorMsg("");
    const result = await saveField(field.path, path);
    if (result.ok) {
      setValue(path);
      setStatus("saved");
      setPickerOpen(false);
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mincho text-[13px] text-(--color-mist)">{labelForPath(field.path)}</label>
      <div className="photo-float relative w-full cursor-pointer overflow-hidden rounded-sm bg-white" onClick={() => setPickerOpen(true)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} loading="lazy" className="aspect-[3/2] w-full object-cover" alt={labelForPath(field.path)} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPickerOpen(true);
          }}
          className="absolute right-2 top-2 rounded-sm bg-(--color-base-dark)/75 px-2.5 py-1 text-[11px] text-(--color-base-light) transition-opacity hover:opacity-90"
        >
          写真を変える
        </button>
      </div>
      <div className="flex min-h-[20px] items-center justify-between gap-2">
        <p className="break-all font-mono text-[10px] text-(--color-mist)/70">{value}</p>
        <div className="flex shrink-0 items-center gap-2">
          {status === "error" && <span className="text-[12px] text-red-700">{errorMsg}</span>}
          {status === "saving" && <span className="text-[12px] text-(--color-mist)">保存中…</span>}
          {status === "saved" && <span className="text-[12px] text-(--color-pine)">✓ 保存しました</span>}
        </div>
      </div>
      <ImagePicker
        open={pickerOpen}
        current={value}
        images={images}
        onSelect={handleSelect}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
 * focal（切り抜きの中心）フィールド編集
 * ------------------------------------------------------------------
 * hero.focal は常に同じオブジェクトの hero.img と対になっている想定。
 * path 末尾の "focal" を "img" に置き換えて allValueByPath から画像パスを引く。
 * 見つからなければ（呼び出し側の構造が想定と違う等）テキスト欄のみのフォールバックにする。
 */
function parsePercentPair(value: string): { x: number; y: number } | null {
  const m = value.match(/^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]) };
}

function siblingImgPath(focalPath: string): string | null {
  if (!focalPath.endsWith(".focal")) return null;
  return focalPath.slice(0, -".focal".length) + ".img";
}

function FocalPointEditor({
  field,
  allValueByPath,
}: {
  field: CopyField;
  allValueByPath: Map<string, string>;
}) {
  const [initial, setInitial] = useState(field.value);
  const [value, setValue] = useState(field.value);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const imgRef = useRef<HTMLImageElement | null>(null);

  const imgPath = siblingImgPath(field.path);
  const imageSrc = imgPath ? allValueByPath.get(imgPath) : undefined;
  const point = parsePercentPair(value);

  async function commit(nextValue: string) {
    setStatus("saving");
    setErrorMsg("");
    const result = await saveField(field.path, nextValue);
    if (result.ok) {
      setInitial(nextValue);
      setValue(nextValue);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    // object-contain のレターボックスを考慮し、コンテナ内で実際に画像が
    // 描画されている矩形（displayRect）を求める。
    const containerRect = img.getBoundingClientRect();
    const containerRatio = containerRect.width / containerRect.height;
    const imageRatio = img.naturalWidth / img.naturalHeight;

    let displayWidth = containerRect.width;
    let displayHeight = containerRect.height;
    if (imageRatio > containerRatio) {
      // 画像の方が横長 → 幅いっぱいに合わせ、上下に余白（レターボックス）
      displayHeight = containerRect.width / imageRatio;
    } else {
      // 画像の方が縦長 → 高さいっぱいに合わせ、左右に余白（ピラーボックス）
      displayWidth = containerRect.height * imageRatio;
    }
    const offsetX = (containerRect.width - displayWidth) / 2;
    const offsetY = (containerRect.height - displayHeight) / 2;

    const clickX = e.clientX - containerRect.left - offsetX;
    const clickY = e.clientY - containerRect.top - offsetY;

    // 余白（レターボックス）部分のクリックは無視する
    if (clickX < 0 || clickY < 0 || clickX > displayWidth || clickY > displayHeight) return;

    const pctX = Math.round((clickX / displayWidth) * 100);
    const pctY = Math.round((clickY / displayHeight) * 100);
    const clamped = { x: Math.min(100, Math.max(0, pctX)), y: Math.min(100, Math.max(0, pctY)) };

    void commit(`${clamped.x}% ${clamped.y}%`);
  }

  const dirty = value !== initial;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mincho text-[13px] text-(--color-mist)">{labelForPath(field.path)}</label>

      {imageSrc ? (
        <div className="relative w-full overflow-hidden rounded-sm bg-(--color-paper)">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageSrc}
            loading="lazy"
            onClick={handleImageClick}
            className="aspect-[3/2] w-full cursor-crosshair object-contain"
            alt={labelForPath(field.path)}
          />
          {point && (
            <div
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-(--color-soil) shadow-[0_1px_4px_rgba(26,20,16,0.5)]"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            />
          )}
        </div>
      ) : (
        <p className="rounded-sm border border-(--color-sand) bg-white/50 px-3 py-2 text-[12px] text-(--color-mist)">
          対応する写真が見つかりませんでした。下の欄に直接 &quot;X% Y%&quot; の形式で入力してください。
        </p>
      )}

      <input
        type="text"
        className="font-mono w-full rounded-sm border border-(--color-sand) bg-white/70 px-2.5 py-1.5 text-[12.5px] text-(--color-base-dark) outline-none focus:border-(--color-soil)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <p className="text-[11px] leading-relaxed text-(--color-mist)">
        画像をクリックした場所が、画面幅で切り抜かれるときの中心になります。
      </p>

      <div className="flex min-h-[20px] items-center justify-between gap-2">
        <p className="break-all font-mono text-[10px] text-(--color-mist)/70">{field.path}</p>
        <div className="flex shrink-0 items-center gap-2">
          {status === "error" && <span className="text-[12px] text-red-700">{errorMsg}</span>}
          {status === "saving" && <span className="text-[12px] text-(--color-mist)">保存中…</span>}
          {status === "saved" && <span className="text-[12px] text-(--color-pine)">✓ 保存しました</span>}
          {dirty && status !== "saved" && status !== "saving" && (
            <button
              type="button"
              onClick={() => void commit(value)}
              className="rounded-sm bg-(--color-soil) px-3 py-1 text-[12px] text-(--color-base-light) transition-opacity hover:opacity-90"
            >
              保存
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * ギャラリー（スライドショー）1 枚のカード
 * object 要素は "<gallery.path>.<i>.src" / "<gallery.path>.<i>.alt" を、
 * string 要素は "<gallery.path>.<i>" 自体を差し替え対象とする。
 * ------------------------------------------------------------------ */
function GallerySlideCard({
  gallery,
  index,
  src,
  altValue,
  images,
  canRemove,
  onRefreshNeeded,
}: {
  gallery: Gallery;
  index: number;
  src: string;
  altValue: string | null;
  images: string[];
  canRemove: boolean;
  onRefreshNeeded: () => void;
}) {
  const elementSrcPath =
    gallery.elementKind === "object" ? `${gallery.path}.${index}.src` : `${gallery.path}.${index}`;

  const [value, setValue] = useState(src);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [removing, setRemoving] = useState(false);
  const [moving, setMoving] = useState(false);

  async function handleSelect(path: string) {
    setStatus("saving");
    setErrorMsg("");
    const result = await saveField(elementSrcPath, path);
    if (result.ok) {
      setValue(path);
      setStatus("saved");
      setPickerOpen(false);
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  async function handleRemove() {
    if (!canRemove || removing) return;
    setRemoving(true);
    setErrorMsg("");
    const result = await removeGalleryImage(gallery.path, index);
    if (result.ok) {
      onRefreshNeeded();
    } else {
      setRemoving(false);
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  async function handleMove(dir: -1 | 1) {
    if (moving) return;
    const target = index + dir;
    if (target < 0 || target >= gallery.images.length) return;
    setMoving(true);
    setErrorMsg("");
    const result = await reorderGalleryImage(gallery.path, index, target);
    if (result.ok) {
      onRefreshNeeded(); // 成功時は親が再取得 → このカードは作り直されるので setMoving(false) 不要
    } else {
      setMoving(false);
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="photo-float relative w-full cursor-pointer overflow-hidden rounded-sm bg-white"
        onClick={() => setPickerOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} loading="lazy" className="aspect-[3/2] w-full object-cover" alt={altValue ?? ""} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPickerOpen(true);
          }}
          className="absolute right-2 top-2 rounded-sm bg-(--color-base-dark)/75 px-2.5 py-1 text-[11px] text-(--color-base-light) transition-opacity hover:opacity-90"
        >
          変更
        </button>
      </div>

      {gallery.elementKind === "object" && altValue !== null && (
        <AltTextEditor path={`${gallery.path}.${index}.alt`} initialValue={altValue} />
      )}

      <div className="flex min-h-[20px] items-center justify-between gap-2">
        <p className="break-all font-mono text-[10px] text-(--color-mist)/70">{value}</p>
        <div className="flex shrink-0 items-center gap-2">
          {status === "error" && <span className="text-[12px] text-red-700">{errorMsg}</span>}
          {status === "saving" && <span className="text-[12px] text-(--color-mist)">保存中…</span>}
          {status === "saved" && <span className="text-[12px] text-(--color-pine)">✓ 保存しました</span>}
          {moving && <span className="text-[12px] text-(--color-mist)">移動中…</span>}
          <button
            type="button"
            onClick={() => handleMove(-1)}
            disabled={index === 0 || moving}
            title="順番を前へ（左/上に移動）"
            className="rounded-sm border border-(--color-sand) px-2 py-1 text-[11px] leading-none text-(--color-mist) transition-colors hover:border-(--color-soil) hover:text-(--color-soil) disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => handleMove(1)}
            disabled={index === gallery.images.length - 1 || moving}
            title="順番を次へ（右/下に移動）"
            className="rounded-sm border border-(--color-sand) px-2 py-1 text-[11px] leading-none text-(--color-mist) transition-colors hover:border-(--color-soil) hover:text-(--color-soil) disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={!canRemove || removing}
            title={canRemove ? "この写真を削除" : "最低1枚は必要です"}
            className="rounded-sm border border-(--color-sand) px-2 py-1 text-[11px] text-(--color-mist) transition-colors hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {removing ? "削除中…" : "削除"}
          </button>
        </div>
      </div>

      <ImagePicker
        open={pickerOpen}
        current={value}
        images={images}
        onSelect={handleSelect}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

/* alt テキストは既存の text 保存フローと同じ replace を使う軽量エディタ */
function AltTextEditor({ path, initialValue }: { path: string; initialValue: string }) {
  const [initial, setInitial] = useState(initialValue);
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const dirty = value !== initial;

  async function handleSave() {
    setStatus("saving");
    setErrorMsg("");
    const result = await saveField(path, value);
    if (result.ok) {
      setInitial(value);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        className="font-mincho w-full rounded-sm border border-(--color-sand) bg-white/70 px-2.5 py-1.5 text-[12.5px] text-(--color-base-dark) outline-none focus:border-(--color-soil)"
        value={value}
        placeholder="写真の説明"
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex min-h-[18px] items-center justify-between gap-2">
        <span className="text-[10px] text-(--color-mist)/70">写真の説明</span>
        <div className="flex shrink-0 items-center gap-2">
          {status === "error" && <span className="text-[11px] text-red-700">{errorMsg}</span>}
          {status === "saved" && <span className="text-[11px] text-(--color-pine)">✓ 保存しました</span>}
          {dirty && status !== "saved" && (
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "saving"}
              className="rounded-sm bg-(--color-soil) px-2.5 py-0.5 text-[11px] text-(--color-base-light) transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "saving" ? "保存中…" : "保存"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * ギャラリー（スライドショー）編集ブロック — 1 つの画像配列を増減付きで編集する
 * ------------------------------------------------------------------ */
function GalleryBlock({
  gallery,
  images,
  altByPath,
  onRefreshNeeded,
}: {
  gallery: Gallery;
  images: string[];
  altByPath: Map<string, string>;
  onRefreshNeeded: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const count = gallery.images.length;
  const canRemove = count > 1;

  async function handleAppend(path: string) {
    setStatus("saving");
    setErrorMsg("");
    const result = await appendGalleryImage(gallery.path, path);
    if (result.ok) {
      setStatus("idle");
      setPickerOpen(false);
      onRefreshNeeded();
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-(--color-sand)/70 bg-white/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mincho text-[13px] text-(--color-mist)">{labelForPath(gallery.path)}</h3>
        <span className="text-[11px] text-(--color-mist)/70">写真 {count} 枚</span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {gallery.images.map((src, i) => {
          const altPath = `${gallery.path}.${i}.alt`;
          const altValue = gallery.elementKind === "object" ? (altByPath.get(altPath) ?? "") : null;
          return (
            <GallerySlideCard
              key={`${gallery.path}.${i}`}
              gallery={gallery}
              index={i}
              src={src}
              altValue={altValue}
              images={images}
              canRemove={canRemove}
              onRefreshNeeded={onRefreshNeeded}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="break-all font-mono text-[10px] text-(--color-mist)/70">{gallery.path}</p>
        <div className="flex shrink-0 items-center gap-2">
          {status === "error" && <span className="text-[12px] text-red-700">{errorMsg}</span>}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={status === "saving"}
            className="rounded-sm border border-(--color-soil)/50 px-3 py-1.5 text-[12px] text-(--color-soil) transition-colors hover:bg-(--color-soil)/10 disabled:opacity-60"
          >
            {status === "saving" ? "追加中…" : "＋ 写真を追加"}
          </button>
        </div>
      </div>

      <ImagePicker
        open={pickerOpen}
        current={gallery.images[gallery.images.length - 1] ?? ""}
        images={images}
        onSelect={handleAppend}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
 * セクション表示
 * ------------------------------------------------------------------ */
function SectionBlock({
  section,
  images,
  altByPath,
  onRefreshNeeded,
}: {
  section: FieldSection;
  images: string[];
  altByPath: Map<string, string>;
  onRefreshNeeded: () => void;
}) {
  const imageFields = section.fields.filter((f) => f.kind === "image");
  const isImageHeavy = imageFields.length === section.fields.length && imageFields.length > 1;

  return (
    <section id={section.id} className="scroll-mt-28 py-10 first:pt-0">
      <h2 className="sec-title font-mincho text-[18px] text-(--color-base-dark)">{section.title}</h2>
      {section.fields.length > 0 && (
        <div className={isImageHeavy ? "mt-6 grid grid-cols-1 gap-8 md:grid-cols-2" : "mt-6 flex flex-col gap-8"}>
          {section.fields.map((field) => {
            if (field.kind === "image") {
              return <ImageFieldEditor key={field.path} field={field} images={images} />;
            }
            if (field.kind === "focal") {
              return <FocalPointEditor key={field.path} field={field} allValueByPath={altByPath} />;
            }
            return <TextFieldEditor key={field.path} field={field} />;
          })}
        </div>
      )}
      {section.galleries.length > 0 && (
        <div className="mt-8 flex flex-col gap-6">
          {section.galleries.map((gallery) => (
            <GalleryBlock
              key={gallery.path}
              gallery={gallery}
              images={images}
              altByPath={altByPath}
              onRefreshNeeded={onRefreshNeeded}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------
 * ルート
 * ------------------------------------------------------------------ */
export function StudioClient({ fields, images, galleries }: Props) {
  const router = useRouter();
  const sections = useMemo(() => buildSections(fields, galleries), [fields, galleries]);
  // alt テキストの現在値をギャラリー編集ブロックが引けるように path → value で索引化
  const altByPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of fields) map.set(f.path, f.value);
    return map;
  }, [fields]);

  // 追加・削除は配列の index がずれるため、サーバーコンポーネントを再取得して最新の
  // fields/galleries で再描画する。置換（replace）は index が変わらないため呼ばない。
  function handleRefreshNeeded() {
    router.refresh();
  }

  return (
    <div className="studio-root min-h-screen bg-(--color-base-light) text-(--color-base-dark)">
      {/* 編集画面ではサイト共通の予約ボタン(dock)を隠す — 誤タップで Airbnb に飛ばないように */}
      <style>{`body:has(.studio-root) .dock { display: none !important; }`}</style>
      <header className="sticky top-0 z-20 border-b border-(--color-sand) bg-(--color-base-light)/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4 md:px-10">
          <h1 className="font-serif text-[16px] tracking-wide md:text-[18px]">TERRA HAYAMA 編集スタジオ</h1>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-sm bg-(--color-soil) px-4 py-2 text-[13px] text-(--color-base-light) transition-opacity hover:opacity-90"
          >
            サイトを開く →
          </a>
        </div>
        <div className="mx-auto max-w-[1100px] px-6 pb-4 md:px-10">
          <p className="text-[12px] leading-relaxed text-(--color-mist)">
            書き換えて保存すると app/copy.ts が更新され、開いているサイトに数秒で反映されます。このページはこの Mac の開発サーバー専用で、公開サイトには表示されません。
          </p>
          <p className="text-[12px] leading-relaxed text-(--color-mist)">
            スライドショーの写真は「＋ 写真を追加」「削除」でこの画面から増やせます（最低 1 枚は残ります）。元に戻したいときは Claude に「さっきの変更を戻して」と伝えれば OK（すべて git で記録されています）。新しい写真そのものの追加や、セクションの並べ替えは Claude へ。
          </p>
        </div>
        {/* モバイル: 横スクロールのセクションジャンプ chips */}
        <nav className="flex gap-2 overflow-x-auto border-t border-(--color-sand) px-6 py-3 md:hidden">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-(--color-sand) bg-white/60 px-3 py-1.5 text-[12px] text-(--color-base-dark)"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1100px] gap-10 px-6 py-10 md:px-10">
        {/* md 以上: 左固定サイドナビ */}
        <nav className="sticky top-40 hidden h-fit w-[200px] shrink-0 flex-col gap-1 md:flex">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-sm px-2.5 py-1.5 text-[12.5px] leading-snug text-(--color-mist) transition-colors hover:bg-white/60 hover:text-(--color-base-dark)"
            >
              {section.title}
            </a>
          ))}
        </nav>

        <main className="w-full max-w-[880px] divide-y divide-(--color-sand)">
          {sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              images={images}
              altByPath={altByPath}
              onRefreshNeeded={handleRefreshNeeded}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
