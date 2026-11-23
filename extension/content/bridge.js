// Runs in the page's own JS world so it can read WhatsApp Web's in-memory chat list.
// Read-only: it never sends anything. The panel talks to it with window.postMessage.
(function () {
  if (window.__wabsBridge) return;
  window.__wabsBridge = true;

  function req(name) {
    try { return window.require ? window.require(name) : null; } catch (e) { return null; }
  }
  function arr(coll) {
    if (!coll) return [];
    try {
      if (typeof coll.getModelsArray === "function") return coll.getModelsArray();
      if (Array.isArray(coll.models)) return coll.models;
      if (Array.isArray(coll._models)) return coll._models;
      if (Array.isArray(coll)) return coll;
    } catch (e) {}
    return [];
  }
  function ser(id) { return id && (id._serialized || (id.user ? id.user + "@" + id.server : String(id))); }
  function participants(chat) {
    const gm = chat.groupMetadata;
    if (!gm || !gm.participants) return [];
    return arr(gm.participants);
  }

  function listChats() {
    const C = req("WAWebCollections");
    if (!C || !C.Chat) throw new Error("store-unavailable");
    const out = [];
    arr(C.Chat).forEach((chat) => {
      const id = ser(chat.id);
      const server = chat.id && chat.id.server;
      let type = "chat";
      if (chat.isGroup || server === "g.us") type = "group";
      if (server === "newsletter") type = "channel";
      const gm = chat.groupMetadata;
      if (gm && (gm.isParentGroup || gm.groupType === "COMMUNITY")) type = "community";
      if (type === "chat" && server === "broadcast") type = "broadcast";
      out.push({
        id,
        type,
        name: chat.formattedTitle || chat.name || (chat.contact && (chat.contact.name || chat.contact.pushname)) || (chat.id && chat.id.user) || "",
        members: type === "group" || type === "community" ? participants(chat).length : "",
        archived: !!chat.archive,
      });
    });
    // Channels you follow can live in their own collection.
    const nlMod = req("WAWebNewsletterCollection") || req("WAWebNewsletterModelCollection");
    const nl = nlMod && (nlMod.NewsletterCollection || nlMod.default || nlMod);
    arr(nl).forEach((n) => {
      const id = ser(n.id);
      if (out.some((o) => o.id === id)) return;
      out.push({
        id,
        type: "channel",
        name: (n.newsletterMetadata && n.newsletterMetadata.name) || n.name || "",
        members: (n.newsletterMetadata && n.newsletterMetadata.subscribersCount) || "",
        archived: false,
      });
    });
    return out;
  }

  function groupMembers(groupId) {
    const C = req("WAWebCollections");
    if (!C || !C.Chat) throw new Error("store-unavailable");
    const chat = arr(C.Chat).find((c) => ser(c.id) === groupId);
    if (!chat) throw new Error("group-not-found");
    return participants(chat).map((p) => {
      const id = ser(p.id);
      const contact = C.Contact && C.Contact.get ? C.Contact.get(p.id) : null;
      return {
        number: p.id && p.id.user ? p.id.user : id,
        name: contact ? contact.name || contact.shortName || contact.pushname || "" : "",
        admin: !!(p.isAdmin || p.isSuperAdmin),
      };
    });
  }

  function activeChatId() {
    const C = req("WAWebCollections");
    if (!C || !C.Chat || typeof C.Chat.getActive !== "function") throw new Error("store-unavailable");
    const a = C.Chat.getActive();
    return a ? ser(a.id) : null;
  }

  // Open (or create) a 1:1 chat inside the running app, no page reload.
  async function openChat(num) {
    const CmdMod = req("WAWebCmd");
    const Find = req("WAWebFindChatAction");
    const WidF = req("WAWebWidFactory");
    if (!CmdMod || !Find || !WidF) throw new Error("modules-unavailable");
    const wid = WidF.createWid ? WidF.createWid(num + "@c.us") : WidF.createUserWid(num, "c.us");
    const finder = Find.findOrCreateLatestChat || Find.findChat;
    const r = await finder(wid);
    const chat = (r && r.chat) || r;
    const cmd = CmdMod.Cmd || CmdMod.default || CmdMod;
    if (cmd.openChatBottom) await cmd.openChatBottom({ chat });
    else if (cmd.openChatAt) await cmd.openChatAt({ chat });
    else throw new Error("modules-unavailable");
    return true;
  }

  window.addEventListener("message", async (ev) => {
    if (ev.source !== window || !ev.data || ev.data.source !== "WABS_REQ") return;
    const { id, cmd, arg } = ev.data;
    let res;
    try {
      let data;
      if (cmd === "ping") data = { store: !!(req("WAWebCollections") || {}).Chat };
      else if (cmd === "listChats") data = listChats();
      else if (cmd === "groupMembers") data = groupMembers(arg);
      else if (cmd === "activeChatId") data = activeChatId();
      else if (cmd === "openChat") data = await openChat(arg);
      else throw new Error("unknown-command");
      res = { ok: true, data };
    } catch (e) {
      res = { ok: false, error: String(e && e.message ? e.message : e) };
    }
    window.postMessage({ source: "WABS_RES", id, ...res }, "*");
  });
})();
