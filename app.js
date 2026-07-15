/*
 * hindsight. — a time-shifted live mirror for video calls.
 * https://made-by-ac.com
 *
 * The whole trick: capture webcam frames into a short in-memory ring buffer
 * and render the frame from `delay` seconds ago. Still live, still moving —
 * just shifted back in time, so glancing at it shows you your real
 * mid-conversation face instead of your checking-the-mirror face.
 *
 * Everything stays local. No recording, no network.
 */

(() => {
  'use strict';

  // --- Config ------------------------------------------------------------
  const CAPTURE_FPS = 20;        // buffer capture rate
  const MAX_DELAY_S = 5;         // largest preset; bounds buffer memory
  const BUFFER_SLACK_MS = 600;   // keep a little extra history beyond max delay
  const STORAGE_KEY = 'hindsight-settings';
  // 640x360 @ 20fps for 5s ≈ 100 frames — small enough to hold in memory.
  const BASE_VIDEO = { width: { ideal: 640 }, height: { ideal: 360 } };

  // --- Elements ----------------------------------------------------------
  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d');
  const placeholder = document.getElementById('placeholder');
  const controls = document.getElementById('controls');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const pipBtn = document.getElementById('pipBtn');
  const camBtn = document.getElementById('camBtn');
  const delayBtns = Array.from(document.querySelectorAll('.seg-btn'));
  const mirrorToggle = document.getElementById('mirrorToggle');
  const toastEl = document.getElementById('toast');

  // --- State -------------------------------------------------------------
  const video = document.createElement('video'); // hidden source element
  video.muted = true;
  video.playsInline = true;

  /** @type {{bitmap: ImageBitmap, t: number}[]} */
  let buffer = [];
  let stream = null;
  let captureTimer = null;
  let rafId = null;
  let capturing = false;        // guards overlapping async captures
  let startedAt = 0;            // for the "rewinding" state
  let delayMs = 3000;
  let mirrored = false;
  let pipVideo = null;          // video element backing Picture-in-Picture
  let cameras = [];             // available videoinput devices
  let cameraIndex = 0;
  let toastTimer = null;

  // --- Settings persistence ------------------------------------------------
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (typeof saved.delay === 'number') delayMs = saved.delay;
      if (typeof saved.mirrored === 'boolean') mirrored = saved.mirrored;
    } catch (_) { /* corrupted settings — fall back to defaults */ }

    mirrorToggle.checked = mirrored;
    const match = delayBtns.find((b) => Number(b.dataset.delay) * 1000 === delayMs);
    setActiveDelayBtn(match || delayBtns.find((b) => b.dataset.delay === '3'));
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ delay: delayMs, mirrored }));
    } catch (_) { /* private mode — settings just won't persist */ }
  }

  function setActiveDelayBtn(btn) {
    delayBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    delayMs = Number(btn.dataset.delay) * 1000;
  }

  // --- Toast -----------------------------------------------------------------
  function toast(message, ms = 3200) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  // --- Camera lifecycle ----------------------------------------------------
  function constraintsFor(index) {
    const video = { ...BASE_VIDEO };
    if (cameras[index]) {
      video.deviceId = { exact: cameras[index].deviceId };
    } else {
      video.facingMode = 'user';
    }
    return { audio: false, video };
  }

  async function start() {
    startBtn.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraintsFor(cameraIndex));
    } catch (err) {
      startBtn.disabled = false;
      toast('Could not access the camera — check the permission for this page ' +
        'and that no other app has locked it.', 5000);
      return;
    }

    video.srcObject = stream;
    await video.play();

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;

    startedAt = performance.now();
    placeholder.classList.add('hidden');
    controls.classList.remove('hidden');

    captureTimer = setInterval(captureFrame, 1000 / CAPTURE_FPS);
    rafId = requestAnimationFrame(render);

    // If the camera dies (unplugged, revoked), reset the UI.
    stream.getVideoTracks()[0].addEventListener('ended', stop);

    refreshCameraList();
  }

  async function refreshCameraList() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      cameras = devices.filter((d) => d.kind === 'videoinput');
      const current = stream && stream.getVideoTracks()[0].getSettings().deviceId;
      const idx = cameras.findIndex((c) => c.deviceId === current);
      if (idx >= 0) cameraIndex = idx;
      camBtn.classList.toggle('hidden', cameras.length < 2);
    } catch (_) { /* enumeration unsupported — just hide the switch button */ }
  }

  async function switchCamera() {
    if (cameras.length < 2) return;
    const nextIndex = (cameraIndex + 1) % cameras.length;
    let nextStream;
    try {
      nextStream = await navigator.mediaDevices.getUserMedia(constraintsFor(nextIndex));
    } catch (err) {
      toast('Could not switch to that camera.');
      return;
    }

    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = nextStream;
    cameraIndex = nextIndex;
    video.srcObject = stream;
    await video.play();

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;

    // Old camera's frames shouldn't play back on the new one.
    buffer.forEach((f) => f.bitmap.close());
    buffer = [];
    startedAt = performance.now();

    stream.getVideoTracks()[0].addEventListener('ended', stop);
    toast(cameras[cameraIndex].label || 'Camera ' + (cameraIndex + 1));
  }

  function stop() {
    if (captureTimer) clearInterval(captureTimer);
    if (rafId) cancelAnimationFrame(rafId);
    captureTimer = null;
    rafId = null;

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    video.srcObject = null;

    buffer.forEach((f) => f.bitmap.close());
    buffer = [];

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    placeholder.classList.remove('hidden');
    controls.classList.add('hidden');
    startBtn.disabled = false;
  }

  // --- Frame buffering -----------------------------------------------------
  async function captureFrame() {
    if (capturing || video.readyState < video.HAVE_CURRENT_DATA) return;
    capturing = true;
    try {
      const bitmap = await createImageBitmap(video);
      buffer.push({ bitmap, t: performance.now() });

      const cutoff = performance.now() - (MAX_DELAY_S * 1000 + BUFFER_SLACK_MS);
      while (buffer.length && buffer[0].t < cutoff) {
        buffer.shift().bitmap.close();
      }
    } catch (_) {
      // createImageBitmap can fail transiently while the track shuts down; ignore.
    } finally {
      capturing = false;
    }
  }

  /** The buffered frame closest to (now - delay), or null while warming up. */
  function frameAt(target) {
    for (let i = buffer.length - 1; i >= 0; i--) {
      if (buffer[i].t <= target) return buffer[i];
    }
    return null;
  }

  // --- Rendering -----------------------------------------------------------
  function render() {
    rafId = requestAnimationFrame(render);

    const now = performance.now();
    const frame = frameAt(now - delayMs);
    const w = canvas.width;
    const h = canvas.height;

    if (!frame) {
      // Not enough history yet: show live feed with a countdown until the
      // delayed feed is ready, so the screen is never dead.
      ctx.save();
      applyMirror();
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        ctx.drawImage(video, 0, 0, w, h);
      }
      ctx.restore();

      const remaining = Math.max(0, delayMs - (now - startedAt)) / 1000;
      if (delayMs > 0) {
        drawBadge(`rewinding… ready in ${remaining.toFixed(1)}s`, false);
      }
      return;
    }

    ctx.save();
    applyMirror();
    ctx.drawImage(frame.bitmap, 0, 0, w, h);
    ctx.restore();

    const actualDelay = (now - frame.t) / 1000;
    if (delayMs === 0) {
      drawBadge('live', true);
    } else {
      drawBadge(`you, ${actualDelay.toFixed(1)}s ago`, false);
    }
  }

  function applyMirror() {
    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
  }

  // Drawn on the canvas (not the DOM) so it also shows in the PiP window.
  // Top-left, out of the way of the floating control bar.
  function drawBadge(text, live) {
    const x = 12;
    const y = 12;
    const h = 26;
    const dotR = 3.5;
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(text).width;
    const w = tw + 34;

    ctx.fillStyle = 'rgba(10, 10, 16, 0.62)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, h / 2);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }

    ctx.fillStyle = live ? '#3ddc84' : '#8f7bff';
    ctx.beginPath();
    ctx.arc(x + 13, y + h / 2, dotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 23, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  // --- Picture-in-Picture ----------------------------------------------------
  async function togglePiP() {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }
    if (!document.pictureInPictureEnabled) {
      toast('Picture-in-Picture is not available in this browser — keep this ' +
        'tab in a small window next to your call instead.', 5000);
      return;
    }
    try {
      if (!pipVideo) {
        pipVideo = document.createElement('video');
        pipVideo.muted = true;
        pipVideo.playsInline = true;
        pipVideo.srcObject = canvas.captureStream(30);
      }
      await pipVideo.play();
      await pipVideo.requestPictureInPicture();
      toast('Floating window opened — park it near your webcam.');
    } catch (err) {
      toast('Could not open the floating window: ' + err.message, 5000);
    }
  }

  // --- Wire up the controls ---------------------------------------------------
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  pipBtn.addEventListener('click', togglePiP);
  camBtn.addEventListener('click', switchCamera);

  delayBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveDelayBtn(btn);
      saveSettings();
    });
  });

  mirrorToggle.addEventListener('change', () => {
    mirrored = mirrorToggle.checked;
    saveSettings();
  });

  // Keyboard shortcuts: M mirror · P pop out · arrows step through delay presets
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const isTyping = t.matches('textarea, select') ||
      (t.matches('input') && !['checkbox', 'radio', 'range', 'button'].includes(t.type));
    if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!stream) return;

    if (e.key === 'm' || e.key === 'M') {
      mirrorToggle.checked = !mirrorToggle.checked;
      mirrored = mirrorToggle.checked;
      saveSettings();
      toast(mirrored ? 'Mirrored — bathroom-mirror view' : 'Unmirrored — how others see you', 1800);
    } else if (e.key === 'p' || e.key === 'P') {
      togglePiP();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const current = delayBtns.findIndex((b) => b.classList.contains('active'));
      const next = e.key === 'ArrowUp'
        ? Math.min(delayBtns.length - 1, current + 1)
        : Math.max(0, current - 1);
      setActiveDelayBtn(delayBtns[next]);
      saveSettings();
    }
  });

  loadSettings();
})();
