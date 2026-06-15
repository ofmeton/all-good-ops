"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "./icons";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    // ナビ遷移で自動クローズ。開いていた場合はフォーカスをメニューボタンへ戻す
    // （ドロワーが inert 化してフォーカスが宙に浮くのを防ぐ）。
    setOpen((prev) => {
      if (prev) restoreFocusRef.current = true;
      return false;
    });
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      if (restoreFocusRef.current) {
        menuButtonRef.current?.focus();
        restoreFocusRef.current = false;
      }
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = drawerRef.current?.querySelector<HTMLAnchorElement>("a[href]");
    firstLink?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        restoreFocusRef.current = true;
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div
        className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden"
        inert={open}
      >
        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors duration-150 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="ナビゲーションを開く"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-foreground">家計</span>
      </div>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}
        role="dialog"
        aria-modal="true"
        aria-label="ナビゲーション"
        aria-hidden={!open}
        inert={!open}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/40 transition-opacity duration-150 motion-reduce:transition-none ${
            open ? "opacity-100" : "opacity-0"
          }`}
          aria-label="ナビゲーションを閉じる"
          onClick={() => {
            restoreFocusRef.current = true;
            setOpen(false);
          }}
        />
        <div
          ref={drawerRef}
          className={`relative h-full w-60 transform transition-transform duration-150 motion-reduce:transition-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            className="absolute right-3 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="ナビゲーションを閉じる"
            onClick={() => {
              restoreFocusRef.current = true;
              setOpen(false);
            }}
          >
            <X className="h-5 w-5" />
          </button>
          <Sidebar variant="drawer" />
        </div>
      </div>

      <main id="main" className="lg:pl-60" inert={open}>
        {children}
      </main>
    </div>
  );
}
