# rearview.

**See yourself the way they *just* saw you.**

A time-shifted live mirror for video calls. Runs entirely in your browser — no install, no account, no servers, nothing recorded or uploaded.

A **[made.](https://made-by-ac.com)** product, designed & built by [Asrith Cheepurupalli](https://made-by-ac.com).

## The problem

On a video call, you can never see how you actually look to the other person. The moment you glance at your self-view tile, your eyes have already moved — so all you ever see is your *checking-the-mirror* face, never your real *mid-conversation* face. Freezing the frame or taking a screenshot loses the live feel entirely.

## The solution

rearview plays your own camera back to you on a short, adjustable delay (default 3 seconds). When you glance at it, you're watching **live, continuously moving video of yourself from a few seconds ago** — eyes still on the screen, still talking, still reacting. Exactly what the other participants just saw.

Two things make it honest:

1. **Time shift** — you see your engaged face, not your glancing face.
2. **Unmirrored by default** — call apps flip your self-view like a bathroom mirror, but that's not what others see. rearview shows the unflipped view (with a toggle if you prefer the mirror).

## Features

- Delay presets: Live / 1s / 2s / 3s / 5s
- Mirror toggle (unmirrored by default — how others see you)
- **Pop out**: a Picture-in-Picture floating window that stays on top of every app — Zoom, Meet, Teams, anything
- Camera switcher when you have more than one webcam
- Keyboard shortcuts: `M` mirror · `P` pop out · `↑`/`↓` delay
- Settings remembered between visits (locally)
- Fully private: frames live in memory for five seconds, then they're gone

## How to use it

1. Open the page in Chrome or Edge.
2. Click **Start camera** and allow camera access.
3. Pick your delay and click **Pop out**.
4. Park the floating window near your webcam and join your call in any app. Glance at it whenever you want an honest look at yourself.

> **Note:** keep the rearview tab visible or popped out. Browsers throttle fully hidden background tabs, which can pause the delayed feed.

## How it works

- `getUserMedia` grabs your camera at a modest resolution (~640×360).
- Frames are captured into an in-memory ring buffer (~20 fps, up to 5 s of history) as `ImageBitmap`s.
- A render loop draws the frame from *delay* seconds ago onto a canvas, with an on-canvas badge showing how far back you're looking.
- **Pop out** streams that canvas into a Picture-in-Picture window that floats above other apps.
- Old frames are discarded immediately. Nothing is saved, recorded, or sent anywhere.

No build step, no framework — static files only (`index.html`, `style.css`, `app.js` plus SEO assets).

## Deploying

The site is fully static: serve the repo root from any host. For GitHub Pages: repo **Settings → Pages → deploy from branch**. If you move it to a custom domain, update the `canonical`, `og:url`, `og:image`, and `twitter:image` URLs in `index.html`, plus `robots.txt` and `sitemap.xml`.

## Roadmap

- Gaze detection: notice when you look at the widget and auto-rewind to just before the glance.
- "Moments" reel: privately buffer the last 30 s so you can scrub (still nothing saved to disk).
- Framing guides: rule-of-thirds overlay, lighting hints.
- Native menu-bar app for an always-on-top window with zero tab-throttling.

---

© 2026 [Asrith Cheepurupalli](https://made-by-ac.com) · **made. by ac** · [GitHub](https://github.com/asrithcheepurupalli)
