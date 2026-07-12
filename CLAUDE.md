# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**md-note** is a single-page web application that turns the browser window into a desktop for markdown sticky notes: create notes anywhere, drag them, stack/unstack them, edit content as markdown. A left sidebar lists and switches desktops; a menu bar above the canvas renames the current desktop, changes its theme, adds notes/desktops, deletes the desktop (with confirmation), and holds the help menu. Each desktop has a theme (free form, kanban, quadrants, SWOT, retrospective, pros & cons, weekly planner, business model canvas, lean canvas) that draws layout zones. Content and layout persist to the local filesystem.

## Commands

```sh
npm start          # or: node server.js — serves the app at http://localhost:3000
PORT=8080 npm start            # change port
MD_NOTE_DATA=/path npm start   # change data directory (default: ./data)
```

There is no build step, bundler, linter, or test framework. The frontend is plain HTML/CSS/JS served statically; `node --check server.js public/app.js` is the only syntax gate. Node >= 18, zero npm dependencies (`marked` is vendored at `public/vendor/marked.min.js`).

## Architecture

Two pieces:

- **`server.js`** — zero-dependency Node HTTP server. Serves `public/` statically and exposes a JSON API under `/api/desktops`. It exists solely because a static page cannot write to the local filesystem portably; all app logic lives client-side.
- **`public/app.js`** — the entire frontend (vanilla JS, no framework). `index.html` is a static shell; `app.js` owns all state and DOM.

### On-disk data model (the core contract)

```
data/<desktop-id>/desktop.json    # name, theme, notes[] layout metadata (x, y, w, h, z, color, stackId, zone)
data/<desktop-id>/notes/<id>.md   # note content, plain markdown
```

Content and layout are deliberately separated so `.md` files stay readable/editable outside the app. `PUT /api/desktops/:id` receives the **full desktop state including note contents**; the server splits it — layout into `desktop.json`, each note's `content` into its `.md` file — and deletes `.md` files for notes no longer present. `GET /api/desktops/:id` re-joins them. `POST` on the same path is an alias for `PUT` so `keepalive` saves work on tab close.

### Frontend concepts

- **Single source of truth** is the `desk` object (active desktop + notes array). DOM elements per note live in the `noteEls` map; `updateNoteEl(note)` pushes state → DOM. Any mutation calls `markDirty()`, which debounces (600 ms) a full-state `PUT`.
- **Stacks are first-class, not z-index**: notes stacked on each other share a `stackId`. Dragging any member moves the whole group; shift-drag pulls one note out; the count badge (shown on the top note) unstacks all. Stacking is triggered by dropping a note whose center lands on another note. `dissolveTinyStacks()` clears `stackId` from 1-member stacks.
- **Themes are zone layouts, not skins**: `THEMES` in `app.js` maps theme key → zones with fractional rects (`x/y/w/h` in 0..1 of canvas size). Zones render as dashed backgrounds, highlight during drag, and each note records the `zone` its center sits in on drop. Adding a theme = adding an entry to `THEMES`.
- **Markdown editing** toggles per note between a rendered div (`marked`, GFM + breaks) and a textarea; blur commits and re-renders.

### Conventions

- Desktop ids are slugs of the name (server-generated, uniqued with `-2`, `-3`…); note/stack ids are client-generated (`n-…`, `s-…`). The server validates all ids against `ID_RE` — keep that on any new route (it's the path-traversal guard along with the `PUBLIC_DIR` prefix check in `serveStatic`).
