'use strict';

const API = 'http://localhost:8081/api';

// ── State ──────────────────────────────────────────────────────────────────
const S = {
  user: null,           // {id, username}
  courses: [],
  currentCourse: null,
  modules: [],
  moduleTopics: {},     // moduleID → topic[]
  editMode: false,
  currentModule: null,
  topics: [],
  currentTopic: null,
  coursePage: null,
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
  S.currentCourse = course; S.currentModule = null; S.currentTopic = null;
  S.editMode = editMode;
  S.modules = await loadAll('/module?id=', course.moduleIDs || []);
  S.moduleTopics = await loadAllTopics(S.modules);
  S.view = 'modules';
  pushHash('#course/' + course.courseID);
  render();
}

async function goTopics(module) {
  S.currentModule = module; S.currentTopic = null;
  S.topics = await loadAll('/topic?id=', module.topicIDs || []);
  S.moduleTopics[module.moduleID] = S.topics;
  S.view = 'topics';
  pushHash('#course/' + S.currentCourse.courseID + '/module/' + module.moduleID);
  render();
}

async function goTopic(topic) {
  S.currentTopic = topic;
  const [cp, pn] = await Promise.all([
    GET('/coursepages?id=' + topic.coursePageID),
    GET('/privatenotes?id=' + topic.privateNoteID),
  ]);
  S.coursePage = cp;
  S.privateNote = pn;
  S.view = 'topic';
  pushHash('#course/' + S.currentCourse.courseID + '/module/' + S.currentModule.moduleID + '/topic/' + topic.topicID);
  render();
}

