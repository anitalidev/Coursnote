'use strict';

const API = 'http://localhost:8081/api';

// ── State ──────────────────────────────────────────────────────────────────
const S = {
  user: null,           // {id, username}
  courses: [],
  currentCourse: null,
  modules: [],
  moduleTopics: {},     // moduleID → topic[]
  editMode: false, notesTab: 'cp',
  currentModule: null,
  topics: [],
  currentTopic: null,
  notebookCells: [],    // [{id, type, content?, cells?}]
  privateNote: null,
  view: 'login',        // login | courses | modules | topics | topic
};

// ── API ────────────────────────────────────────────────────────────────────
async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}
const GET  = p        => req('GET',    p);
const POST = (p, b)   => req('POST',   p, b);
const PUT  = (p, b)   => req('PUT',    p, b);
const DEL  = p        => req('DELETE', p);

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', 2800);
}

// ── Navigation ─────────────────────────────────────────────────────────────
function pushHash(hash) {
  history.pushState(null, '', hash);
}

async function goLogin() {
  localStorage.removeItem('coursnote_user');
  Object.assign(S, { user: null, courses: [], currentCourse: null, modules: [], currentModule: null, topics: [], currentTopic: null, coursePage: null, privateNote: null, view: 'login' });
  pushHash('#');
  render();
}

async function goCourses() {
  S.currentCourse = null; S.currentModule = null; S.currentTopic = null;
  S.courses = await loadCourses(S.user.courseIDs || []);
  const progMap = {};
  await Promise.all(S.courses.map(async c => {
    if (!c.moduleIDs?.length) { progMap[c.courseID] = 0; return; }
    const mods = await loadAll('/module?id=', c.moduleIDs);
    const done = mods.filter(m => m.slashed).length;
    progMap[c.courseID] = Math.round(done / mods.length * 100);
  }));
  S.courseProgress = progMap;
  S.view = 'courses';
  pushHash('#courses');
  render();
}

async function goModules(course, editMode = false) {
  try {
    S.currentCourse = course; S.currentModule = null; S.currentTopic = null;
    S.editMode = editMode;
    S.modules = await loadAll('/module?id=', course.moduleIDs || []);
    S.moduleTopics = await loadAllTopics(S.modules);
    S.view = 'modules';
    pushHash('#course/' + course.courseID + (editMode ? '/edit' : ''));
    render();
  } catch (e) { toast(e.message || 'Failed to open course', 'err'); }
}

async function goTopics(module) {
  try {
    S.currentModule = module; S.currentTopic = null;
    S.topics = await loadAll('/topic?id=', module.topicIDs || []);
    S.moduleTopics[module.moduleID] = S.topics;
    S.view = 'topics';
    pushHash('#course/' + S.currentCourse.courseID + '/module/' + module.moduleID);
    render();
  } catch (e) { toast(e.message || 'Failed to open module', 'err'); }
}

async function goTopic(topic) {
  try {
    S.currentTopic = topic;
    S.notebookCells = parseRawElements(topic.rawElements);
    S.privateNote = await GET('/privatenotes?id=' + topic.privateNoteID);
    S.view = 'topic';
    pushHash('#course/' + S.currentCourse.courseID + '/module/' + S.currentModule.moduleID + '/topic/' + topic.topicID + '/' + S.notesTab);
    render();
  } catch (e) {
    toast(e.message || 'Failed to open topic', 'err');
  }
}

