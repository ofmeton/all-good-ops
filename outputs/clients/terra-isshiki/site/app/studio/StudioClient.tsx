"use client";

import { useMemo, useState } from "react";
import type { CopyField } from "./lib";
import { ImagePicker } from "./ImagePicker";

type Props = {
  fields: CopyField[];
  images: string[];
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
};

const STRIP_SECTIONS: { prefix: string; title: string }[] = [
  { prefix: "TOP.roomsDetail.", title: "部屋と空間・詳細" },
  { prefix: "TOP.amenitiesDetail.", title: "設備と備品・詳細" },
  { prefix: "TOP.stayDetail.", title: "過ごし方・スライド写真" },
  { prefix: "TOP.accessDetail.", title: "アクセス・詳細" },
  { prefix: "TOP.ownerDetail.", title: "BEAT ICE・紹介文" },
  { prefix: "TOP.reservationDetail.", title: "予約・詳細" },
];

const CHILD_PAGE_SECTIONS: { prefix: string; title: string }[] = [
  { prefix: "ROOMS_PAGE.", title: "部屋と空間ページ" },
  { prefix: "STAY_PAGE.", title: "過ごし方ページ" },
  { prefix: "OWNER_PAGE.", title: "オーナーページ" },
  { prefix: "ACCESS_PAGE.", title: "アクセスページ" },
];

const COMMON_PREFIXES = ["SITE.", "NAV.", "META.", "CTA.", "POINTS."];

function buildSections(fields: CopyField[]): FieldSection[] {
  const consumed = new Set<CopyField>();
  const sections: FieldSection[] = [];

  const take = (predicate: (f: CopyField) => boolean) => {
    const matched = fields.filter((f) => !consumed.has(f) && predicate(f));
    matched.forEach((f) => consumed.add(f));
    return matched;
  };

  // 1. コンセプト文（FV）
  const opening = take((f) => f.path.startsWith("OPENING."));
  if (opening.length > 0) {
    sections.push({ id: "sec-opening", title: "コンセプト文（FV）", fields: opening });
  }

  // 2. FV スライド写真
  const heroSlides = take((f) => f.path.startsWith("TOP.heroSlides."));
  if (heroSlides.length > 0) {
    sections.push({ id: "sec-hero-slides", title: "FV スライド写真", fields: heroSlides });
  }

  // 3. 帯ごとに 1 セクション（見出しは TOP.bands.N.title の値を使う）
  const bandIndexes = new Set<number>();
  for (const f of fields) {
    const m = f.path.match(/^TOP\.bands\.(\d+)\./);
    if (m) bandIndexes.add(Number(m[1]));
  }
  const sortedBandIndexes = Array.from(bandIndexes).sort((a, b) => a - b);
  for (const idx of sortedBandIndexes) {
    const bandFields = take((f) => f.path.startsWith(`TOP.bands.${idx}.`));
    if (bandFields.length === 0) continue;
    const titleField = bandFields.find((f) => f.path === `TOP.bands.${idx}.title`);
    const bandTitle = titleField?.value ?? `帯 ${idx + 1}`;
    const num = String(idx + 1).padStart(2, "0");
    sections.push({ id: `sec-band-${idx}`, title: `${num} ${bandTitle}`, fields: bandFields });
  }

  // 4. 各ストリップ
  for (const strip of STRIP_SECTIONS) {
    const stripFields = take((f) => f.path.startsWith(strip.prefix));
    if (stripFields.length > 0) {
      sections.push({ id: `sec-strip-${strip.prefix}`, title: strip.title, fields: stripFields });
    }
  }

  // 5. 子ページ
  for (const page of CHILD_PAGE_SECTIONS) {
    const pageFields = take((f) => f.path.startsWith(page.prefix));
    if (pageFields.length > 0) {
      sections.push({ id: `sec-page-${page.prefix}`, title: page.title, fields: pageFields });
    }
  }

  // 6. ご利用にあたって（注意事項）
  const notices = take((f) => f.path.startsWith("NOTICES."));
  if (notices.length > 0) {
    sections.push({ id: "sec-notices", title: "ご利用にあたって（注意事項）", fields: notices });
  }

  // 7. サイト共通（まとめて）
  const common = take((f) => COMMON_PREFIXES.some((prefix) => f.path.startsWith(prefix)));
  if (common.length > 0) {
    sections.push({ id: "sec-common", title: "サイト共通", fields: common });
  }

  // どのグループにも入らないフィールドは最後に「その他」
  const rest = fields.filter((f) => !consumed.has(f));
  if (rest.length > 0) {
    sections.push({ id: "sec-other", title: "その他", fields: rest });
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
 * セクション表示
 * ------------------------------------------------------------------ */
function SectionBlock({ section, images }: { section: FieldSection; images: string[] }) {
  const imageFields = section.fields.filter((f) => f.kind === "image");
  const isImageHeavy = imageFields.length === section.fields.length && imageFields.length > 1;

  return (
    <section id={section.id} className="scroll-mt-28 py-10 first:pt-0">
      <h2 className="sec-title font-mincho text-[18px] text-(--color-base-dark)">{section.title}</h2>
      <div className={isImageHeavy ? "mt-6 grid grid-cols-1 gap-8 md:grid-cols-2" : "mt-6 flex flex-col gap-8"}>
        {section.fields.map((field) =>
          field.kind === "image" ? (
            <ImageFieldEditor key={field.path} field={field} images={images} />
          ) : (
            <TextFieldEditor key={field.path} field={field} />
          ),
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
 * ルート
 * ------------------------------------------------------------------ */
export function StudioClient({ fields, images }: Props) {
  const sections = useMemo(() => buildSections(fields), [fields]);

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
            元に戻したいときは Claude に「さっきの変更を戻して」と伝えれば OK（すべて git で記録されています）。写真の新規追加や項目の増減も Claude へ。
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
            <SectionBlock key={section.id} section={section} images={images} />
          ))}
        </main>
      </div>
    </div>
  );
}
