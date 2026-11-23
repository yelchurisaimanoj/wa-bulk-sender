// The in-page panel (shadow DOM so WhatsApp's styles cannot break it).
(function () {
  const W = window.WABS;
  if (W.panelLoaded) return;
  W.panelLoaded = true;

  const CSS = `
  :host{all:initial}
  *{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .fab{position:fixed;right:14px;bottom:90px;width:48px;height:48px;border-radius:50%;background:#128c7e;color:#fff;border:0;font-size:22px;cursor:pointer;z-index:2147483646;box-shadow:0 2px 8px rgba(0,0,0,.35)}
  .panel{position:fixed;top:0;right:0;height:100vh;width:400px;max-width:100vw;background:#fff;color:#111;z-index:2147483647;box-shadow:-4px 0 18px rgba(0,0,0,.3);display:none;flex-direction:column;font-size:13px}
  .panel.open{display:flex}
  header{background:#075e54;color:#fff;padding:10px 12px;display:flex;align-items:center;justify-content:space-between}
  header b{font-size:15px}
  header button{background:none;border:0;color:#fff;font-size:18px;cursor:pointer}
  nav{display:flex;border-bottom:1px solid #ddd;background:#f0f2f5}
  nav button{flex:1;padding:9px 4px;border:0;background:none;cursor:pointer;font-size:13px;border-bottom:3px solid transparent}
  nav button.on{border-bottom-color:#128c7e;font-weight:600;color:#075e54}
  main{overflow:auto;padding:12px;flex:1}
  section{display:none}section.on{display:block}
  label{display:block;font-weight:600;margin:10px 0 3px}
  small,.hint{color:#667781;font-size:11.5px}
  textarea,input[type=text],input[type=number],input[type=datetime-local],select{width:100%;padding:7px;border:1px solid #c4ccd0;border-radius:6px;font-size:13px}
  textarea{resize:vertical;min-height:62px}
  .row{display:flex;gap:8px;align-items:center}.row>*{flex:1}
  .btn{padding:8px 12px;border:0;border-radius:6px;background:#128c7e;color:#fff;cursor:pointer;font-size:13px;font-weight:600}
  .btn.sec{background:#e9edef;color:#111}.btn.red{background:#c62828}.btn:disabled{opacity:.45;cursor:not-allowed}
  .btns{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
  .warn{background:#fff4e5;border:1px solid #f5c26b;border-radius:6px;padding:8px;font-size:12px;margin-bottom:8px}
  .ok{color:#1b7f3b}.bad{color:#c62828}
  .chips{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}
  .chip{background:#e7f5f3;border:1px solid #b9dfd9;border-radius:12px;padding:2px 8px;font-size:11.5px;cursor:pointer}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border-bottom:1px solid #eee;padding:4px;text-align:left;vertical-align:top;word-break:break-word}
  .bar{height:8px;background:#e9edef;border-radius:4px;overflow:hidden;margin:6px 0}.bar>div{height:100%;background:#25d366;width:0}
  .st-sent{color:#1b7f3b}.st-failed{color:#c62828}.st-unknown{color:#b26a00}.st-pending,.st-sending{color:#667781}
  .preview{background:#dcf8c6;border-radius:8px;padding:8px;white-space:pre-wrap;margin-top:4px;font-size:12.5px}
  .box{border:1px solid #e0e4e6;border-radius:8px;padding:8px;margin-top:10px}
  .scroll{max-height:240px;overflow:auto;border:1px solid #e0e4e6;border-radius:6px}
  `;

  const host = document.createElement("div");
  host.id = "wabs-host";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${CSS}</style>
  <button class="fab" id="fab" title="WA Bulk Sender">✉</button>
  <div class="panel" id="panel">
    <header><b>WA Bulk Sender</b><button id="close" title="Close">✕</button></header>
    <nav id="nav"><button data-t="send" class="on">Send</button><button data-t="groups">Groups</button><button data-t="lists">Lists</button><button data-t="help">Tips</button></nav>
    <main>
    <section id="t-send" class="on">
      <div class="warn">Bulk sending can get a WhatsApp number restricted. Message only people who expect to hear from you, keep batches small, and keep the delays on.</div>
      <label>Mobile numbers <small>(comma separated)</small></label>
      <textarea id="nums" placeholder="919876543210, 9876500001, +14155550123"></textarea>
      <div class="row"><div><small>Country code</small><input type="text" id="cc" value="91"></div>
      <div><small>Or import a CSV (phone, name, any columns)</small><input type="file" id="csv" accept=".csv,text/csv"></div></div>
      <div id="numinfo" class="hint"></div>
      <label>Group names <small>(comma separated, exact names)</small></label>
      <textarea id="grps" placeholder="Family, Clients Batch A"></textarea>
      <label style="font-weight:400"><input type="checkbox" id="partial"> Allow a partial name if it matches only one group</label>
      <label>Message</label>
      <div class="row"><select id="tplSel"><option value="">Saved templates...</option></select><button class="btn sec" id="tplSave" style="flex:0 0 auto">Save</button><button class="btn sec" id="tplDel" style="flex:0 0 auto">Delete</button></div>
      <textarea id="msg" style="min-height:110px" placeholder="Namaste {name|Sir/Madam}, ..."></textarea>
      <div class="chips" id="chips"></div>
      <small>{name}, {first_name}, {number} and any CSV column. Use {name|there} for a fallback when a name is empty. Groups get the same text, with name blank.</small>
      <div id="preview" class="preview" style="display:none"></div>
      <label>Image <small>(optional, sent with the message as caption, experimental)</small></label>
      <input type="file" id="img" accept="image/*">
      <div class="box">
        <b>Safety</b>
        <div class="row" style="margin-top:6px"><select id="preset"><option value="careful">Careful (15-40s, break every 20)</option><option value="normal" selected>Normal (8-20s, break every 30)</option><option value="fast">Fast (5-10s, risky)</option><option value="custom">Custom</option></select></div>
        <div class="row"><div><small>Min delay (s)</small><input type="number" id="minD" min="3" value="8"></div><div><small>Max delay (s)</small><input type="number" id="maxD" min="3" value="20"></div></div>
        <div class="row"><div><small>Break after N sends</small><input type="number" id="batch" min="0" value="30"></div><div><small>Break length (min)</small><input type="number" id="batchP" min="0" value="5"></div></div>
        <div class="row"><div><small>Max messages this run</small><input type="number" id="maxRun" min="1" value="50"></div><div><small>Start at (optional)</small><input type="datetime-local" id="startAt"></div></div>
      </div>
      <div class="btns"><button class="btn sec" id="dry">Preview list</button><button class="btn" id="start">Start sending</button></div>
      <div id="runbox" class="box" style="display:none">
        <div class="row"><b id="runTitle">Progress</b><span id="runCount" style="text-align:right"></span></div>
        <div class="bar"><div id="bar"></div></div>
        <div id="runNote" class="hint"></div><div id="countdown" class="hint"></div>
        <div class="btns"><button class="btn sec" id="pause">Pause</button><button class="btn sec" id="resume">Resume</button><button class="btn red" id="stop">Stop</button><button class="btn sec" id="retry">Retry failed</button><button class="btn sec" id="dlres">Download results</button><button class="btn sec" id="clr">Clear</button></div>
        <div class="scroll"><table id="log"></table></div>
      </div>
    </section>
    <section id="t-groups">
      <p class="hint">Lists every group, community and channel in your WhatsApp Web, so you can download them or pick groups to message.</p>
      <div class="btns"><button class="btn" id="loadG">Load groups & channels</button><button class="btn sec" id="dlCSV" disabled>Download CSV</button><button class="btn sec" id="dlJSON" disabled>Download JSON</button></div>
      <div id="gstatus" class="hint"></div>
      <div class="row"><input type="text" id="gfilter" placeholder="Filter by name"><select id="gtype"><option value="">All types</option><option value="group">Groups</option><option value="channel">Channels</option><option value="community">Communities</option><option value="chat">Chats</option></select></div>
      <div class="scroll" style="margin-top:6px"><table id="gtable"></table></div>
      <div class="btns"><button class="btn sec" id="gall">Select shown</button><button class="btn" id="gadd">Add selected groups to send list</button><button class="btn sec" id="gmem">Download members of selected</button></div>
    </section>
    <section id="t-lists">
      <label>Do not message <small>(numbers, comma separated. Always skipped)</small></label>
      <textarea id="skip" placeholder="919000000000"></textarea>
      <label>Saved recipient lists</label>
      <div class="row"><input type="text" id="listName" placeholder="List name, e.g. March reminders"><button class="btn sec" id="listSave" style="flex:0 0 auto">Save current</button></div>
      <div id="savedLists"></div>
    </section>
    <section id="t-help">
      <p><b>Staying safe</b></p>
      <ul><li>Start with 10 to 20 messages a day on a new setup.</li><li>Only message people who know you. Add an opt-out line like "Reply STOP to skip reminders".</li><li>If WhatsApp shows a warning, stop and wait a day.</li><li>Keep this WhatsApp Web tab open while a run is going. The phone must stay online.</li></ul>
      <p><b>How sending works</b><br>Numbers open one at a time through WhatsApp's own "click to chat" link. Groups are found by exact name in your chat list. Everything runs in your own browser. Nothing is uploaded anywhere.</p>
    </section>
    </main>
  </div>`;
  document.documentElement.appendChild(host);

  const $ = (id) => root.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let csvRecipients = []; // from import
  let imageData = null;
  let chats = [];

  // ---- open/close, tabs ----
  const setOpen = (o) => { $("panel").classList.toggle("open", o); W.store.set("panelOpen", o); };
  $("fab").onclick = () => setOpen(!$("panel").classList.contains("open"));
  $("close").onclick = () => setOpen(false);
  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === "WABS_TOGGLE") setOpen(m.open ? true : !$("panel").classList.contains("open"));
  });
  $("nav").onclick = (e) => {
    const t = e.target.dataset && e.target.dataset.t;
    if (!t) return;
    root.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b === e.target));
    root.querySelectorAll("main > section").forEach((s) => s.classList.toggle("on", s.id === "t-" + t));
  };

  // ---- presets ----
  const PRESETS = { careful: [15, 40, 20, 10], normal: [8, 20, 30, 5], fast: [5, 10, 40, 3] };
  $("preset").onchange = () => {
    const p = PRESETS[$("preset").value];
    if (!p) return;
    $("minD").value = p[0]; $("maxD").value = p[1]; $("batch").value = p[2]; $("batchP").value = p[3];
    persist();
  };
  ["minD", "maxD", "batch", "batchP"].forEach((id) => ($(id).oninput = () => { $("preset").value = "custom"; }));

  // ---- recipients ----
  async function skipSet() {
    return new Set(W.parseList($("skip").value).map((n) => W.normalizeNumber(n, $("cc").value)).filter(Boolean));
  }
  async function collectRecipients() {
    const cc = $("cc").value;
    const skip = await skipSet();
    const seen = new Set();
    const out = [], invalid = [], dupes = [], skipped = [];
    const add = (raw, vars) => {
      const n = W.normalizeNumber(raw, cc);
      if (!n) return invalid.push(raw);
      if (skip.has(n)) return skipped.push(n);
      if (seen.has(n)) return dupes.push(n);
      seen.add(n);
      out.push({ number: n, vars: Object.assign({}, vars, { number: n }) });
    };
    W.parseList($("nums").value).forEach((r) => add(r, {}));
    csvRecipients.forEach((r) => add(r.raw, r.vars));
    return { out, invalid, dupes, skipped };
  }
  async function refreshInfo() {
    const c = await collectRecipients();
    const g = W.parseList($("grps").value);
    $("numinfo").innerHTML = `<span class="ok">${c.out.length} valid</span>` +
      (c.invalid.length ? ` · <span class="bad">${c.invalid.length} invalid (${esc(c.invalid.slice(0, 3).join(", "))}${c.invalid.length > 3 ? "..." : ""})</span>` : "") +
      (c.dupes.length ? ` · ${c.dupes.length} duplicate${c.dupes.length > 1 ? "s" : ""} removed` : "") +
      (c.skipped.length ? ` · ${c.skipped.length} on do-not-message list` : "") +
      (csvRecipients.length ? ` · CSV rows: ${csvRecipients.length}` : "") + ` · ${g.length} group${g.length === 1 ? "" : "s"}`;
    renderChips();
    renderPreview(c);
  }
  function renderChips() {
    const base = ["name", "first_name", "number"];
    const extra = new Set();
    csvRecipients.forEach((r) => Object.keys(r.vars).forEach((k) => extra.add(k)));
    $("chips").innerHTML = [...new Set([...base, ...extra])].map((k) => `<span class="chip" data-v="${esc(k)}">{${esc(k)}}</span>`).join("");
  }
  $("chips").onclick = (e) => {
    const v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    const t = $("msg"); const s = t.selectionStart || t.value.length;
    t.value = t.value.slice(0, s) + "{" + v + "}" + t.value.slice(t.selectionEnd || s);
    t.focus(); t.dispatchEvent(new Event("input"));
  };
  function renderPreview(c) {
    const p = $("preview");
    if (!$("msg").value.trim()) { p.style.display = "none"; return; }
    const r = c && c.out[0];
    p.style.display = "block";
    p.textContent = W.renderTemplate($("msg").value, r ? r.vars : { name: "" });
  }
  $("csv").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    csvRecipients = W.csvToRecipients(W.parseCSV(await f.text()));
    refreshInfo(); persist();
  };
  $("img").onchange = (e) => {
    const f = e.target.files[0];
    if (!f) { imageData = null; return; }
    const r = new FileReader();
    r.onload = () => { imageData = { name: f.name, type: f.type, dataUrl: r.result }; };
    r.readAsDataURL(f);
  };

  // ---- persist draft ----
  const FIELDS = ["nums", "cc", "grps", "msg", "minD", "maxD", "batch", "batchP", "maxRun", "preset", "skip"];
  let pt;
  function persist() {
    clearTimeout(pt);
    pt = setTimeout(() => {
      const d = { partial: $("partial").checked, csv: csvRecipients };
      FIELDS.forEach((f) => (d[f] = $(f).value));
      W.store.set("draft", d);
    }, 300);
  }
  FIELDS.concat(["partial"]).forEach((f) => $(f).addEventListener("input", () => { persist(); refreshInfo(); }));
  $("partial").addEventListener("change", persist);

  // ---- templates & saved lists ----
  async function renderTemplates() {
    const t = (await W.store.get("templates")) || {};
    $("tplSel").innerHTML = '<option value="">Saved templates...</option>' + Object.keys(t).map((k) => `<option>${esc(k)}</option>`).join("");
  }
  $("tplSave").onclick = async () => {
    const name = prompt("Template name?");
    if (!name) return;
    const t = (await W.store.get("templates")) || {};
    t[name] = $("msg").value; await W.store.set("templates", t); renderTemplates();
  };
  $("tplDel").onclick = async () => {
    const n = $("tplSel").value; if (!n) return;
    const t = (await W.store.get("templates")) || {}; delete t[n]; await W.store.set("templates", t); renderTemplates();
  };
  $("tplSel").onchange = async () => {
    const t = (await W.store.get("templates")) || {};
    if (t[$("tplSel").value] !== undefined) { $("msg").value = t[$("tplSel").value]; persist(); refreshInfo(); }
  };
  async function renderLists() {
    const l = (await W.store.get("lists")) || {};
    const keys = Object.keys(l);
    $("savedLists").innerHTML = keys.length ? keys.map((k) => `<div class="box row"><span style="flex:3"><b>${esc(k)}</b><br><small>${l[k].nums.split(",").filter(Boolean).length + (l[k].csv || []).length} numbers, ${l[k].grps.split(",").filter(Boolean).length} groups</small></span><button class="btn sec" data-load="${esc(k)}">Load</button><button class="btn sec" data-del="${esc(k)}">Delete</button></div>`).join("") : '<p class="hint">No saved lists yet.</p>';
  }
  $("listSave").onclick = async () => {
    const n = $("listName").value.trim(); if (!n) return alert("Give the list a name first.");
    const l = (await W.store.get("lists")) || {};
    l[n] = { nums: $("nums").value, grps: $("grps").value, csv: csvRecipients };
    await W.store.set("lists", l); $("listName").value = ""; renderLists();
  };
  $("savedLists").onclick = async (e) => {
    const l = (await W.store.get("lists")) || {};
    const k = e.target.dataset.load || e.target.dataset.del;
    if (!k) return;
    if (e.target.dataset.load) { $("nums").value = l[k].nums; $("grps").value = l[k].grps; csvRecipients = l[k].csv || []; persist(); refreshInfo(); root.querySelector('nav [data-t="send"]').click(); }
    else { delete l[k]; await W.store.set("lists", l); renderLists(); }
  };

  // ---- build & start ----
  function cfg() {
    const n = (id, d) => { const v = parseInt($(id).value, 10); return isNaN(v) ? d : v; };
    let minD = Math.max(3, n("minD", 8)), maxD = Math.max(minD, n("maxD", 20));
    return { minDelay: minD, maxDelay: maxD, batchSize: n("batch", 0), batchPauseMin: n("batchP", 0), maxPerRun: Math.max(1, n("maxRun", 50)), partialGroups: $("partial").checked };
  }
  async function buildRun() {
    const tpl = $("msg").value;
    if (!tpl.trim()) { alert("Write a message first."); return null; }
    const c = await collectRecipients();
    const groups = W.parseList($("grps").value);
    if (!c.out.length && !groups.length) { alert("Add at least one valid number or group name."); return null; }
    const recipients = c.out.map((r) => Object.assign(r, { text: W.renderTemplate(tpl, r.vars) }));
    const dupGroups = [...new Set(groups)];
    const groupText = W.renderTemplate(tpl, {});
    return { recipients, groups: dupGroups, groupText, cfg: cfg(), image: imageData, invalid: c.invalid };
  }
  $("dry").onclick = async () => {
    const b = await buildRun(); if (!b) return;
    const est = (b.recipients.length + b.groups.length) * ((b.cfg.minDelay + b.cfg.maxDelay) / 2 + 6);
    const lines = b.recipients.slice(0, 50).map((r) => `${r.number}${r.vars.name ? " (" + r.vars.name + ")" : ""}`).concat(b.groups.map((g) => "Group: " + g));
    alert(`${b.recipients.length} numbers + ${b.groups.length} groups. About ${W.fmtDuration(est)}.\n\nFirst entries:\n${lines.slice(0, 15).join("\n")}\n\nFirst message:\n${(b.recipients[0] ? b.recipients[0].text : b.groupText)}`);
  };
  $("start").onclick = async () => {
    const existing = await W.store.get("run");
    if (existing && ["running", "paused", "scheduled"].includes(existing.status)) return alert("A run is already in progress. Stop or finish it first.");
    const b = await buildRun(); if (!b) return;
    const total = b.recipients.length + b.groups.length;
    const startAt = $("startAt").value ? new Date($("startAt").value).getTime() : 0;
    let warn = "";
    if (total > b.cfg.maxPerRun) warn += `\nOnly the first ${b.cfg.maxPerRun} will be sent now (max per run). You can resume later.`;
    if (total > 100) warn += "\nMore than 100 messages in one go raises the risk of a WhatsApp restriction.";
    if (b.cfg.minDelay < 5) warn += "\nVery short delays are risky.";
    if (!confirm(`Send to ${b.recipients.length} numbers and ${b.groups.length} groups?${warn}\n\nKeep this tab open until it finishes.`)) return;
    const run = W.runner.build({ recipients: b.recipients, groups: b.groups, groupText: b.groupText, cfg: b.cfg, image: b.image, startAt });
    await W.runner.start(run);
  };
  $("pause").onclick = () => W.runner.pause();
  $("resume").onclick = () => W.runner.resume();
  $("stop").onclick = () => confirm("Stop this run?") && W.runner.stop();
  $("retry").onclick = () => W.runner.retryFailed();
  $("clr").onclick = async () => { const r = await W.store.get("run"); if (r && ["running", "scheduled"].includes(r.status)) return alert("Stop the run first."); W.runner.clear(); };
  $("dlres").onclick = async () => {
    const r = await W.store.get("run"); if (!r) return;
    const rows = [["type", "target", "name", "status", "note", "time"]].concat(r.items.map((i) => [i.type, i.target, i.label, i.status, i.error, i.ts ? new Date(i.ts).toISOString() : ""]));
    W.download("wa-bulk-results-" + new Date().toISOString().slice(0, 10) + ".csv", W.toCSV(rows));
  };

  // ---- render run ----
  async function renderRun() {
    const r = await W.store.get("run");
    const box = $("runbox");
    if (!r) { box.style.display = "none"; return; }
    box.style.display = "block";
    const done = r.items.filter((i) => ["sent", "failed", "unknown"].includes(i.status)).length;
    const sent = r.items.filter((i) => i.status === "sent").length;
    const failed = r.items.filter((i) => i.status === "failed" || i.status === "unknown").length;
    $("runTitle").textContent = "Run: " + r.status;
    $("runCount").textContent = `${sent} sent · ${failed} failed · ${r.items.length} total`;
    $("bar").style.width = (r.items.length ? (done / r.items.length) * 100 : 0) + "%";
    $("runNote").textContent = r.note || "";
    const active = ["running", "scheduled"].includes(r.status);
    $("pause").disabled = !active; $("resume").disabled = r.status !== "paused"; $("stop").disabled = !(active || r.status === "paused");
    $("retry").disabled = active || !failed;
    $("log").innerHTML = "<tr><th>To</th><th>Status</th><th>Note</th></tr>" + r.items.map((i) => `<tr><td>${esc(i.type === "group" ? "👥 " + i.target : i.target + (i.label ? " (" + i.label + ")" : ""))}</td><td class="st-${i.status}">${esc(i.status)}</td><td>${esc(i.error)}</td></tr>`).join("");
  }
  W.runner.onLive = (l) => { $("countdown").textContent = l.countdown || l.note || ""; };
  chrome.storage.onChanged.addListener((ch) => { if (ch.run) renderRun(); });

  // ---- groups tab ----
  function renderChats() {
    const f = $("gfilter").value.toLowerCase(), t = $("gtype").value;
    const rows = chats.filter((c) => (!t || c.type === t) && (!f || c.name.toLowerCase().includes(f)));
    $("gtable").innerHTML = "<tr><th></th><th>Name</th><th>Type</th><th>Members</th></tr>" + rows.map((c) => `<tr><td><input type="checkbox" class="gsel" data-id="${esc(c.id || c.name)}" data-name="${esc(c.name)}" ${c.type === "group" || c.type === "community" ? "" : ""}></td><td>${esc(c.name)}</td><td>${esc(c.type)}</td><td>${esc(c.members)}</td></tr>`).join("");
    $("gstatus").textContent = `${chats.length} loaded (${chats.filter((c) => c.type === "group").length} groups, ${chats.filter((c) => c.type === "channel").length} channels, ${chats.filter((c) => c.type === "community").length} communities). Showing ${rows.length}.`;
  }
  $("gfilter").oninput = renderChats; $("gtype").onchange = renderChats;
  $("loadG").onclick = async () => {
    $("gstatus").textContent = "Loading...";
    $("loadG").disabled = true;
    try {
      try { chats = await wa().bridge("listChats"); }
      catch (e) {
        $("gstatus").textContent = "WhatsApp's internal list is not reachable, reading the chat list on screen instead (types will show as 'chat')...";
        chats = await wa().scanChatListDOM((n) => ($("gstatus").textContent = "Scanning chat list... " + n + " found"));
      }
      chats.sort((a, b) => (a.type > b.type ? 1 : a.type < b.type ? -1 : a.name.localeCompare(b.name)));
      $("dlCSV").disabled = $("dlJSON").disabled = !chats.length;
      renderChats();
    } catch (e) { $("gstatus").textContent = "Could not load: " + e.message + ". Make sure your chats are visible in WhatsApp Web."; }
    $("loadG").disabled = false;
  };
  const wa = () => W.wa;
  $("dlCSV").onclick = () => W.download("whatsapp-groups-channels-" + new Date().toISOString().slice(0, 10) + ".csv", W.toCSV([["name", "type", "members", "id", "archived"]].concat(chats.map((c) => [c.name, c.type, c.members, c.id, c.archived ? "yes" : ""]))));
  $("dlJSON").onclick = () => W.download("whatsapp-groups-channels-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(chats, null, 2), "application/json");
  $("gall").onclick = () => root.querySelectorAll(".gsel").forEach((c) => (c.checked = true));
  const selected = () => [...root.querySelectorAll(".gsel:checked")].map((c) => ({ id: c.dataset.id, name: c.dataset.name }));
  $("gadd").onclick = () => {
    const names = selected().map((s) => s.name);
    if (!names.length) return alert("Tick some groups first.");
    const cur = W.parseList($("grps").value);
    $("grps").value = [...new Set(cur.concat(names))].join(", ");
    persist(); refreshInfo(); root.querySelector('nav [data-t="send"]').click();
  };
  $("gmem").onclick = async () => {
    const sel = selected().filter((s) => /@g\.us$/.test(s.id));
    if (!sel.length) return alert("Tick at least one group (members are only available for groups).");
    const rows = [["group", "number", "name", "admin"]];
    try {
      for (const g of sel) (await wa().bridge("groupMembers", g.id)).forEach((m) => rows.push([g.name, m.number, m.name, m.admin ? "yes" : ""]));
    } catch (e) { return alert("Could not read members: " + e.message); }
    W.download("whatsapp-group-members-" + new Date().toISOString().slice(0, 10) + ".csv", W.toCSV(rows));
  };

  // ---- init ----
  (async function init() {
    const d = await W.store.get("draft");
    if (d) {
      FIELDS.forEach((f) => { if (d[f] !== undefined) $(f).value = d[f]; });
      $("partial").checked = !!d.partial; csvRecipients = d.csv || [];
    } else {
      $("msg").value = "Namaste {name|Sir/Madam}, this is a reminder from Manoj (India Post agent). Your RD installment is due this month. Please share the payment by the 10th. Thank you.";
    }
    await renderTemplates(); await renderLists(); await refreshInfo(); await renderRun();
    if (await W.store.get("panelOpen")) setOpen(true);
    const r = await W.store.get("run");
    if (r && ["running", "scheduled"].includes(r.status)) { setOpen(true); W.runner.tick(); }
  })();
  W.ui = { collectRecipients, refreshInfo }; // handy for tests
})();
