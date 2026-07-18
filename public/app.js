/* md-note frontend — vanilla JS, no build step. */
'use strict';

/* ---------------- themes ---------------- */

const THEMES = {
  free: { label: 'Free form', zones: [] },
  kanban: {
    label: 'Kanban',
    zones: [
      { id: 'todo', label: 'To Do', x: 0, y: 0, w: 1 / 3, h: 1 },
      { id: 'doing', label: 'In Progress', x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { id: 'done', label: 'Done', x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  quadrants: {
    label: 'Quadrants',
    zones: [
      { id: 'q1', label: 'Urgent · Important', x: 0, y: 0, w: 0.5, h: 0.5 },
      { id: 'q2', label: 'Not Urgent · Important', x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { id: 'q3', label: 'Urgent · Not Important', x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { id: 'q4', label: 'Not Urgent · Not Important', x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  swot: {
    label: 'SWOT Analysis',
    zones: [
      { id: 'strengths', label: 'Strengths', x: 0, y: 0, w: 0.5, h: 0.5 },
      { id: 'weaknesses', label: 'Weaknesses', x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { id: 'opportunities', label: 'Opportunities', x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { id: 'threats', label: 'Threats', x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  retro: {
    label: 'Retrospective',
    zones: [
      { id: 'well', label: 'Went Well', x: 0, y: 0, w: 1 / 3, h: 1 },
      { id: 'improve', label: 'To Improve', x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { id: 'actions', label: 'Action Items', x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  proscons: {
    label: 'Pros & Cons',
    zones: [
      { id: 'pros', label: 'Pros', x: 0, y: 0, w: 0.5, h: 1 },
      { id: 'cons', label: 'Cons', x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  week: {
    label: 'Weekly Planner',
    zones: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
      (day, i) => ({ id: day.toLowerCase(), label: day, x: i / 7, y: 0, w: 1 / 7, h: 1 })
    ),
  },
  bmc: {
    label: 'Business Model Canvas',
    zones: [
      { id: 'partners', label: 'Key Partners', x: 0, y: 0, w: 0.2, h: 0.6 },
      { id: 'activities', label: 'Key Activities', x: 0.2, y: 0, w: 0.2, h: 0.3 },
      { id: 'resources', label: 'Key Resources', x: 0.2, y: 0.3, w: 0.2, h: 0.3 },
      { id: 'value', label: 'Value Propositions', x: 0.4, y: 0, w: 0.2, h: 0.6 },
      { id: 'relationships', label: 'Customer Relationships', x: 0.6, y: 0, w: 0.2, h: 0.3 },
      { id: 'channels', label: 'Channels', x: 0.6, y: 0.3, w: 0.2, h: 0.3 },
      { id: 'segments', label: 'Customer Segments', x: 0.8, y: 0, w: 0.2, h: 0.6 },
      { id: 'costs', label: 'Cost Structure', x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { id: 'revenue', label: 'Revenue Streams', x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
  },
  lean: {
    label: 'Lean Canvas',
    zones: [
      { id: 'problem', label: 'Problem', x: 0, y: 0, w: 0.2, h: 0.6 },
      { id: 'solution', label: 'Solution', x: 0.2, y: 0, w: 0.2, h: 0.3 },
      { id: 'metrics', label: 'Key Metrics', x: 0.2, y: 0.3, w: 0.2, h: 0.3 },
      { id: 'uvp', label: 'Unique Value Proposition', x: 0.4, y: 0, w: 0.2, h: 0.6 },
      { id: 'advantage', label: 'Unfair Advantage', x: 0.6, y: 0, w: 0.2, h: 0.3 },
      { id: 'channels', label: 'Channels', x: 0.6, y: 0.3, w: 0.2, h: 0.3 },
      { id: 'segments', label: 'Customer Segments', x: 0.8, y: 0, w: 0.2, h: 0.6 },
      { id: 'costs', label: 'Cost Structure', x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { id: 'revenue', label: 'Revenue Streams', x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
  },
};

const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple'];
const DEFAULT_NOTE = { w: 220, h: 170 };
const STACK_OFFSET = 16;

marked.use({ gfm: true, breaks: true });

/* ---------------- state ---------------- */

let desktops = []; // sidebar entries {id, name, theme}
let desk = null; // active desktop {id, name, theme, notes:[]}
let zCounter = 1;
let saveTimer = null;
let dirty = false;

const $ = (sel, el = document) => el.querySelector(sel);
const canvas = $('#canvas');
const zonesEl = $('#zones');
const noteEls = new Map(); // note id -> element

const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* ---------------- persistence ----------------
 * All storage goes through `store`, picked once at boot:
 *  - serverStore  → the Node server's /api/desktops (data/ folder on disk)
 *  - browserStore → localStorage, used when no API answers (static hosting,
 *    GitHub Pages, or opening index.html straight from a folder)
 * Both expose: list, create, load, save, remove, saveOnUnload.
 *
 * File format version 2: on disk, note x/y/w/h are fractions (0..1) of the
 * canvas size, so a layout made on a 4K screen keeps its shape on a smaller
 * one. In memory the app works in pixels: normalizeDesk() converts on load
 * (and migrates version-1 pixel files), serializeDesk() converts on save —
 * every store.save/saveOnUnload call must go through serializeDesk().
 */

let store = null;

const FORMAT_VERSION = 2;

function canvasSize() {
  return { cw: Math.max(1, canvas.clientWidth), ch: Math.max(1, canvas.clientHeight) };
}

const frac = (v) => +v.toFixed(4);

function normalizeDesk(d) {
  const { cw, ch } = canvasSize();
  const notes = (Array.isArray(d.notes) ? d.notes : []).map((n) => {
    if (d.version === FORMAT_VERSION) {
      return {
        ...n,
        x: Math.round((n.x || 0) * cw),
        y: Math.round((n.y || 0) * ch),
        w: Math.round((n.w || 0) * cw) || DEFAULT_NOTE.w,
        h: Math.round((n.h || 0) * ch) || DEFAULT_NOTE.h,
      };
    }
    // version 1 stored pixels from an unknown screen — clamp into this one
    const w = Math.min(n.w || DEFAULT_NOTE.w, cw);
    const h = Math.min(n.h || DEFAULT_NOTE.h, ch);
    const x = Math.min(Math.max(0, n.x || 0), cw - w);
    const y = Math.min(Math.max(0, n.y || 0), ch - h);
    // clamping may have shifted the note, so re-derive its zone
    return { ...n, x, y, w, h, zone: zoneAt(x + w / 2, y + h / 2, d.theme) };
  });
  return { ...d, version: FORMAT_VERSION, notes };
}

function serializeDesk(d) {
  const { cw, ch } = canvasSize();
  return {
    id: d.id,
    version: FORMAT_VERSION,
    name: d.name,
    theme: d.theme,
    notes: (d.notes || []).map((n) => ({
      ...n,
      x: frac(n.x / cw),
      y: frac(n.y / ch),
      w: frac(n.w / cw),
      h: frac(n.h / ch),
    })),
  };
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

// paths are relative so the app also works when served under a subpath
const serverStore = {
  label: 'data/ folder (server)',
  list: () => api('api/desktops'),
  create: (name, theme) =>
    api('api/desktops', { method: 'POST', body: JSON.stringify({ name, theme }) }),
  load: (id) => api(`api/desktops/${id}`),
  save: (id, d) => api(`api/desktops/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => api(`api/desktops/${id}`, { method: 'DELETE' }),
  // best-effort save when the tab closes mid-debounce (POST = PUT alias)
  saveOnUnload(d) {
    fetch(`api/desktops/${d.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
      keepalive: true,
    });
  },
};

const LS_PREFIX = 'md-note:desk:';

// mirrors server.js slugify so ids look the same in both modes
function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'desktop'
  );
}

const browserStore = {
  label: 'this browser (localStorage)',
  ids() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(LS_PREFIX)) out.push(k.slice(LS_PREFIX.length));
    }
    return out;
  },
  read(id) {
    const raw = localStorage.getItem(LS_PREFIX + id);
    if (raw === null) throw new Error('desktop not found');
    return { ...JSON.parse(raw), id };
  },
  write(id, d) {
    localStorage.setItem(
      LS_PREFIX + id,
      // no version field (pre-v2 entry) → normalizeDesk treats it as v1 pixels
      JSON.stringify({ version: d.version, name: d.name, theme: d.theme, notes: d.notes || [] })
    );
  },
  async list() {
    return this.ids()
      .map((id) => {
        try {
          const d = this.read(id);
          return { id, name: d.name, theme: d.theme, noteCount: (d.notes || []).length };
        } catch {
          return null; // skip corrupt entries
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  async create(name, theme) {
    name = String(name || '').trim();
    if (!name) throw new Error('name is required');
    let id = slugify(name);
    for (let n = 2; localStorage.getItem(LS_PREFIX + id) !== null; n++)
      id = `${slugify(name)}-${n}`;
    const d = { id, version: FORMAT_VERSION, name, theme: String(theme || 'free'), notes: [] };
    this.write(id, d);
    return d;
  },
  async load(id) {
    return this.read(id);
  },
  async save(id, d) {
    this.write(id, d);
    return { ok: true };
  },
  async remove(id) {
    localStorage.removeItem(LS_PREFIX + id);
    return { ok: true };
  },
  // localStorage is synchronous, so an unload save is just a save
  saveOnUnload(d) {
    this.write(d.id, d);
  },
};

async function pickStore() {
  if (location.protocol !== 'file:') {
    try {
      const res = await fetch('api/desktops');
      if (res.ok && (res.headers.get('content-type') || '').includes('json'))
        return serverStore;
    } catch {
      /* no server → fall through to browser storage */
    }
  }
  return browserStore;
}

function markDirty() {
  dirty = true;
  $('#save-indicator').className = 'dirty';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 600);
}

async function flushSave() {
  if (!dirty || !desk) return;
  clearTimeout(saveTimer);
  dirty = false;
  try {
    await store.save(desk.id, serializeDesk(desk));
    $('#save-indicator').className = '';
  } catch (err) {
    dirty = true;
    $('#save-indicator').className = 'error';
    $('#save-indicator').title = `save failed: ${err.message}`;
  }
}

window.addEventListener('beforeunload', () => {
  if (dirty && desk) store.saveOnUnload(serializeDesk(desk));
});

/* ---------------- desktops / sidebar ---------------- */

async function refreshDesktopList() {
  desktops = await store.list();
  const ul = $('#desktop-list');
  ul.innerHTML = '';
  for (const d of desktops) {
    const li = document.createElement('li');
    li.dataset.deskId = d.id;
    li.classList.toggle('active', desk && d.id === desk.id);
    li.innerHTML = `
      <div class="desk-row">
        <span class="desk-name"></span>
        <button class="desk-del" title="Delete desktop">✕</button>
      </div>
      <span class="desk-theme"></span>`;
    $('.desk-name', li).textContent = d.name;
    $('.desk-theme', li).textContent = (THEMES[d.theme] || THEMES.free).label;
    li.addEventListener('click', () => switchDesktop(d.id));
    $('.desk-del', li).addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDesktopById(d.id, d.name);
    });
    ul.appendChild(li);
  }
}

async function deleteDesktopById(id, name) {
  if (!confirm(`Delete desktop "${name}" and all its notes?`)) return;
  await store.remove(id);
  if (desk && desk.id === id) {
    dirty = false; // discard pending saves for the deleted desktop
    desk = null;
    await loadInitialDesktop();
  }
  await refreshDesktopList();
}

async function createNewDesktop() {
  const base = 'Untitled';
  const taken = desktops.filter((d) => d.name.startsWith(base)).length;
  const name = taken ? `${base} ${taken + 1}` : base;
  const d = await store.create(name, 'free');
  await switchDesktop(d.id);
  $('#desk-name').focus();
  $('#desk-name').select();
}

async function switchDesktop(id) {
  if (desk && desk.id === id) return;
  await flushSave();
  desk = normalizeDesk(await store.load(id));
  localStorage.setItem('md-note:last-desktop', id);
  zCounter = Math.max(1, ...desk.notes.map((n) => n.z || 1)) + 1;
  renderDesktop();
  refreshDesktopList();
}

async function loadInitialDesktop() {
  desktops = await store.list();
  if (desktops.length === 0) {
    const d = await store.create('My Desktop', 'free');
    desktops = [d];
  }
  const last = localStorage.getItem('md-note:last-desktop');
  const target = desktops.find((d) => d.id === last) || desktops[0];
  await switchDesktop(target.id);
}

/* ---------------- export / import ---------------- */

async function exportAll() {
  await flushSave();
  const list = await store.list();
  const desktopsFull = [];
  // normalize→serialize migrates any still-v1 desktop to v2 fractions
  for (const d of list) desktopsFull.push(serializeDesk(normalizeDesk(await store.load(d.id))));
  const blob = new Blob([JSON.stringify({ version: FORMAT_VERSION, desktops: desktopsFull }, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'md-note-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// import adds desktops, never overwrites: create() uniques clashing ids
async function importFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    alert('Not a valid JSON file.');
    return;
  }
  const list = Array.isArray(data) ? data : data.desktops;
  if (!Array.isArray(list)) {
    alert('Not an md-note export (expected { desktops: [...] }).');
    return;
  }
  let imported = 0;
  for (const d of list) {
    if (!d || typeof d.name !== 'string' || !Array.isArray(d.notes)) continue;
    const created = await store.create(d.name, d.theme || 'free');
    // accepts v1 (pixel) and v2 (fractional) exports alike
    const v2 = serializeDesk(normalizeDesk({ ...d, theme: d.theme || 'free' }));
    await store.save(created.id, { ...v2, id: created.id });
    imported++;
  }
  await refreshDesktopList();
  alert(imported ? `Imported ${imported} desktop(s).` : 'No desktops found in that file.');
}

/* ---------------- cross-desktop move ---------------- */

// the sidebar desktop entry under the pointer, if it isn't the active desktop
// (rect check instead of elementFromPoint: the dragged note follows the cursor)
function sidebarDropTarget(clientX, clientY) {
  for (const li of $('#desktop-list').children) {
    const r = li.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom)
      return li.dataset.deskId !== desk.id ? li : null;
  }
  return null;
}

// destination is saved before the source forgets the notes, so a failure
// mid-move can at worst duplicate a note, never lose one
async function moveGroupToDesktop(group, targetId) {
  const target = normalizeDesk(await store.load(targetId));
  let z = Math.max(0, ...target.notes.map((n) => n.z || 0));
  const moved = group
    .slice()
    .sort((a, b) => (a.z || 0) - (b.z || 0))
    .map((n) => ({ ...n, z: ++z, zone: zoneAt(n.x + n.w / 2, n.y + n.h / 2, target.theme) }));
  target.notes.push(...moved);
  await store.save(targetId, serializeDesk(target));

  const ids = new Set(group.map((n) => n.id));
  desk.notes = desk.notes.filter((n) => !ids.has(n.id));
  for (const id of ids) {
    noteEls.get(id)?.remove();
    noteEls.delete(id);
  }
  dissolveTinyStacks();
  updateStackBadges();
  markDirty();
  await flushSave();
}

/* ---------------- zones ---------------- */

function themeZones(theme = desk?.theme) {
  return (THEMES[theme] || THEMES.free).zones;
}

function renderZones() {
  zonesEl.innerHTML = '';
  for (const z of themeZones()) {
    const el = document.createElement('div');
    el.className = 'zone';
    el.dataset.zone = z.id;
    el.style.left = `${z.x * 100}%`;
    el.style.top = `${z.y * 100}%`;
    el.style.width = `${z.w * 100}%`;
    el.style.height = `${z.h * 100}%`;
    el.innerHTML = `<span class="zone-label"></span>`;
    $('.zone-label', el).textContent = z.label;
    zonesEl.appendChild(el);
  }
}

function zoneAt(px, py, theme = desk?.theme) {
  const { clientWidth: cw, clientHeight: ch } = canvas;
  for (const z of themeZones(theme)) {
    if (px >= z.x * cw && px < (z.x + z.w) * cw && py >= z.y * ch && py < (z.y + z.h) * ch)
      return z.id;
  }
  return null;
}

function highlightZone(zoneId) {
  for (const el of zonesEl.children) el.classList.toggle('active', el.dataset.zone === zoneId);
}

/* ---------------- notes ---------------- */

function groupOf(note) {
  if (!note.stackId) return [note];
  return desk.notes.filter((n) => n.stackId === note.stackId);
}

function bringToFront(note) {
  const group = groupOf(note).sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const n of group) {
    n.z = zCounter++;
    const el = noteEls.get(n.id);
    if (el) el.style.zIndex = n.z;
  }
}

function updateNoteEl(note) {
  const el = noteEls.get(note.id);
  if (!el) return;
  el.style.left = `${note.x}px`;
  el.style.top = `${note.y}px`;
  el.style.width = `${note.w}px`;
  el.style.height = `${note.h}px`;
  el.style.zIndex = note.z || 1;
  el.className = `note note--${COLORS.includes(note.color) ? note.color : 'yellow'}`;
}

function updateStackBadges() {
  for (const note of desk.notes) {
    const el = noteEls.get(note.id);
    if (!el) continue;
    const badge = $('.stack-badge', el);
    const group = groupOf(note);
    const isTop = group.length > 1 && note.z === Math.max(...group.map((n) => n.z || 0));
    badge.hidden = !isTop;
    if (isTop) badge.textContent = group.length;
  }
}

function restackPositions(stackId) {
  const members = desk.notes
    .filter((n) => n.stackId === stackId)
    .sort((a, b) => (a.z || 0) - (b.z || 0));
  if (members.length === 0) return;
  const base = members[0];
  members.forEach((n, i) => {
    n.x = base.x + i * STACK_OFFSET;
    n.y = base.y + i * STACK_OFFSET;
    updateNoteEl(n);
  });
}

function unstack(stackId) {
  const members = desk.notes
    .filter((n) => n.stackId === stackId)
    .sort((a, b) => (a.z || 0) - (b.z || 0));
  members.forEach((n, i) => {
    n.stackId = null;
    n.x = members[0].x + i * (n.w + 14);
    n.zone = zoneAt(n.x + n.w / 2, n.y + n.h / 2);
    updateNoteEl(n);
  });
  updateStackBadges();
  markDirty();
}

function dissolveTinyStacks() {
  const counts = {};
  for (const n of desk.notes) if (n.stackId) counts[n.stackId] = (counts[n.stackId] || 0) + 1;
  for (const n of desk.notes) if (n.stackId && counts[n.stackId] < 2) n.stackId = null;
}

function createNote(x, y) {
  const note = {
    id: uid('n'),
    x: Math.round(x),
    y: Math.round(y),
    w: DEFAULT_NOTE.w,
    h: DEFAULT_NOTE.h,
    z: zCounter++,
    color: COLORS[desk.notes.length % COLORS.length],
    stackId: null,
    zone: zoneAt(x + DEFAULT_NOTE.w / 2, y + DEFAULT_NOTE.h / 2),
    content: '',
  };
  desk.notes.push(note);
  mountNote(note);
  markDirty();
  startEditing(note);
}

function deleteNote(note) {
  desk.notes = desk.notes.filter((n) => n.id !== note.id);
  noteEls.get(note.id)?.remove();
  noteEls.delete(note.id);
  dissolveTinyStacks();
  updateStackBadges();
  markDirty();
}

function renderMarkdown(note) {
  const el = noteEls.get(note.id);
  const render = $('.note-render', el);
  render.innerHTML = marked.parse(note.content || '');
  render.classList.toggle('placeholder', !note.content.trim());
}

function startEditing(note) {
  const el = noteEls.get(note.id);
  const render = $('.note-render', el);
  const edit = $('.note-edit', el);
  render.hidden = true;
  edit.hidden = false;
  edit.value = note.content;
  edit.focus();
  edit.setSelectionRange(edit.value.length, edit.value.length);
}

function stopEditing(note) {
  const el = noteEls.get(note.id);
  const edit = $('.note-edit', el);
  if (edit.hidden) return;
  if (edit.value !== note.content) {
    note.content = edit.value;
    markDirty();
  }
  edit.hidden = true;
  $('.note-render', el).hidden = false;
  renderMarkdown(note);
}

function mountNote(note) {
  const el = document.createElement('div');
  el.dataset.id = note.id;
  el.innerHTML = `
    <div class="note-head">
      <button class="stack-badge" hidden title="Unstack all"></button>
      <span class="drag-space"></span>
      <button class="color-btn" title="Change color">◐</button>
      <button class="del-btn" title="Delete note">✕</button>
    </div>
    <div class="note-body">
      <div class="note-render"></div>
      <textarea class="note-edit" hidden spellcheck="false"
        placeholder="# Markdown here…"></textarea>
    </div>
    <div class="resize-handle"></div>`;
  canvas.appendChild(el);
  noteEls.set(note.id, el);
  updateNoteEl(note);
  renderMarkdown(note);

  const head = $('.note-head', el);
  head.addEventListener('pointerdown', (e) => onDragStart(e, note));

  $('.del-btn', el).addEventListener('click', () => deleteNote(note));
  $('.color-btn', el).addEventListener('click', () => {
    note.color = COLORS[(COLORS.indexOf(note.color) + 1) % COLORS.length];
    updateNoteEl(note);
    markDirty();
  });
  $('.stack-badge', el).addEventListener('click', (e) => {
    e.stopPropagation();
    if (note.stackId) unstack(note.stackId);
  });

  const render = $('.note-render', el);
  render.addEventListener('click', (e) => {
    if (e.target.closest('a')) return; // let links work
    bringToFront(note);
    startEditing(note);
  });
  const edit = $('.note-edit', el);
  edit.addEventListener('blur', () => stopEditing(note));
  edit.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') edit.blur();
  });

  $('.resize-handle', el).addEventListener('pointerdown', (e) => onResizeStart(e, note));
}

/* ---------------- drag & stack ---------------- */

function onDragStart(e, note) {
  if (e.target.closest('button')) return;
  e.preventDefault();
  document.activeElement?.blur(); // commit any open editor

  // shift-drag pulls a note out of its stack
  if (e.shiftKey && note.stackId) {
    note.stackId = null;
    dissolveTinyStacks();
  }
  bringToFront(note);
  const group = groupOf(note);
  const startPoses = group.map((n) => ({ n, x: n.x, y: n.y }));
  const startX = e.clientX;
  const startY = e.clientY;
  const el = noteEls.get(note.id);
  el.classList.add('dragging');
  el.setPointerCapture(e.pointerId);
  let dropLi = null; // sidebar desktop currently hovered as a move target

  const onMove = (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    for (const p of startPoses) {
      p.n.x = Math.round(p.x + dx);
      p.n.y = Math.round(p.y + dy);
      updateNoteEl(p.n);
    }
    highlightZone(zoneAt(note.x + note.w / 2, note.y + note.h / 2));
    const li = sidebarDropTarget(ev.clientX, ev.clientY);
    if (li !== dropLi) {
      dropLi?.classList.remove('drop-target');
      dropLi = li;
      dropLi?.classList.add('drop-target');
    }
  };

  const onUp = (ev) => {
    el.classList.remove('dragging');
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    highlightZone(null);
    dropLi?.classList.remove('drop-target');

    // dropped on another desktop in the sidebar → move the whole group there,
    // keeping the spot it occupied before the drag started
    if (dropLi && ev.type === 'pointerup') {
      const targetId = dropLi.dataset.deskId;
      for (const p of startPoses) {
        p.n.x = p.x;
        p.n.y = p.y;
        updateNoteEl(p.n);
      }
      moveGroupToDesktop(group, targetId).catch((err) => alert(`Move failed: ${err.message}`));
      return;
    }

    // dropped outside the canvas (sidebar background, menu bar) → snap back
    const rect = canvas.getBoundingClientRect();
    if (
      ev.clientX < rect.left || ev.clientX > rect.right ||
      ev.clientY < rect.top || ev.clientY > rect.bottom
    ) {
      for (const p of startPoses) {
        p.n.x = p.x;
        p.n.y = p.y;
        updateNoteEl(p.n);
      }
      updateStackBadges();
      return;
    }

    // stack if dropped onto a note outside the dragged group
    const groupIds = new Set(group.map((n) => n.id));
    const cx = note.x + note.w / 2;
    const cy = note.y + note.h / 2;
    const target = desk.notes
      .filter(
        (n) =>
          !groupIds.has(n.id) &&
          cx >= n.x && cx <= n.x + n.w &&
          cy >= n.y && cy <= n.y + n.h
      )
      .sort((a, b) => (b.z || 0) - (a.z || 0))[0];

    if (target) {
      const stackId = target.stackId || (target.stackId = uid('s'));
      for (const n of group) n.stackId = stackId;
      bringToFront(note);
      restackPositions(stackId);
    }
    for (const n of desk.notes) n.zone = zoneAt(n.x + n.w / 2, n.y + n.h / 2);
    updateStackBadges();
    markDirty();
  };

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
}

function onResizeStart(e, note) {
  e.preventDefault();
  e.stopPropagation();
  const el = noteEls.get(note.id);
  const handle = $('.resize-handle', el);
  handle.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  const startY = e.clientY;
  const startW = note.w;
  const startH = note.h;

  const onMove = (ev) => {
    note.w = Math.max(160, Math.round(startW + ev.clientX - startX));
    note.h = Math.max(120, Math.round(startH + ev.clientY - startY));
    updateNoteEl(note);
  };
  const onUp = () => {
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    markDirty();
  };
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
}

/* ---------------- desktop rendering ---------------- */

let lastCanvas = null; // canvas size the in-memory pixel coordinates refer to

// keep the fractional layout: scale pixel coordinates when the window resizes
function rescaleToCanvas() {
  if (!desk) return;
  const { cw, ch } = canvasSize();
  if (lastCanvas && (lastCanvas.cw !== cw || lastCanvas.ch !== ch)) {
    const sx = cw / lastCanvas.cw;
    const sy = ch / lastCanvas.ch;
    for (const n of desk.notes) {
      n.x = Math.round(n.x * sx);
      n.y = Math.round(n.y * sy);
      n.w = Math.round(n.w * sx);
      n.h = Math.round(n.h * sy);
      updateNoteEl(n);
    }
  }
  lastCanvas = { cw, ch };
}
window.addEventListener('resize', rescaleToCanvas);

function renderDesktop() {
  lastCanvas = canvasSize();
  for (const el of noteEls.values()) el.remove();
  noteEls.clear();
  renderZones();
  for (const note of desk.notes) mountNote(note);
  updateStackBadges();
  $('#desk-name').value = desk.name;
  $('#desk-theme').value = THEMES[desk.theme] ? desk.theme : 'free';
  $('#save-indicator').className = '';
}

/* ---------------- global wiring ---------------- */

canvas.addEventListener('dblclick', (e) => {
  if (e.target !== canvas && e.target !== zonesEl && !e.target.closest('.zone')) return;
  const rect = canvas.getBoundingClientRect();
  createNote(
    e.clientX - rect.left - DEFAULT_NOTE.w / 2,
    e.clientY - rect.top - 20
  );
});

$('#new-desktop-btn').addEventListener('click', createNewDesktop);
$('#add-desktop-btn').addEventListener('click', createNewDesktop);

$('#del-desktop-btn').addEventListener('click', () => {
  if (desk) deleteDesktopById(desk.id, desk.name);
});

$('#add-note-btn').addEventListener('click', () => {
  if (!desk) return;
  const jitter = () => Math.round(Math.random() * 60);
  createNote(60 + jitter(), 40 + jitter());
});

// rename via menu bar
const deskNameInput = $('#desk-name');
deskNameInput.addEventListener('change', async () => {
  const name = deskNameInput.value.trim();
  if (!desk || !name || name === desk.name) {
    deskNameInput.value = desk ? desk.name : '';
    return;
  }
  desk.name = name;
  markDirty();
  await flushSave();
  refreshDesktopList();
});
deskNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === 'Escape') deskNameInput.blur();
});

// change theme via menu bar
$('#desk-theme').addEventListener('change', async (e) => {
  if (!desk) return;
  desk.theme = e.target.value;
  renderZones();
  for (const n of desk.notes) n.zone = zoneAt(n.x + n.w / 2, n.y + n.h / 2);
  markDirty();
  await flushSave();
  refreshDesktopList();
});

// populate theme selector
for (const [key, t] of Object.entries(THEMES)) {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = t.label;
  $('#desk-theme').appendChild(opt);
}

// export / import
$('#export-btn').addEventListener('click', () => {
  exportAll().catch((err) => alert(`Export failed: ${err.message}`));
});
const importInput = $('#import-file');
$('#import-btn').addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  importInput.value = '';
  if (file) await importFile(file).catch((err) => alert(`Import failed: ${err.message}`));
});

// help menu
const helpDropdown = $('#help-menu .dropdown');
$('#help-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  helpDropdown.hidden = !helpDropdown.hidden;
});
document.addEventListener('click', (e) => {
  if (!helpDropdown.hidden && !e.target.closest('#help-menu')) helpDropdown.hidden = true;
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSave();
});

/* ---------------- boot ---------------- */

(async () => {
  store = await pickStore();
  $('#save-indicator').title = `save state — saving to ${store.label}`;
  await loadInitialDesktop();
})().catch((err) => {
  document.body.innerHTML = `<pre style="padding:2em">Failed to load: ${err.message}</pre>`;
});
