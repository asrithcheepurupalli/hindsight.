# rearview extension (MV3)

Plain Manifest V3, no build step. Load this folder unpacked at
`chrome://extensions` (enable Developer mode first). Reload the extension
after any change to extension JS.

- `mirror-core.js` — the shared delayed-mirror engine (ring buffer + canvas
  render). Keep its render logic in sync with the site's `app.js`.
- `content.js` — in-call overlay for Meet / Zoom web / Teams. Mounts nothing
  until the user asks from the popup; camera runs under the call site's
  origin, which already holds camera permission.
- `popup.html/js` — context-aware launcher: toggles the overlay on call
  sites, opens `window.html` everywhere else. Settings in
  `chrome.storage.sync`.
- `window.html/js` — the floating mirror window (with PiP).
- No network permission. Keep it that way — it is the trust claim.

Package for the Web Store with `scripts/package-extension.sh` (repo root).
