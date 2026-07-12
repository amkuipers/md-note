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

/* ---------------- persistence ---------------- */

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
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
    await api(`/api/desktops/${desk.id}`, { method: 'PUT', body: JSON.stringify(desk) });
    $('#save-indicator').className = '';
  } catch (err) {
    dirty = true;
    $('#save-indicator').className = 'error';
    $('#save-indicator').title = `save failed: ${err.message}`;
  }
}

// best-effort save when the tab closes mid-debounce
window.addEventListener('beforeunload', () => {
  if (dirty && desk) {
    fetch(`/api/desktops/${desk.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(desk),
      keepalive: true,
    });
  }
});

/* ---------------- desktops / sidebar ---------------- */

async function refreshDesktopList() {
  desktops = await api('/api/desktops');
  const ul = $('#desktop-list');
  ul.innerHTML = '';
  for (const d of desktops) {
    const li = document.createElement('li');
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
  await api(`/api/desktops/${id}`, { method: 'DELETE' });
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
  const d = await api('/api/desktops', {
    method: 'POST',
    body: JSON.stringify({ name, theme: 'free' }),
  });
  await switchDesktop(d.id);
  $('#desk-name').focus();
  $('#desk-name').select();
}

async function switchDesktop(id) {
  if (desk && desk.id === id) return;
  await flushSave();
  desk = await api(`/api/desktops/${id}`);
  localStorage.setItem('md-note:last-desktop', id);
  zCounter = Math.max(1, ...desk.notes.map((n) => n.z || 1)) + 1;
  renderDesktop();
  refreshDesktopList();
}

async function loadInitialDesktop() {
  desktops = await api('/api/desktops');
  if (desktops.length === 0) {
    const d = await api('/api/desktops', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Desktop', theme: 'free' }),
    });
    desktops = [d];
  }
  const last = localStorage.getItem('md-note:last-desktop');
  const target = desktops.find((d) => d.id === last) || desktops[0];
  await switchDesktop(target.id);
}

/* ---------------- zones ---------------- */

function themeZones() {
  return (THEMES[desk?.theme] || THEMES.free).zones;
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

function zoneAt(px, py) {
  const { clientWidth: cw, clientHeight: ch } = canvas;
  for (const z of themeZones()) {
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

  const onMove = (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    for (const p of startPoses) {
      p.n.x = Math.round(p.x + dx);
      p.n.y = Math.round(p.y + dy);
      updateNoteEl(p.n);
    }
    highlightZone(zoneAt(note.x + note.w / 2, note.y + note.h / 2));
  };

  const onUp = () => {
    el.classList.remove('dragging');
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    highlightZone(null);

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

function renderDesktop() {
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

loadInitialDesktop().catch((err) => {
  document.body.innerHTML = `<pre style="padding:2em">Failed to load: ${err.message}\n\nIs the server running? Start it with: node server.js</pre>`;
});
