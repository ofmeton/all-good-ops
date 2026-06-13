/* web-ui-bridge overlay — 動いている自分のサイトに dev 限定で注入する自己完結スクリプト。
 *
 * できること:
 *   - 🎯 ボタンで「選択モード」に入る
 *   - 要素ホバーでハイライト＋ラベル、クリックで選択
 *   - [直接調整] 余白/詰め/サイズ/揃え/色/className をその場でいじり、実ソースへ即書き戻し（Phase B/B.2・Claude 不介在）
 *     画面幅(bp: 全/sm/md/lg/xl)を切替えると以降の調整がその breakpoint(md: 等)に効く
 *   - [⇅ 並べ替え] 要素をドラッグして兄弟の上にドロップ→daemon が AST で兄弟順を決定的に確定（Phase C・Claude 不介在）
 *   - [Claudeに頼む] 自然文プロンプトをキューに溜め「Claudeへ送る」(/enqueue)
 *
 * 設計判断（Spike 0 の実測に基づく）:
 *   - React fiber の _debugSource は React 19 で消えており、App Router の Server Component は
 *     クライアント fiber に名前が出ない。よって file:line・component 名には依存しない。
 *   - 確実な locator = className（ソースと一致・grep 一発）＋ text 部分一致＋route＋DOMパス。
 *   - UI は Shadow DOM に隔離し、ページの Tailwind と相互汚染しない。
 */
