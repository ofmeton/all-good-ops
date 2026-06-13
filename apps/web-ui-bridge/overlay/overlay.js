/* web-ui-bridge overlay — 動いている自分のサイトに dev 限定で注入する自己完結スクリプト。
 *
 * できること:
 *   - 🎯 ボタンで「選択モード」に入る
 *   - 要素ホバーでハイライト＋ラベル、クリックで選択
 *   - 選んだ要素に自然文プロンプトを書いてキューに溜める
 *   - 「Claudeへ送る」で daemon(/enqueue) に POST → .claude-ui-queue.jsonl へ
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
  const HOST_ID = "web-ui-bridge-root";

  // ---- 状態 -------------------------------------------------------------
  let inspecting = false;
  let hovered = null;
  let selected = null; // 現在編集中の要素
  const pending = []; // {payload, prompt}

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
    </style>
    <div class="hl"></div>
    <div class="label"></div>
    <button class="fab" title="要素を選択 (Esc で解除)">🎯</button>
    <div class="panel"></div>
    <div class="toast"></div>
  `;

  const $hl = root.querySelector(".hl");
  const $label = root.querySelector(".label");
  const $fab = root.querySelector(".fab");
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

  // ---- パネル描画 -------------------------------------------------------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function renderPanel() {
    const sel = selected;
    const list = pending.map((p, i) =>
      `<li><span class="t">&lt;${esc(p.payload.tag)}&gt; ${esc((p.payload.text || "").slice(0, 24) || p.payload.classes.slice(0, 24))} — ${esc(p.prompt.slice(0, 30))}</span><span class="x" data-i="${i}">✕</span></li>`
    ).join("");

    $panel.innerHTML = `
      <h4>🎯 web-ui-bridge</h4>
      ${sel ? `
        <div class="meta">
          <b>&lt;${esc(sel.tag)}&gt;</b>${sel.component ? ` · ${esc(sel.component)}` : ""} · <b>${esc(sel.route)}</b><br>
          ${sel.text ? `“${esc(sel.text.slice(0, 60))}”<br>` : ""}
          <span style="color:#475569">${esc(sel.classes.slice(0, 80))}</span>
        </div>
        <textarea placeholder="この要素への指示（例: 2行に分けて余白を広く）"></textarea>
        <div class="row">
          <button class="act add">キューに追加</button>
        </div>
      ` : `<p class="hint">🎯 を押して要素をクリックで選択</p>`}
      <p class="hint">溜めた指示: ${pending.length} 件</p>
      <ul>${list}</ul>
      ${pending.length ? `<div class="row"><button class="act send">Claudeへ送る (${pending.length})</button></div>` : ""}
    `;

    const $ta = $panel.querySelector("textarea");
    if ($ta) $ta.focus();
    const $add = $panel.querySelector(".add");
    if ($add) $add.onclick = () => {
      const prompt = ($ta.value || "").trim();
      if (!prompt) { toast("指示を入力してください", "#dc2626"); return; }
      pending.push({ payload: selected, prompt });
      selected = null;
      renderPanel();
      setInspecting(true);
    };
    $panel.querySelectorAll(".x").forEach((x) => {
      x.onclick = () => { pending.splice(Number(x.dataset.i), 1); renderPanel(); };
    });
    const $send = $panel.querySelector(".send");
    if ($send) $send.onclick = send;
  }

  function openPanel() { $panel.classList.add("show"); renderPanel(); }
  function closePanel() { $panel.classList.remove("show"); }

  async function send() {
    if (!pending.length) return;
    const items = pending.map((p) => ({ ...p.payload, prompt: p.prompt }));
    try {
      const res = await fetch(`${ORIGIN}/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // ---- イベント ---------------------------------------------------------
  $fab.onclick = () => {
    if (inspecting) { setInspecting(false); }
    else { setInspecting(true); openPanel(); }
  };

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
    selected = collect(e.target);
    setInspecting(false);
    openPanel();
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (inspecting) setInspecting(false);
      else closePanel();
    }
  });

  window.addEventListener("scroll", () => { if (inspecting && hovered) showHighlight(hovered); }, true);

  console.log("[web-ui-bridge] overlay loaded →", ORIGIN);
})();
