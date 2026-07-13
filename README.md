# Rearview

**See yourself the way they *just* saw you.**

A time-shifted live mirror for video calls. Runs entirely in your browser — no install, no account, no servers, nothing recorded or uploaded.

## The problem

On a video call, you can never see how you actually look to the other person. The moment you glance at your self-view tile, your eyes have already moved — so all you ever see is your *checking-the-mirror* face, never your real *mid-conversation* face. Freezing the frame or taking a screenshot loses the live feel entirely.

## The solution

Rearview plays your own camera back to you on a short, adjustable delay (default 3 seconds). When you glance at it, you're watching **live, continuously moving video of yourself from a few seconds ago** — eyes still on the screen, still talking, still reacting. Exactly what the other participants just saw.

Two things make it honest:

1. **Time shift** — you see your engaged face, not your glancing face.
2. **Unmirrored by default** — call apps flip your self-view like a bathroom mirror, but that's not what others see. Rearview shows the unflipped view (with a toggle if you prefer the mirror).

## How to use it

1. Open `index.html` (or the hosted page) in Chrome or Edge.
2. Click **Start camera** and allow camera access.
3. Set your delay (0–5 s) and click **Pop out (Picture-in-Picture)**.
4. Park the small floating window near your webcam and join your call in any app — Zoom, Meet, Teams, anything. Glance at the floating window whenever you want an honest look at yourself.

> **Note:** keep the Rearview tab visible or popped out. Browsers throttle fully hidden background tabs, which can pause the delayed feed.

## How it works

- `getUserMedia` grabs your camera at a modest resolution (~640×360).
- Frames are captured into an in-memory ring buffer (~20 fps, up to 5 s of history) as `ImageBitmap`s.
- A render loop draws the frame from *delay* seconds ago onto a canvas, with an on-canvas badge showing how far back you're looking.
- **Pop out** streams that canvas into a Picture-in-Picture window that floats above other apps.
- Old frames are discarded immediately. Nothing is saved, recorded, or sent anywhere.

No build step, no dependencies — three static files (`index.html`, `style.css`, `app.js`).

## Publishing / distribution ideas

- **GitHub Pages** (easiest): repo Settings → Pages → deploy from branch. Free hosting, instant shareable URL, works because the app is fully static.
- **Product Hunt / social launch** once it's on a URL — it demos itself in 10 seconds.
- **Browser extension** (later): same code in a popup, one-click from the toolbar during a call.
- **Native menu-bar app** (later): an always-on-top window that doesn't depend on browser tab throttling.

## Ideas for v2

- Gaze detection: notice when you look at the widget and auto-rewind to just before the glance.
- "Moments" reel: privately buffer the last 30 s so you can scrub (still nothing saved to disk).
- Framing guides: rule-of-thirds overlay, lighting hints.
