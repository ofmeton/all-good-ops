/* web-ui-bridge overlay — 動いている自分のサイトに dev 限定で注入する自己完結スクリプト。
 * UI は STUDIO 風の右ドック・ダーク・インスペクタ（Shadow DOM 隔離・SVG アイコン）。
 *
 * 機能（すべて Claude 不介在の決定的コード操作。一意特定できない時のみ Claude 経路へ誘導）:
 *   - 選択(V): 要素ホバーでハイライト→クリックで選択しインスペクタに属性表示
 *   - 直接調整: 余白/詰め/サイズ/揃え/色/className を実ソースへ即反映。bp(全/sm/md/lg/xl)切替
 *   - 構造: 複製/削除、⇅移動でドラッグ並べ替え or 別親移動(reparent)
 *   - 戻る/進む: ⌘Z/⌘⇧Z・Ctrl+Z/Ctrl+Y（daemon の編集履歴）
 *   - Claudeに頼む: 複雑な構造/文言は自然文をキューに溜め送信
 *
 * 設計判断(Spike 0): React19 で _debugSource 無・App Router の SC は fiber に名前が出ない
 *   → file:line/component 名に依存せず className(ソース一致)+text+route+DOMパスを locator にする。
 */
(() => {
  if (window.__WEB_UI_BRIDGE__) return;
  window.__WEB_UI_BRIDGE__ = true;

  const ORIGIN = "__BRIDGE_ORIGIN__";
  const TOKEN = "__BRIDGE_TOKEN__";
  const HOST_ID = "web-ui-bridge-root";
  const POST_HEADERS = { "Content-Type": "application/json", "X-Bridge-Token": TOKEN };

  // ---- 状態 -------------------------------------------------------------
  let inspecting = false, hovered = null;
  let selection = [];
  let primaryIdx = -1;
  const cur = () => (primaryIdx >= 0 ? selection[primaryIdx] : null);
  let bp = "", state = "", tab = "box";
  let marginLocked = null, paddingLocked = null;
  let reordering = false, dragEl2 = null, draggingGroup = false, dropTarget = null, dropPos = "before";
  let lastX = 0, lastY = 0, asTimer = null, asDir = 0; // D&D オートスクロール
  const pending = [];

  // ---- SVG アイコン（Lucide 風・絵文字は使わない） ----------------------
  const I = {
    cursor: '<path d="M3 3l7 17 2.3-6.7L19 11 3 3z"/>',
    move: '<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
    redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    up: '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
    right: '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
    down: '<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/>',
    left: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  };
  const svg = (k, s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;

  // ---- locator 収集 -----------------------------------------------------
  const NEXT_INTERNALS = /^(Inner|Outer|Render|Layout|Segment|Scroll|Redirect|Error|HTTPAccess|Loading|App|Root|Client|Server|Hot|Dev|Metadata|NotFound|Template|Bailout|Provider|Global|Mounted|Pages|Route)/;
  const INTERNAL_SUFFIX = /(Context|Boundary|Provider|Router|Handler)$/;
  function componentName(el) {
    try {
      const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
      if (!key) return null;
      let f = el[key], guard = 0;
      while (f && guard++ < 60) {
        const t = f.type;
        if (t && typeof t !== "string") {
          const n = t.displayName || t.name || (t.render && (t.render.displayName || t.render.name));
          if (n && !n.startsWith("_") && !NEXT_INTERNALS.test(n) && !INTERNAL_SUFFIX.test(n)) return n;
        }
        f = f.return;
      }
    } catch {}
    return null;
  }
  function uniqueSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 6) {
      let sel = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) sel += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
      parts.unshift(sel);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }
  function domPath(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 5) {
      parts.unshift(node.tagName.toLowerCase());
      node = node.parentElement;
    }
    return parts.join(" > ");
  }
  function ownText(el) {
    return [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(" ");
  }
  function snippets(text) {
    return [...new Set(text.split(/[\s、。「」（）()・,.!?！？\n]+/).map((s) => s.trim()).filter((s) => s.length >= 4))].slice(0, 5);
  }
  function collect(el) {
    const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200);
    const own = ownText(el);
    return {
      route: location.pathname, tag: el.tagName.toLowerCase(), component: componentName(el),
      classes: el.getAttribute("class") || "", text, ownText: own || null,
      textSnippets: snippets(own || text), domPath: domPath(el), selector: uniqueSelector(el),
    };
  }
  function makeSel(el) {
    const payload = collect(el);
    return { el, payload, sourceClass: payload.classes, liveClass: payload.classes };
  }
  function resetEditState() { state = ""; marginLocked = null; paddingLocked = null; }
  function setPrimaryLiveClass(next) {
    const c = cur();
    if (!c) return;
    c.liveClass = next;
    if (c.el && c.el.isConnected) c.el.setAttribute("class", next);
  }
  function removeSelectionAt(idx) {
    if (idx < 0 || idx >= selection.length) return;
    selection.splice(idx, 1);
    if (!selection.length) primaryIdx = -1;
    else primaryIdx = Math.min(primaryIdx === idx ? selection.length - 1 : primaryIdx > idx ? primaryIdx - 1 : primaryIdx, selection.length - 1);
    resetEditState();
    updateMoveAvailability();
    highlightSelection();
    renderBody();
  }
  function clearSelection() {
    selection = [];
    primaryIdx = -1;
    resetEditState();
    updateMoveAvailability();
    hideHighlight();
    renderBody();
  }
  function selectFromClick(el, e) {
    const additive = e.metaKey || e.shiftKey;
    const idx = selection.findIndex((s) => s.el === el);
    if (additive) {
      if (idx >= 0) selection.splice(idx, 1);
      else selection.push(makeSel(el));
      primaryIdx = selection.length - 1;
    } else {
      selection = [makeSel(el)];
      primaryIdx = 0;
    }
    resetEditState();
    const c = cur();
    if (c) tab = TEXTUAL.test(c.payload.tag) ? "text" : "box";
    // 複数選択は「クリックで選択を組み立てる」操作なので select モードは保持する
    // （最初の選択後に OFF にすると 2 個目の ⌘/Shift+クリックが効かない）。
    // exit は選択ツール再押下 or Esc。パネル内操作は isOurs ガードで選択に巻き込まれない。
    updateMoveAvailability();
    openPanel();
    highlightSelection();
  }

  // ---- UI (Shadow DOM) — STUDIO 風ダークインスペクタ ---------------------
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = "all:initial; position:fixed; z-index:2147483647; top:0; left:0; width:0; height:0;";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  const W = 300;
  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: Inter, -apple-system, system-ui, sans-serif; }
      /* STUDIO 実機の色（ライト・モノクロ #222 アクセント）。選択ハイライトのみ青(--sel) */
      :host { --bg:#ffffff; --surface:#ffffff; --surface2:#f7f7f7; --bd:rgba(34,34,34,.10); --bd2:#e5e5e5;
              --tx:#1a1a1a; --muted:#8a8a8a; --accent:#222222; --sel:#2563eb; --danger:#e5484d; }
      .hl { position: fixed; pointer-events: none; border: 1.5px solid var(--sel);
            background: rgba(37,99,235,.08); border-radius: 2px; z-index: 5; display: none; transition: all .05s ease-out; }
      .hl2 { position: fixed; pointer-events: none; border: 1.5px solid rgba(37,99,235,.5);
             background: rgba(37,99,235,.04); border-radius: 2px; z-index: 4; display: block; transition: all .05s ease-out; }
      .hl.drag { border-color: #7c3aed; border-style: dashed; background: rgba(124,58,237,.12); }
      .label { position: fixed; pointer-events: none; z-index: 6; display: none; font-family: ui-monospace, monospace;
               background: var(--sel); color: #fff; font-size: 10.5px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
      .dropline { position: fixed; pointer-events: none; z-index: 7; height: 2px; background: #a855f7;
                  border-radius: 2px; display: none; box-shadow: 0 0 0 1px rgba(168,85,247,.4), 0 0 8px #a855f7; }
      .dropline::before { content:""; position:absolute; left:-3px; top:-2px; width:6px; height:6px; border-radius:50%; background:#a855f7; }
      .launcher { position: fixed; top: 14px; right: 14px; width: 38px; height: 38px; border-radius: 9px;
                  border: 1px solid var(--bd2); background: var(--surface); color: var(--tx); cursor: pointer;
                  display: none; align-items: center; justify-content: center; pointer-events: auto;
                  box-shadow: 0 6px 20px rgba(0,0,0,.16); }
      .launcher.show { display: flex; }
      .launcher:hover { background: var(--surface2); }
      .inspector { position: fixed; top: 0; right: 0; height: 100vh; width: ${W}px; pointer-events: auto;
                   background: var(--bg); color: var(--tx); border-left: 1px solid var(--bd2);
                   display: flex; flex-direction: column; box-shadow: -6px 0 24px rgba(0,0,0,.10);
                   transform: translateX(100%); transition: transform .18s ease-out; font-size: 12px; }
      .inspector.show { transform: none; }
      .bar { border-bottom: 1px solid var(--bd); padding: 8px; display: flex; flex-direction: column; gap: 8px; }
      .bar-row { display: flex; align-items: center; justify-content: space-between; }
      .tools { display: flex; gap: 4px; }
      .brand { font-size: 11px; color: var(--muted); letter-spacing: .04em; }
      .tool { width: 30px; height: 28px; border-radius: 7px; border: 1px solid transparent; background: transparent;
              color: var(--muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all .12s; }
      .tool:hover { background: var(--surface); color: var(--tx); }
      .tool.on { background: var(--accent); color: #fff; }
      .tool:disabled { opacity: .35; cursor: default; }
      .bpseg { display: flex; background: var(--surface2); border: 1px solid var(--bd2); border-radius: 8px; padding: 2px; min-height: 32px; }
      .bpseg button { flex: 1; height: 26px; border: none; background: transparent; color: var(--muted);
                      font-size: 11px; border-radius: 6px; cursor: pointer; transition: all .12s; }
      .bpseg button:hover { color: var(--tx); }
      .bpseg button.on { background: #fff; color: var(--tx); box-shadow: 0 1px 2px rgba(0,0,0,.12); }
      .body { flex: 1; overflow-y: auto; padding: 4px 0 24px; }
      .empty { color: var(--muted); font-size: 12px; padding: 28px 16px; text-align: center; line-height: 1.7; }
      .meta { padding: 12px 14px 10px; font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted); word-break: break-all; }
      .meta b { color: var(--accent); }
      section { border-top: 1px solid var(--bd); padding: 12px 16px; }
      h5 { margin: 0 0 10px; font-size: 12px; color: var(--tx); font-weight: 700; }
      .ctl { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .ctl:last-child { margin-bottom: 0; }
      .ctl > label { font-size: 11px; color: var(--muted); width: 64px; flex: none; }
      select { background: var(--surface); color: var(--tx); border: 1px solid var(--bd2); border-radius: 7px;
               font-size: 11px; padding: 5px 6px; outline: none; }
      select:focus { border-color: var(--accent); }
      .seg { display: inline-flex; background: var(--surface); border: 1px solid var(--bd2); border-radius: 7px; padding: 2px; gap: 2px; }
      .seg button { padding: 3px 9px; border: none; background: transparent; color: var(--muted); border-radius: 5px; cursor: pointer; font-size: 11px; }
      .seg button:hover { color: var(--tx); }
      .swatch { display: inline-flex; align-items: center; gap: 6px; }
      input[type="color"] { width: 24px; height: 24px; padding: 0; border: 1px solid var(--bd2); border-radius: 4px; background: var(--surface); cursor: pointer; }
      .cls { width: 100%; background: var(--surface); color: #93c5fd; border: 1px solid var(--bd2); border-radius: 8px;
             padding: 8px; font-size: 11px; font-family: ui-monospace, monospace; resize: vertical; min-height: 56px; outline: none; line-height: 1.5; }
      .cls:focus { border-color: var(--accent); }
      textarea.ask { width: 100%; background: var(--surface); color: var(--tx); border: 1px solid var(--bd2); border-radius: 8px;
             padding: 8px; font-size: 12px; resize: vertical; min-height: 54px; outline: none; }
      textarea.ask:focus { border-color: var(--accent); }
      .row { display: flex; gap: 8px; margin-top: 8px; }
      .btn { flex: 1; padding: 8px; border: 1px solid var(--bd2); border-radius: 8px; font-size: 12px; cursor: pointer;
             background: var(--surface); color: var(--tx); display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all .12s; }
      .btn:hover { background: var(--surface2); }
      .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
      .btn.primary:hover { filter: brightness(1.08); }
      .btn.ghost { flex: none; width: 70px; color: var(--muted); }
      .btn.danger { color: #fda4af; }
      .btn.danger:hover { background: rgba(244,63,94,.12); border-color: var(--danger); }
      .btn.send { background: #16a34a; border-color: #16a34a; color: #fff; }
      ul { list-style: none; margin: 8px 0 0; padding: 0; }
      li { font-size: 11px; padding: 7px 0; border-top: 1px solid var(--bd); display: flex; gap: 8px; align-items: center; }
      li .t { flex: 1; color: var(--tx); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      li .x { color: var(--danger); cursor: pointer; }
      .toast { position: fixed; bottom: 18px; right: ${W + 18}px; max-width: 320px; background: var(--surface2); color: var(--tx);
               border: 1px solid var(--bd2); padding: 10px 14px; border-radius: 9px; font-size: 12px; display: none;
               pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,.16); }
      .toast.warn { border-color: #b45309; } .toast.err { border-color: var(--danger); }
      .inspect-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px 8px 16px; }
      .elhdr { display: flex; align-items: center; gap: 7px; min-width: 0; color: var(--muted); }
      .elhdr svg { color: var(--accent); }
      .eltag { font-family: ui-monospace, monospace; font-size: 12px; color: var(--tx); }
      .elcomp { font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .chips { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 14px 8px 16px; }
      .chip { display: inline-flex; align-items: center; gap: 4px; max-width: 86px; height: 22px; padding: 0 6px; border: 1px solid var(--bd2); border-radius: 999px; color: var(--muted); background: var(--surface2); font-size: 11px; }
      .chip.primary { color: var(--tx); border-color: rgba(37,99,235,.45); background: rgba(37,99,235,.08); }
      .chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .chip button { width: 14px; height: 14px; border: none; background: transparent; color: var(--muted); cursor: pointer; padding: 0; line-height: 12px; }
      .chip button:hover { color: var(--danger); }
      .state-ctl { display: inline-flex; align-items: center; border: 1px solid var(--bd2); border-radius: 2px; overflow: hidden; flex: none; }
      .state-ctl button { height: 28px; padding: 0 8px; border: none; background: #fff; color: var(--muted); font-size: 14px; cursor: pointer; }
      .state-ctl button + button { border-left: 1px solid var(--bd2); }
      .state-ctl button.on { background: var(--accent); color: #fff; }
      .state-badge { margin: 0 16px 8px; display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 2px; background: #222; color: #fff; font-size: 11px; }
      .hint { margin: 0 16px 8px; color: var(--muted); font-size: 11px; line-height: 1.5; }
      .tabs { display: flex; gap: 2px; padding: 0 10px; border-bottom: 1px solid var(--bd); }
      .tab { flex: 1; height: 40px; padding: 8px 0; border: none; background: transparent; color: var(--muted); font-size: 14px; cursor: pointer;
             border-bottom: 2px solid transparent; margin-bottom: -1px; }
      .tab:hover { color: var(--tx); }
      .tab.on { color: var(--tx); border-bottom-color: var(--accent); }
      .num { display: inline-flex; align-items: center; min-height: 32px; background: var(--surface2); border: 1px solid transparent; border-radius: 8px; overflow: hidden; padding: 0 4px; }
      .num input { width: 52px; height: 30px; border: none; background: transparent; color: #222; font-size: 12px; padding: 0 2px; outline: none; -moz-appearance: textfield; }
      .num input::-webkit-outer-spin-button, .num input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .num input:focus { background: transparent; }
      .num .u { font-size: 10px; color: var(--muted); padding: 0 3px 0 2px; }
      .spacing-ctl { align-items: flex-start; }
      .spacing { flex: 1; min-width: 0; }
      .spacing-line { display: grid; grid-template-columns: 1fr 32px; gap: 4px; align-items: center; }
      .spacing-grid { display: grid; grid-template-columns: 1fr 1fr 32px; gap: 4px; align-items: center; }
      .spacing-grid .spnum:nth-child(3) { grid-column: 1; }
      .spnum { width: 100%; }
      .spnum input { flex: 1; width: 0; min-width: 28px; }
      .dir { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; color: rgba(34,34,34,.7); flex: none; }
      .dir svg { width: 16px; height: 16px; }
      .lock-toggle { width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; background: var(--surface2); color: rgba(34,34,34,.7); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
      .lock-toggle:hover { color: var(--tx); border-color: var(--bd2); }
      .source-label { font-size: 10px; color: var(--muted); background: var(--surface2); border-radius: 4px; padding: 2px 5px; }
      .seg button.on { background: var(--accent); color: #fff; }
      .kv { display: flex; gap: 8px; font-size: 11px; margin-bottom: 6px; }
      .kv span { color: var(--muted); width: 56px; flex: none; }
      .kv code { color: var(--tx); font-family: ui-monospace, monospace; word-break: break-all; }
      @media (prefers-reduced-motion: reduce) { .inspector, .hl, .tool, .btn { transition: none; } }
    </style>
    <div class="hl"></div>
    <div class="label"></div>
    <div class="dropline"></div>
    <button class="launcher" title="web-ui-bridge を開く">${svg("cursor", 18)}</button>
    <aside class="inspector show">
      <div class="bar">
        <div class="bar-row">
          <span class="tools">
            <button class="tool t-select" title="選択">${svg("cursor")}</button>
            <button class="tool t-move" title="ドラッグで並べ替え/移動">${svg("move")}</button>
          </span>
          <span class="brand">web-ui-bridge</span>
          <span class="tools">
            <button class="tool t-undo" title="戻す (⌘Z)">${svg("undo")}</button>
            <button class="tool t-redo" title="進む (⌘⇧Z)">${svg("redo")}</button>
            <button class="tool t-collapse" title="閉じる">${svg("chevron")}</button>
          </span>
        </div>
        <div class="bar-row bpseg">
          <button data-bp="">全</button><button data-bp="sm:">sm</button><button data-bp="md:">md</button><button data-bp="lg:">lg</button><button data-bp="xl:">xl</button>
        </div>
      </div>
      <div class="body"></div>
    </aside>
    <div class="toast"></div>
  `;

  const $ = (s) => root.querySelector(s);
  const $hl = $(".hl"), $label = $(".label"), $dropline = $(".dropline");
  const $launcher = $(".launcher"), $inspector = $(".inspector"), $body = $(".body"), $toast = $(".toast");
  const $tSelect = $(".t-select"), $tMove = $(".t-move"), $tUndo = $(".t-undo"), $tRedo = $(".t-redo");

  function isOurs(el) { return el === host || (el && el.id === HOST_ID) || (el && el.closest && el.closest(`#${HOST_ID}`)); }

  function showHighlight(el, drag) {
    const r = el.getBoundingClientRect();
    $hl.style.cssText = `position:fixed;display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    $hl.className = "hl" + (drag ? " drag" : "");
    const comp = componentName(el);
    $label.textContent = `<${el.tagName.toLowerCase()}>` + (comp ? ` · ${comp}` : "");
    $label.style.display = "block";
    $label.style.left = r.left + "px";
    $label.style.top = Math.max(0, r.top - 20) + "px";
  }
  function removeExtraHighlights() { root.querySelectorAll(".hl2").forEach((n) => n.remove()); }
  function hideHighlight() { $hl.style.display = "none"; $label.style.display = "none"; removeExtraHighlights(); }
  function showBox(el, primary) {
    if (!el || !el.isConnected) return;
    if (primary) { showHighlight(el); return; }
    const r = el.getBoundingClientRect();
    const box = document.createElement("div");
    box.className = "hl2";
    box.style.cssText = `position:fixed;display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    root.appendChild(box);
  }
  function highlightSelection() {
    removeExtraHighlights();
    const c = cur();
    if (!c?.el?.isConnected) { $hl.style.display = "none"; $label.style.display = "none"; return; }
    selection.forEach((s, i) => showBox(s.el, i === primaryIdx));
  }
  function allSameParent(items = selection) {
    if (items.length < 2) return true;
    const p = items[0].el?.parentElement;
    return !!p && items.every((s) => s.el?.parentElement === p);
  }
  function updateMoveAvailability() {
    const disabled = selection.length >= 2 && !allSameParent();
    $tMove.disabled = disabled;
    $tMove.title = disabled ? "親が異なるため決定移動不可。『まとめてClaude移動』を使用" : "ドラッグで並べ替え/移動";
    if (disabled && reordering) setReordering(false);
  }

  function setInspecting(on) { inspecting = on; $tSelect.classList.toggle("on", on); if (!on) { hideHighlight(); hovered = null; } }

  function toast(msg, kind) {
    $toast.textContent = msg;
    $toast.className = "toast" + (kind === "warn" ? " warn" : kind === "err" ? " err" : "");
    $toast.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { $toast.style.display = "none"; }, 2600);
  }

  // ページに右ガター(余白)を空け、ドックが実サイトに被らないようにする。
  // ・html margin-right で通常フローを左へ回り込ませる（body 幅 = 100%-W になる）。
  // ・body に transform を当て、サイト側の position:fixed/sticky の包含ブロックを
  //   ビューポート→body へ移す。これで `fixed inset-x-0` の全幅ヘッダー等もガター内に収まり、
  //   ドック下に潜らない（包含ブロック奪取を逆用。cf. feedback_css_fixed_containing_block）。
  function setPageGutter(on) {
    const de = document.documentElement, b = document.body;
    de.style.transition = "margin-right .18s ease";
    de.style.marginRight = on ? W + "px" : "";
    if (b) b.style.transform = on ? "translateZ(0)" : "";
  }

  function setCollapsed(c) {
    $inspector.classList.toggle("show", !c);
    $launcher.classList.toggle("show", c);
    setPageGutter(!c);
    if (c) { setInspecting(false); setReordering(false); hideHighlight(); }
  }

  // ---- 直接調整ロジック（決定的・純文字列操作） -------------------------
  const SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const PFX = () => bp + state;
  const live = () => cur()?.liveClass ?? "";
  const source = () => cur()?.sourceClass ?? "";
  function readAcross(readForSel) {
    const vals = selection.map(readForSel);
    const uniq = [...new Set(vals.map((v) => JSON.stringify(v)))];
    return uniq.length === 1 ? { mixed: false, value: vals[0] } : { mixed: true };
  }
  const multi = () => selection.length >= 2;
  const fieldVal = (single, readForSel) => {
    if (!multi()) return { value: single ?? "", ph: "" };
    const r = readAcross(readForSel);
    return r.mixed ? { value: "", ph: "—" } : { value: r.value ?? "", ph: "" };
  };

  function applyLive(next) {
    setPrimaryLiveClass(next);
    const c = $(".cls"); if (c && c.value !== next) c.value = next;
    highlightSelection();
  }
  async function applyAbsoluteBatch(computeNewClass) {
    const c = cur();
    if (!c) return;
    const seen = new Set();
    const edits = [];
    let missing = 0, dup = 0;
    for (const s of selection) {
      if (!s.sourceClass) { missing++; continue; }
      if (seen.has(s.sourceClass)) { dup++; continue; }
      seen.add(s.sourceClass);
      const nc = computeNewClass(s);
      if (nc && nc !== s.sourceClass) edits.push({ oldClassName: s.sourceClass, newClassName: nc });
    }
    if (missing) toast("一部は class 無→Claude経路", "warn");
    if (dup) toast(`${selection.length - missing}要素は同一ソース→${seen.size}箇所に適用`);
    if (edits.length === 0) { toast("変更なし"); return; }
    try {
      const j = await post("/apply-style-batch", { route: c.payload.route, edits });
      if (j.ok) {
        const skipped = new Set((j.skipped || []).map((s) => s.oldClassName));
        for (const e of edits) {
          if (skipped.has(e.oldClassName)) continue;
          for (const s of selection) {
            if (s.sourceClass === e.oldClassName) {
              s.sourceClass = e.newClassName;
              s.liveClass = e.newClassName;
              s.payload.classes = e.newClassName;
              if (s.el?.isConnected) s.el.setAttribute("class", e.newClassName);
            }
          }
        }
        toast(`一括反映(${j.applied ?? edits.length}) skip ${j.skipped?.length || 0}`);
        highlightSelection(); renderBody();
      } else toast(`失敗: ${j.reason || j.error}`, "warn");
    } catch (err) { toast(`失敗: ${err.message}`, "err"); }
  }
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const nextAlignClass = (base, val) => {
    const p = reEsc(PFX());
    const cleaned = base.replace(new RegExp(`(^|\\s)${p}text-(left|center|right|justify)(?=\\s|$)`, "g"), " ");
    return norm(cleaned + ` ${PFX()}text-${val}`);
  };
  function setAlign(val) {
    if (multi()) return applyAbsoluteBatch((s) => nextAlignClass(s.sourceClass, val));
    applyLive(nextAlignClass(live(), val));
  }
  const nextStepSizeClass = (base, dir) => {
    const p = reEsc(PFX());
    const re = new RegExp(`(^|\\s)${p}text-(xs|sm|base|lg|xl|[2-9]xl)(?=\\s|$)`);
    const m = base.match(re);
    if (m) {
      let i = SIZES.indexOf(m[2]);
      i = Math.max(0, Math.min(SIZES.length - 1, i + dir));
      return norm(base.replace(re, `$1${PFX()}text-${SIZES[i]}`));
    }
    return dir > 0 ? norm(base + ` ${PFX()}text-lg`) : base;
  };
  function stepSize(dir) {
    if (multi()) return applyAbsoluteBatch((s) => nextStepSizeClass(s.sourceClass, dir));
    const next = nextStepSizeClass(live(), dir);
    if (next !== live()) applyLive(next);
  }
  const nextColorClass = (base, kind, hex) => {
    const p = reEsc(PFX());
    const strip = new RegExp(`(^|\\s)${p}${kind}-(\\[#[0-9a-fA-F]{3,8}\\]|\\(--[^)]+\\)|[a-z]+-\\d{2,3})(?=\\s|$)`, "g");
    return norm(base.replace(strip, " ") + ` ${PFX()}${kind}-[${hex}]`);
  };
  function setColor(kind, hex) {
    if (multi()) return applyAbsoluteBatch((s) => nextColorClass(s.sourceClass, kind, hex));
    applyLive(nextColorClass(live(), kind, hex));
  }
  function readColorInfo(kind, fallback, cls = live()) {
    const m = cls.match(new RegExp(`(^|\\s)${reEsc(PFX())}${kind}-(\\[#[0-9a-fA-F]{3,8}\\])(?=\\s|$)`));
    return m ? { value: m[2].slice(1, -1), source: "class" } : { value: fallback, source: "computed" };
  }
  function rgbToHex(rgb) {
    const m = (rgb || "").match(/\d+/g);
    if (!m || m.length < 3) return "#000000";
    if (m.length >= 4 && Number(m[3]) === 0) return "#ffffff";
    return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  }

  // ---- 汎用 Tailwind ユーティリティ編集（bp 対応・決定的） ----------------
  // 値1つ: [arbitrary] / (paren) / 単一トークン(ハイフン無し=方向別/色階調クラスを巻き込まない)
  const VAL = `(\\[[^\\]]*\\]|\\([^)]*\\)|[\\w./%#.]+)`;
  // prefix-value 系（w/h/rounded/opacity/z/leading/tracking 等。text-/font- のような多義prefixには使わない）
  const nextUtilClass = (base, prefix, value) => {
    const p = reEsc(PFX()), pf = reEsc(prefix);
    let next = base.replace(new RegExp(`(^|\\s)${p}${pf}-${VAL}(?=\\s|$)`, "g"), " ");
    if (value !== "" && value != null) next = next + ` ${PFX()}${prefix}-${value}`;
    return norm(next);
  };
  function setUtil(prefix, value) {
    if (multi()) return applyAbsoluteBatch((s) => nextUtilClass(s.sourceClass, prefix, value));
    applyLive(nextUtilClass(live(), prefix, value));
  }
  function readUtil(prefix, cls = live()) {
    const m = cls.match(new RegExp(`(^|\\s)${reEsc(PFX())}${reEsc(prefix)}-${VAL}(?=\\s|$)`));
    return m ? m[2] : "";
  }
  function readUtilLast(prefix, cls = live()) {
    const re = new RegExp(`(^|\\s)${reEsc(PFX())}${reEsc(prefix)}-${VAL}(?=\\s|$)`, "g");
    let found = "", m;
    while ((m = re.exec(cls))) found = m[2];
    return found;
  }
  // 排他キーワード集合（position/overflow/shadow 等）
  const nextEnumClass = (base, options, value) => {
    const p = reEsc(PFX());
    let next = base.replace(new RegExp(`(^|\\s)${p}(${options.map(reEsc).join("|")})(?=\\s|$)`, "g"), " ");
    if (value) next = next + ` ${PFX()}${value}`;
    return norm(next);
  };
  function setEnum(options, value) {
    if (multi()) return applyAbsoluteBatch((s) => nextEnumClass(s.sourceClass, options, value));
    applyLive(nextEnumClass(live(), options, value));
  }
  function readEnum(options, cls = live()) {
    const m = cls.match(new RegExp(`(^|\\s)${reEsc(PFX())}(${options.map(reEsc).join("|")})(?=\\s|$)`));
    return m ? m[2] : "";
  }
  // on/off トグル（underline/italic 等）
  const nextToggleClass = (base, cls) => {
    const re = new RegExp(`(^|\\s)${reEsc(PFX())}${reEsc(cls)}(?=\\s|$)`);
    return norm(re.test(base) ? base.replace(re, " ") : base + ` ${PFX()}${cls}`);
  };
  function toggleUtil(cls) {
    if (multi()) return applyAbsoluteBatch((s) => nextToggleClass(s.sourceClass, cls));
    applyLive(nextToggleClass(live(), cls));
  }
  function hasUtil(cls, className = live()) { return new RegExp(`(^|\\s)${reEsc(PFX())}${reEsc(cls)}(?=\\s|$)`).test(className); }
  const numOf = (v) => { const m = String(v).match(/-?\d+(\.\d+)?/); return m ? m[0] : ""; }; // "[200px]"→"200"
  // bracket 値(0-1等)は×100して%表示、素のTailwind階調(opacity-50/leading-6)はそのまま
  const pctBracket = (raw) => { if (!raw) return ""; if (raw.startsWith("[")) { const n = parseFloat(raw.replace(/[\[\]]/g, "")); return Number.isFinite(n) ? Math.round(n * 100) : ""; } return numOf(raw); };

  // フォントサイズ（色/揃えを潰さず size のみ差し替え）
  const nextTextSizeClass = (base, px) => {
    const p = reEsc(PFX());
    const strip = new RegExp(`(^|\\s)${p}text-(\\[(?!#|var\\(|rgb|hsl|oklch)[^\\]]*\\]|xs|sm|base|lg|xl|[2-9]xl)(?=\\s|$)`, "g");
    let next = base.replace(strip, " ");
    if (px !== "") next = next + ` ${PFX()}text-[${px}px]`;
    return norm(next);
  };
  function setTextSize(px) {
    if (multi()) return applyAbsoluteBatch((s) => nextTextSizeClass(s.sourceClass, px));
    applyLive(nextTextSizeClass(live(), px));
  }
  function readTextSize(cls = live()) {
    const m = cls.match(new RegExp(`(^|\\s)${reEsc(PFX())}text-(\\[(?!#|var\\(|rgb|hsl|oklch)[^\\]]*\\]|xs|sm|base|lg|xl|[2-9]xl)(?=\\s|$)`));
    return m ? numOf(m[2]) : "";
  }
  // フォント太さ（family を潰さず weight のみ）
  const WEIGHTS = ["font-thin", "font-extralight", "font-light", "font-normal", "font-medium", "font-semibold", "font-bold", "font-extrabold", "font-black"];
  function setWeight(v) { setEnum(WEIGHTS, v); }
  // フォントファミリ
  const FAMILIES = ["font-sans", "font-serif", "font-mono"];
  function setFamily(v) { setEnum(FAMILIES, v); }

  async function post(endpoint, body) {
    const res = await fetch(`${ORIGIN}${endpoint}`, { method: "POST", headers: POST_HEADERS, body: body ? JSON.stringify(body) : undefined });
    return res.json();
  }

  async function commitStyle() {
    const c = cur();
    if (!c) return;
    if (c.liveClass === c.sourceClass) { toast("変更なし"); return; }
    try {
      const j = await post("/apply-style", { route: c.payload.route, oldClassName: c.sourceClass, newClassName: c.liveClass, selector: c.payload.selector, text: c.payload.text });
      if (j.ok) {
        toast(`反映 → ${j.file ?? "noop"}`);
        c.sourceClass = c.liveClass; c.payload.classes = c.liveClass;
        setTimeout(() => { const fresh = document.querySelector(c.payload.selector); if (fresh) c.el = fresh; }, 1200);
      } else if (j.reason === "ambiguous") toast(`同じclassが${j.count}箇所。Claudeに頼んで`, "warn");
      else if (j.reason === "not-found") toast("ソース未特定(動的class?)。Claudeに頼んで", "warn");
      else toast(`失敗: ${j.reason || j.error}`, "err");
    } catch (err) { toast(`失敗: ${err.message}（daemon 起動中？）`, "err"); }
  }
  async function doStruct(endpoint) {
    const c = cur();
    if (!c) return;
    if (!c.sourceClass) { toast("class が無く操作不可（Claudeに頼んで）", "warn"); return; }
    const verb = endpoint === "/delete" ? "削除" : "複製";
    try {
      const j = await post(endpoint, { route: c.payload.route, targetClass: c.sourceClass });
      if (j.ok) { toast(`${verb}反映 → ${j.file}`); closePanel(); }
      else if (j.reason === "ambiguous") toast("同じclassが複数。Claudeに頼んで", "warn");
      else if (j.reason === "not-found") toast("ソース未特定(動的class?)。Claudeに頼んで", "warn");
      else toast(`失敗: ${j.reason || j.error}`, "err");
    } catch (err) { toast(`失敗: ${err.message}`, "err"); }
  }
  async function doStructBatch(kind) {
    const c = cur();
    if (!c) return;
    const withClass = selection.map((s) => s.sourceClass).filter(Boolean);
    if (withClass.length < selection.length) toast("一部は class 無→Claude経路", "warn");
    // 同一 className を除去（map/loop 生成で 1 ソース→複数 DOM の時、二重適用を防ぐ）。
    const targets = [...new Set(withClass)];
    if (targets.length < withClass.length) toast(`${withClass.length}要素は同一ソース→${targets.length}箇所に適用`);
    if (targets.length === 0) { toast("class が無く操作不可（Claudeに頼んで）", "warn"); return; }
    try {
      const j = await post("/structure-batch", { route: c.payload.route, kind, targets });
      if (j.ok) {
        toast(`${kind === "delete" ? "削除" : "複製"}一括 → ${j.file ?? "noop"}（skip ${j.skipped?.length || 0}）`);
        if (kind === "delete") clearSelection();
        else setTimeout(highlightSelection, 1200);
      } else toast(`失敗: ${j.reason || j.error}`, "warn");
    } catch (err) { toast(`失敗: ${err.message}`, "err"); }
  }
  async function doHistory(endpoint) {
    const verb = endpoint === "/undo" ? "戻す" : "進む";
    try {
      const j = await post(endpoint);
      if (j.ok) toast(`${verb}: ${j.label}（${j.file}）`);
      else if (j.reason === "nothing") toast(`これ以上「${verb}」操作はありません`);
      else if (j.reason === "file-changed") toast(`外部変更があり「${verb}」できません`, "warn");
      else toast(`失敗: ${j.reason || j.error}`, "err");
    } catch (err) { toast(`失敗: ${err.message}`, "err"); }
  }

  // ---- インスペクタ本文の描画 -------------------------------------------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TEXTUAL = /^(p|h[1-6]|span|a|button|li|label|strong|em|blockquote|figcaption|small|q|cite)$/;
  const POS = ["relative", "absolute", "fixed", "sticky"];
  const OVERFLOW = ["overflow-visible", "overflow-hidden", "overflow-auto", "overflow-scroll"];
  const SHADOWS = ["shadow-none", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl"];
  const opt = (val, cur, label) => `<option value="${val}"${val === cur ? " selected" : ""}>${label}</option>`;
  const SPACING_SIDES = ["t", "r", "b", "l"];
  const SPACING_ICONS = { t: "up", r: "right", b: "down", l: "left" };
  const SPACING_AXIS = { t: "y", b: "y", r: "x", l: "x" };
  const SPACING_PROP = {
    m: { t: "marginTop", r: "marginRight", b: "marginBottom", l: "marginLeft" },
    p: { t: "paddingTop", r: "paddingRight", b: "paddingBottom", l: "paddingLeft" },
  };

  function spacingOverride(kind) { return kind === "m" ? marginLocked : paddingLocked; }
  function setSpacingOverride(kind, locked) { if (kind === "m") marginLocked = locked; else paddingLocked = locked; }
  function spacingPrefix(kind, side) { return kind + (side || ""); }
  function spacingTokenToPx(raw) {
    if (!raw) return "";
    const token = String(raw).trim();
    if (token.startsWith("[")) {
      const inner = token.slice(1, -1).trim();
      const m = inner.match(/^(-?\d+(?:\.\d+)?)(px|rem)?$/);
      if (!m) return "";
      const n = Number(m[1]);
      if (!Number.isFinite(n)) return "";
      return String(Math.round(m[2] === "rem" ? n * 16 : n));
    }
    if (/^-?\d+(?:\.\d+)?$/.test(token)) return String(Math.round(Number(token) * 4));
    return "";
  }
  function readComputedSpacingPx(kind, side, sel = cur()) {
    if (!sel?.el || !sel.el.isConnected) return "";
    const cs = getComputedStyle(sel.el);
    const readSide = (s) => {
      const n = parseFloat(cs[SPACING_PROP[kind][s]]);
      return Number.isFinite(n) ? String(Math.round(n)) : "";
    };
    if (side) return readSide(side);
    const vals = SPACING_SIDES.map(readSide);
    return vals.every((v) => v !== "" && v === vals[0]) ? vals[0] : "";
  }
  function readClassSpacingPx(kind, side, className = live()) {
    const readPrefix = (prefix) => spacingTokenToPx(readUtilLast(prefix, className));
    if (!side) {
      const vals = SPACING_SIDES.map((s) => readClassSpacingPx(kind, s, className));
      return vals.every((v) => v !== "" && v === vals[0]) ? vals[0] : "";
    }
    return readPrefix(spacingPrefix(kind, side)) || readPrefix(spacingPrefix(kind, SPACING_AXIS[side])) || readPrefix(kind);
  }
  function readSpacingPx(kind, side, sel = cur()) {
    const className = sel?.liveClass ?? "";
    if (!side) {
      const vals = SPACING_SIDES.map((s) => readSpacingPx(kind, s, sel));
      return vals.every((v) => v !== "" && v === vals[0]) ? vals[0] : "";
    }
    const classPx = readClassSpacingPx(kind, side, className);
    if (classPx !== "") return classPx;
    return state === "" ? readComputedSpacingPx(kind, side, sel) : "";
  }
  function spacingStripTargets(kind, side) {
    if (!side) return ["", "x", "y", ...SPACING_SIDES].map((s) => spacingPrefix(kind, s));
    return [kind, spacingPrefix(kind, SPACING_AXIS[side]), spacingPrefix(kind, side)];
  }
  function stripSpacing(kind, prefixes, className = live()) {
    const p = reEsc(PFX());
    const neg = kind === "m" ? "-?" : "";
    const choices = prefixes.map(reEsc).join("|");
    return norm(className.replace(new RegExp(`(^|\\s)${p}${neg}(${choices})-${VAL}(?=\\s|$)`, "g"), " "));
  }
  function isSpacingLocked(kind) {
    const override = spacingOverride(kind);
    if (override !== null) return override;
    const hasAxisOrSide = ["x", "y", ...SPACING_SIDES].some((side) => readUtil(spacingPrefix(kind, side)));
    if (hasAxisOrSide) return false;
    // shorthand-only and unset both render as locked.
    return true;
  }
  function appendSpacingPx(next, kind, side, px) {
    const n = Number(px);
    if (px === "" || px == null || (Number.isFinite(n) && n === 0)) return next;
    return (next + ` ${PFX()}${spacingPrefix(kind, side)}-[${px}px]`).trim();
  }
  function nextSpacingValueClass(base, kind, side, px, sel) {
    if (!side) {
      let next = stripSpacing(kind, spacingStripTargets(kind, ""), base);
      return appendSpacingPx(next, kind, "", px);
    }
    const baseSel = sel ? { ...sel, liveClass: base } : cur();
    const vals = Object.fromEntries(SPACING_SIDES.map((s) => [s, readSpacingPx(kind, s, baseSel)]));
    vals[side] = px === "" || px == null ? "0" : String(px);
    let next = stripSpacing(kind, spacingStripTargets(kind, ""), base);
    SPACING_SIDES.forEach((s) => { next = appendSpacingPx(next, kind, s, vals[s]); });
    return next;
  }
  function setSpacingValue(kind, side, px) {
    if (multi()) return applyAbsoluteBatch((s) => nextSpacingValueClass(s.sourceClass, kind, side, px, { ...s, liveClass: s.sourceClass }));
    applyLive(nextSpacingValueClass(live(), kind, side, px, cur()));
  }
  function expandSpacing(kind) {
    const vals = Object.fromEntries(SPACING_SIDES.map((side) => [side, readSpacingPx(kind, side)]));
    SPACING_SIDES.forEach((side) => setSpacingValue(kind, side, vals[side]));
    setSpacingOverride(kind, false);
    renderBody();
  }
  function collapseSpacing(kind) {
    const vals = SPACING_SIDES.map((side) => readSpacingPx(kind, side));
    const px = vals[0];
    if (vals.some((v) => v !== px)) toast("4辺の値が異なります。上の値で一括化しました", "warn");
    setSpacingValue(kind, "", px);
    setSpacingOverride(kind, true);
    renderBody();
  }
  function renderSpacing(kind) {
    const locked = isSpacingLocked(kind);
    const prefix = kind === "m" ? "マージン" : "パディング";
    const input = (side, val) => `<span class="num spnum">${side ? `<span class="dir">${svg(SPACING_ICONS[side], 16)}</span>` : ""}<input type="number" class="sp-input" data-kind="${kind}" data-side="${side}" value="${val.value}" placeholder="${val.ph || ""}"><span class="u">px</span></span>`;
    const spacingVal = (side) => fieldVal(readSpacingPx(kind, side), (s) => readSpacingPx(kind, side, s));
    if (locked) {
      return `<div class="ctl spacing-ctl"><label>${prefix}</label><div class="spacing"><div class="spacing-line">
        ${input("", spacingVal(""))}
        <button class="lock-toggle" data-spacing="${kind}" data-locked="true" title="${prefix}を方向別に編集">${svg("lock", 16)}</button>
      </div></div></div>`;
    }
    return `<div class="ctl spacing-ctl"><label>${prefix}</label><div class="spacing"><div class="spacing-grid">
      ${SPACING_SIDES.map((side) => input(side, spacingVal(side))).join("")}
      <button class="lock-toggle" data-spacing="${kind}" data-locked="false" title="${prefix}を一括編集">${svg("unlock", 16)}</button>
    </div></div></div>`;
  }

  function renderBody() {
    const active = cur();
    const sel = active?.payload;
    if (!active || !sel) {
      $body.innerHTML = `<div class="empty">ツールバーの選択アイコンを押して<br>要素をクリックで選択してください</div>`;
      updateMoveAvailability();
      return;
    }
    updateMoveAvailability();
    const cs = active.el && active.el.isConnected ? getComputedStyle(active.el) : null;
    const textColor = readColorInfo("text", rgbToHex(cs && cs.color));
    const bgColor = readColorInfo("bg", rgbToHex(cs && cs.backgroundColor));
    const bdColor = readColorInfo("border", rgbToHex(cs && cs.borderColor));
    const textHex = textColor.value, bgHex = bgColor.value, bdHex = bdColor.value;
    const sourceLabel = (info) => info.source === "computed" ? `<span class="source-label">${state ? "未設定" : "computed"}</span>` : "";
    const textual = TEXTUAL.test(sel.tag);
    const tabs = (textual ? [["text", "テキスト"]] : []).concat([["box", "ボックス"], ["transform", "変形"], ["settings", "設定"]]);
    if (!tabs.some(([k]) => k === tab)) tab = tabs[0][0];
    const num = (cls, val, unit, ph = "") => {
      const v = val && typeof val === "object" ? val : { value: val, ph };
      return `<span class="num"><input type="number" class="${cls}" value="${v.value ?? ""}" placeholder="${v.ph || ""}">${unit ? `<span class="u">${unit}</span>` : ""}</span>`;
    };
    const pendingLabel = (p) => p.payloads ? `${p.payloads.length}要素` : `&lt;${esc(p.payload.tag)}&gt;`;
    const list = pending.map((p, i) => `<li><span class="t">${pendingLabel(p)} ${esc(p.prompt.slice(0, 36))}</span><span class="x" data-i="${i}">✕</span></li>`).join("");
    const multiHead = selection.length >= 2;
    const chips = multiHead ? `<div class="chips">${selection.map((s, i) => `<span class="chip${i === primaryIdx ? " primary" : ""}"><span>&lt;${esc(s.payload.tag)}&gt;</span><button class="sel-x" data-i="${i}" title="選択解除">×</button></span>`).join("")}</div>` : "";
    const classMissingHint = multiHead && selection.some((s) => !s.sourceClass) ? `<div class="hint">class の無い要素は一括スタイル・複製/削除から除外されます</div>` : "";
    const valOf = (single, readForSel) => fieldVal(single, readForSel);
    const readColorValue = (kind, s) => {
      const style = s.el?.isConnected ? getComputedStyle(s.el) : null;
      const prop = kind === "text" ? "color" : kind === "bg" ? "backgroundColor" : "borderColor";
      return readColorInfo(kind, rgbToHex(style && style[prop]), s.liveClass).value;
    };
    const mixedBadge = (isMixed) => isMixed ? `<span class="source-label">—</span>` : "";
    const textColorMixed = multi() && readAcross((s) => readColorValue("text", s)).mixed;
    const bgColorMixed = multi() && readAcross((s) => readColorValue("bg", s)).mixed;
    const bdColorMixed = multi() && readAcross((s) => readColorValue("border", s)).mixed;
    const textSizeVal = valOf(readTextSize(), (s) => readTextSize(s.liveClass));
    const familyVal = valOf(readEnum(FAMILIES), (s) => readEnum(FAMILIES, s.liveClass)).value;
    const weightVal = valOf(readEnum(WEIGHTS), (s) => readEnum(WEIGHTS, s.liveClass)).value;
    const leadingVal = valOf(pctBracket(readUtil("leading")), (s) => pctBracket(readUtil("leading", s.liveClass)));
    const trackingVal = valOf(numOf(readUtil("tracking")), (s) => numOf(readUtil("tracking", s.liveClass)));
    const widthVal = valOf(numOf(readUtil("w")), (s) => numOf(readUtil("w", s.liveClass)));
    const heightVal = valOf(numOf(readUtil("h")), (s) => numOf(readUtil("h", s.liveClass)));
    const radiusVal = valOf(numOf(readUtil("rounded")), (s) => numOf(readUtil("rounded", s.liveClass)));
    const opacityVal = valOf(pctBracket(readUtil("opacity")), (s) => pctBracket(readUtil("opacity", s.liveClass)));
    const borderVal = valOf(numOf(readUtil("border")), (s) => numOf(readUtil("border", s.liveClass)));
    const shadowVal = valOf(readEnum(SHADOWS), (s) => readEnum(SHADOWS, s.liveClass)).value;
    const posVal = valOf(readEnum(POS), (s) => readEnum(POS, s.liveClass)).value;
    const zVal = valOf(numOf(readUtil("z")), (s) => numOf(readUtil("z", s.liveClass)));
    const overflowVal = valOf(readEnum(OVERFLOW), (s) => readEnum(OVERFLOW, s.liveClass)).value;
    const rotateVal = valOf(numOf(readUtil("rotate")), (s) => numOf(readUtil("rotate", s.liveClass)));
    const scaleVal = valOf(readUtil("scale").replace(/[\[\]]/g, ""), (s) => readUtil("scale", s.liveClass).replace(/[\[\]]/g, ""));
    const underlineMixed = multi() && readAcross((s) => hasUtil("underline", s.liveClass)).mixed;
    const italicMixed = multi() && readAcross((s) => hasUtil("italic", s.liveClass)).mixed;

    let panel = "";
    if (tab === "text") {
      panel = `<section><h5>タイポグラフィ</h5>
        <div class="ctl"><label>色</label><span class="swatch"><input type="color" class="c-text" value="${textHex}">${mixedBadge(textColorMixed)}</span></div>
        <div class="ctl"><label>フォント</label><select class="f-family">${opt("", familyVal, "—")}${opt("font-sans", familyVal, "Sans")}${opt("font-serif", familyVal, "Serif")}${opt("font-mono", familyVal, "Mono")}</select></div>
        <div class="ctl"><label>サイズ</label>${num("f-size", textSizeVal, "px")}
          <label style="width:auto">太さ</label><select class="f-weight">${["", ...WEIGHTS].map((w) => opt(w, weightVal, w ? w.replace("font-", "") : "—")).join("")}</select></div>
        <div class="ctl"><label>行高</label>${num("f-lh", leadingVal, "%")}
          <label style="width:auto">字間</label>${num("f-ls", trackingVal, "em")}</div>
        <div class="ctl"><label>整列</label><span class="seg"><button data-align="left">左</button><button data-align="center">中</button><button data-align="right">右</button><button data-align="justify">両端</button></span></div>
        <div class="ctl"><label>装飾</label><span class="seg"><button class="t-ul${hasUtil("underline") && !underlineMixed ? " on" : ""}" title="${underlineMixed ? "—" : ""}">下線</button><button class="t-it${hasUtil("italic") && !italicMixed ? " on" : ""}" title="${italicMixed ? "—" : ""}"><i>斜体</i></button></span></div>
      </section>`;
    } else if (tab === "box") {
      panel = `<section><h5>レイアウト</h5>
        <div class="ctl"><label>幅</label>${num("l-w", widthVal, "px")}<label style="width:auto">高さ</label>${num("l-h", heightVal, "px")}</div>
        ${renderSpacing("m")}
        ${renderSpacing("p")}
      </section>
      <section><h5>外観</h5>
        <div class="ctl"><label>背景色</label><span class="swatch"><input type="color" class="c-bg" value="${bgHex}">${mixedBadge(bgColorMixed) || sourceLabel(bgColor)}</span></div>
        <div class="ctl"><label>角丸</label>${num("a-radius", radiusVal, "px")}<label style="width:auto">不透明度</label>${num("a-opacity", opacityVal, "%")}</div>
        <div class="ctl"><label>枠線</label>${num("a-border", borderVal, "px")}<span class="swatch"><input type="color" class="c-border" value="${bdHex}">${mixedBadge(bdColorMixed) || sourceLabel(bdColor)}</span></div>
        <div class="ctl"><label>影</label><select class="a-shadow">${["", ...SHADOWS].map((s) => opt(s, shadowVal, s ? s.replace("shadow-", "").replace("shadow", "default") : "—")).join("")}</select></div>
      </section>
      <section><h5>ポジション</h5>
        <div class="ctl"><label>位置</label><select class="p-pos">${["", ...POS].map((v) => opt(v, posVal, v || "static")).join("")}</select><label style="width:auto">重ね順</label>${num("p-z", zVal, "")}</div>
        <div class="ctl"><label>はみ出し</label><select class="p-of">${["", ...OVERFLOW].map((v) => opt(v, overflowVal, v ? v.replace("overflow-", "") : "—")).join("")}</select></div>
      </section>`;
    } else if (tab === "transform") {
      panel = `<section><h5>変形</h5>
        <div class="ctl"><label>回転</label>${num("t-rot", rotateVal, "deg")}</div>
        <div class="ctl"><label>拡縮</label>${num("t-scale", scaleVal, "×", "1")}</div>
      </section>`;
    } else {
      panel = `<section><h5>クラス（Tailwind）</h5>
        <textarea class="cls" spellcheck="false">${esc(active.liveClass)}</textarea>
        <div class="row"><button class="btn primary apply">適用</button><button class="btn ghost reset">戻す</button></div>
      </section>
      <section><h5>構造</h5>
        <div class="row"><button class="btn dup">${svg("copy", 14)} 複製</button><button class="btn danger del">${svg("trash", 14)} 削除</button></div>
      </section>
      <section><h5>要素</h5>
        <div class="kv"><span>tag</span><code>&lt;${esc(sel.tag)}&gt;</code></div>
        <div class="kv"><span>page</span><code>${esc(sel.route)}</code></div>
        <div class="kv"><span>selector</span><code>${esc(sel.selector)}</code></div>
      </section>`;
    }

    $body.innerHTML = `
      <div class="inspect-head">
        <div class="elhdr">${svg("cursor", 13)}${multiHead ? `<span class="eltag">${selection.length}個選択中</span>` : `<span class="eltag">&lt;${esc(sel.tag)}&gt;</span>${sel.component ? `<span class="elcomp">${esc(sel.component)}</span>` : ""}`}</div>
        <div class="state-ctl" title="条件スタイル">
          <button class="${state === "" ? "on" : ""}" data-state="">通常</button>
          <button class="${state === "hover:" ? "on" : ""}" data-state="hover:">ホバー</button>
        </div>
      </div>
      ${chips}
      ${classMissingHint}
      ${state === "hover:" ? `<div class="state-badge">ホバー状態を編集中</div>` : ""}
      <div class="tabs">${tabs.map(([k, l]) => `<button class="tab${k === tab ? " on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
      ${panel}
      <section class="ask-sec"><h5>Claudeに頼む（複雑な構造・文言）</h5>
        <textarea class="ask" placeholder="例: 2行に分けて、画像と左右入れ替えて"></textarea>
        <div class="row"><button class="btn add">キューに追加</button></div>
        ${pending.length ? `<ul>${list}</ul><div class="row"><button class="btn send">${svg("send", 14)} Claudeへ送る (${pending.length})</button></div>` : ""}
      </section>`;

    // タブ切替
    $body.querySelectorAll(".sel-x").forEach((b) => b.onclick = () => removeSelectionAt(Number(b.dataset.i)));
    $body.querySelectorAll(".tab[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; renderBody(); });
    $body.querySelectorAll(".state-ctl button[data-state]").forEach((b) => b.onclick = () => { state = b.dataset.state; renderBody(); });
    // 共通: 色/揃え/装飾
    const oc = (s, fn) => { const el = $(s); if (el) el.oninput = fn; };
    oc(".c-text", (e) => setColor("text", e.target.value));
    oc(".c-bg", (e) => setColor("bg", e.target.value));
    oc(".c-border", (e) => setColor("border", e.target.value));
    $body.querySelectorAll(".seg button[data-align]").forEach((b) => b.onclick = () => setAlign(b.dataset.align));
    const ul = $(".t-ul"); if (ul) ul.onclick = () => { toggleUtil("underline"); renderBody(); };
    const it = $(".t-it"); if (it) it.onclick = () => { toggleUtil("italic"); renderBody(); };
    // テキスト数値
    oc(".f-size", (e) => setTextSize(e.target.value));
    const fam = $(".f-family"); if (fam) fam.onchange = (e) => setFamily(e.target.value);
    const fw = $(".f-weight"); if (fw) fw.onchange = (e) => setWeight(e.target.value);
    oc(".f-lh", (e) => setUtil("leading", e.target.value ? `[${e.target.value / 100}]` : ""));
    oc(".f-ls", (e) => setUtil("tracking", e.target.value ? `[${e.target.value}em]` : ""));
    // ボックス
    $body.querySelectorAll(".sp-input").forEach((input) => {
      input.oninput = (e) => setSpacingValue(e.target.dataset.kind, e.target.dataset.side, e.target.value);
    });
    $body.querySelectorAll(".lock-toggle[data-spacing]").forEach((b) => {
      b.onclick = () => (b.dataset.locked === "true" ? expandSpacing(b.dataset.spacing) : collapseSpacing(b.dataset.spacing));
    });
    oc(".l-w", (e) => setUtil("w", e.target.value ? `[${e.target.value}px]` : ""));
    oc(".l-h", (e) => setUtil("h", e.target.value ? `[${e.target.value}px]` : ""));
    oc(".a-radius", (e) => setUtil("rounded", e.target.value ? `[${e.target.value}px]` : ""));
    oc(".a-opacity", (e) => setUtil("opacity", e.target.value !== "" ? `[${Math.max(0, Math.min(100, e.target.value)) / 100}]` : ""));
    oc(".a-border", (e) => setUtil("border", e.target.value ? `[${e.target.value}px]` : ""));
    const sh = $(".a-shadow"); if (sh) sh.onchange = (e) => setEnum(SHADOWS, e.target.value);
    const pos = $(".p-pos"); if (pos) pos.onchange = (e) => setEnum(POS, e.target.value);
    oc(".p-z", (e) => setUtil("z", e.target.value !== "" ? `[${e.target.value}]` : ""));
    const of = $(".p-of"); if (of) of.onchange = (e) => setEnum(OVERFLOW, e.target.value);
    // 変形
    oc(".t-rot", (e) => setUtil("rotate", e.target.value ? `[${e.target.value}deg]` : ""));
    oc(".t-scale", (e) => setUtil("scale", e.target.value ? `[${e.target.value}]` : ""));
    // 設定タブ: class/構造
    const cls = $(".cls");
    if (cls) cls.oninput = (e) => { setPrimaryLiveClass(e.target.value); highlightSelection(); };
    const ap = $(".apply"); if (ap) ap.onclick = commitStyle;
    const rs = $(".reset"); if (rs) rs.onclick = () => applyLive(source());
    const du = $(".dup"); if (du) du.onclick = () => selection.length >= 2 ? doStructBatch("duplicate") : doStruct("/duplicate");
    const de = $(".del"); if (de) de.onclick = () => selection.length >= 2 ? doStructBatch("delete") : doStruct("/delete");
    // Claude
    const ask = $(".ask"), add = $(".add");
    if (add) add.onclick = () => {
      const p = (ask.value || "").trim();
      if (!p) { toast("指示を入力してください", "warn"); return; }
      if (selection.length >= 2) pending.push({ payloads: selection.map((s) => s.payload), prompt: p });
      else pending.push({ payload: sel, prompt: p });
      renderBody();
    };
    $body.querySelectorAll(".x").forEach((x) => x.onclick = () => { pending.splice(Number(x.dataset.i), 1); renderBody(); });
    const sendBtn = $(".send"); if (sendBtn) sendBtn.onclick = send;
  }

  function openPanel() { setCollapsed(false); renderBody(); }
  function closePanel() { clearSelection(); }

  async function send() {
    if (!pending.length) return;
    const items = pending.map((p) => p.payloads
      ? { ...p.payloads[0], payloads: p.payloads, prompt: p.prompt }
      : { ...p.payload, prompt: p.prompt });
    try {
      const json = await post("/enqueue", { items });
      if (!json.ok) throw new Error(json.error || "enqueue failed");
      pending.length = 0; renderBody();
      toast(`${json.ids.length} 件を Claude のキューへ送りました`);
    } catch (err) { toast(`送信失敗: ${err.message}（daemon 起動中？）`, "err"); }
  }

  // ---- 並べ替え/移動（ドラッグ・決定的・オートスクロール付き） -----------
  function setReordering(on) {
    reordering = on; $tMove.classList.toggle("on", on);
    if (on) { setInspecting(false); toast("要素をドラッグして別の要素の上にドロップ"); }
    else { dragEl2 = null; dropTarget = null; $dropline.style.display = "none"; stopAutoScroll(); hideHighlight(); }
  }
  function showDropline(target, pos) {
    const r = target.getBoundingClientRect();
    $dropline.style.display = "block";
    $dropline.style.left = r.left + "px";
    $dropline.style.width = Math.min(r.width, window.innerWidth - W - r.left) + "px";
    $dropline.style.top = (pos === "before" ? r.top - 1 : r.bottom - 1) + "px";
  }
  function updateDrop() {
    const el = document.elementFromPoint(lastX, lastY);
    if (!el || isOurs(el) || el === dragEl2) { $dropline.style.display = "none"; dropTarget = null; return; }
    const r = el.getBoundingClientRect();
    dropPos = lastY < r.top + r.height / 2 ? "before" : "after";
    dropTarget = el; showDropline(el, dropPos);
  }
  function setAutoScroll(y) {
    const m = 90;
    asDir = y < m ? -1 : y > window.innerHeight - m ? 1 : 0;
    if (asDir && !asTimer) asTimer = setInterval(() => { window.scrollBy(0, asDir * 18); if (dragEl2) updateDrop(); }, 16);
    else if (!asDir) stopAutoScroll();
  }
  function stopAutoScroll() { if (asTimer) { clearInterval(asTimer); asTimer = null; } asDir = 0; }
  async function doReorder(dragEl, target, pos) {
    const dragClass = dragEl.getAttribute("class"), targetClass = target.getAttribute("class");
    if (!dragClass || !targetClass) { toast("class が無く並べ替え不可（Claudeに頼んで）", "warn"); return; }
    try {
      const j = await post("/reorder", { route: location.pathname, dragClass, targetClass, position: pos });
      if (j.ok && !j.noop) toast(`並べ替え反映 → ${j.file}`);
      else if (j.ok) toast("変更なし");
      else if (j.reason === "ambiguous") toast("同じclassが複数。Claudeに頼んで", "warn");
      else if (j.reason === "nested") toast("自分の中/外へは移動不可", "warn");
      else if (j.reason === "not-found") toast("ソース未特定(動的class?)。Claudeに頼んで", "warn");
      else toast(`失敗: ${j.reason || j.error}`, "err");
    } catch (err) { toast(`失敗: ${err.message}`, "err"); }
  }
  function claudeMoveFallback(targetEl, pos) {
    const tinfo = collect(targetEl);
    const label = tinfo.text ? `「${tinfo.text.slice(0, 20)}」` : targetEl.tagName.toLowerCase();
    pending.push({
      payloads: selection.map((s) => s.payload),
      prompt: `次の${selection.length}要素を、${label}の${pos === "before" ? "前" : "後"}へ、選択順を保ってまとめて移動してください。`,
      moveTarget: tinfo,
    });
    toast("別親のため Claude 経路にまとめて移動を積みました", "warn");
    renderBody();
  }
  async function doReorderGroup(targetEl, pos) {
    const rawClasses = selection.map((s) => s.sourceClass);
    const dragClasses = [...new Set(rawClasses.filter(Boolean))];
    const targetClass = targetEl.getAttribute("class");
    if (dragClasses.length < selection.length || !targetClass) return claudeMoveFallback(targetEl, pos);
    if (!allSameParent(selection)) return claudeMoveFallback(targetEl, pos);
    if (selection.some((s) => s.el === targetEl)) { toast("移動先が選択内です", "warn"); return; }
    if (dragClasses.includes(targetClass)) { toast("移動先が選択内です", "warn"); return; }
    try {
      const j = await post("/reorder-group", { route: location.pathname, dragClasses, targetClass, position: pos });
      if (j.ok && !j.noop) toast(`グループ移動 → ${j.file}`);
      else if (j.ok) toast("変更なし");
      else if (j.reason === "not-same-parent") return claudeMoveFallback(targetEl, pos);
      else if (j.reason === "nested") toast("自分の中/外へは移動不可", "warn");
      else if (j.reason === "ambiguous") toast("同じclassが複数。Claudeに頼んで", "warn");
      else if (j.reason === "target-in-group") toast("移動先が選択内です", "warn");
      else if (j.reason === "not-found") toast("ソース未特定(動的class?)。Claudeに頼んで", "warn");
      else toast(`失敗: ${j.reason || j.error}`, "warn");
    } catch (err) { toast(`失敗: ${err.message}`, "err"); }
  }

  // ---- ツールバー配線 ---------------------------------------------------
  $tSelect.onclick = () => { setReordering(false); inspecting ? setInspecting(false) : (setInspecting(true), renderBody()); };
  $tMove.onclick = () => { setInspecting(false); setReordering(!reordering); };
  $tUndo.onclick = () => doHistory("/undo");
  $tRedo.onclick = () => doHistory("/redo");
  $(".t-collapse").onclick = () => setCollapsed(true);
  $launcher.onclick = () => setCollapsed(false);
  setPageGutter(true); // 初期はインスペクタ開＝ガターを空ける
  root.querySelectorAll(".bpseg button").forEach((b) => {
    if (b.dataset.bp === bp) b.classList.add("on");
    b.onclick = () => { bp = b.dataset.bp; root.querySelectorAll(".bpseg button").forEach((x) => x.classList.toggle("on", x.dataset.bp === bp)); if (cur()) renderBody(); };
  });

  // ---- ページ側イベント -------------------------------------------------
  document.addEventListener("mousedown", (e) => {
    if (!reordering || isOurs(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    // 選択要素「内側」を掴んでも group 扱い（子を持つ要素は mousedown が子に当たるため contains で判定）
    const grabbed = selection.find((s) => s.el === e.target || (s.el.contains && s.el.contains(e.target)));
    draggingGroup = selection.length >= 2 && !!grabbed;
    dragEl2 = draggingGroup ? grabbed.el : e.target; lastX = e.clientX; lastY = e.clientY;
    if (draggingGroup) { highlightSelection(); toast(`${selection.length}要素移動中`); }
    else showHighlight(dragEl2, true);
  }, true);
  document.addEventListener("mousemove", (e) => {
    if (reordering && dragEl2) { lastX = e.clientX; lastY = e.clientY; updateDrop(); setAutoScroll(lastY); return; }
    if (inspecting) { const el = e.target; if (isOurs(el)) { hideHighlight(); return; } hovered = el; showHighlight(el); }
  }, true);
  document.addEventListener("mouseup", (e) => {
    if (!reordering || !dragEl2) return;
    e.preventDefault();
    if (dropTarget && dropTarget !== dragEl2) {
      if (draggingGroup) doReorderGroup(dropTarget, dropPos);
      else doReorder(dragEl2, dropTarget, dropPos);
    }
    const wasGroup = draggingGroup;
    dragEl2 = null; draggingGroup = false; dropTarget = null; $dropline.style.display = "none"; stopAutoScroll(); hideHighlight();
    if (wasGroup && selection.length) setTimeout(highlightSelection, 1200);
  }, true);
  document.addEventListener("click", (e) => {
    if (!inspecting || isOurs(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    selectFromClick(e.target, e);
  }, true);

  function isEditing() {
    let ae = document.activeElement;
    if (ae && ae.id === HOST_ID && ae.shadowRoot) ae = ae.shadowRoot.activeElement;
    return !!ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (reordering) setReordering(false); else if (inspecting) setInspecting(false); else if (cur()) closePanel(); return; }
    if (!(e.metaKey || e.ctrlKey) || isEditing()) return; // テキスト編集中は OS ネイティブの undo を優先
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); doHistory("/undo"); }
    else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); doHistory("/redo"); }
  }, true);

  window.addEventListener("scroll", () => {
    if (inspecting && hovered) showHighlight(hovered);
    else if (cur()) highlightSelection();
  }, true);

  renderBody();
  console.log("[web-ui-bridge] overlay loaded →", ORIGIN);
})();
