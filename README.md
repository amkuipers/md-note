# md-note

Markdown sticky notes on a desktop canvas. The browser window becomes a desktop: create notes anywhere, drag them around, stack them, and edit their content as markdown. Multiple desktops with layout themes (kanban, SWOT, retrospective, …) are listed in a sidebar. Everything is saved to plain files on your local filesystem.

## Installation

Requirements: [Node.js](https://nodejs.org) 18 or newer. Nothing else — the app has zero npm dependencies and no build step, so there is no `npm install` to run.

```sh
git clone <repo-url> md-note
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
    "name": "Weekly planning",
    "theme": "kanban",
    "notes": [
      {
        "id": "n-abc123",
        "x": 120, "y": 80,
        "w": 220, "h": 180,
        "z": 3,
        "color": "yellow",
        "stackId": "s-xyz789",
        "zone": "todo"
      }
    ]
  }
  ```

  Per note: position (`x`, `y`), size (`w`, `h`), stacking order (`z`), `color`, the `stackId` shared by notes stacked together (`null` when unstacked), and the theme `zone` the note was last dropped in.

The server exposes this same model as a small JSON API under `/api/desktops` (list/create desktops; get/save/delete a desktop with its notes inlined), which is what the frontend talks to.

Backing up or moving your notes is just copying the `data/` directory.
