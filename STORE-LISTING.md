# rearview, Chrome Web Store listing (paste-ready)

Every field below matches the shipped build (storage + activeTab, content
script on Meet, Zoom web and Teams, no network permission).
House rule: no em or en dashes in store copy.

---

## Item name
rearview, honest self-view for video calls

## Summary (132 char max)
A live mirror on a short delay. Glance over and see yourself as you were 3 seconds ago, exactly how the other person saw you.

## Category
Productivity > Communication

## Language
English (United States)

## Description
On a video call you can never see how you actually look to the other person.
The moment you glance at your self-view, your eyes have already moved. All you
ever see is your checking-the-mirror face, never your real mid-conversation
face.

rearview fixes that with a trick so simple it feels obvious afterwards: it
plays your own camera back to you on a short delay. Glance at it and you are
watching live, moving video of yourself from three seconds ago. Eyes still on
the screen, still talking, still reacting. Exactly what the other person just
saw.

How you use it:
- On Google Meet, Zoom (web) or Microsoft Teams, click the rearview icon and
  choose "Show mirror in this call". A small draggable mirror appears in the
  corner of the call itself.
- Anywhere else (or if you take calls in a desktop app), open the floating
  mirror window and park it near your webcam. It can also pop into an
  always-on-top Picture-in-Picture window.

Two things make it honest:
1. Time shift. You see your engaged face, not your glancing face. Pick Live,
   1s, 2s, 3s or 5s.
2. Unmirrored by default. Call apps flip your self-view like a bathroom
   mirror, but that is not what others see. rearview shows the unflipped
   truth, with a toggle if you prefer the mirror.

How it stays honest:
- Everything runs on your device. Frames live in memory for five seconds and
  are then discarded. Nothing is recorded, nothing is saved, nothing is
  uploaded.
- The extension asks for no network permission and makes no network requests
  of its own. Open your network tab and watch it stay silent.
- Its only page access is Meet, Zoom web and Teams, so it can draw the mirror
  inside your call.

From made. by ac.

## Single purpose description
Shows the user a delayed, optionally unmirrored preview of their own camera
during video calls so they can see how they appear to other participants.

## Permission justifications
- storage: saves the user's delay and mirror preferences.
- activeTab: detects whether the current tab is a supported call site so the
  popup can offer the in-call overlay instead of the floating window.
- Host access (meet.google.com, zoom.us/wc, teams.microsoft.com,
  teams.live.com): mounts the in-call mirror overlay inside the call tab when
  the user requests it. No data is read from or written to these pages.

## Privacy
- No data collected, no analytics, no accounts.
- Camera frames are processed in memory only and discarded within seconds.
- Privacy policy: https://asrithcheepurupalli.github.io/rearview./ (site)

## Assets checklist
- [ ] Screenshots 1280x800 (render from extension/store/_src, see airlock pattern)
- [ ] Small promo tile 440x280
- [ ] Marquee 1400x560 (optional)
- [x] Icon 128x128 (extension/icons/icon128.png)
