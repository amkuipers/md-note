---
name: verify
description: Build/launch/drive recipe for verifying md-note changes end-to-end in a real browser.
---

# Verifying md-note

No build step, no tests. `node --check server.js public/app.js` is the only syntax gate. Real verification means driving the app in a browser.

## Launch (three storage modes)

```sh
# server mode — use a throwaway data dir so real notes stay untouched
MD_NOTE_DATA=/tmp/md-note-test PORT=3123 node server.js &

# browser-store mode (static hosting)
python3 -m http.server 8124 -d public &

# browser-store mode (file://) — just open public/index.html
```

The app picks its store at boot: server mode if `api/desktops` answers with JSON, else localStorage (`md-note:desk:<id>`). Hover the save indicator (●) — its title names the active mode.

## Drive

Headless local Chrome via `playwright-core` works well (no browser download needed):

```js
const { chromium } = require('playwright-core');
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
```

Flows worth driving: add note via `#add-note-btn`, type, click canvas to blur/commit, wait ~900 ms for the 600 ms debounced save, then reload and check `.note-render`. In server mode also assert the `.md` file landed in the data dir. Export via `#export-btn` (waitForEvent('download')), import via `#import-btn` (waitForEvent('filechooser')).

## Gotchas

- `confirm`/`alert` are native dialogs — install a `page.on('dialog')` handler or deletes/imports hang.
- The initial `/api/desktops` probe 404s on static hosting by design; it's not an error.
- `md-note:last-desktop` in localStorage is shared across modes on the same origin; a stale id just falls back to the first desktop.