(() => {
  if (window.__WEB_UI_BRIDGE__) return;
  window.__WEB_UI_BRIDGE__ = true;

  const ORIGIN = "__BRIDGE_ORIGIN__"; // daemon が配信時に置換
  const TOKEN = "__BRIDGE_TOKEN__";   // daemon が配信時に置換（POST の認可トークン）
  const HOST_ID = "web-ui-bridge-root";
  const POST_HEADERS = { "Content-Type": "application/json", "X-Bridge-Token": TOKEN };

  // ---- 状態 -------------------------------------------------------------
  let inspecting = false;
  let hovered = null;
  let selected = null;    // 現在編集中の要素の payload スナップショット
  let selectedEl = null;  // その DOM ノード（ライブプレビュー用）
  let sourceClass = "";   // 確定済み（=ソースと一致）の className 基準
  let liveClass = "";     // 編集中の className（プレビュー反映済み）
  let bp = "";            // 編集対象のブレークポイント prefix（"" | "sm:" | "md:" | "lg:" | "xl:"）
  let reordering = false; // 並べ替えモード
  let dragEl2 = null;     // ドラッグ中の要素
  let dropTarget = null;  // ドロップ先の兄弟候補
  let dropPos = "before"; // before | after
  const pending = [];     // {payload, prompt}

  // ---- locator 収集 -----------------------------------------------------
  const NEXT_INTERNALS = /^(Inner|Outer|Render|Layout|Segment|Scroll|Redirect|Error|HTTPAccess|Loading|App|Root|Client|Server|Hot|Dev|Metadata|NotFound|Template|Bailout|Provider)/;

  function componentName(el) {
    try {
      const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
      if (!key) return null;
      let f = el[key];
      let guard = 0;
      while (f && guard++ < 60) {
        const t = f.type;
        if (t && typeof t !== "string") {
          const n = t.displayName || t.name || (t.render && (t.render.displayName || t.render.name));
          if (n && !n.startsWith("_") && !NEXT_INTERNALS.test(n)) return n;
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
    // 子要素を除いた、この要素直下のテキストノードだけ（grep に効く）
    return [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .filter(Boolean)
      .join(" ");
  }

  function snippets(text) {
    // 句読点・空白で割って、長めのトークンを grep ヒント用に最大5個
    return [...new Set(
      text.split(/[\s、。「」（）()・,.!?！？\n]+/).map((s) => s.trim()).filter((s) => s.length >= 4)
    )].slice(0, 5);
  }

  function collect(el) {
    const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200);
    const own = ownText(el);
    return {
      route: location.pathname,
      tag: el.tagName.toLowerCase(),
      component: componentName(el),
      classes: el.getAttribute("class") || "",
      text,
      ownText: own || null,
      textSnippets: snippets(own || text),
      domPath: domPath(el),
      selector: uniqueSelector(el),
    };
  }

  // ---- UI (Shadow DOM) --------------------------------------------------
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = "all:initial; position:fixed; z-index:2147483647; top:0; left:0; width:0; height:0;";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: -apple-system, system-ui, sans-serif; }
      .hl { position: fixed; pointer-events: none; border: 2px solid #60a5fa;
            background: rgba(96,165,250,.12); border-radius: 4px; z-index: 5; display: none; transition: all .04s; }
      .label { position: fixed; pointer-events: none; z-index: 6; display: none;
               background: #1e293b; color: #e2e8f0; font-size: 11px; padding: 3px 7px;
               border-radius: 5px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,.4); }
      .fab { position: fixed; bottom: 18px; right: 18px; width: 46px; height: 46px; border-radius: 50%;
             border: none; background: #2563eb; color: #fff; font-size: 20px; cursor: pointer;
             box-shadow: 0 4px 14px rgba(0,0,0,.35); pointer-events: auto; }
      .fab.on { background: #dc2626; }
      .fab2 { position: fixed; bottom: 72px; right: 18px; width: 46px; height: 46px; border-radius: 50%;
              border: none; background: #7c3aed; color: #fff; font-size: 18px; cursor: pointer;
              box-shadow: 0 4px 14px rgba(0,0,0,.35); pointer-events: auto; }
      .fab2.on { background: #dc2626; }
      .dropline { position: fixed; pointer-events: none; z-index: 7; height: 3px; background: #a855f7;
                  border-radius: 2px; display: none; box-shadow: 0 0 6px #a855f7; }
      .hl.drag { border-color: #a855f7; background: rgba(168,85,247,.16); }
      .panel { position: fixed; bottom: 76px; right: 18px; width: 340px; max-height: 70vh; overflow: auto;
               background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 12px;
               padding: 14px; pointer-events: auto; display: none; box-shadow: 0 12px 40px rgba(0,0,0,.5); }
      .panel.show { display: block; }
      h4 { margin: 0 0 8px; font-size: 13px; color: #cbd5e1; }
      .meta { font-size: 11px; color: #94a3b8; word-break: break-all; margin-bottom: 6px; line-height: 1.4; }
      .meta b { color: #60a5fa; }
      textarea { width: 100%; min-height: 60px; background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
                 border-radius: 6px; padding: 8px; font-size: 12px; resize: vertical; }
      .row { display: flex; gap: 8px; margin-top: 8px; }
      button.act { flex: 1; padding: 7px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }
      .add { background: #334155; color: #e2e8f0; }
      .send { background: #16a34a; color: #fff; }
      .hint { font-size: 11px; color: #64748b; margin: 4px 0 0; }
      ul { list-style: none; margin: 10px 0 0; padding: 0; border-top: 1px solid #1e293b; }
      li { font-size: 11px; padding: 7px 0; border-bottom: 1px solid #1e293b; display: flex; gap: 6px; }
      li .x { color: #f87171; cursor: pointer; }
      li .t { flex: 1; color: #cbd5e1; }
      .toast { position: fixed; bottom: 76px; right: 18px; background: #16a34a; color: #fff; padding: 10px 14px;
               border-radius: 8px; font-size: 12px; display: none; pointer-events: none; }
      .sec { margin-top: 10px; padding-top: 10px; border-top: 1px solid #1e293b; }
      .sec-h { font-size: 11px; color: #cbd5e1; margin-bottom: 6px; font-weight: 600; }
      .ctl { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
      .ctl label { font-size: 11px; color: #94a3b8; width: 78px; flex: none; }
      .ctl select { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 5px;
                    font-size: 11px; padding: 3px; }
      .step, .seg { display: flex; gap: 4px; }
      .step button, .seg button { width: 28px; height: 26px; border: 1px solid #334155; background: #1e293b;
                    color: #e2e8f0; border-radius: 5px; cursor: pointer; font-size: 13px; padding: 0; }
      .seg button { width: auto; padding: 0 8px; font-size: 11px; }
      .step button:hover, .seg button:hover { background: #334155; }
      .bpseg button.on { background: #2563eb; border-color: #2563eb; color: #fff; }
      .ctl input[type="color"] { width: 34px; height: 26px; padding: 0; border: 1px solid #334155;
                    border-radius: 5px; background: #1e293b; cursor: pointer; }
      .cls { width: 100%; background: #1e293b; color: #93c5fd; border: 1px solid #334155; border-radius: 6px;
             padding: 7px; font-size: 11px; font-family: ui-monospace, monospace; resize: vertical; min-height: 48px; }
      .apply { background: #2563eb; color: #fff; }
      .reset { background: #334155; color: #cbd5e1; flex: none; width: 64px; }
    </style>
    <div class="hl"></div>
    <div class="label"></div>
    <div class="dropline"></div>
    <button class="fab2" title="ドラッグで並べ替え (Esc で解除)">⇅</button>
    <button class="fab" title="要素を選択 (Esc で解除)">🎯</button>
    <div class="panel"></div>
    <div class="toast"></div>
  `;

  const $hl = root.querySelector(".hl");
  const $label = root.querySelector(".label");
  const $dropline = root.querySelector(".dropline");
  const $fab = root.querySelector(".fab");
  const $fab2 = root.querySelector(".fab2");
  const $panel = root.querySelector(".panel");
  const $toast = root.querySelector(".toast");

  function isOurs(el) {
    return el === host || (el && el.id === HOST_ID) || (el && el.closest && el.closest(`#${HOST_ID}`));
  }

  function showHighlight(el) {
    const r = el.getBoundingClientRect();
    $hl.style.display = "block";
    $hl.style.left = r.left + "px";
    $hl.style.top = r.top + "px";
    $hl.style.width = r.width + "px";
    $hl.style.height = r.height + "px";
    const comp = componentName(el);
    $label.textContent = `<${el.tagName.toLowerCase()}>` + (comp ? ` · ${comp}` : "");
    $label.style.display = "block";
    $label.style.left = r.left + "px";
    $label.style.top = Math.max(0, r.top - 22) + "px";
  }
  function hideHighlight() {
    $hl.style.display = "none";
    $label.style.display = "none";
  }

  function setInspecting(on) {
    inspecting = on;
    $fab.classList.toggle("on", on);
    $fab.textContent = on ? "✕" : "🎯";
    if (!on) { hideHighlight(); hovered = null; }
  }

  function toast(msg, color = "#16a34a") {
    $toast.textContent = msg;
    $toast.style.background = color;
    $toast.style.display = "block";
    setTimeout(() => { $toast.style.display = "none"; }, 2200);
  }

  // ---- Phase B / B.2: スタイル直接調整 ----------------------------------
  const SCALE = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];
  const SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // bp の ":" 等を安全に正規表現へ

  function highlightSelected() { if (selectedEl && selected) showHighlight(selectedEl); }

  // 編集中 className を DOM へ即反映（プレビュー）
  function applyLive(next) {
    liveClass = next;
    if (selectedEl && selectedEl.isConnected) selectedEl.setAttribute("class", next);
    const $cls = $panel.querySelector(".cls");
    if ($cls && $cls.value !== next) $cls.value = next;
    highlightSelected();
  }

  // 余白/詰めのスケールを1段上下（prefix 例: m, mx, my, mt, pt …）
  function stepSpacing(prefix, dir) {
    const re = new RegExp(`(^|\\s)${prefix}-(\\d+)(?=\\s|$)`);
    const m = liveClass.match(re);
    let next;
    if (m) {
      const cur = Number(m[2]);
      let i = SCALE.indexOf(cur);
      if (i === -1) i = SCALE.findIndex((v) => v >= cur);
      i = Math.max(0, Math.min(SCALE.length - 1, i + dir));
      next = liveClass.replace(re, `$1${prefix}-${SCALE[i]}`);
    } else if (dir > 0) {
      next = (liveClass + ` ${prefix}-4`).trim();
    } else {
      return; // 既存なし & 減方向は何もしない
    }
    applyLive(next.replace(/\s+/g, " ").trim());
  }

  function setAlign(val) {
    const p = reEsc(bp);
    const cleaned = liveClass.replace(new RegExp(`(^|\\s)${p}text-(left|center|right|justify)(?=\\s|$)`, "g"), " ").replace(/\s+/g, " ").trim();
    applyLive((cleaned + ` ${bp}text-${val}`).trim());
  }

  // フォントサイズ（名前付きスケール text-xs..9xl）を1段上下。bp 対応。
  function stepSize(dir) {
    const p = reEsc(bp);
    const re = new RegExp(`(^|\\s)${p}text-(xs|sm|base|lg|xl|[2-9]xl)(?=\\s|$)`);
    const m = liveClass.match(re);
    let next;
    if (m) {
      let i = SIZES.indexOf(m[2]);
      i = Math.max(0, Math.min(SIZES.length - 1, i + dir));
      next = liveClass.replace(re, `$1${bp}text-${SIZES[i]}`);
    } else if (dir > 0) {
      next = (liveClass + ` ${bp}text-lg`).trim();
    } else return;
    applyLive(next.replace(/\s+/g, " ").trim());
  }

  // 色（文字色/背景色）を arbitrary hex で設定。同プロパティの既存色ユーティリティを除去して付与。
  // kind = "text" | "bg"。bp 対応。
  function setColor(kind, hex) {
    const p = reEsc(bp);
    // 同 bp・同プロパティの色クラスを除去: arbitrary [#..] / CSS変数 (--..) / 名前付き color-shade。
    // ※ text-<size> / text-left 等（数字シェード無し）は温存される。
    const strip = new RegExp(
      `(^|\\s)${p}${kind}-(\\[#[0-9a-fA-F]{3,8}\\]|\\(--[^)]+\\)|[a-z]+-\\d{2,3})(?=\\s|$)`, "g");
    const cleaned = liveClass.replace(strip, " ").replace(/\s+/g, " ").trim();
    applyLive((cleaned + ` ${bp}${kind}-[${hex}]`).trim());
  }

  function rgbToHex(rgb) {
    const m = (rgb || "").match(/\d+/g);
    if (!m || m.length < 3) return "#000000";
    return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  }

  async function commitStyle() {
    if (!selected) return;
    if (liveClass === sourceClass) { toast("変更なし"); return; }
    try {
      const res = await fetch(`${ORIGIN}/apply-style`, {
        method: "POST",
        headers: POST_HEADERS,
        body: JSON.stringify({
          route: selected.route, oldClassName: sourceClass, newClassName: liveClass,
          selector: selected.selector, text: selected.text,
        }),
      });
      const j = await res.json();
      if (j.ok) {
        toast(`反映 → ${j.file ?? "noop"}`);
        sourceClass = liveClass;
        selected.classes = liveClass;
        // HMR がノードを作り直すので selector で取り直す
        setTimeout(() => { const fresh = document.querySelector(selected.selector); if (fresh) selectedEl = fresh; }, 1200);
      } else if (j.reason === "ambiguous") {
        toast(`同じclassが${j.count}箇所。Claudeに頼んで`, "#f59e0b");
      } else if (j.reason === "not-found") {
        toast("ソース未特定(動的class?)。Claudeに頼んで", "#f59e0b");
      } else {
        toast(`失敗: ${j.reason || j.error}`, "#dc2626");
      }
    } catch (err) {
      toast(`失敗: ${err.message}（daemon 起動中？）`, "#dc2626");
    }
  }

  // ---- パネル描画 -------------------------------------------------------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const SIDE_OPTS = `
    <option value="">全</option><option value="x">左右</option><option value="y">上下</option>
    <option value="t">上</option><option value="r">右</option><option value="b">下</option><option value="l">左</option>`;

  function renderPanel() {
    const sel = selected;
    const cs = sel && selectedEl && selectedEl.isConnected ? getComputedStyle(selectedEl) : null;
    const textHex = rgbToHex(cs && cs.color);
    const bgHex = rgbToHex(cs && cs.backgroundColor);
    const list = pending.map((p, i) =>
      `<li><span class="t">&lt;${esc(p.payload.tag)}&gt; ${esc((p.payload.text || "").slice(0, 24) || p.payload.classes.slice(0, 24))} — ${esc(p.prompt.slice(0, 30))}</span><span class="x" data-i="${i}">✕</span></li>`
    ).join("");

    $panel.innerHTML = `
      <h4>🎯 web-ui-bridge</h4>
      ${sel ? `
        <div class="meta">
          <b>&lt;${esc(sel.tag)}&gt;</b>${sel.component ? ` · ${esc(sel.component)}` : ""} · <b>${esc(sel.route)}</b>
        </div>
        <div class="sec">
          <div class="sec-h">直接調整（実コードに即反映）</div>
          <div class="ctl"><label>画面幅 bp</label>
            <span class="seg bpseg">
              <button data-bp="" class="${bp===""?"on":""}">全</button>
              <button data-bp="sm:" class="${bp==="sm:"?"on":""}">sm</button>
              <button data-bp="md:" class="${bp==="md:"?"on":""}">md</button>
              <button data-bp="lg:" class="${bp==="lg:"?"on":""}">lg</button>
              <button data-bp="xl:" class="${bp==="xl:"?"on":""}">xl</button>
            </span></div>
          <div class="ctl"><label>余白 margin</label><select class="m-side">${SIDE_OPTS}</select>
            <span class="step"><button data-act="m-">−</button><button data-act="m+">＋</button></span></div>
          <div class="ctl"><label>詰め padding</label><select class="p-side">${SIDE_OPTS}</select>
            <span class="step"><button data-act="p-">−</button><button data-act="p+">＋</button></span></div>
          <div class="ctl"><label>サイズ text</label>
            <span class="step"><button data-size="-1">−</button><button data-size="1">＋</button></span></div>
          <div class="ctl"><label>揃え align</label>
            <span class="seg"><button data-align="left">左</button><button data-align="center">中</button><button data-align="right">右</button></span></div>
          <div class="ctl"><label>色 文字/背景</label>
            <input type="color" class="c-text" value="${textHex}" title="文字色">
            <input type="color" class="c-bg" value="${bgHex}" title="背景色"></div>
          <textarea class="cls" spellcheck="false">${esc(liveClass)}</textarea>
          <div class="row"><button class="act apply">適用</button><button class="act reset">戻す</button></div>
        </div>
        <div class="sec">
          <div class="sec-h">Claudeに頼む（構造・文言・複雑な調整）</div>
          <textarea placeholder="この要素への指示（例: 2行に分けて、画像と左右入れ替えて）"></textarea>
          <div class="row"><button class="act add">キューに追加</button></div>
        </div>
      ` : `<p class="hint">🎯 を押して要素をクリックで選択</p>`}
      ${pending.length ? `<p class="hint">溜めた指示: ${pending.length} 件</p><ul>${list}</ul>
        <div class="row"><button class="act send">Claudeへ送る (${pending.length})</button></div>` : ""}
    `;

    if (!sel) return;

    // 直接調整の配線
    const sideOf = (s) => $panel.querySelector(s).value;
    // ブレークポイント切替（以降の余白/サイズ/揃え/色がこの bp に効く）
    $panel.querySelectorAll(".bpseg button").forEach((b) => {
      b.onclick = () => { bp = b.dataset.bp; renderPanel(); };
    });
    $panel.querySelectorAll(".step button[data-act]").forEach((b) => {
      b.onclick = () => {
        const act = b.dataset.act; // m+ / m- / p+ / p-
        const kind = act[0], dir = act[1] === "+" ? 1 : -1;
        stepSpacing(bp + kind + sideOf(kind === "m" ? ".m-side" : ".p-side"), dir);
      };
    });
    $panel.querySelectorAll(".step button[data-size]").forEach((b) => {
      b.onclick = () => stepSize(Number(b.dataset.size));
    });
    $panel.querySelectorAll(".seg button[data-align]").forEach((b) => {
      b.onclick = () => setAlign(b.dataset.align);
    });
    $panel.querySelector(".c-text").oninput = (e) => setColor("text", e.target.value);
    $panel.querySelector(".c-bg").oninput = (e) => setColor("bg", e.target.value);
    const $cls = $panel.querySelector(".cls");
    $cls.oninput = (e) => {
      liveClass = e.target.value;
      if (selectedEl && selectedEl.isConnected) selectedEl.setAttribute("class", liveClass);
      highlightSelected();
    };
    $panel.querySelector(".apply").onclick = commitStyle;
    $panel.querySelector(".reset").onclick = () => applyLive(sourceClass);

    // Claude 依頼の配線
    const $ta = $panel.querySelector(".sec:nth-of-type(2) textarea");
    const $add = $panel.querySelector(".add");
    if ($add) $add.onclick = () => {
      const prompt = ($ta.value || "").trim();
      if (!prompt) { toast("指示を入力してください", "#dc2626"); return; }
      pending.push({ payload: selected, prompt });
      renderPanel();
    };
    $panel.querySelectorAll(".x").forEach((x) => {
      x.onclick = () => { pending.splice(Number(x.dataset.i), 1); renderPanel(); };
    });
    const $send = $panel.querySelector(".send");
    if ($send) $send.onclick = send;
  }

  function openPanel() { $panel.classList.add("show"); renderPanel(); }
  function closePanel() {
    $panel.classList.remove("show");
    selected = null; selectedEl = null;
    hideHighlight();
  }

  async function send() {
    if (!pending.length) return;
    const items = pending.map((p) => ({ ...p.payload, prompt: p.prompt }));
    try {
      const res = await fetch(`${ORIGIN}/enqueue`, {
        method: "POST",
        headers: POST_HEADERS,
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "enqueue failed");
      pending.length = 0;
      selected = null;
      renderPanel();
      toast(`${json.ids.length} 件を Claude のキューへ送りました`);
    } catch (err) {
      toast(`送信失敗: ${err.message}（daemon 起動中？）`, "#dc2626");
    }
  }

  // ---- Phase C: ドラッグ並べ替え（決定的・daemon が AST で確定） ----------
  function setReordering(on) {
    reordering = on;
    $fab2.classList.toggle("on", on);
    $fab2.textContent = on ? "✕" : "⇅";
    if (on) { setInspecting(false); closePanel(); toast("要素をドラッグして兄弟の上にドロップ"); }
    else { dragEl2 = null; dropTarget = null; $dropline.style.display = "none"; $hl.classList.remove("drag"); hideHighlight(); }
  }

  function showDropline(target, pos) {
    const r = target.getBoundingClientRect();
    $dropline.style.display = "block";
    $dropline.style.left = r.left + "px";
    $dropline.style.width = r.width + "px";
    $dropline.style.top = (pos === "before" ? r.top - 1 : r.bottom - 1) + "px";
  }

  async function doReorder(dragEl, target, pos) {
    const dragClass = dragEl.getAttribute("class");
    const targetClass = target.getAttribute("class");
    if (!dragClass || !targetClass) { toast("class が無く並べ替え不可（Claudeに頼んで）", "#f59e0b"); return; }
    try {
      const res = await fetch(`${ORIGIN}/reorder`, {
        method: "POST", headers: POST_HEADERS,
        body: JSON.stringify({ route: location.pathname, dragClass, targetClass, position: pos }),
      });
      const j = await res.json();
      if (j.ok && !j.noop) toast(`並べ替え反映 → ${j.file}`);
      else if (j.ok) toast("変更なし");
      else if (j.reason === "ambiguous") toast("同じclassが複数。Claudeに頼んで", "#f59e0b");
      else if (j.reason === "not-siblings") toast("同じ親の兄弟同士でのみ並べ替え可", "#f59e0b");
      else if (j.reason === "not-found") toast("ソース未特定(動的class?)。Claudeに頼んで", "#f59e0b");
      else toast(`失敗: ${j.reason || j.error}`, "#dc2626");
    } catch (err) { toast(`失敗: ${err.message}`, "#dc2626"); }
  }

  // ---- イベント ---------------------------------------------------------
  $fab.onclick = () => {
    if (reordering) setReordering(false);
    if (inspecting) { setInspecting(false); }
    else { setInspecting(true); openPanel(); }
  };
  $fab2.onclick = () => setReordering(!reordering);

  // 並べ替え: mousedown で掴む / mousemove でドロップ位置 / mouseup で確定
  document.addEventListener("mousedown", (e) => {
    if (!reordering || isOurs(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    dragEl2 = e.target;
    showHighlight(dragEl2);
    $hl.classList.add("drag");
  }, true);

  document.addEventListener("mousemove", (e) => {
    if (!reordering || !dragEl2) return;
    const el = e.target;
    if (isOurs(el) || el === dragEl2) { $dropline.style.display = "none"; dropTarget = null; return; }
    const r = el.getBoundingClientRect();
    dropPos = (e.clientY < r.top + r.height / 2) ? "before" : "after";
    dropTarget = el;
    showDropline(el, dropPos);
  }, true);

  document.addEventListener("mouseup", (e) => {
    if (!reordering || !dragEl2) return;
    e.preventDefault();
    if (dropTarget && dropTarget !== dragEl2) doReorder(dragEl2, dropTarget, dropPos);
    dragEl2 = null; dropTarget = null;
    $dropline.style.display = "none"; $hl.classList.remove("drag"); hideHighlight();
  }, true);

  document.addEventListener("mousemove", (e) => {
    if (!inspecting) return;
    const el = e.target;
    if (isOurs(el)) { hideHighlight(); return; }
    hovered = el;
    showHighlight(el);
  }, true);

  document.addEventListener("click", (e) => {
    if (!inspecting) return;
    if (isOurs(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    selectedEl = e.target;
    selected = collect(e.target);
    sourceClass = selected.classes;
    liveClass = selected.classes;
    setInspecting(false);
    openPanel();
    highlightSelected(); // 選択中の要素を出しっぱなしでハイライト
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (reordering) setReordering(false);
      else if (inspecting) setInspecting(false);
      else closePanel();
    }
  });

  window.addEventListener("scroll", () => {
    if (inspecting && hovered) showHighlight(hovered);
    else if (selectedEl && selected) highlightSelected();
  }, true);

  console.log("[web-ui-bridge] overlay loaded →", ORIGIN);
})();
