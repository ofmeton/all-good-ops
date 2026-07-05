"use client";

import { useEffect, useState } from "react";

/* dev限定: デスクトップ文字サイズ底上げ（4段クラスタ）の強弱を
   画面上で切り替えて見比べるための一時的なパネル。
   本番ビルドには一切出力されない（layout.tsx側でNODE_ENV分岐）。
   決定後は globals.css の :root 初期値を採用値に固定し、このファイルごと削除する。 */

type PatternKey = "A" | "B" | "C" | "D";

const PATTERNS: Record<PatternKey, { label: string; lv1: string; lv2: string; lv3: string; lv4: string }> = {
  A: { label: "A 控えめ", lv1: "13.5px", lv2: "14.2px", lv3: "14.8px", lv4: "15.4px" },
  B: { label: "B 標準", lv1: "13.5px", lv2: "14.5px", lv3: "15.5px", lv4: "16.2px" },
  C: { label: "C やや強め", lv1: "14.0px", lv2: "15.0px", lv3: "16.2px", lv4: "17.2px" },
  D: { label: "D 強め", lv1: "14.5px", lv2: "15.8px", lv3: "17.2px", lv4: "18.8px" },
};

const STORAGE_KEY = "terra-font-scale";

function applyPattern(key: PatternKey) {
  const p = PATTERNS[key];
  const root = document.documentElement.style;
  root.setProperty("--fs-lv1", p.lv1);
  root.setProperty("--fs-lv2", p.lv2);
  root.setProperty("--fs-lv3", p.lv3);
  root.setProperty("--fs-lv4", p.lv4);
}

export function FontScalePanel() {
  const [active, setActive] = useState<PatternKey>("B");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PatternKey | null;
    if (saved && PATTERNS[saved]) {
      setActive(saved);
      applyPattern(saved);
    }
  }, []);

  function handleSelect(key: PatternKey) {
    setActive(key);
    applyPattern(key);
    localStorage.setItem(STORAGE_KEY, key);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex gap-1 rounded-sm border border-black/15 bg-white/90 p-1.5 text-[11px] shadow-md backdrop-blur">
      {(Object.keys(PATTERNS) as PatternKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleSelect(key)}
          className={`rounded-sm px-2 py-1 transition-colors ${
            active === key ? "bg-black text-white" : "bg-black/5 text-black/70 hover:bg-black/10"
          }`}
          title={PATTERNS[key].label}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
