# hindsight, Chrome Web Store listing (paste-ready)

Every field below matches the shipped build (storage + activeTab, content
script on Meet, Zoom web and Teams, no network permission).
House rule: no em or en dashes in store copy.

---

## Item name
hindsight, honest self-view for video calls

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

hindsight fixes that with a trick so simple it feels obvious afterwards: it
plays your own camera back to you on a short delay. Glance at it and you are
watching live, moving video of yourself from three seconds ago. Eyes still on
the screen, still talking, still reacting. Exactly what the other person just
saw.

How you use it:
- On Google Meet, Zoom (web) or Microsoft Teams, click the hindsight icon and
  choose "Show mirror in this call". A small draggable mirror appears in the
  corner of the call itself.
- Anywhere else (or if you take calls in a desktop app), open the floating
  mirror window and park it near your webcam. It can also pop into an
  always-on-top Picture-in-Picture window.

Two things make it honest:
1. Time shift. You see your engaged face, not your glancing face. Pick Live,
   1s, 2s, 3s or 5s.
2. Unmirrored by default. Call apps flip your self-view like a bathroom
   mirror, but that is not what others see. hindsight shows the unflipped
   truth, with a toggle if you prefer the mirror.

Hindsight is 20/20. Now your self-view is too.

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
- Privacy policy: https://hindsight.made-by-ac.com/privacy

## Assets checklist
- [x] Screenshots 1280x800 (extension/store/screenshot-{1,2,3}-1280x800.png;
      re-render from extension/store/_src with render.sh)
- [x] Small promo tile 440x280 (extension/store/promo-tile-440x280.png)
- [x] Marquee 1400x560 (extension/store/marquee-1400x560.png)
- [x] Icon 128x128 (extension/icons/icon128.png, ships inside the zip)
- [x] Privacy policy URL (https://hindsight.made-by-ac.com/privacy, live once
      the site deploys on the custom domain)

---

## Dev console walkthrough (every field, in order)

Prereqs: pay the one time 5 USD registration at
https://chrome.google.com/webstore/devconsole, verify the account email, and
make sure https://hindsight.made-by-ac.com/privacy is live first (the form
validates it). Then click "New item" and upload the zip from
`scripts/package-extension.sh`.

### Store listing tab
- Item name: from "Item name" above (comes from the manifest on upload).
- Summary: from "Summary" above (also prefilled from the manifest).
- Description: paste the "Description" section above.
- Category: Productivity > Communication. Language: English (United States).
- Store icon: auto-taken from the zip (icons/icon128.png).
- Screenshots: upload the three 1280x800 PNGs in order (1 = pitch,
  2 = in-call overlay, 3 = privacy).
- Small promo tile: promo-tile-440x280.png. Marquee: marquee-1400x560.png.
- Official URL: https://hindsight.made-by-ac.com (only selectable after the
  domain is verified in Google Search Console; skip if not verified yet).
- Homepage URL: https://hindsight.made-by-ac.com
- Support URL: https://github.com/asrithcheepurupalli/hindsight./issues

### Privacy tab
- Single purpose: paste the "Single purpose description" above.
- Permission justifications: paste each entry from "Permission
  justifications" above (storage, activeTab, host permissions).
- Remote code: select "No, I am not using remote code".
- Data usage: check NO boxes (no data collected of any type). The three
  certifications at the bottom (not selling data, no unrelated use, no
  creditworthiness use) all apply trivially: certify all three.
- Privacy policy URL: https://hindsight.made-by-ac.com/privacy

### Distribution tab
- Payments: Free. Visibility: Public. Distribution: all regions.

### After submit
- First review typically takes a few days. Camera-adjacent extensions can get
  a manual pass; the no-network-permission design and the privacy page are
  the answer to every question they ask.
- When approved, add the Web Store link to the site hero/nav and README.
