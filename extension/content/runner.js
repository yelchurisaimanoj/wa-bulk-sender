// Send queue. State lives in chrome.storage so a page reload (needed to open each number) resumes the run.
(function () {
  const W = window.WABS;
  const wa = W.wa;
  const R = (W.runner = {});
  let ticking = false;
  R.live = { countdown: "", note: "" }; // not persisted
  R.onLive = null;
  const emit = () => R.onLive && R.onLive(R.live);

  const load = () => W.store.get("run");
  const save = (r) => W.store.set("run", r);

  R.build = (opts) => {
    const items = [];
    opts.recipients.forEach((r, i) => items.push({
      id: "n" + i, type: "number", target: r.number, label: r.vars.name || "", text: r.text, status: "pending", error: "", ts: 0, tries: 0,
    }));
    opts.groups.forEach((g, i) => items.push({
      id: "g" + i, type: "group", target: g, label: g, text: g.text || opts.groupText, status: "pending", error: "", ts: 0, tries: 0,
    }));
    return {
      id: String(Date.now()),
      status: opts.startAt && opts.startAt > Date.now() ? "scheduled" : "running",
      startAt: opts.startAt || 0,
      nextAt: 0,
      sentCount: 0,
      sinceBatch: 0,
      consecutiveFails: 0,
      createdAt: Date.now(),
      cfg: opts.cfg,
      image: opts.image || null,
      note: "",
      items,
    };
  };

  R.start = async (run) => { await save(run); R.tick(); };
  R.pause = async () => { const r = await load(); if (r && ["running", "scheduled"].includes(r.status)) { r.status = "paused"; r.note = "Paused"; await save(r); } };
  R.resume = async () => { const r = await load(); if (r && r.status === "paused") { r.status = "running"; r.note = ""; r.consecutiveFails = 0; await save(r); R.tick(); } };
  R.stop = async () => { const r = await load(); if (r && r.status !== "done") { r.status = "stopped"; r.note = "Stopped by you"; await save(r); } };
  R.retryFailed = async () => {
    const r = await load();
    if (!r) return;
    r.items.forEach((i) => { if (i.status === "failed") { i.status = "pending"; i.error = ""; i.tries = 0; } });
    r.status = "running"; r.note = ""; r.consecutiveFails = 0; r.nextAt = 0;
    await save(r); R.tick();
  };
  R.clear = async () => { await W.store.del("run"); };

  function phoneInUrl() {
    const m = location.search.match(/[?&]phone=(\d+)/);
    return m ? m[1] : "";
  }

  async function markResult(run, item, status, error) {
    item.status = status; item.error = error || ""; item.ts = Date.now();
    if (status === "sent") { run.sentCount++; run.sinceBatch++; run.consecutiveFails = 0; }
    else if (status === "failed") run.consecutiveFails++;
    // delay before the next send
    const c = run.cfg;
    let d = W.rand(c.minDelay, c.maxDelay) * 1000;
    if (status === "sent" && c.batchSize > 0 && run.sinceBatch >= c.batchSize) {
      d += c.batchPauseMin * 60000; run.sinceBatch = 0;
      run.note = "Batch break of " + c.batchPauseMin + " min";
    } else run.note = "";
    run.nextAt = Date.now() + (status === "failed" && /not on whatsapp/i.test(error || "") ? 1500 : d);
    if (run.consecutiveFails >= 3) {
      run.status = "paused";
      run.note = "Paused after 3 failures in a row. Check WhatsApp Web, then press Resume.";
    }
    await save(run);
  }

  async function sendNumber(run, item) {
    const loaded = await wa.waitFor(() => wa.composer() || wa.invalidNumberDialog() || wa.isQrScreen(), 45000);
    if (wa.isQrScreen() && !wa.composer()) return ["failed", "WhatsApp Web is logged out. Scan the QR code and press Resume."];
    const dlg = wa.invalidNumberDialog();
    if (dlg) { wa.dismissDialog(dlg); return ["failed", "Not on WhatsApp (or invalid number)"]; }
    if (!loaded) return ["failed", "Chat did not open in time"];
    await W.sleep(W.rand(900, 1800));
    return sendInOpenChat(run, item);
  }

  async function setStatus(id, status) {
    const r = await load();
    if (!r) return;
    const it = r.items.find((i) => i.id === id);
    if (it && r.status !== "stopped") { it.status = status; await save(r); }
  }

  async function sendInOpenChat(run, item, forceType) {
    const composer = wa.composer();
    if (!composer) return ["failed", "Message box not found"];
    if (run.image) {
      const a = await wa.attachImage(run.image, item.text);
      if (!a.ok) return ["failed", a.error];
      await setStatus(item.id, "sending-click");
      wa.click(a.sendBtn);
      const gone = await wa.waitFor(() => !document.querySelector('[data-testid="media-caption-input"]') && !wa.first(wa.SEL.mediaSend), 20000);
      return gone ? ["sent", ""] : ["failed", "Image send not confirmed. Check the chat before retrying."];
    }
    if (forceType || !wa.composerText()) await wa.typeInto(composer, item.text);
    if (!wa.composerText()) return ["failed", "Could not type the message"];
    await W.sleep(W.rand(500, 1200));
    await setStatus(item.id, "sending-click");
    if (!wa.pressSend()) return ["failed", "Send button not found"];
    const cleared = await wa.waitFor(() => !wa.composerText(), 15000);
    return cleared ? ["sent", ""] : ["failed", "Send not confirmed. Check the chat before retrying."];
  }

  async function sendGroup(run, item) {
    if (!(await wa.waitFor(() => wa.isLoggedIn() && wa.first(wa.SEL.search), 45000)))
      return ["failed", "WhatsApp Web not ready (logged out?)"];
    const o = await wa.openChatByName(item.target, !!run.cfg.partialGroups);
    if (!o.ok) return ["failed", o.error];
    await W.sleep(W.rand(700, 1500));
    const res = await sendInOpenChat(run, item, true);
    await wa.clearSearch();
    return res;
  }

  R.tick = async function () {
    if (ticking) return;
    ticking = true;
    try {
      for (;;) {
        const run = await load();
        if (!run || !["running", "scheduled"].includes(run.status)) { R.live.countdown = ""; emit(); break; }
        if (run.status === "scheduled") {
          if (Date.now() < run.startAt) { R.live.countdown = "Starts in " + W.fmtDuration((run.startAt - Date.now()) / 1000) + " (keep this tab open)"; emit(); await W.sleep(1000); continue; }
          run.status = "running"; await save(run);
        }
        // we reloaded right after pressing Send: do not risk a duplicate
        const stuck = run.items.find((i) => i.status === "sending-click");
        if (stuck) { stuck.status = "unknown"; stuck.error = "Page reloaded right after Send. Check the chat manually."; await save(run); continue; }
        const next = run.items.find((i) => i.status === "pending" || i.status === "sending");
        if (!next) { run.status = "done"; run.note = "Finished"; await save(run); R.live.countdown = ""; emit(); break; }
        if (run.sentCount >= run.cfg.maxPerRun) { run.status = "paused"; run.note = "Reached the limit of " + run.cfg.maxPerRun + " messages for this run. Press Resume to continue later."; await save(run); break; }
        const wait = (run.nextAt || 0) - Date.now();
        if (wait > 0) { R.live.countdown = "Next message in " + W.fmtDuration(wait / 1000); emit(); await W.sleep(Math.min(wait, 1000)); continue; }
        R.live.countdown = "Sending to " + next.target + "..."; emit();

        let result;
        if (next.type === "number") {
          if (phoneInUrl() !== next.target) {
            next.tries = (next.tries || 0) + 1;
            if (next.tries > 3) { await markResult(run, next, "failed", "Could not open the chat"); continue; }
            next.status = "sending"; await save(run);
            const q = new URLSearchParams({ phone: next.target });
            if (!run.image && next.text.length < 1500) q.set("text", next.text);
            location.href = location.origin + "/send?" + q.toString();
            return; // page reloads and the content script resumes
          }
          result = await sendNumber(run, next);
        } else {
          if (phoneInUrl()) { /* stay on page; search works from any chat view */ }
          result = await sendGroup(run, next);
        }
        const fresh = await load();
        if (!fresh || fresh.status === "stopped") break;
        const it = fresh.items.find((i) => i.id === next.id);
        await markResult(fresh, it, result[0], result[1]);
      }
    } catch (e) {
      R.live.note = "Error: " + (e && e.message);
      emit();
    } finally {
      ticking = false;
    }
  };
})();
