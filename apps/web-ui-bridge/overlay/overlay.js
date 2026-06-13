/* web-ui-bridge overlay — 動いている自分のサイトに dev 限定で注入する自己完結スクリプト。
 *
 * できること:
 *   - 🎯 ボタンで「選択モード」に入る
 *   - 要素ホバーでハイライト＋ラベル、クリックで選択
 *   - [直接調整] 余白/詰め/揃え/className をその場でいじり、実ソースへ即書き戻し（Phase B・Claude 不介在）
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
  const HOST_ID = "web-ui-bridge-root";

  // ---- 状態 -------------------------------------------------------------
  let inspecting = false;
  let hovered = null;
  let selected = null;    // 現在編集中の要素の payload スナップショット
  let selectedEl = null;  // その DOM ノード（ライブプレビュー用）
  let sourceClass = "";   // 確定済み（=ソースと一致）の className 基準
  let liveClass = "";     // 編集中の className（プレビュー反映済み）
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
      .cls { width: 100%; background: #1e293b; color: #93c5fd; border: 1px solid #334155; border-radius: 6px;
             padding: 7px; font-size: 11px; font-family: ui-monospace, monospace; resize: vertical; min-height: 48px; }
      .apply { background: #2563eb; color: #fff; }
      .reset { background: #334155; color: #cbd5e1; flex: none; width: 64px; }
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

  // ---- Phase B: スタイル直接調整 ----------------------------------------
  const SCALE = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

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
    const cleaned = liveClass.replace(/(^|\s)text-(left|center|right|justify)(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();
    applyLive((cleaned + ` text-${val}`).trim());
  }

  async function commitStyle() {
    if (!selected) return;
    if (liveClass === sourceClass) { toast("変更なし"); return; }
    try {
      const res = await fetch(`${ORIGIN}/apply-style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          <div class="ctl"><label>余白 margin</label><select class="m-side">${SIDE_OPTS}</select>
            <span class="step"><button data-act="m-">−</button><button data-act="m+">＋</button></span></div>
          <div class="ctl"><label>詰め padding</label><select class="p-side">${SIDE_OPTS}</select>
            <span class="step"><button data-act="p-">−</button><button data-act="p+">＋</button></span></div>
          <div class="ctl"><label>揃え align</label>
            <span class="seg"><button data-align="left">左</button><button data-align="center">中</button><button data-align="right">右</button></span></div>
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
    $panel.querySelectorAll(".step button").forEach((b) => {
      b.onclick = () => {
        const act = b.dataset.act; // m+ / m- / p+ / p-
        const kind = act[0], dir = act[1] === "+" ? 1 : -1;
        stepSpacing(kind + sideOf(kind === "m" ? ".m-side" : ".p-side"), dir);
      };
    });
    $panel.querySelectorAll(".seg button").forEach((b) => {
      b.onclick = () => setAlign(b.dataset.align);
    });
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
      if (inspecting) setInspecting(false);
      else closePanel();
    }
  });

  window.addEventListener("scroll", () => {
    if (inspecting && hovered) showHighlight(hovered);
    else if (selectedEl && selected) highlightSelected();
  }, true);

  console.log("[web-ui-bridge] overlay loaded →", ORIGIN);
})();