// Restore state from a hash URL (e.g. on page load or browser back/forward)
async function restoreFromHash(hash) {
  if (!S.user) return;
  const m = {
    courses: hash.match(/^#courses$/),
    modules: hash.match(/^#course\/([^/]+)(\/edit)?$/),
    topics:  hash.match(/^#course\/([^/]+)\/module\/([^/]+)$/),
    topic:   hash.match(/^#course\/([^/]+)\/module\/([^/]+)\/topic\/([^/]+)(?:\/(pn|cp))?$/),
  };
  try {
    if (m.topic) {
      const [courseID, moduleID, topicID] = [m.topic[1], m.topic[2], m.topic[3]];
      S.notesTab = m.topic[4] || 'cp';
      const [course, module, topic] = await Promise.all([GET('/course?id=' + courseID), GET('/module?id=' + moduleID), GET('/topic?id=' + topicID)]);
      S.privateNote = await GET('/privatenotes?id=' + topic.privateNoteID);
      S.courses = await loadCourses(S.user.courseIDs || []);
      S.currentCourse = course; S.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.currentModule = module; S.topics = await loadAll('/topic?id=', module.topicIDs || []);
      S.currentTopic = topic; S.notebookCells = parseRawElements(topic.rawElements);
      S.view = 'topic';
    } else if (m.topics) {
      const [courseID, moduleID] = [m.topics[1], m.topics[2]];
      const [course, module] = await Promise.all([GET('/course?id=' + courseID), GET('/module?id=' + moduleID)]);
      S.courses = await loadCourses(S.user.courseIDs || []);
      S.currentCourse = course; S.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.currentModule = module; S.topics = await loadAll('/topic?id=', module.topicIDs || []);
      S.moduleTopics = await loadAllTopics(S.modules);
      S.moduleTopics[module.moduleID] = S.topics;
      S.view = 'topics';
    } else if (m.modules) {
      const courseID = m.modules[1];
      const course = await GET('/course?id=' + courseID);
      S.courses = await loadCourses(S.user.courseIDs || []);
      S.currentCourse = course; S.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.moduleTopics = await loadAllTopics(S.modules);
      S.editMode = !!m.modules[2];
      S.view = 'modules';
    } else {
      await goCourses(); return;
    }
    render();
  } catch {
    await goCourses();
  }
}

window.addEventListener('popstate', () => restoreFromHash(location.hash));

// ── Fetch helpers ──────────────────────────────────────────────────────────
async function loadCourses(ids) {
  if (!ids || !ids.length) return [];
  return Promise.all(ids.map(id => GET('/course?id=' + id)));
}

async function loadAll(path, ids) {
  if (!ids || !ids.length) return [];
  return Promise.all(ids.map(id => GET(path + id)));
}

async function loadAllTopics(modules) {
  const map = {};
  await Promise.all((modules || []).map(async m => {
    map[m.moduleID] = m.topicIDs?.length ? await loadAll('/topic?id=', m.topicIDs) : [];
  }));
  return map;
}

async function refreshUser() {
  const u = await GET('/user?id=' + S.user.id);
  S.user = { id: u.id || S.user.id, username: u.username, courseIDs: u.courseIDs };
}

// ── Login ──────────────────────────────────────────────────────────────────
async function handleLogin(username) {
  username = username.trim();
  if (!username) return;
  // Try to find existing user by username, else create
  let user;
  try {
    user = await GET('/user?username=' + encodeURIComponent(username));
  } catch {
    user = await POST('/user', { username });
  }
  // GET by username returns {id, username}; full user for courseIDs needs GET by id
  const full = await GET('/user?id=' + user.id);
  S.user = { id: user.id, username: user.username, courseIDs: full.courseIDs || [] };
  localStorage.setItem('coursnote_user', JSON.stringify(S.user));
  await goCourses();
}

// ── Create helpers ─────────────────────────────────────────────────────────
async function createCourse(name, desc) {
  await POST('/course', { name, description: desc, userID: S.user.id });
  // Refresh user to get updated courseIDs
  const full = await GET('/user?id=' + S.user.id);
  S.user.courseIDs = full.courseIDs || [];
  S.courses = await loadCourses(S.user.courseIDs);
  render();
  toast('Course created');
}

async function createModule(name, desc) {
  await POST('/module', { name, description: desc, courseID: S.currentCourse.courseID });
  const updated = await GET('/course?id=' + S.currentCourse.courseID);
  S.currentCourse = updated;
  S.modules = await loadAll('/module?id=', updated.moduleIDs || []);
  render();
  toast('Module created');
}

async function createTopic(name, desc) {
  await POST('/topic', { name, description: desc, moduleID: S.currentModule.moduleID });
  const updated = await GET('/module?id=' + S.currentModule.moduleID);
  S.currentModule = updated;
  S.topics = await loadAll('/topic?id=', updated.topicIDs || []);
  S.moduleTopics[S.currentModule.moduleID] = S.topics;
  render();
  toast('Topic created');
}

async function deleteCourse(id) {
  if (!confirm('Delete this course and all its contents?')) return;
  await DEL('/course?id=' + id);
  const full = await GET('/user?id=' + S.user.id);
  S.user.courseIDs = full.courseIDs || [];
  S.courses = await loadCourses(S.user.courseIDs);
  render();
  toast('Course deleted', 'err');
}

async function deleteModule(id) {
  if (!confirm('Delete this module and all its topics?')) return;
  await DEL('/module?id=' + id);
  const updated = await GET('/course?id=' + S.currentCourse.courseID);
  S.currentCourse = updated;
  S.modules = await loadAll('/module?id=', updated.moduleIDs || []);
  render();
  toast('Module deleted', 'err');
}

async function deleteTopic(id) {
  if (!confirm('Delete this topic?')) return;
  await DEL('/topic?id=' + id);
  const updated = await GET('/module?id=' + S.currentModule.moduleID);
  S.currentModule = updated;
  S.topics = await loadAll('/topic?id=', updated.topicIDs || []);
  render();
  toast('Topic deleted', 'err');
}

// ── Notebook ───────────────────────────────────────────────────────────────
let nbIdCounter = 0;
function nbGenId() { return 'nb' + (++nbIdCounter); }

function parseRawElements(raw) {
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw.map(e => ({
    id: nbGenId(),
    type: e.type || 'text',
    content: e.content ?? '',
    cells: e.cells ?? [['', ''], ['', '']],
  }));
}

function nbCellsToElements() {
  return S.notebookCells.map(c =>
    c.type === 'text'
      ? { type: 'text', content: c.content }
      : { type: 'table', cells: c.cells }
  );
}

function nbAddCell(type, insertIdx) {
  const cell = type === 'table'
    ? { id: nbGenId(), type: 'table', cells: [['', ''], ['', '']], content: '' }
    : { id: nbGenId(), type: 'text', content: '', cells: [] };
  S.notebookCells.splice(insertIdx, 0, cell);
  renderNotebook();
  scheduleElementsSave();
  // Focus the new cell's first input
  setTimeout(() => {
    const el = document.querySelector(`[data-id="${cell.id}"] textarea, [data-id="${cell.id}"] input`);
    if (el) el.focus();
  }, 0);
}

function nbDeleteCell(id) {
  S.notebookCells = S.notebookCells.filter(c => c.id !== id);
  renderNotebook();
  scheduleElementsSave();
}

function nbUpdateText(id, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c) c.content = val;
}

function nbUpdateTableCell(id, r, col, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c && c.cells[r]) c.cells[r][col] = val;
}

function nbAddRow(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  const cols = c.cells[0]?.length || 1;
  c.cells.push(Array(cols).fill(''));
  renderNotebook();
  scheduleElementsSave();
}

function nbDelRow(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.cells.length <= 1) return;
  c.cells.pop();
  renderNotebook();
  scheduleElementsSave();
}

function nbAddCol(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || (c.cells[0]?.length ?? 0) >= 10) return;
  c.cells.forEach(row => row.push(''));
  renderNotebook();
  scheduleElementsSave();
}

