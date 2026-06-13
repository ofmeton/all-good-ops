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
  let selected = null, selectedEl = null;
  let sourceClass = "", liveClass = "", bp = "";
  let reordering = false, dragEl2 = null, dropTarget = null, dropPos = "before";
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
      :host { --bg:#0e0f12; --surface:#16181d; --surface2:#1c1f26; --bd:#272a31; --bd2:#33373f;
              --tx:#e6e7ea; --muted:#8b8e96; --accent:#3b82f6; --danger:#f43f5e; }
      .hl { position: fixed; pointer-events: none; border: 1.5px solid var(--accent);
            background: rgba(59,130,246,.10); border-radius: 3px; z-index: 5; display: none; transition: all .05s ease-out; }
      .hl.drag { border-color: #a855f7; border-style: dashed; background: rgba(168,85,247,.14); }
      .label { position: fixed; pointer-events: none; z-index: 6; display: none; font-family: ui-monospace, monospace;
               background: var(--accent); color: #fff; font-size: 10.5px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
      .dropline { position: fixed; pointer-events: none; z-index: 7; height: 2px; background: #a855f7;
                  border-radius: 2px; display: none; box-shadow: 0 0 0 1px rgba(168,85,247,.4), 0 0 8px #a855f7; }
      .dropline::before { content:""; position:absolute; left:-3px; top:-2px; width:6px; height:6px; border-radius:50%; background:#a855f7; }
      .launcher { position: fixed; top: 14px; right: 14px; width: 38px; height: 38px; border-radius: 9px;
                  border: 1px solid var(--bd2); background: var(--surface); color: var(--tx); cursor: pointer;
                  display: none; align-items: center; justify-content: center; pointer-events: auto;
                  box-shadow: 0 6px 20px rgba(0,0,0,.4); }
      .launcher.show { display: flex; }
      .launcher:hover { background: var(--surface2); }
      .inspector { position: fixed; top: 0; right: 0; height: 100vh; width: ${W}px; pointer-events: auto;
                   background: var(--bg); color: var(--tx); border-left: 1px solid var(--bd);
                   display: flex; flex-direction: column; box-shadow: -8px 0 30px rgba(0,0,0,.35);
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
      .bpseg { display: flex; background: var(--surface); border: 1px solid var(--bd); border-radius: 8px; padding: 2px; }
      .bpseg button { flex: 1; height: 24px; border: none; background: transparent; color: var(--muted);
                      font-size: 11px; border-radius: 6px; cursor: pointer; transition: all .12s; }
      .bpseg button:hover { color: var(--tx); }
      .bpseg button.on { background: var(--surface2); color: var(--tx); box-shadow: 0 1px 2px rgba(0,0,0,.3); }
      .body { flex: 1; overflow-y: auto; padding: 4px 0 24px; }
      .empty { color: var(--muted); font-size: 12px; padding: 28px 16px; text-align: center; line-height: 1.7; }
      .meta { padding: 12px 14px 10px; font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted); word-break: break-all; }
      .meta b { color: var(--accent); }
      section { border-top: 1px solid var(--bd); padding: 12px 14px; }
      h5 { margin: 0 0 10px; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
      .ctl { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .ctl:last-child { margin-bottom: 0; }
      .ctl > label { font-size: 11px; color: var(--muted); width: 64px; flex: none; }
      select { background: var(--surface); color: var(--tx); border: 1px solid var(--bd); border-radius: 7px;
               font-size: 11px; padding: 5px 6px; outline: none; }
      select:focus { border-color: var(--accent); }
      .step { display: inline-flex; align-items: stretch; background: var(--surface); border: 1px solid var(--bd); border-radius: 7px; overflow: hidden; }
      .step button { width: 28px; border: none; background: transparent; color: var(--tx); cursor: pointer; font-size: 14px; }
      .step button:hover { background: var(--surface2); }
      .step .mid { min-width: 30px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); font-size: 11px; border-left: 1px solid var(--bd); border-right: 1px solid var(--bd); }
      .seg { display: inline-flex; background: var(--surface); border: 1px solid var(--bd); border-radius: 7px; padding: 2px; gap: 2px; }
      .seg button { padding: 3px 9px; border: none; background: transparent; color: var(--muted); border-radius: 5px; cursor: pointer; font-size: 11px; }
      .seg button:hover { color: var(--tx); }
      .swatch { display: inline-flex; align-items: center; gap: 6px; }
      input[type="color"] { width: 30px; height: 26px; padding: 0; border: 1px solid var(--bd); border-radius: 6px; background: var(--surface); cursor: pointer; }
      .cls { width: 100%; background: var(--surface); color: #93c5fd; border: 1px solid var(--bd); border-radius: 8px;
             padding: 8px; font-size: 11px; font-family: ui-monospace, monospace; resize: vertical; min-height: 56px; outline: none; line-height: 1.5; }
      .cls:focus { border-color: var(--accent); }
      textarea.ask { width: 100%; background: var(--surface); color: var(--tx); border: 1px solid var(--bd); border-radius: 8px;
             padding: 8px; font-size: 12px; resize: vertical; min-height: 54px; outline: none; }
      textarea.ask:focus { border-color: var(--accent); }
      .row { display: flex; gap: 8px; margin-top: 8px; }
      .btn { flex: 1; padding: 8px; border: 1px solid var(--bd); border-radius: 8px; font-size: 12px; cursor: pointer;
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
               pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
      .toast.warn { border-color: #b45309; } .toast.err { border-color: var(--danger); }
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
  function hideHighlight() { $hl.style.display = "none"; $label.style.display = "none"; }
  function highlightSelected() { if (selectedEl && selected) showHighlight(selectedEl); }

  function setInspecting(on) { inspecting = on; $tSelect.classList.toggle("on", on); if (!on) { hideHighlight(); hovered = null; } }

  function toast(msg, kind) {
    $toast.textContent = msg;
    $toast.className = "toast" + (kind === "warn" ? " warn" : kind === "err" ? " err" : "");
    $toast.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { $toast.style.display = "none"; }, 2600);
  }

  function setCollapsed(c) {
    $inspector.classList.toggle("show", !c);
    $launcher.classList.toggle("show", c);
    if (c) { setInspecting(false); setReordering(false); hideHighlight(); }
  }

  // ---- 直接調整ロジック（決定的・純文字列操作） -------------------------
  const SCALE = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];
  const SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function applyLive(next) {
    liveClass = next;
    if (selectedEl && selectedEl.isConnected) selectedEl.setAttribute("class", next);
    const c = $(".cls"); if (c && c.value !== next) c.value = next;
    highlightSelected();
  }
  function stepSpacing(prefix, dir) {
    const re = new RegExp(`(^|\\s)${prefix}-(\\d+)(?=\\s|$)`);
    const m = liveClass.match(re);
    let next;
    if (m) {
      const cur = Number(m[2]); let i = SCALE.indexOf(cur);
      if (i === -1) i = SCALE.findIndex((v) => v >= cur);
      i = Math.max(0, Math.min(SCALE.length - 1, i + dir));
      next = liveClass.replace(re, `$1${prefix}-${SCALE[i]}`);
    } else if (dir > 0) next = (liveClass + ` ${prefix}-4`).trim();
    else return;
    applyLive(next.replace(/\s+/g, " ").trim());
  }
  function setAlign(val) {
    const p = reEsc(bp);
    const cleaned = liveClass.replace(new RegExp(`(^|\\s)${p}text-(left|center|right|justify)(?=\\s|$)`, "g"), " ").replace(/\s+/g, " ").trim();
    applyLive((cleaned + ` ${bp}text-${val}`).trim());
  }
  function stepSize(dir) {
    const p = reEsc(bp);
    const re = new RegExp(`(^|\\s)${p}text-(xs|sm|base|lg|xl|[2-9]xl)(?=\\s|$)`);
    const m = liveClass.match(re);
    let next;
    if (m) { let i = SIZES.indexOf(m[2]); i = Math.max(0, Math.min(SIZES.length - 1, i + dir)); next = liveClass.replace(re, `$1${bp}text-${SIZES[i]}`); }
    else if (dir > 0) next = (liveClass + ` ${bp}text-lg`).trim();
    else return;
    applyLive(next.replace(/\s+/g, " ").trim());
  }
  function setColor(kind, hex) {
    const p = reEsc(bp);
    const strip = new RegExp(`(^|\\s)${p}${kind}-(\\[#[0-9a-fA-F]{3,8}\\]|\\(--[^)]+\\)|[a-z]+-\\d{2,3})(?=\\s|$)`, "g");
    const cleaned = liveClass.replace(strip, " ").replace(/\s+/g, " ").trim();
    applyLive((cleaned + ` ${bp}${kind}-[${hex}]`).trim());
  }
  function rgbToHex(rgb) {
    const m = (rgb || "").match(/\d+/g);
    if (!m || m.length < 3) return "#000000";
    return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  }

  async function post(endpoint, body) {
    const res = await fetch(`${ORIGIN}${endpoint}`, { method: "POST", headers: POST_HEADERS, body: body ? JSON.stringify(body) : undefined });
    return res.json();
  }

  async function commitStyle() {
    if (!selected) return;
    if (liveClass === sourceClass) { toast("変更なし"); return; }
    try {
      const j = await post("/apply-style", { route: selected.route, oldClassName: sourceClass, newClassName: liveClass, selector: selected.selector, text: selected.text });
      if (j.ok) {
        toast(`反映 → ${j.file ?? "noop"}`);
        sourceClass = liveClass; selected.classes = liveClass;
        setTimeout(() => { const fresh = document.querySelector(selected.selector); if (fresh) selectedEl = fresh; }, 1200);
      } else if (j.reason === "ambiguous") toast(`同じclassが${j.count}箇所。Claudeに頼んで`, "warn");
      else if (j.reason === "not-found") toast("ソース未特定(動的class?)。Claudeに頼んで", "warn");
      else toast(`失敗: ${j.reason || j.error}`, "err");
    } catch (err) { toast(`失敗: ${err.message}（daemon 起動中？）`, "err"); }
  }
  async function doStruct(endpoint) {
    if (!selected) return;
    if (!sourceClass) { toast("class が無く操作不可（Claudeに頼んで）", "warn"); return; }
    const verb = endpoint === "/delete" ? "削除" : "複製";
    try {
      const j = await post(endpoint, { route: selected.route, targetClass: sourceClass });
      if (j.ok) { toast(`${verb}反映 → ${j.file}`); closePanel(); }
      else if (j.reason === "ambiguous") toast("同じclassが複数。Claudeに頼んで", "warn");
      else if (j.reason === "not-found") toast("ソース未特定(動的class?)。Claudeに頼んで", "warn");
      else toast(`失敗: ${j.reason || j.error}`, "err");
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
  const SIDE = `<option value="">全</option><option value="x">左右</option><option value="y">上下</option><option value="t">上</option><option value="r">右</option><option value="b">下</option><option value="l">左</option>`;

  function renderBody() {
    const sel = selected;
    if (!sel) {
      $body.innerHTML = `<div class="empty">上の <b style="color:var(--accent)">⌖</b> を押して<br>要素をクリックで選択してください</div>`;
      return;
    }
    const cs = selectedEl && selectedEl.isConnected ? getComputedStyle(selectedEl) : null;
    const textHex = rgbToHex(cs && cs.color), bgHex = rgbToHex(cs && cs.backgroundColor);
    const list = pending.map((p, i) => `<li><span class="t">&lt;${esc(p.payload.tag)}&gt; ${esc(p.prompt.slice(0, 40))}</span><span class="x" data-i="${i}">✕</span></li>`).join("");

    $body.innerHTML = `
      <div class="meta">&lt;${esc(sel.tag)}&gt;${sel.component ? ` · ${esc(sel.component)}` : ""} · <b>${esc(sel.route)}</b></div>
      <section>
        <h5>スペーシング</h5>
        <div class="ctl"><label>余白</label><select class="m-side">${SIDE}</select>
          <span class="step"><button data-act="m-">−</button><button data-act="m+">＋</button></span></div>
        <div class="ctl"><label>詰め</label><select class="p-side">${SIDE}</select>
          <span class="step"><button data-act="p-">−</button><button data-act="p+">＋</button></span></div>
      </section>
      <section>
        <h5>テキスト</h5>
        <div class="ctl"><label>サイズ</label><span class="step"><button data-size="-1">−</button><button data-size="1">＋</button></span></div>
        <div class="ctl"><label>揃え</label><span class="seg"><button data-align="left">左</button><button data-align="center">中</button><button data-align="right">右</button></span></div>
      </section>
      <section>
        <h5>カラー</h5>
        <div class="ctl"><label>文字</label><span class="swatch"><input type="color" class="c-text" value="${textHex}"></span>
          <label style="width:auto">背景</label><span class="swatch"><input type="color" class="c-bg" value="${bgHex}"></span></div>
      </section>
      <section>
        <h5>クラス（Tailwind）</h5>
        <textarea class="cls" spellcheck="false">${esc(liveClass)}</textarea>
        <div class="row"><button class="btn primary apply">適用</button><button class="btn ghost reset">戻す</button></div>
      </section>
      <section>
        <h5>構造</h5>
        <div class="row"><button class="btn dup">${svg("copy", 14)} 複製</button><button class="btn danger del">${svg("trash", 14)} 削除</button></div>
      </section>
      <section>
        <h5>Claudeに頼む（複雑な構造・文言）</h5>
        <textarea class="ask" placeholder="例: 2行に分けて、画像と左右入れ替えて"></textarea>
        <div class="row"><button class="btn add">キューに追加</button></div>
        ${pending.length ? `<ul>${list}</ul><div class="row"><button class="btn send">${svg("send", 14)} Claudeへ送る (${pending.length})</button></div>` : ""}
      </section>`;

    const sideOf = (s) => $(s).value;
    $body.querySelectorAll(".step button[data-act]").forEach((b) => b.onclick = () => {
      const a = b.dataset.act, kind = a[0], dir = a[1] === "+" ? 1 : -1;
      stepSpacing(bp + kind + sideOf(kind === "m" ? ".m-side" : ".p-side"), dir);
    });
    $body.querySelectorAll(".step button[data-size]").forEach((b) => b.onclick = () => stepSize(Number(b.dataset.size)));
    $body.querySelectorAll(".seg button[data-align]").forEach((b) => b.onclick = () => setAlign(b.dataset.align));
    $(".c-text").oninput = (e) => setColor("text", e.target.value);
    $(".c-bg").oninput = (e) => setColor("bg", e.target.value);
    const cls = $(".cls");
    cls.oninput = (e) => { liveClass = e.target.value; if (selectedEl && selectedEl.isConnected) selectedEl.setAttribute("class", liveClass); highlightSelected(); };
    $(".apply").onclick = commitStyle;
    $(".reset").onclick = () => applyLive(sourceClass);
    $(".dup").onclick = () => doStruct("/duplicate");
    $(".del").onclick = () => doStruct("/delete");
    const ask = $(".ask"), add = $(".add");
    add.onclick = () => { const p = (ask.value || "").trim(); if (!p) { toast("指示を入力してください", "warn"); return; } pending.push({ payload: selected, prompt: p }); renderBody(); };
    $body.querySelectorAll(".x").forEach((x) => x.onclick = () => { pending.splice(Number(x.dataset.i), 1); renderBody(); });
    const sendBtn = $(".send"); if (sendBtn) sendBtn.onclick = send;
  }

  function openPanel() { setCollapsed(false); renderBody(); }
  function closePanel() { selected = null; selectedEl = null; hideHighlight(); renderBody(); }

  async function send() {
    if (!pending.length) return;
    const items = pending.map((p) => ({ ...p.payload, prompt: p.prompt }));
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

  // ---- ツールバー配線 ---------------------------------------------------
  $tSelect.onclick = () => { setReordering(false); inspecting ? setInspecting(false) : (setInspecting(true), renderBody()); };
  $tMove.onclick = () => { setInspecting(false); setReordering(!reordering); };
  $tUndo.onclick = () => doHistory("/undo");
  $tRedo.onclick = () => doHistory("/redo");
  $(".t-collapse").onclick = () => setCollapsed(true);
  $launcher.onclick = () => setCollapsed(false);
  root.querySelectorAll(".bpseg button").forEach((b) => {
    if (b.dataset.bp === bp) b.classList.add("on");
    b.onclick = () => { bp = b.dataset.bp; root.querySelectorAll(".bpseg button").forEach((x) => x.classList.toggle("on", x.dataset.bp === bp)); };
  });

  // ---- ページ側イベント -------------------------------------------------
  document.addEventListener("mousedown", (e) => {
    if (!reordering || isOurs(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    dragEl2 = e.target; lastX = e.clientX; lastY = e.clientY; showHighlight(dragEl2, true);
  }, true);
  document.addEventListener("mousemove", (e) => {
    if (reordering && dragEl2) { lastX = e.clientX; lastY = e.clientY; updateDrop(); setAutoScroll(lastY); return; }
    if (inspecting) { const el = e.target; if (isOurs(el)) { hideHighlight(); return; } hovered = el; showHighlight(el); }
  }, true);
  document.addEventListener("mouseup", (e) => {
    if (!reordering || !dragEl2) return;
    e.preventDefault();
    if (dropTarget && dropTarget !== dragEl2) doReorder(dragEl2, dropTarget, dropPos);
    dragEl2 = null; dropTarget = null; $dropline.style.display = "none"; stopAutoScroll(); hideHighlight();
  }, true);
  document.addEventListener("click", (e) => {
    if (!inspecting || isOurs(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    selectedEl = e.target; selected = collect(e.target); sourceClass = selected.classes; liveClass = selected.classes;
    setInspecting(false); openPanel(); highlightSelected();
  }, true);

  function isEditing() {
    let ae = document.activeElement;
    if (ae && ae.id === HOST_ID && ae.shadowRoot) ae = ae.shadowRoot.activeElement;
    return !!ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (reordering) setReordering(false); else if (inspecting) setInspecting(false); else if (selected) closePanel(); return; }
    if (!(e.metaKey || e.ctrlKey) || isEditing()) return; // テキスト編集中は OS ネイティブの undo を優先
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); doHistory("/undo"); }
    else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); doHistory("/redo"); }
  }, true);

  window.addEventListener("scroll", () => {
    if (inspecting && hovered) showHighlight(hovered);
    else if (selectedEl && selected) highlightSelected();
  }, true);

  renderBody();
  console.log("[web-ui-bridge] overlay loaded →", ORIGIN);
})();
