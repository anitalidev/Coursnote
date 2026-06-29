'use strict';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

const staticRoutes = {
  '/course':       (id, CD) => CD.courseMap[id] ?? null,
  '/module':       (id, CD) => CD.moduleMap[id] ?? null,
  '/topic':        (id, CD) => CD.topicMap[id]  ?? null,
  '/privatenotes': (id, CD) => CD.privateNotes?.[id] ?? null,
  '/user':         (_,  CD) => ({ id: 'static', username: 'Viewer', courseIDs: [CD.course.courseID] }),
  '/market':       ()       => [],
};

function staticGet(path) {
  const CD   = window.COURSE_DATA;
  const base = path.split('?')[0];
  const id   = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '').get('id');
  const handler = staticRoutes[base];
  return Promise.resolve(handler ? handler(id, CD) : null);
}

function staticReadOnly() {
  return Promise.reject(new Error('Static courses are read-only'));
}

function GET(path)         { return window.STATIC_MODE ? staticGet(path)    : req('GET',    path);      }
const POST = (path, body) => window.STATIC_MODE ? staticReadOnly()          : req('POST',   path, body);
const PUT  = (path, body) => window.STATIC_MODE ? staticReadOnly()          : req('PUT',    path, body);
const DEL  = path         => window.STATIC_MODE ? staticReadOnly()          : req('DELETE', path);