function nbDelCol(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || (c.cells[0]?.length ?? 0) <= 1) return;
  c.cells.forEach(row => row.pop());
  renderNotebook();
  scheduleElementsSave();
}

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function nbAddZoneHTML(insertIdx) {
  return `<div class="nb-add-zone">
    <div class="nb-add-line"></div>
    <button class="nb-add-btn" onclick="nbAddCell('text',${insertIdx})">＋ Text</button>
    <button class="nb-add-btn" onclick="nbAddCell('table',${insertIdx})">＋ Table</button>
    <div class="nb-add-line"></div>
  </div>`;
}

function nbTextCellHTML(c) {
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill text-pill">Text</span></div>
    <div class="nb-cell-body">
      <textarea class="nb-textarea"
        oninput="nbUpdateText('${c.id}',this.value);autoResize(this);scheduleElementsSave()"
        placeholder="Type here…">${esc(c.content)}</textarea>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbTableCellHTML(c) {
  const rows = c.cells.length;
  const cols = c.cells[0]?.length ?? 0;
  let tbl = '<table class="nb-table">';
  c.cells.forEach((row, r) => {
    tbl += '<tr>';
    row.forEach((val, col) => {
      tbl += `<td><textarea class="nb-cell-input" rows="1"
        oninput="nbUpdateTableCell('${c.id}',${r},${col},this.value);scheduleElementsSave();autoResize(this)">${esc(val)}</textarea></td>`;
    });
    tbl += '</tr>';
  });
  tbl += '</table>';
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill table-pill">Table</span></div>
    <div class="nb-cell-body">
      <div class="nb-table-controls">
        <button class="nb-ctrl-btn" onclick="nbAddRow('${c.id}')">+ Row</button>
        <button class="nb-ctrl-btn" onclick="nbDelRow('${c.id}')" ${rows <= 1 ? 'disabled' : ''}>− Row</button>
        <button class="nb-ctrl-btn" onclick="nbAddCol('${c.id}')" ${cols >= 10 ? 'disabled' : ''}>+ Col</button>
        <button class="nb-ctrl-btn" onclick="nbDelCol('${c.id}')" ${cols <= 1 ? 'disabled' : ''}>− Col</button>
      </div>
      <div class="nb-table-wrap">${tbl}</div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function buildNotebookHTML() {
  if (!S.notebookCells.length) {
    return nbAddZoneHTML(0) +
      '<div class="nb-empty">No content yet — add a cell above.</div>';
  }
  return S.notebookCells.reduce((html, c, i) => {
    const cellHTML = c.type === 'table' ? nbTableCellHTML(c) : nbTextCellHTML(c);
    return html + cellHTML + nbAddZoneHTML(i + 1);
  }, nbAddZoneHTML(0));
}

function buildCourseViewHTML() {
  if (!S.notebookCells.length) return '<div class="nb-empty">No course content yet.</div>';
  return S.notebookCells.map(c => {
    if (c.type === 'table') {
      const tbl = c.cells.map(row =>
        '<tr>' + row.map(val => `<td>${esc(val)}</td>`).join('') + '</tr>'
      ).join('');
      return `<table class="cv-table">${tbl}</table>`;
    }
    return `<div class="cv-text">${esc(c.content).replace(/\n/g, '<br>')}</div>`;
  }).join('');
}

function renderNotebook() {
  const nb = document.getElementById('notebook');
  if (!nb) return;
  if (S.editMode) {
    nb.innerHTML = buildNotebookHTML();
    nb.querySelectorAll('.nb-textarea, .nb-cell-input').forEach(ta => autoResize(ta));
  } else {
    nb.innerHTML = buildCourseViewHTML();
  }
}


// ── Save notes ─────────────────────────────────────────────────────────────
let elemSaveTimer, pnSaveTimer;

function scheduleElementsSave() {
  clearTimeout(elemSaveTimer);
  setStatus('cp', 'saving...');
  elemSaveTimer = setTimeout(async () => {
    try {
      await PUT('/topic', {
        id: S.currentTopic.topicID,
        name: S.currentTopic.name,
        description: S.currentTopic.description,
        elements: nbCellsToElements(),
      });
      setStatus('cp', 'Saved');
    } catch { setStatus('cp', 'Error saving'); }
  }, 800);
}

function schedulePNSave(text) {
  clearTimeout(pnSaveTimer);
  setStatus('pn', 'saving...');
  pnSaveTimer = setTimeout(async () => {
    try {
      await PUT('/privatenotes', { id: S.privateNote.privateNoteID, description: text });
      S.privateNote.description = text;
      setStatus('pn', 'Saved');
    } catch { setStatus('pn', 'Error saving'); }
  }, 800);
}

function setStatus(pane, msg) {
  const el = document.getElementById('status-' + pane);
  if (!el) return;
  el.textContent = msg;
  el.className = 'save-indicator' + (msg === 'Saved' ? ' saved' : '');
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  renderSidebar();
  renderMain();
}

function renderSidebar() {
  const header = document.getElementById('sidebar-header');
  const nav    = document.getElementById('sidebar-nav');
  const footer = document.getElementById('sidebar-footer');

  if (S.view === 'login') {
    header.innerHTML = '<h2>Coursnote</h2><p>Your course notes</p>';
    nav.innerHTML = '';
    footer.innerHTML = '';
    return;
  }

  header.innerHTML = `<h2>Coursnote</h2><p>${esc(S.user.username)}</p>`;
  footer.innerHTML = `<button class="logout-btn" onclick="goLogin()">Sign out</button>`;

  if (S.view === 'courses' || !S.currentCourse) {
    document.getElementById('sidebar').classList.add('icon-mode');
    const initial = (S.user.username || '?')[0].toUpperCase();
    nav.innerHTML = `
      <div class="icon-nav-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </div>
      <div class="icon-nav-item" onclick="goCourses()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Home</span>
      </div>
      <div class="icon-nav-item active" onclick="goCourses()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span>Courses</span>
      </div>
      <div class="icon-nav-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        <span>Topics</span>
      </div>
      <div class="icon-nav-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>Search</span>
      </div>`;
    footer.innerHTML = `
      <div class="icon-nav-item" onclick="goLogin()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Settings</span>
      </div>
      <div class="icon-nav-avatar" onclick="goLogin()">${initial}</div>
      <div class="icon-nav-avatar-label">${esc(S.user.username)} ▾</div>`;
    return;
  }

  document.getElementById('sidebar').classList.remove('icon-mode');

  // Inside a course
  const total = S.modules.length;
  const done  = S.modules.filter(m => m.slashed).length;
  const totalTopics = S.modules.reduce((n, m) => n + (m.topicIDs || []).length, 0);
  const pct   = total ? Math.round(done / total * 100) : 0;

  header.innerHTML = `
    <h2>Coursnote</h2>
    <p>${esc(S.user.username)}</p>
    <div class="sb-cc-stats">
      <div class="sb-cc-stat">
        <span class="sb-cc-stat-val">${total}</span>
        <span class="sb-cc-stat-label">Module${total !== 1 ? 's' : ''}</span>
      </div>
      <div class="sb-cc-stat">
        <span class="sb-cc-stat-val">${totalTopics}</span>
        <span class="sb-cc-stat-label">Topics</span>
      </div>
      <div class="sb-cc-stat">
        <span class="sb-cc-stat-val">${pct}%</span>
        <span class="sb-cc-stat-label">Progress</span>
      </div>
    </div>
  `;

  const moduleItems = S.modules.map(m => {
    const isMod  = S.currentModule?.moduleID === m.moduleID;
    const active = isMod ? ' active' : '';
    const slash  = m.slashed ? ' done' : '';
    const mTopics = (S.moduleTopics || {})[m.moduleID] || [];
    const topicItems = mTopics.map(t => {
      const tActive = S.currentTopic?.topicID === t.topicID ? ' nav-sub-active' : '';
      return `<div class="nav-sub-item${tActive}" onclick="event.stopPropagation();goTopic(${jsonAttr(t)})">
        <span class="nav-sub-dot"></span><span>${esc(t.name)}</span>
      </div>`;
    }).join('');
    return `<div class="nav-item${active}${slash}" onclick="goTopics(${jsonAttr(m)})">
      <span class="nav-dot"></span><span style="flex:1">${esc(m.name)}</span>
    </div>${topicItems}`;
  }).join('');

  nav.innerHTML = `
    <div class="nav-item" onclick="goCourses()" style="margin-bottom:4px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      All Courses
    </div>
    <div class="nav-group-item" onclick="goModules(${jsonAttr(S.currentCourse)})">
      <div style="display:flex;align-items:center;gap:10px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M8 8h8M8 16h4"/></svg>
        Overview
      </div>
      <span class="nav-count">${total}</span>
    </div>
    <div class="nav-section">Content</div>
    ${moduleItems}
    ${S.editMode ? `<div class="nav-section" style="margin-top:8px">Manage</div>
    <div class="nav-item" onclick="goModules(${jsonAttr(S.currentCourse)}, true);setTimeout(()=>enterCourseEditMode(),100)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      Course Settings
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-left:auto"><path d="M9 18l6-6-6-6"/></svg>
    </div>
    <div class="nav-item nav-danger" onclick="deleteCourse('${S.currentCourse.courseID}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      Delete Course
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-left:auto"><path d="M9 18l6-6-6-6"/></svg>
    </div>` : ''}`;
}

function renderMain() {
  const main = document.getElementById('main');

  if (S.view === 'login') {
    document.getElementById('sidebar').style.display = 'none';
    main.innerHTML = loginHTML();
    document.getElementById('username-input').focus();
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const val = document.getElementById('username-input').value;
      handleLogin(val).catch(err => {
        document.getElementById('login-error').textContent = err.message;
      });
    });
    return;
  }

  document.getElementById('sidebar').style.display = '';

  if (S.view === 'courses')  { main.innerHTML = coursesHTML(); bindCoursesForm(); }
  if (S.view === 'modules')  { main.innerHTML = modulesHTML(); bindModulesForm(); }
  if (S.view === 'topics')   { main.innerHTML = topicsHTML();  bindTopicsForm(); }
  if (S.view === 'topic')    { main.innerHTML = topicHTML();   bindTopicListeners(); }
}

