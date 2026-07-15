/*
 * hindsight in-call overlay. Injected on Meet / Zoom web / Teams. Mounts a
 * small draggable, delayed self-view in the corner of the call tab when the
 * user asks for it from the popup. Nothing is mounted (and no camera is
 * touched) until then.
 *
 * The camera request runs under the call site's origin, which already holds
 * camera permission for the call, so there is usually no extra prompt.
 *
 * Runs in the isolated world; UI lives in a closed-off shadow root so the
 * call site's styles can't leak in (and ours can't leak out).
 */

(() => {
  'use strict';
  if (window.__hindsight) return;

  const hasChrome = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.sync);
  const DELAYS = [0, 1000, 2000, 3000, 5000];
  const LABELS = ['Live', '1s', '2s', '3s', '5s'];

  let host = null;
  let shadow = null;
  let mirror = null;
  const settings = { delay: 3000, mirrored: false };

  async function loadSettings() {
    if (!hasChrome) return;
    const s = await chrome.storage.sync.get({ delay: 3000, mirrored: false });
    settings.delay = s.delay;
    settings.mirrored = s.mirrored;
  }

  function saveSettings() {
    if (hasChrome) chrome.storage.sync.set({ delay: settings.delay, mirrored: settings.mirrored });
  }

  async function loadPosition() {
    if (!hasChrome || !chrome.storage.local) return null;
    const { overlayPos } = await chrome.storage.local.get('overlayPos');
    return overlayPos || null;
  }

  function savePosition(pos) {
    if (hasChrome && chrome.storage.local) chrome.storage.local.set({ overlayPos: pos });
  }

  const CSS = `
    :host { all: initial; }
    .hs {
      position: fixed;
      z-index: 2147483646;
      right: 20px;
      bottom: 88px;
      width: 264px;
      border-radius: 14px;
      overflow: hidden;
      background: rgba(11, 11, 16, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55), 0 0 60px -20px rgba(124, 92, 255, 0.4);
      backdrop-filter: blur(12px);
      font-family: Inter, system-ui, -apple-system, sans-serif;
      user-select: none;
      animation: hs-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes hs-in { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
    .hs-head {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 10px;
      cursor: grab;
      color: rgba(242, 243, 247, 0.9);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .hs-head:active { cursor: grabbing; }
    .hs-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: linear-gradient(135deg, #7c5cff, #00d4ff);
      box-shadow: 0 0 8px rgba(124, 92, 255, 0.9);
    }
    .hs-head .hs-accent { color: #8f7bff; }
    .hs-spacer { flex: 1; }
    .hs-x {
      border: none; background: none; padding: 2px 4px; cursor: pointer;
      color: rgba(155, 159, 173, 0.9); font-size: 14px; line-height: 1;
      border-radius: 6px; transition: color 0.15s, background 0.15s;
    }
    .hs-x:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
    canvas { display: block; width: 100%; aspect-ratio: 16 / 9; background: #000; }
    .hs-err {
      padding: 18px 14px; color: rgba(242, 243, 247, 0.85);
      font-size: 12px; line-height: 1.55; font-weight: 400;
    }
    .hs-bar {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 9px;
      opacity: 0;
      transition: opacity 0.18s ease;
    }
    .hs:hover .hs-bar { opacity: 1; }
    .hs-seg { display: flex; gap: 2px; background: rgba(255,255,255,0.07); border-radius: 999px; padding: 2px; }
    .hs-seg button {
      border: none; background: transparent; cursor: pointer;
      color: rgba(155, 159, 173, 1); font: 600 10.5px Inter, system-ui, sans-serif;
      padding: 4px 8px; border-radius: 999px; transition: color 0.15s, background 0.15s;
    }
    .hs-seg button:hover { color: #fff; }
    .hs-seg button.on {
      background: linear-gradient(135deg, #7c5cff, #00d4ff);
      color: #fff;
    }
    .hs-mir {
      margin-left: auto;
      border: 1px solid rgba(255, 255, 255, 0.14); background: rgba(255, 255, 255, 0.06);
      cursor: pointer; color: rgba(155, 159, 173, 1);
      font: 600 10.5px Inter, system-ui, sans-serif;
      padding: 4px 9px; border-radius: 999px; transition: all 0.15s;
    }
    .hs-mir:hover { color: #fff; }
    .hs-mir.on { background: linear-gradient(135deg, #7c5cff, #00d4ff); color: #fff; border-color: transparent; }
    @media (prefers-reduced-motion: reduce) { .hs { animation: none; } }
  `;

  function buildOverlay(pos) {
    host = document.createElement('div');
    host.id = 'hindsight-overlay-host';
    shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    const box = document.createElement('div');
    box.className = 'hs';
    if (pos) {
      box.style.right = 'auto';
      box.style.bottom = 'auto';
      box.style.left = Math.max(0, Math.min(pos.x, innerWidth - 100)) + 'px';
      box.style.top = Math.max(0, Math.min(pos.y, innerHeight - 60)) + 'px';
    }

    const head = document.createElement('div');
    head.className = 'hs-head';
    head.innerHTML = '<span class="hs-dot"></span><span class="hs-name">hindsight<span class="hs-accent">.</span></span><span class="hs-spacer"></span>';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'hs-x';
    closeBtn.title = 'Close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', destroy);
    head.appendChild(closeBtn);

    const canvas = document.createElement('canvas');

    const bar = document.createElement('div');
    bar.className = 'hs-bar';
    const seg = document.createElement('div');
    seg.className = 'hs-seg';
    DELAYS.forEach((ms, i) => {
      const b = document.createElement('button');
      b.textContent = LABELS[i];
      b.dataset.delay = String(ms);
      if (ms === settings.delay) b.classList.add('on');
      b.addEventListener('click', () => {
        settings.delay = ms;
        if (mirror) mirror.setDelay(ms);
        seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        saveSettings();
      });
      seg.appendChild(b);
    });
    const mir = document.createElement('button');
    mir.className = 'hs-mir' + (settings.mirrored ? ' on' : '');
    mir.textContent = 'Mirror';
    mir.title = 'Off = how others see you';
    mir.addEventListener('click', () => {
      settings.mirrored = !settings.mirrored;
      if (mirror) mirror.setMirror(settings.mirrored);
      mir.classList.toggle('on', settings.mirrored);
      saveSettings();
    });
    bar.appendChild(seg);
    bar.appendChild(mir);

    box.appendChild(head);
    box.appendChild(canvas);
    box.appendChild(bar);
    shadow.appendChild(box);
    document.documentElement.appendChild(host);

    makeDraggable(box, head);
    return { box, canvas };
  }

  function makeDraggable(box, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.hs-x')) return;
      dragging = true;
      const r = box.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(ox + e.clientX - sx, innerWidth - box.offsetWidth));
      const y = Math.max(0, Math.min(oy + e.clientY - sy, innerHeight - box.offsetHeight));
      box.style.right = 'auto';
      box.style.bottom = 'auto';
      box.style.left = x + 'px';
      box.style.top = y + 'px';
    });
    handle.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      const r = box.getBoundingClientRect();
      savePosition({ x: r.left, y: r.top });
    });
  }

  function showError(box, canvas, message) {
    canvas.remove();
    const err = document.createElement('div');
    err.className = 'hs-err';
    err.textContent = message;
    box.insertBefore(err, box.lastElementChild);
  }

  async function toggle() {
    if (host) {
      destroy();
      return { shown: false };
    }
    await loadSettings();
    const pos = await loadPosition();
    const { box, canvas } = buildOverlay(pos);
    mirror = window.HindsightCore.create(canvas, {
      delayMs: settings.delay,
      mirrored: settings.mirrored,
      onEnded: destroy,
    });
    try {
      await mirror.start();
    } catch (err) {
      mirror = null;
      showError(box, canvas, 'Could not open the camera. Join the call (or allow camera access for this site) and try again.');
    }
    return { shown: true };
  }

  function destroy() {
    if (mirror) mirror.stop();
    mirror = null;
    if (host) host.remove();
    host = null;
    shadow = null;
  }

  if (hasChrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.type === 'hindsight-toggle') {
        toggle().then(sendResponse);
        return true; // async response
      }
      if (msg && msg.type === 'hindsight-status') {
        sendResponse({ shown: !!host });
      }
    });

    // Keep the overlay in sync when settings change from the popup.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !host) return;
      if (changes.delay) {
        settings.delay = changes.delay.newValue;
        if (mirror) mirror.setDelay(settings.delay);
        shadow.querySelectorAll('.hs-seg button').forEach((b) => {
          b.classList.toggle('on', Number(b.dataset.delay) === settings.delay);
        });
      }
      if (changes.mirrored) {
        settings.mirrored = changes.mirrored.newValue;
        if (mirror) mirror.setMirror(settings.mirrored);
        const m = shadow.querySelector('.hs-mir');
        if (m) m.classList.toggle('on', settings.mirrored);
      }
    });
  }

  window.__hindsight = { toggle, destroy };
})();
