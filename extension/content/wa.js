// WhatsApp Web DOM helpers. Every lookup tries several selectors because WhatsApp changes its markup.
(function () {
  const W = window.WABS;
  const wa = (W.wa = {});

  const SEL = {
    composer: [
      'footer div[contenteditable="true"][role="textbox"]',
      'footer [contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][data-tab="10"]',
      'footer div[contenteditable="true"]',
    ],
    search: [
      '[data-testid="chat-list-search"]',
      'div[contenteditable="true"][data-tab="3"]',
      '#side div[contenteditable="true"][role="textbox"]',
      '#side div[contenteditable="true"]',
    ],
    send: [
      'footer button[aria-label="Send"]',
      'footer [data-testid="send"]',
      'footer span[data-icon="send"]',
      'footer [aria-label="Send"]',
    ],
    attach: [
      '[data-testid="clip"]',
      'footer span[data-icon="plus"]',
      'footer span[data-icon="clip"]',
      'footer [aria-label="Attach"]',
      'footer [title="Attach"]',
    ],
    mediaSend: [
      '[data-testid="media-caption-send"]',
      'div[role="dialog"] [aria-label="Send"]',
      'div[role="dialog"] span[data-icon="send"]',
      '[aria-label="Send"]',
      'span[data-icon="send"]',
    ],
    pane: ["#pane-side", '[data-testid="chat-list"]'],
    header: ["#main header span[title]", "header span[title]"],
  };
  wa.SEL = SEL;

  function first(list, root) {
    for (const s of list) {
      const el = (root || document).querySelector(s);
      if (el) return el;
    }
    return null;
  }
  wa.first = first;
  const clickable = (el) => (el ? el.closest('button,[role="button"]') || el : null);

  wa.waitFor = async (fn, timeout = 15000, step = 250) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      let v;
      try { v = fn(); } catch (e) { v = null; }
      if (v) return v;
      await W.sleep(step);
    }
    return null;
  };

  wa.isLoggedIn = () => !!(first(SEL.pane) || document.querySelector("#side"));
  wa.isQrScreen = () => !!document.querySelector('canvas[aria-label*="QR"], [data-ref]');
  wa.composer = () => {
    for (const sel of SEL.composer) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el; // must be visible (a chat is open)
    }
    return null;
  };
  wa.composerText = () => {
    const c = wa.composer();
    return c ? (c.innerText || c.textContent || "").replace(/\u200b/g, "").trim() : "";
  };

  wa.click = (el) => {
    const t = clickable(el);
    if (!t) return false;
    t.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    t.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    t.click();
    return true;
  };

  // Put text in a contenteditable the way a paste would, falling back to execCommand.
  wa.typeInto = async (el, text) => {
    el.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    await W.sleep(80);
    let ok = false;
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      await W.sleep(150);
      ok = (el.innerText || el.textContent || "").trim().length > 0;
    } catch (e) {}
    if (!ok) {
      el.focus();
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) document.execCommand("insertLineBreak", false, null);
        if (lines[i]) document.execCommand("insertText", false, lines[i]);
      }
      await W.sleep(150);
    }
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  };

  wa.pressSend = () => {
    const btn = first(SEL.send);
    if (btn) return wa.click(btn);
    const c = wa.composer();
    if (!c) return false;
    c.focus();
    ["keydown", "keypress", "keyup"].forEach((t) =>
      c.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }))
    );
    return true;
  };

  // "Phone number shared via url is invalid" style popup.
  wa.invalidNumberDialog = () => {
    const dlgs = document.querySelectorAll('div[role="dialog"], [data-animate-modal-popup="true"]');
    for (const d of dlgs) {
      if (/invalid|not on whatsapp|isn.t on whatsapp|not registered/i.test(d.innerText || "")) return d;
    }
    return null;
  };
  wa.dismissDialog = (d) => {
    const b = d && d.querySelector("button,[role=button]");
    if (b) b.click();
  };

  wa.headerTitle = () => {
    const h = first(SEL.header);
    return h ? (h.getAttribute("title") || h.textContent || "").trim() : "";
  };

  // ---- groups / chats by name ----
  const norm = (s) => String(s || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  wa.norm = norm;

  wa.clearSearch = async () => {
    const s = first(SEL.search);
    if (!s) return;
    s.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    s.dispatchEvent(new InputEvent("input", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
    await W.sleep(200);
  };

  // Search the chat list and open the chat. Returns {ok, title} or {ok:false, error}.
  wa.openChatByName = async (name, allowPartial) => {
    const s = await wa.waitFor(() => first(SEL.search), 15000);
    if (!s) return { ok: false, error: "Search box not found. Is WhatsApp Web fully loaded?" };
    await wa.typeInto(s, name);
    await W.sleep(1200);
    const pane = first(SEL.pane) || document;
    // wait for results to settle
    let titles = [];
    for (let i = 0; i < 12; i++) {
      titles = [...pane.querySelectorAll("span[title]")].filter((e) => e.closest('[role="listitem"],[role="row"],[data-testid="cell-frame-container"],div[tabindex]'));
      if (titles.length) break;
      await W.sleep(400);
    }
    const target = norm(name);
    let exact = titles.filter((e) => norm(e.getAttribute("title")) === target);
    let pick = exact[0];
    let how = "exact";
    if (!pick && allowPartial) {
      const part = titles.filter((e) => norm(e.getAttribute("title")).includes(target));
      if (part.length === 1) { pick = part[0]; how = "partial"; }
      else if (part.length > 1) { await wa.clearSearch(); return { ok: false, error: part.length + " groups match partially. Use the exact name." }; }
    }
    if (!pick) { await wa.clearSearch(); return { ok: false, error: "No chat named exactly \"" + name + "\" found" }; }
    if (exact.length > 1) { await wa.clearSearch(); return { ok: false, error: exact.length + " chats have this exact name. Rename one to avoid sending to the wrong group." }; }
    const row = pick.closest('[role="listitem"],[role="row"],[data-testid="cell-frame-container"]') || pick.closest("div[tabindex]") || pick;
    wa.click(row);
    const opened = await wa.waitFor(() => norm(wa.headerTitle()) === norm(pick.getAttribute("title")) && wa.composer(), 10000);
    if (!opened) return { ok: false, error: "Chat did not open" };
    return { ok: true, title: wa.headerTitle(), how };
  };

  // ---- attachments (experimental) ----
  wa.attachImage = async (img, caption) => {
    const clip = first(SEL.attach);
    if (!clip) return { ok: false, error: "Attach button not found" };
    wa.click(clip);
    const input = await wa.waitFor(() => document.querySelector('input[type="file"][accept*="image"]'), 5000);
    if (!input) return { ok: false, error: "Photo input not found" };
    const blob = await (await fetch(img.dataUrl)).blob();
    const file = new File([blob], img.name, { type: img.type || blob.type });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const cap = await wa.waitFor(() => document.querySelector('[data-testid="media-caption-input"], div[role="dialog"] [contenteditable="true"], div[aria-label*="aption"][contenteditable="true"]'), 12000);
    if (!cap) return { ok: false, error: "Image preview did not open" };
    if (caption) await wa.typeInto(cap, caption);
    await W.sleep(600);
    const sendBtn = first(SEL.mediaSend);
    if (!sendBtn) return { ok: false, error: "Send button not found in image preview" };
    return { ok: true, sendBtn };
  };

  // ---- fallback export from the visible list when the in-memory store is unavailable ----
  wa.scanChatListDOM = async (onProgress) => {
    const pane = first(SEL.pane);
    if (!pane) throw new Error("Chat list not found");
    const seen = new Map();
    pane.scrollTop = 0;
    await W.sleep(400);
    let stable = 0, last = -1;
    for (let i = 0; i < 400 && stable < 4; i++) {
      pane.querySelectorAll("span[title]").forEach((e) => {
        if (!e.closest('[role="listitem"],[role="row"],[data-testid="cell-frame-container"],div[tabindex]')) return;
        const t = (e.getAttribute("title") || "").trim();
        if (t && !seen.has(t)) seen.set(t, { id: "", type: "chat", name: t, members: "", archived: false });
      });
      if (onProgress) onProgress(seen.size);
      const before = pane.scrollTop;
      pane.scrollTop = before + Math.max(200, pane.clientHeight * 0.8);
      await W.sleep(350);
      if (pane.scrollTop === before) stable++;
      else stable = 0;
      if (seen.size === last && pane.scrollTop === before) stable++;
      last = seen.size;
    }
    pane.scrollTop = 0;
    return [...seen.values()];
  };

  // ---- bridge client ----
  let rid = 0;
  wa.bridge = (cmd, arg, timeout = 8000) =>
    new Promise((resolve, reject) => {
      const id = ++rid;
      const t = setTimeout(() => { window.removeEventListener("message", h); reject(new Error("bridge-timeout")); }, timeout);
      function h(ev) {
        if (ev.source !== window || !ev.data || ev.data.source !== "WABS_RES" || ev.data.id !== id) return;
        clearTimeout(t);
        window.removeEventListener("message", h);
        ev.data.ok ? resolve(ev.data.data) : reject(new Error(ev.data.error));
      }
      window.addEventListener("message", h);
      window.postMessage({ source: "WABS_REQ", id, cmd, arg }, "*");
    });
})();