// ── HTML builders ──────────────────────────────────────────────────────────
function loginHTML() {
  return `
  <div id="login-view">
    <div class="login-card">
      <div class="logo"><span>Coursnote</span></div>
      <div class="tagline">Enter your username to continue</div>
      <form id="login-form">
        <div class="field">
          <label>Username</label>
          <input id="username-input" type="text" placeholder="e.g. alice" autocomplete="off" />
        </div>
        <div id="login-error" class="login-error"></div>
        <button type="submit" class="btn btn-primary">Continue →</button>
      </form>
    </div>
  </div>`;
}

// coursesHTML is defined in views.js

// modulesHTML is defined in views.js

function topicsHTML() {
  const m = S.currentModule;
  const items = S.topics.length
    ? S.topics.map(t => `
      <div class="item-card" onclick="goTopic(${jsonAttr(t)})">
        <div class="item-icon topic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div class="item-body">
          <div class="item-title">${esc(t.name)}</div>
          <div class="item-desc">${esc(t.description) || 'Open to add notes'}</div>
        </div>
        ${S.editMode ? `<div class="item-actions">
          <button class="btn btn-danger" onclick="event.stopPropagation();deleteTopic('${t.topicID}')">Delete</button>
        </div>` : ''}
      </div>`).join('')
    : `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>No topics yet.<br>Add your first topic above.</p>
      </div>`;

  return `<div class="section">
    <div class="breadcrumb">
      <span onclick="goCourses()">All Courses</span>
      <span class="sep">›</span>
      <span onclick="goModules(${jsonAttr(S.currentCourse)})">${esc(S.currentCourse.name)}</span>
    </div>
    <div class="page-hero">
      <div class="section-header" style="align-items:flex-start;margin-bottom:0">
        <h1><span>${esc(m.name)}</span></h1>
        ${S.editMode ? `<button class="btn btn-primary" onclick="toggleForm('topic-form')">+ New Topic</button>` : ''}
      </div>
      ${m.description ? `<p class="subtitle">${esc(m.description)}</p>` : '<div style="margin-bottom:24px"></div>'}
    </div>
    <div class="inline-form" id="topic-form">
      <h3>New Topic</h3>
      <div class="form-row">
        <div class="field"><label>Name</label><input id="tf-name" placeholder="e.g. Binary Search Trees" /></div>
        <div class="field"><label>Description</label><input id="tf-desc" placeholder="Short summary…" /></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="tf-submit">Create</button>
        <button class="btn btn-ghost" onclick="toggleForm('topic-form')">Cancel</button>
      </div>
    </div>
    <div class="item-list">${items}</div>
  </div>`;
}

