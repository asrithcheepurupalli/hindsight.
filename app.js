/*
 * Rearview — a time-shifted live mirror for video calls.
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
  const MAX_DELAY_S = 5;         // slider max; bounds buffer memory
  const BUFFER_SLACK_MS = 600;   // keep a little extra history beyond max delay
  // 640x360 @ 20fps for 5s ≈ 100 frames — small enough to hold in memory.
  const CAMERA_CONSTRAINTS = {
    audio: false,
    video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
  };

  // --- Elements ----------------------------------------------------------
  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d');
  const placeholder = document.getElementById('placeholder');
  const controls = document.getElementById('controls');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const pipBtn = document.getElementById('pipBtn');
  const delayBtns = Array.from(document.querySelectorAll('.seg-btn'));
  const mirrorToggle = document.getElementById('mirrorToggle');

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
  let startedAt = 0;            // for the "warming up" state
  let delayMs = Number(document.querySelector('.seg-btn.active').dataset.delay) * 1000;
  let mirrored = mirrorToggle.checked;
  let pipVideo = null;          // video element backing Picture-in-Picture

  // --- Camera lifecycle ----------------------------------------------------
  async function start() {
    startBtn.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
    } catch (err) {
      startBtn.disabled = false;
      alert('Could not access the camera: ' + err.message +
        '\n\nCheck the camera permission for this page and that no other app has locked the camera.');
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
      alert('Picture-in-Picture is not available in this browser. ' +
        'Keep this tab in a small window next to your call instead.');
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
    } catch (err) {
      alert('Could not open the floating window: ' + err.message);
    }
  }

  // --- Wire up the controls ---------------------------------------------------
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  pipBtn.addEventListener('click', togglePiP);

  delayBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      delayBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      delayMs = Number(btn.dataset.delay) * 1000;
    });
  });

  mirrorToggle.addEventListener('change', () => {
    mirrored = mirrorToggle.checked;
  });
})();
