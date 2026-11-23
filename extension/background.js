// Toolbar icon: toggle the panel on the WhatsApp Web tab, or open WhatsApp Web.
chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.url && tab.url.startsWith("https://web.whatsapp.com/")) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "WABS_TOGGLE" });
      return;
    } catch (e) {
      // content script not ready (tab loaded before install): reload it once
      await chrome.tabs.reload(tab.id);
      return;
    }
  }
  const existing = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  if (existing.length) {
    await chrome.tabs.update(existing[0].id, { active: true });
    await chrome.windows.update(existing[0].windowId, { focused: true });
    try { await chrome.tabs.sendMessage(existing[0].id, { type: "WABS_TOGGLE", open: true }); } catch (e) {}
  } else {
    await chrome.tabs.create({ url: "https://web.whatsapp.com/" });
  }
});
