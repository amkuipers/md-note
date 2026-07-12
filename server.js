#!/usr/bin/env node
/**
 * md-note server — serves the SPA and persists desktops/notes to the local
 * filesystem. Zero dependencies (Node built-ins only).
 *
 * Data layout on disk:
 *   data/<desktop-id>/desktop.json   layout: name, theme, note metadata
 *   data/<desktop-id>/notes/<id>.md  note content, plain markdown
 */
'use strict';

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.MD_NOTE_DATA || path.join(__dirname, 'data');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const ID_RE = /^[a-z0-9][a-z0-9_-]*$/i;

function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'desktop'
  );
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function desktopDir(id) {
  return path.join(DATA_DIR, id);
}

async function readDesktopMeta(id) {
  const raw = await fsp.readFile(path.join(desktopDir(id), 'desktop.json'), 'utf8');
  return JSON.parse(raw);
}

async function listDesktops() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const entries = await fsp.readdir(DATA_DIR, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory() || !ID_RE.test(e.name)) continue;
    try {
      const meta = await readDesktopMeta(e.name);
      out.push({
        id: e.name,
        name: meta.name,
        theme: meta.theme,
        noteCount: (meta.notes || []).length,
      });
    } catch {
      /* skip folders without a valid desktop.json */
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

async function createDesktop(body) {
  const name = String(body.name || '').trim();
  if (!name) throw Object.assign(new Error('name is required'), { status: 400 });
  const theme = String(body.theme || 'free');
  await fsp.mkdir(DATA_DIR, { recursive: true });
  let id = slugify(name);
  for (let n = 2; fs.existsSync(desktopDir(id)); n++) id = `${slugify(name)}-${n}`;
  await fsp.mkdir(path.join(desktopDir(id), 'notes'), { recursive: true });
  const meta = { name, theme, notes: [] };
  await fsp.writeFile(
    path.join(desktopDir(id), 'desktop.json'),
    JSON.stringify(meta, null, 2)
  );
  return { id, ...meta };
}

async function getDesktop(id) {
  const meta = await readDesktopMeta(id);
  const notes = [];
  for (const n of meta.notes || []) {
    let content = '';
    try {
      content = await fsp.readFile(
        path.join(desktopDir(id), 'notes', `${n.id}.md`),
        'utf8'
      );
    } catch {
      /* note file missing → empty content */
    }
    notes.push({ ...n, content });
  }
  return { id, name: meta.name, theme: meta.theme, notes };
}

async function putDesktop(id, body) {
  const dir = desktopDir(id);
  await fsp.access(path.join(dir, 'desktop.json'));
  const notesDir = path.join(dir, 'notes');
  await fsp.mkdir(notesDir, { recursive: true });

  const notes = Array.isArray(body.notes) ? body.notes : [];
  const metaNotes = [];
  const keep = new Set();
  for (const n of notes) {
    if (!ID_RE.test(String(n.id))) continue;
    keep.add(`${n.id}.md`);
    await fsp.writeFile(path.join(notesDir, `${n.id}.md`), String(n.content ?? ''));
    const { content, ...layout } = n;
    metaNotes.push(layout);
  }
  // remove .md files for deleted notes
  for (const f of await fsp.readdir(notesDir)) {
    if (f.endsWith('.md') && !keep.has(f)) await fsp.unlink(path.join(notesDir, f));
  }

  const meta = {
    name: String(body.name || id),
    theme: String(body.theme || 'free'),
    notes: metaNotes,
  };
  await fsp.writeFile(path.join(dir, 'desktop.json'), JSON.stringify(meta, null, 2));
  return { ok: true };
}

async function deleteDesktop(id) {
  await fsp.rm(desktopDir(id), { recursive: true, force: true });
  return { ok: true };
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'desktops', id?]
  const id = parts[2];
  if (id && !ID_RE.test(id)) return sendJSON(res, 400, { error: 'bad desktop id' });

  try {
    if (parts[1] === 'desktops') {
      if (!id && req.method === 'GET') return sendJSON(res, 200, await listDesktops());
      if (!id && req.method === 'POST')
        return sendJSON(res, 201, await createDesktop(await readBody(req)));
      if (id && req.method === 'GET') return sendJSON(res, 200, await getDesktop(id));
      // POST accepted as alias for PUT so sendBeacon/keepalive saves work
      if (id && (req.method === 'PUT' || req.method === 'POST'))
        return sendJSON(res, 200, await putDesktop(id, await readBody(req)));
      if (id && req.method === 'DELETE') return sendJSON(res, 200, await deleteDesktop(id));
    }
    sendJSON(res, 404, { error: 'not found' });
  } catch (err) {
    if (err.code === 'ENOENT') return sendJSON(res, 404, { error: 'desktop not found' });
    sendJSON(res, err.status || 500, { error: err.message });
  }
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (req.method !== 'GET') {
    res.writeHead(405).end();
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`md-note running at http://localhost:${PORT}`);
  console.log(`notes stored in ${DATA_DIR}`);
});
