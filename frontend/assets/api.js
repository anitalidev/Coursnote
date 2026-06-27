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

const GET  = p      => req('GET',    p);
const POST = (p, b) => req('POST',   p, b);
const PUT  = (p, b) => req('PUT',    p, b);
const DEL  = p      => req('DELETE', p);
