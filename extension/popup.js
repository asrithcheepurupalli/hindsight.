// rearview popup. Context-aware launcher: on a supported call site it toggles
// the in-call overlay via the content script; anywhere else it opens the
// floating mirror window. Settings live in chrome.storage.sync so the popup,
// overlay, and window stay in step.

(() => {
  'use strict';

  const CALL_SITES = [
    /^https:\/\/meet\.google\.com\//,
    /^https:\/\/[^/]*\.zoom\.us\/wc\//,
    /^https:\/\/teams\.microsoft\.com\//,
    /^https:\/\/teams\.live\.com\//,
  ];

  const seg = document.getElementById('seg');
  const segBtns = Array.from(seg.querySelectorAll('button'));
  const mirrorEl = document.getElementById('mirror');
  const cta = document.getElementById('cta');
  const ctahint = document.getElementById('ctahint');
  const statusEl = document.getElementById('status');
  const statusText = document.getElementById('status-text');

  let callTab = null;      // active tab when it's a supported call site
  let overlayShown = false;

  function siteName(url) {
    if (/meet\.google\.com/.test(url)) return 'Google Meet';
    if (/zoom\.us/.test(url)) return 'Zoom';
    if (/teams\./.test(url)) return 'Microsoft Teams';
    return 'this call';
  }

  function paintSeg(delay) {
    segBtns.forEach((b) => b.classList.toggle('on', Number(b.dataset.delay) === delay));
  }

  function paintCta() {
    if (callTab) {
      const name = siteName(callTab.url);
      if (overlayShown) {
        cta.textContent = 'Hide mirror';
        cta.classList.add('off');
        statusEl.className = 'status live';
        statusText.textContent = 'mirror on';
      } else {
        cta.textContent = 'Show mirror in ' + name;
        cta.classList.remove('off');
        statusEl.className = 'status oncall';
        statusText.textContent = 'on ' + name;
      }
      ctahint.textContent = 'Sits in the corner of the call tab. Drag it anywhere.';
    } else {
      cta.textContent = 'Open floating mirror';
      cta.classList.remove('off');
      statusEl.className = 'status';
      statusText.textContent = 'ready';
      ctahint.textContent = 'A small window you can park near your webcam.';
    }
  }

  async function init() {
    const s = await chrome.storage.sync.get({ delay: 3000, mirrored: false });
    paintSeg(s.delay);
    mirrorEl.checked = s.mirrored;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && CALL_SITES.some((re) => re.test(tab.url))) {
        callTab = tab;
        const res = await chrome.tabs.sendMessage(tab.id, { type: 'rearview-status' })
          .catch(() => null);
        overlayShown = !!(res && res.shown);
      }
    } catch (_) { /* no tab access; fall back to the floating window */ }

    paintCta();
  }

  segBtns.forEach((b) => {
    b.addEventListener('click', () => {
      const delay = Number(b.dataset.delay);
      paintSeg(delay);
      chrome.storage.sync.set({ delay });
    });
  });

  mirrorEl.addEventListener('change', () => {
    chrome.storage.sync.set({ mirrored: mirrorEl.checked });
  });

  cta.addEventListener('click', async () => {
    if (callTab) {
      const res = await chrome.tabs.sendMessage(callTab.id, { type: 'rearview-toggle' })
        .catch(() => null);
      if (res) {
        overlayShown = res.shown;
        paintCta();
        if (overlayShown) window.close();
      } else {
        ctahint.textContent = 'Could not reach the call tab. Reload it and try again.';
      }
      return;
    }
    await chrome.windows.create({
      url: chrome.runtime.getURL('window.html'),
      type: 'popup',
      width: 420,
      height: 330,
    });
    window.close();
  });

  init();
})();
