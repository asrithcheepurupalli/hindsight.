# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

hindsight is a time-shifted live mirror for video calls: it plays the user's own
camera back on a short delay so a glance at it shows their real
mid-conversation face (eyes on screen), not their checking-the-mirror face.
It is **two deployables in one repo**:

1. **Landing page + web app** (repo root: `index.html`, `app.js`, `style.css`) —
   static, no build step, deploys via GitHub Pages. The page IS the app.
2. **MV3 browser extension** (`extension/`) — plain hand-written MV3, no build
   step; load the folder unpacked at `chrome://extensions`.

A **made. by ac** product (https://made-by-ac.com). All commits are authored by
Asrith Cheepurupalli only — never add AI co-author trailers or session links to
commits, PR bodies, or any pushed artifact.

## Commands

There is no package.json. Everything is static.

- **Run the site:** open `index.html`, or `python3 -m http.server` (camera
  needs localhost or HTTPS, not `file://`).
- **Load the extension:** load `extension/` unpacked; reload it after any
  change to extension JS.
- **Package for the Web Store:** `scripts/package-extension.sh` (preflights
  required files, zips `extension/` minus store assets).

## The mirror engine exists in two copies — keep them in sync

The ring-buffer + render logic is duplicated, intentionally:

- `app.js` (site) — full app: settings persistence in localStorage, keyboard
  shortcuts, toasts, camera switcher.
- `extension/mirror-core.js` — the same capture/render core as a plain IIFE
  exposing `window.HindsightCore` (MV3 content scripts can't be modules),
  consumed by both `extension/content.js` and `extension/window.js`.

**When you change buffer/render behavior (capture rate, badge drawing, warmup
countdown, mirror transform), change BOTH files.**

## How the delay works (both copies)

- `getUserMedia` at ~640×360; frames captured ~20 fps via `createImageBitmap`
  into an in-memory array; frames older than 5 s + slack are `close()`d.
- A rAF loop draws the frame from `delayMs` ago onto a canvas; during warmup it
  draws the live feed plus a "rewinding…" badge so the canvas is never dead.
- The status badge is drawn ON the canvas (not DOM) so it survives
  Picture-in-Picture, which streams `canvas.captureStream()` into a video.
- Unmirrored is the default everywhere: that is how others see you. This is a
  product decision, not an accident.

## Extension architecture

- `popup.js` is a context-aware launcher: if the active tab matches a call
  site (Meet, `*.zoom.us/wc/`, Teams) it messages the content script to toggle
  the in-call overlay; otherwise it opens `window.html` via
  `chrome.windows.create({type:'popup'})`.
- `content.js` mounts NOTHING until the user asks from the popup — no camera
  touch, no DOM. The overlay lives in a shadow root on a host `div` appended
  to `documentElement`; all styles are inside the shadow root.
- Settings (`delay`, `mirrored`) live in `chrome.storage.sync`; popup, overlay
  and window all listen to `chrome.storage.onChanged`. Overlay position is
  `chrome.storage.local` (`overlayPos`).
- `content.js` guards every `chrome.*` access (`hasChrome`) and exposes
  `window.__hindsight = { toggle, destroy }` so tests can inject and drive it
  on a plain page without extension APIs.
- **Invariant: the extension holds no network permission and makes no network
  requests of its own.** Fonts are bundled in `extension/fonts/` (never load
  from Google Fonts inside the extension — CSP forbids it anyway). This is the
  core trust claim; see `STORE-LISTING.md`.

## SEO / URLs

- Canonical + OG + sitemap URLs point at
  `https://asrithcheepurupalli.github.io/hindsight./` (repo is literally named
  `hindsight.`, dot included). When moving to a custom domain, update:
  `index.html` (canonical, og:url, og:image, twitter:image, JSON-LD url),
  `robots.txt`, `sitemap.xml`, and the privacy URL in `STORE-LISTING.md`.
- `og-image.png`, `icon-192.png`, `icon-512.png` and `extension/icons/*` are
  generated (headless Chromium screenshots of the brand SVG/card) — regenerate
  rather than hand-edit.

## Style

- Brand: lowercase wordmark `hindsight.` with gradient accent dot; dark theme
  `#0b0b10`; violet→cyan gradient (`#7c5cff` → `#00d4ff`); Space Grotesk for
  display, Inter for body.
- Footer/branding must credit "a made. product" and link to
  https://made-by-ac.com.
- Store listing copy follows the made. house rule: no em or en dashes
  (`STORE-LISTING.md`).
