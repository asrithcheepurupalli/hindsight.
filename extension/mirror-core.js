/*
 * mirror-core.js, the rearview engine as a plain IIFE (MV3 content scripts
 * can't be modules). Captures webcam frames into a short in-memory ring
 * buffer and renders the frame from `delay` seconds ago onto a canvas.
 * Used by the in-call overlay (content.js) and the floating window
 * (window.js). Keep in sync with the site's app.js render logic.
 *
 * Everything stays local. No recording, no network.
 */

(() => {
  'use strict';

  const CAPTURE_FPS = 20;        // buffer capture rate
  const MAX_DELAY_S = 5;         // largest preset; bounds buffer memory
  const BUFFER_SLACK_MS = 600;   // keep a little extra history beyond max delay

  function create(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    /** @type {{bitmap: ImageBitmap, t: number}[]} */
    let buffer = [];
    let stream = null;
    let captureTimer = null;
    let rafId = null;
    let capturing = false;
    let startedAt = 0;
    let delayMs = typeof opts.delayMs === 'number' ? opts.delayMs : 3000;
    let mirrored = !!opts.mirrored;
    const onEnded = opts.onEnded || null; // camera died (unplugged, revoked)

    async function start(deviceId) {
      const videoConstraints = { width: { ideal: 640 }, height: { ideal: 360 } };
      if (deviceId) videoConstraints.deviceId = { exact: deviceId };
      else videoConstraints.facingMode = 'user';

      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: videoConstraints,
      });
      video.srcObject = stream;
      await video.play();

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;

      startedAt = performance.now();
      captureTimer = setInterval(captureFrame, 1000 / CAPTURE_FPS);
      rafId = requestAnimationFrame(render);

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stop();
        if (onEnded) onEnded();
      });
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

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
        // transient failure while the track shuts down; ignore
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

    function render() {
      rafId = requestAnimationFrame(render);
      const now = performance.now();
      const frame = frameAt(now - delayMs);
      const w = canvas.width;
      const h = canvas.height;

      if (!frame) {
        // Warm-up: show live feed with a countdown so the screen is never dead.
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
      if (delayMs === 0) drawBadge('live', true);
      else drawBadge(`you, ${actualDelay.toFixed(1)}s ago`, false);
    }

    function applyMirror() {
      if (mirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
    }

    // Drawn on the canvas (not the DOM) so it survives PiP and stays in-frame.
    function drawBadge(text, live) {
      const x = 12;
      const y = 12;
      const h = 26;
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
      ctx.arc(x + 13, y + h / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + 23, y + h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }

    return {
      start,
      stop,
      setDelay(ms) { delayMs = ms; },
      setMirror(m) { mirrored = !!m; },
      get running() { return !!stream; },
      get delayMs() { return delayMs; },
      get mirrored() { return mirrored; },
      canvas,
    };
  }

  const api = { create, MAX_DELAY_S };
  if (typeof window !== 'undefined') window.RearviewCore = api;
})();
