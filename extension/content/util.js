// Shared helpers (isolated world, shared by all content scripts below).
(function () {
  const W = (window.WABS = window.WABS || {});

  W.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  W.rand = (min, max) => Math.round(min + Math.random() * Math.max(0, max - min));

  // Split on commas, semicolons or new lines. Keeps order, trims, drops empties.
  W.parseList = (text) =>
    String(text || "")
      .split(/[,;\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  // Returns digits-only international number, or null if it does not look valid.
  W.normalizeNumber = (raw, defaultCC) => {
    let s = String(raw || "").trim();
    if (!s) return null;
    const hadPlus = s.startsWith("+");
    let d = s.replace(/\D/g, "");
    if (!d) return null;
    if (!hadPlus && d.startsWith("00")) d = d.slice(2);
    else if (!hadPlus && defaultCC) {
      const cc = String(defaultCC).replace(/\D/g, "");
      if (cc) {
        if (d.startsWith("0")) d = d.replace(/^0+/, "");
        if (d.length <= 10) d = cc + d; // local number without country code
      }
    }
    if (d.length < 8 || d.length > 15) return null;
    return d;
  };

  W.firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

  // {name}, {first_name}, {number}, {anything_from_csv}. {name|there} gives a fallback.
  W.renderTemplate = (tpl, vars) => {
    const v = {};
    Object.keys(vars || {}).forEach((k) => (v[k.toLowerCase()] = vars[k]));
    if (v.name && !v.first_name) v.first_name = W.firstName(v.name);
    return String(tpl || "").replace(/\{\s*([\w ]+?)\s*(?:\|([^}]*))?\}/g, (m, key, fb) => {
      const val = v[key.trim().toLowerCase().replace(/ /g, "_")];
      if (val !== undefined && String(val).trim() !== "") return String(val);
      return fb !== undefined ? fb : "";
    });
  };

  W.templateVars = (tpl) => {
    const out = new Set();
    String(tpl || "").replace(/\{\s*([\w ]+?)\s*(?:\|[^}]*)?\}/g, (m, k) => out.add(k.trim().toLowerCase().replace(/ /g, "_")));
    return [...out];
  };

  W.parseCSV = (text) => {
    const rows = [];
    let row = [], cur = "", q = false;
    text = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === "," || c === ";" || c === "\t") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.some((x) => x.trim() !== "")) rows.push(row);
        row = [];
      } else cur += c;
    }
    row.push(cur);
    if (row.some((x) => x.trim() !== "")) rows.push(row);
    return rows;
  };

  W.toCSV = (rows) =>
    rows
      .map((r) =>
        r
          .map((c) => {
            let s = c === null || c === undefined ? "" : String(c);
            // stop spreadsheet formula injection
            if (/^[=+\-@]/.test(s) && !/^\+?\d[\d\s-]*$/.test(s)) s = "'" + s;
            return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          })
          .join(",")
      )
      .join("\r\n");

  W.download = (filename, text, mime) => {
    const blob = new Blob(["\uFEFF" + text], { type: mime || "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  };

  // Turn CSV rows into recipients: phone column found by header name, rest become variables.
  W.csvToRecipients = (rows) => {
    if (!rows.length) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^\w]+/g, "_"));
    const looksHeader = header.some((h) => /^(phone|mobile|number|whatsapp|contact|name)/.test(h));
    const body = looksHeader ? rows.slice(1) : rows;
    let pi = looksHeader ? header.findIndex((h) => /(phone|mobile|number|whatsapp|contact_no)/.test(h)) : 0;
    if (pi < 0) pi = 0;
    return body.map((r) => {
      const vars = {};
      if (looksHeader) header.forEach((h, i) => { if (i !== pi && h) vars[h] = (r[i] || "").trim(); });
      else if (r[1] !== undefined) vars.name = (r[1] || "").trim();
      return { raw: (r[pi] || "").trim(), vars };
    });
  };

  W.store = {
    get: (k) => new Promise((res) => chrome.storage.local.get(k, (o) => res(o ? o[k] : undefined))),
    set: (k, v) => new Promise((res) => chrome.storage.local.set({ [k]: v }, res)),
    del: (k) => new Promise((res) => chrome.storage.local.remove(k, res)),
  };

  W.fmtDuration = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + "h " : "") + (m || h ? m + "m " : "") + (!h ? s + "s" : "");
  };
})();