function topicHTML() {
  const t = S.currentTopic;
  const pn = S.privateNote;
  return `<div class="section topic-section">
    <div class="breadcrumb">
      <span onclick="goCourses()">All Courses</span>
      <span class="sep">›</span>
      <span onclick="goModules(${jsonAttr(S.currentCourse)})">${esc(S.currentCourse.name)}</span>
      <span class="sep">›</span>
      <span onclick="goTopics(${jsonAttr(S.currentModule)})">${esc(S.currentModule.name)}</span>
    </div>
    <div class="topic-header">
      <div>
        <h1><span>${esc(t.name)}</span></h1>
        ${t.description ? `<p class="subtitle">${esc(t.description)}</p>` : ''}
      </div>
      <div class="notes-tab-group">
        <button class="notes-tab ${S.notesTab === 'pn' ? 'notes-tab-active' : ''}" id="tab-pn" onclick="switchNotesTab('pn')">Private Notes</button>
        <button class="notes-tab ${S.notesTab === 'cp' ? 'notes-tab-active' : ''}" id="tab-cp" onclick="switchNotesTab('cp')">Course View</button>
      </div>
    </div>
    <div id="pane-pn" class="note-pane" style="${S.notesTab === 'pn' ? '' : 'display:none'}">
      <div class="note-pane-header">
        <span class="note-pane-title private">Private Notes</span>
        <span class="save-indicator" id="status-pn"></span>
      </div>
      <div class="note-pane-body">
        <textarea id="pn-text" ${S.editMode ? '' : 'readonly'}>${esc(pn?.description || '')}</textarea>
      </div>
    </div>
    <div id="pane-cp" class="note-pane" style="${S.notesTab === 'cp' ? '' : 'display:none'}">
      <div class="note-pane-header">
        <span class="note-pane-title course">Course View</span>
        <span class="save-indicator" id="status-cp"></span>
      </div>
      <div class="note-pane-body nb-pane-body">
        <div class="notebook" id="notebook"></div>
      </div>
    </div>
  </div>`;
}

