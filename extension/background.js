// rearview background service worker. Deliberately tiny: seeds default
// settings on install. The extension makes no network requests of its own.

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.sync.get({ delay: null, mirrored: null });
  const defaults = {};
  if (settings.delay === null) defaults.delay = 3000;
  if (settings.mirrored === null) defaults.mirrored = false;
  if (Object.keys(defaults).length) await chrome.storage.sync.set(defaults);
});
