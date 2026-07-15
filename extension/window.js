// hindsight floating mirror window. Opened by the popup when the active tab
// isn't a supported call site. Auto-starts the camera (first run shows a
// Start button so the permission prompt has a user gesture behind it).

(() => {
  'use strict';

  const canvas = document.getElementById('view');
  const startPane = document.getElementById('start');
  const startMsg = document.getElementById('start-msg');
  const startBtn = document.getElementById('start-btn');
  const bar = document.getElementById('bar');
  const seg = document.getElementById('seg');
  const segBtns = Array.from(seg.querySelectorAll('button'));
  const mirrorBtn = document.getElementById('mirror');
  const pipBtn = document.getElementById('pip');

  let mirror = null;
  let pipVideo = null;
  const settings = { delay: 3000, mirrored: false };

  function paint() {
    segBtns.forEach((b) => b.classList.toggle('on', Number(b.dataset.delay) === settings.delay));
    mirrorBtn.classList.toggle('on', settings.mirrored);
  }

  async function start() {
    mirror = window.HindsightCore.create(canvas, {
      delayMs: settings.delay,
      mirrored: settings.mirrored,
      onEnded: () => {
        bar.classList.add('hidden');
        startPane.classList.remove('hidden');
      },
    });
    try {
      await mirror.start();
      startPane.classList.add('hidden');
      bar.classList.remove('hidden');
    } catch (err) {
      mirror = null;
      startMsg.innerHTML = 'Camera unavailable. Allow camera access for this window, or close whatever app is holding it, then try again.';
      startPane.classList.remove('hidden');
    }
  }

  segBtns.forEach((b) => {
    b.addEventListener('click', () => {
      settings.delay = Number(b.dataset.delay);
      if (mirror) mirror.setDelay(settings.delay);
      paint();
      chrome.storage.sync.set({ delay: settings.delay });
    });
  });

  mirrorBtn.addEventListener('click', () => {
    settings.mirrored = !settings.mirrored;
    if (mirror) mirror.setMirror(settings.mirrored);
    paint();
    chrome.storage.sync.set({ mirrored: settings.mirrored });
  });

  pipBtn.addEventListener('click', async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }
    if (!document.pictureInPictureEnabled) return;
    try {
      if (!pipVideo) {
        pipVideo = document.createElement('video');
        pipVideo.muted = true;
        pipVideo.playsInline = true;
        pipVideo.srcObject = canvas.captureStream(30);
      }
      await pipVideo.play();
      await pipVideo.requestPictureInPicture();
    } catch (_) { /* PiP refused; the window itself still works */ }
  });

  startBtn.addEventListener('click', start);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.delay) {
      settings.delay = changes.delay.newValue;
      if (mirror) mirror.setDelay(settings.delay);
    }
    if (changes.mirrored) {
      settings.mirrored = changes.mirrored.newValue;
      if (mirror) mirror.setMirror(settings.mirrored);
    }
    paint();
  });

  (async () => {
    const s = await chrome.storage.sync.get({ delay: 3000, mirrored: false });
    settings.delay = s.delay;
    settings.mirrored = s.mirrored;
    paint();
    start(); // auto-start; if the permission prompt blocks it, the Start pane stays
  })();
})();