function switchNotesTab(tab) {
  S.notesTab = tab;
  document.getElementById('pane-pn').style.display = tab === 'pn' ? '' : 'none';
  document.getElementById('pane-cp').style.display = tab === 'cp' ? '' : 'none';
  document.getElementById('tab-pn').classList.toggle('notes-tab-active', tab === 'pn');
  document.getElementById('tab-cp').classList.toggle('notes-tab-active', tab === 'cp');
  if (tab === 'pn') { const ta = document.getElementById('pn-text'); if (ta) autoResize(ta); }
  if (S.currentTopic) pushHash('#course/' + S.currentCourse.courseID + '/module/' + S.currentModule.moduleID + '/topic/' + S.currentTopic.topicID + '/' + tab);
}

// ── Form bindings ──────────────────────────────────────────────────────────
function bindCoursesForm() {
  document.getElementById('cf-submit')?.addEventListener('click', () => {
    const name = document.getElementById('cf-name').value.trim();
    const desc = document.getElementById('cf-desc').value.trim();
    if (!name) return;
    createCourse(name, desc);
  });
  enterSubmit('cf-name', 'cf-submit');

  document.getElementById('cef-save')?.addEventListener('click', async () => {
    const id  = document.getElementById('cef-save').dataset.id;
    const name = document.getElementById('cef-name').value.trim();
    const desc = document.getElementById('cef-desc').value.trim();
    if (!name) return;
    try {
      const updated = await PUT('/course', { id, name, description: desc });
      const idx = S.courses.findIndex(c => c.courseID === updated.courseID);
      if (idx !== -1) S.courses[idx] = updated;
      render();
      toast('Course updated');
    } catch (e) { toast(e.message, 'err'); }
  });
  enterSubmit('cef-name', 'cef-save');
}