// Restore state from a hash URL (e.g. on page load or browser back/forward)
async function restoreFromHash(hash) {
  if (!S.user) return;
  const m = {
    courses: hash.match(/^#courses$/),
    modules: hash.match(/^#course\/([^/]+)$/),
    topics:  hash.match(/^#course\/([^/]+)\/module\/([^/]+)$/),
    topic:   hash.match(/^#course\/([^/]+)\/module\/([^/]+)\/topic\/([^/]+)$/),
  };
  try {
    if (m.topic) {
      const [courseID, moduleID, topicID] = [m.topic[1], m.topic[2], m.topic[3]];
      const [course, module, topic] = await Promise.all([GET('/course?id=' + courseID), GET('/module?id=' + moduleID), GET('/topic?id=' + topicID)]);
      const [cp, pn] = await Promise.all([GET('/coursepages?id=' + topic.coursePageID), GET('/privatenotes?id=' + topic.privateNoteID)]);
      S.courses = await loadCourses(S.user.courseIDs || []);
      S.currentCourse = course; S.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.currentModule = module; S.topics = await loadAll('/topic?id=', module.topicIDs || []);
      S.currentTopic = topic; S.coursePage = cp; S.privateNote = pn;
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

// ── Save notes ─────────────────────────────────────────────────────────────
let cpSaveTimer, pnSaveTimer;

function scheduleCPSave(text) {
  clearTimeout(cpSaveTimer);
  setStatus('cp', 'saving...');
  cpSaveTimer = setTimeout(async () => {
    try {
      await PUT('/coursepages', { id: S.coursePage.coursePageID, description: text });
      S.coursePage.description = text;
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
    nav.innerHTML = `<div class="nav-item active" onclick="goCourses()">
      <span class="nav-dot"></span>All Courses</div>`;
    return;
  }

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

function coursesHTML() {
  const cards = S.courses.length
    ? S.courses.map(c => {
        const mods = (c.moduleIDs || []).length;
        const pct  = (S.courseProgress || {})[c.courseID] ?? 0;
        return `
      <div class="course-card" onclick="goModules(${jsonAttr(c)}, false)">
        <div class="cc-title">${esc(c.name)}</div>
        <div class="cc-desc">${esc(c.description) || '<span style="color:var(--border)">No description</span>'}</div>
        <div class="cc-meta">
          <span class="tag">${mods} module${mods !== 1 ? 's' : ''}</span>
          <button class="btn btn-ghost btn-sm cc-edit-btn" onclick="event.stopPropagation();goModules(${jsonAttr(c)}, true)" title="Edit course">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        </div>
        <div class="cc-progress">
          <div class="cc-progress-bar"><div class="cc-progress-fill" style="width:${pct}%"></div></div>
          <span class="cc-progress-pct">${pct}%</span>
        </div>
      </div>`;
      }).join('')
    : `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></svg>
        <p>No courses yet.<br>Create your first course above.</p>
      </div>`;

  return `<div class="section">
    <div class="section-header" style="margin-bottom:20px">
      <div>
        <h1 style="margin-bottom:4px"><span>My Courses</span></h1>
        <p class="subtitle" style="margin-bottom:0">Pick up where you left off, or start something new.</p>
      </div>
      <button class="btn btn-primary" onclick="toggleForm('course-form')">+ New Course</button>
    </div>
    <div class="inline-form" id="course-form">
      <h3>New Course</h3>
      <div class="form-row">
        <div class="field"><label>Name</label><input id="cf-name" placeholder="e.g. Data Structures" /></div>
        <div class="field"><label>Description</label><input id="cf-desc" placeholder="What's this course about?" /></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="cf-submit">Create</button>
        <button class="btn btn-ghost" onclick="toggleForm('course-form')">Cancel</button>
      </div>
    </div>
    <div class="inline-form" id="course-edit-card-form">
      <h3>Edit Course</h3>
      <div class="form-row">
        <div class="field"><label>Name</label><input id="cef-name" /></div>
        <div class="field"><label>Description</label><input id="cef-desc" /></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="cef-save">Save</button>
        <button class="btn btn-ghost" onclick="toggleForm('course-edit-card-form')">Cancel</button>
      </div>
    </div>
    <div class="course-grid">${cards}</div>
  </div>`;
}

function modulesHTML() {
  const c = S.currentCourse;
  const totalTopics = S.modules.reduce((n, m) => n + (m.topicIDs || []).length, 0);
  const doneMods = S.modules.filter(m => m.slashed).length;
  const pct = S.modules.length ? Math.round(doneMods / S.modules.length * 100) : 0;

  const palettes = [
    { strip: '#6c8ef7', bg: 'rgba(108,142,247,.13)', text: '#6c8ef7' },
    { strip: '#a78bfa', bg: 'rgba(167,139,250,.13)',  text: '#a78bfa' },
    { strip: '#34d399', bg: 'rgba(52,211,153,.13)',   text: '#34d399' },
    { strip: '#fb923c', bg: 'rgba(251,146,60,.13)',   text: '#fb923c' },
    { strip: '#f472b6', bg: 'rgba(244,114,182,.13)',  text: '#f472b6' },
  ];

  const items = S.modules.length
    ? `<div class="mod-grid">${S.modules.map((m, i) => {
        const topics = (m.topicIDs || []).length;
        const p = palettes[i % palettes.length];
        const doneClass = m.slashed ? ' mod-done' : '';
        return `
        <div class="mod-card${doneClass}" onclick="goTopics(${jsonAttr(m)})">
          <div class="mod-strip" style="background:${p.strip}"></div>
          <div class="mod-body">
            <div class="mod-icon" style="background:${p.bg};color:${p.text}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/><path d="M8 8h8"/><path d="M8 16h4"/></svg>
            </div>
            <div class="mod-name">${esc(m.name)}</div>
            <div class="mod-desc">${esc(m.description) || '<span style="color:var(--text3);font-style:italic">No description</span>'}</div>
          </div>
          <div class="mod-foot">
            <span class="mod-chip" style="background:${p.bg};color:${p.text}">${topics} topic${topics !== 1 ? 's' : ''}</span>
            ${S.editMode ? `<button class="btn btn-danger" onclick="event.stopPropagation();deleteModule('${m.moduleID}')">Delete</button>` : ''}
          </div>
        </div>`;
      }).join('')}</div>`
    : `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></svg>
        <p>No modules yet.<br>Add your first module above.</p>
      </div>`;

  return `<div class="course-page">
    <div class="back-link" onclick="goCourses()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      All Courses
    </div>

    <div class="course-hero" id="course-view-header">
      <div class="ch-top">
        <div class="ch-title-row">
          <div class="ch-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div>
            <h1 id="course-title-display" style="margin-bottom:3px"><span>${esc(c.name)}</span></h1>
            <p id="course-desc-display" class="ch-desc">${esc(c.description) || '<span style="opacity:.45">No description — click Edit to add one</span>'}</p>
          </div>
        </div>
        <div class="ch-actions">
          ${S.editMode
            ? `<button class="btn btn-ghost btn-sm" id="course-edit-btn" onclick="enterCourseEditMode()">✎ Edit</button>
               <button class="btn btn-primary btn-sm" onclick="toggleForm('module-form')">+ New Module</button>
               <button class="btn btn-ghost btn-sm" onclick="S.editMode=false;render()" style="color:var(--accent3);border-color:var(--accent3)">✓ Done editing</button>`
            : ''
          }
        </div>
      </div>
      <div class="ch-stats">
        <div class="ch-stat">
          <span class="ch-stat-val">${S.modules.length}</span>
          <span class="ch-stat-label">Modules</span>
        </div>
        <div class="ch-stat">
          <span class="ch-stat-val">${totalTopics}</span>
          <span class="ch-stat-label">Topics</span>
        </div>
        <div class="ch-stat">
          <span class="ch-stat-val">${doneMods}</span>
          <span class="ch-stat-label">Completed</span>
        </div>
        <div class="ch-stat-prog">
          <div class="ch-prog-label">
            <span>Progress</span>
            <span style="color:var(--accent);font-weight:700">${pct}%</span>
          </div>
          <div class="ch-prog"><div class="ch-prog-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
    </div>

    ${S.editMode ? `
    <div id="course-edit-form" style="display:none;margin-bottom:24px">
      <div class="inline-form open" style="margin-bottom:0">
        <h3>Edit Course</h3>
        <div class="form-row">
          <div class="field"><label>Name</label><input id="ce-name" value="${esc(c.name)}" /></div>
          <div class="field"><label>Description</label><input id="ce-desc" value="${esc(c.description || '')}" placeholder="What's this course about?" /></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="ce-save">Save</button>
          <button class="btn btn-ghost" onclick="exitCourseEditMode()">Cancel</button>
        </div>
      </div>
    </div>
    <div class="inline-form" id="module-form">
      <h3>New Module</h3>
      <div class="form-row">
        <div class="field"><label>Name</label><input id="mf-name" placeholder="e.g. Week 3 — Sorting" /></div>
        <div class="field"><label>Description</label><input id="mf-desc" placeholder="Brief overview…" /></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="mf-submit">Create</button>
        <button class="btn btn-ghost" onclick="toggleForm('module-form')">Cancel</button>
      </div>
    </div>` : ''}
    ${items}
  </div>`;
}

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
        <div class="item-actions">
          <button class="btn btn-danger" onclick="event.stopPropagation();deleteTopic('${t.topicID}')">Delete</button>
        </div>
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
        <button class="btn btn-primary" onclick="toggleForm('topic-form')">+ New Topic</button>
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
  const cp = S.coursePage;
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
        <button class="notes-tab ${S.editMode ? 'notes-tab-active' : ''}" id="tab-pn" onclick="switchNotesTab('pn')">Private Notes</button>
        <button class="notes-tab ${!S.editMode ? 'notes-tab-active' : ''}" id="tab-cp" onclick="switchNotesTab('cp')">Course View</button>
      </div>
    </div>
    <div id="pane-pn" class="note-pane" style="${S.editMode ? '' : 'display:none'}">
      <div class="note-pane-header">
        <span class="note-pane-title private">Private Notes</span>
        <span class="save-indicator" id="status-pn"></span>
      </div>
      <div class="note-pane-body">
        <textarea id="pn-text" placeholder="Add your personal notes here…">${esc(pn?.description || '')}</textarea>
      </div>
    </div>
    <div id="pane-cp" class="note-pane" style="${!S.editMode ? '' : 'display:none'}">
      <div class="note-pane-header">
        <span class="note-pane-title course">Course View</span>
        <span class="save-indicator" id="status-cp"></span>
      </div>
      <div class="note-pane-body">
        <textarea id="cp-text" placeholder="Add course view notes here…">${esc(cp?.description || '')}</textarea>
      </div>
    </div>
  </div>`;
}

function switchNotesTab(tab) {
  document.getElementById('pane-pn').style.display = tab === 'pn' ? '' : 'none';
  document.getElementById('pane-cp').style.display = tab === 'cp' ? '' : 'none';
  document.getElementById('tab-pn').classList.toggle('notes-tab-active', tab === 'pn');
  document.getElementById('tab-cp').classList.toggle('notes-tab-active', tab === 'cp');
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
  document.getElementById('cp-text')?.addEventListener('input', e => scheduleCPSave(e.target.value));
  document.getElementById('pn-text')?.addEventListener('input', e => schedulePNSave(e.target.value));
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
