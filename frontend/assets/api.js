'use strict';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(Config.apiBase + path, opts);
  if (r.status === 204) return null;
  let data;
  try { data = await r.json(); } catch { throw new Error(`${r.status} ${r.statusText}`); }
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

const staticRoutes = {
  '/course':       (id, CD) => CD.courseMap[id]     ?? null,
  '/module':       (id, CD) => CD.moduleMap[id]     ?? null,
  '/topic':        (id, CD) => CD.topicMap[id]      ?? null,
  '/coursepages':  (id, CD) => CD.coursePageMap?.[id] ?? null,
  '/privatenotes': (id, CD) => CD.privateNotes?.[id] ?? null,
  '/user':         (_,  CD) => ({ id: 'static', username: 'Viewer', courseIDs: [CD.course.courseID] }),
  '/market':       ()       => [],
};

function staticGet(path) {
  const CD   = Runtime.courseData;
  const base = path.split('?')[0];
  const id   = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '').get('id');
  const handler = staticRoutes[base];
  return Promise.resolve(handler ? handler(id, CD) : null);
}

function staticReadOnly() {
  return Promise.reject(new Error('Static courses are read-only'));
}

function GET(path) {
  if (!Runtime.trackProgress) return req('GET', path);
  // Enrolled online: course pages live in the DB — fetch directly rather than
  // relying on rawElements being present in the (potentially old) static bundle.
  if (path.startsWith('/coursepages') && Runtime.enrollmentData) return req('GET', path);
  return staticGet(path);
}
const POST = (path, body) => Runtime.trackProgress ? staticReadOnly()          : req('POST',   path, body);
const PUT  = (path, body) => Runtime.trackProgress ? staticReadOnly()          : req('PUT',    path, body);
const DEL  = path         => Runtime.trackProgress ? staticReadOnly()          : req('DELETE', path);