function openCourseCardEdit(course) {
  const form = document.getElementById('course-edit-card-form');
  // Close new-course form if open
  document.getElementById('course-form')?.classList.remove('open');
  document.getElementById('cef-name').value = course.name;
  document.getElementById('cef-desc').value = course.description || '';
  document.getElementById('cef-save').dataset.id = course.courseID;
  form.classList.add('open');
  document.getElementById('cef-name').focus();
}

function bindModulesForm() {
  document.getElementById('mf-submit')?.addEventListener('click', () => {
    const name = document.getElementById('mf-name').value.trim();
    const desc = document.getElementById('mf-desc').value.trim();
    if (!name) return;
    createModule(name, desc);
  });
  enterSubmit('mf-name', 'mf-submit');

  document.getElementById('ce-save')?.addEventListener('click', saveCourseEdit);
  enterSubmit('ce-name', 'ce-save');
}

function enterCourseEditMode() {
  document.getElementById('course-view-header').style.display = 'none';
  document.getElementById('course-edit-form').style.display = 'block';
  document.getElementById('ce-name').focus();
  document.getElementById('ce-name').select();
}

function exitCourseEditMode() {
  document.getElementById('course-edit-form').style.display = 'none';
  document.getElementById('course-view-header').style.display = '';
}

function saveCourseFromEditMode() {
  if (document.getElementById('ce-name')) {
    saveCourseEdit();
  }
}

