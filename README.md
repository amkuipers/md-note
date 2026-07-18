# md-note

Markdown sticky notes on a desktop canvas. The browser window becomes a desktop: create notes anywhere, drag them around, stack them, and edit their content as markdown. Multiple desktops with layout themes (kanban, SWOT, retrospective, …) are listed in a sidebar. Everything is saved to plain files on your local filesystem — or, when running without the Node server (see [Running without Node.js](#running-without-nodejs)), to the browser's localStorage.

## Installation

Requirements: [Node.js](https://nodejs.org) 18 or newer. Nothing else — the app has zero npm dependencies and no build step, so there is no `npm install` to run.

```sh
git clone https://github.com/amkuipers/md-note.git
cd md-note
```

## Start and stop

```sh
npm start            # or: node server.js
```

Then open <http://localhost:3000> in your browser.

Stop the server with **Ctrl+C** in the terminal. Edits are auto-saved a moment after you make them (watch the save indicator in the menu bar), and the app also flushes pending changes when you close the tab, so stopping the server when the indicator is idle loses nothing.

Options via environment variables:

```sh
PORT=8080 npm start              # serve on a different port (default 3000)
MD_NOTE_DATA=/path/to/dir npm start   # store data elsewhere (default ./data)
```

## Running without Node.js

The app is a static page; the Node server exists only to save notes as files in `data/`. When no server is present, the app detects this at startup and stores everything in the browser's localStorage instead. Three ways to run it server-less:

1. **Any static file server** — serve the `public/` folder with whatever you have:

   ```sh
   python3 -m http.server 8000 -d public    # then open http://localhost:8000
   # or: npx serve public
   ```

2. **Straight from the folder** — double-click `public/index.html` (or drag it into a browser). Works in Chrome, Edge, and Firefox; some browsers restrict localStorage for `file://` pages, in which case use option 1.

3. **GitHub Pages** — the repo ships a workflow (`.github/workflows/pages.yml`) that publishes `public/` on every push to `main`. Enable it once under **Settings → Pages → Build and deployment → Source: GitHub Actions**, then open <https://amkuipers.github.io/md-note/>.

In this mode your notes live in that browser's localStorage for that site only — they are not written to `data/`, not shared between browsers, and are lost if you clear site data. Use the menu bar's **⬇ Export** button to download all desktops as one JSON file, and **⬆ Import** to load such a file — that's how you back up, move notes between browsers, or carry them over to (or from) a Node-served instance. Hover the save indicator (●) to see which storage mode is active.

## How to use

### Desktops

- The **left sidebar** lists your desktops; click one to switch to it.
- **＋ Desktop** (menu bar) creates a new desktop; **click the desktop name** in the menu bar to rename it.
- The **theme selector** changes the desktop's layout: *free form, kanban, quadrants, SWOT, retrospective, pros & cons, weekly planner, business model canvas,* or *lean canvas*. Themes draw dashed zones on the canvas to arrange notes in — they guide layout, they don't restrict it.
- The **🗑 button** deletes the current desktop (with a confirmation prompt). This removes all its notes.

### Notes

- **Double-click** the canvas (or use **＋ Note**) to add a note where you clicked.
- **Drag** a note by its top bar to move it. While dragging, the theme zone under the note highlights; the note remembers which zone it was dropped in.
- **Click** a note's body to edit its markdown; click elsewhere (or press **Escape**) to commit and render it. Markdown is GitHub-flavored, and links in rendered notes are clickable.
- The **◐ button** cycles the note's color (yellow, pink, blue, green, purple); the **✕ button** deletes the note; drag the **corner handle** to resize.

### Stacks

- **Drop a note onto another note** to stack them. Dragging any member of a stack moves the whole stack.
- **Shift-drag** pulls a single note out of its stack.
- The top note of a stack shows a **count badge** — click it to unstack all notes at once.

### Moving notes between desktops

- **Drag a note onto a desktop in the sidebar** to move it to that desktop. The target row highlights while you hover it; the note keeps its position and lands in whatever theme zone sits there on the target desktop.
- Dragging a **stack** onto a sidebar desktop moves the whole stack in one go.
- Dropping a note on the sidebar background (not on a desktop) snaps it back to where it was.

### Outline view, copying and printing

The **Board / Outline** toggle in the menu bar switches between two views of the same desktop:

- **Board** — the sticky-note canvas you edit on.
- **Outline** — a read-only text document: the desktop name, each theme box name as a heading, and under it the rendered markdown of every note in that box (top-to-bottom, left-to-right; notes outside any box appear under *Unassigned*). It is text-complete — empty notes and empty boxes are listed too — and fully selectable. The **⧉ Copy** button copies the whole outline to the clipboard as plain markdown for pasting into other applications.

**Printing** (⌘P) prints whichever view is active, always without the sidebar and toolbar:

- **Board** prints as a landscape snapshot: white page (no dot grid, no zone fill — only the dashed box borders and labels, to save ink), sticky notes keep their colors, and the whole board is scaled to fit one sheet.
- **Outline** prints portrait as a compact text document grouped by box names — smaller type, page breaks avoided inside a note. No colors needed.

> Safari ignores the CSS that requests landscape paper for board printing — pick **Landscape** in Safari's print dialog yourself. Chrome and Edge preselect it.

### Screen sizes

Note positions and sizes are stored as **fractions of the canvas**, not pixels — a layout arranged on a 4K monitor keeps its shape on a 2K laptop (and live window resizes rescale the notes as you watch). Because theme zones are fractional too, every note stays in its zone regardless of resolution.

A **? help menu** in the menu bar summarizes these gestures in the app itself.

## Data format

All data lives under the `data/` directory (or `MD_NOTE_DATA` if set), one folder per desktop:

```
data/
└── <desktop-id>/               # slug of the desktop name, e.g. "weekly-planning"
    ├── desktop.json            # desktop name, theme, and note layout metadata
    └── notes/
        ├── n-….md              # one plain-markdown file per note
        └── …
```

Content and layout are deliberately kept apart:

- **`notes/<id>.md`** holds only the note's markdown text. You can read and edit these files in any editor, sync them, or grep them — external edits show up in the app on the next load.
- **`desktop.json`** holds everything about *where* notes are, not what they say:

  ```json
  {
    "version": 2,
    "name": "Weekly planning",
    "theme": "kanban",
    "notes": [
      {
        "id": "n-abc123",
        "x": 0.0625, "y": 0.0833,
        "w": 0.1146, "h": 0.1875,
        "z": 3,
        "color": "yellow",
        "stackId": "s-xyz789",
        "zone": "todo"
      }
    ]
  }
  ```

  Per note: position (`x`, `y`), size (`w`, `h`), stacking order (`z`), `color`, the `stackId` shared by notes stacked together (`null` when unstacked), and the theme `zone` the note was last dropped in.

  **Format versions.** In version 2 (current), `x`/`y`/`w`/`h` are fractions (0–1) of the canvas width and height, which is what makes layouts independent of screen resolution. Version 1 files — no `version` field, coordinates in pixels — still load: the app converts them using the current window size (clamping anything off-screen back into view) and writes them back as version 2 on the next save. There is nothing to migrate by hand.

The server exposes this same model as a small JSON API under `/api/desktops` (list/create desktops; get/save/delete a desktop with its notes inlined), which is what the frontend talks to.

Backing up or moving your notes is just copying the `data/` directory — or using the **Export**/**Import** buttons in the menu bar, which work in both storage modes.

When running without the server, the same desktop model (with note contents inlined) is stored per desktop under localStorage keys `md-note:desk:<desktop-id>`.