async function saveCourseEdit() {
  const name = document.getElementById('ce-name').value.trim();
  const desc = document.getElementById('ce-desc').value.trim();
  if (!name) return;
  try {
    const updated = await PUT('/course', { id: S.currentCourse.courseID, name, description: desc });
    S.currentCourse = updated;
    // Reflect in the courses list too
    const idx = S.courses.findIndex(c => c.courseID === updated.courseID);
    if (idx !== -1) S.courses[idx] = updated;
    render();
    toast('Course updated');
  } catch (e) {
    toast(e.message, 'err');
  }
}

function bindTopicsForm() {
  document.getElementById('tf-submit')?.addEventListener('click', () => {
    const name = document.getElementById('tf-name').value.trim();
    const desc = document.getElementById('tf-desc').value.trim();
    if (!name) return;
    createTopic(name, desc);
  });
  enterSubmit('tf-name', 'tf-submit');
}

function bindTopicListeners() {
  const pnText = document.getElementById('pn-text');
  if (pnText) {
    autoResize(pnText);
    pnText.addEventListener('input', e => { schedulePNSave(e.target.value); autoResize(e.target); });
  }
  renderNotebook();
}

function enterSubmit(inputId, btnId) {
  document.getElementById(inputId)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(btnId)?.click();
  });
}

// ── Utilities ──────────────────────────────────────────────────────────────
function toggleForm(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function jsonAttr(obj) {
  return "JSON.parse(decodeURIComponent('" + encodeURIComponent(JSON.stringify(obj)) + "'))";
}

// ── Boot ───────────────────────────────────────────────────────────────────
(async () => {
  const saved = localStorage.getItem('coursnote_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    try {
      // Happy path: backend still has this user
      const fresh = await GET('/user?id=' + parsed.id);
      S.user = { id: fresh.id, username: fresh.username, courseIDs: fresh.courseIDs || [] };
      localStorage.setItem('coursnote_user', JSON.stringify(S.user));
      if (location.hash && location.hash !== '#courses') {
        await restoreFromHash(location.hash);
      } else {
        await goCourses();
      }
      return;
    } catch {
      // Backend restarted (in-memory) — re-create the user by username
      try {
        await handleLogin(parsed.username);
        return;
      } catch {
        localStorage.removeItem('coursnote_user');
      }
    }
  }
  render();
})();
