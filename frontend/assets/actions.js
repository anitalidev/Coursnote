'use strict';

function toggleUserMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('icon-user-menu');
  if (!menu) return;
  const open = menu.style.display !== 'none';
  if (open) { menu.style.display = 'none'; return; }
  const rect = e.currentTarget.getBoundingClientRect();
  menu.style.display = 'block';
  menu.style.left = (rect.right + 8) + 'px';
  menu.style.top = rect.top + 'px';
  const close = () => { menu.style.display = 'none'; document.removeEventListener('click', close); };
  document.addEventListener('click', close);
}

async function handleLogin(username) {
  username = username.trim();
  if (!username) return;
  let user;
  try {
    user = await GET('/user?username=' + encodeURIComponent(username));
  } catch {
    user = await POST('/user', { username });
  }
  const full = await GET('/user?id=' + user.id);
  S.user = { id: user.id, username: user.username, courseIDs: full.courseIDs || [] };
  localStorage.setItem('coursnote_user', JSON.stringify(S.user));
  await goCourses();
}

async function createCourse(name, desc) {
  await POST('/course', { name, description: desc, userID: S.user.id });
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
  S.modules.forEach(m => { if (!S.moduleTopics[m.moduleID]) S.moduleTopics[m.moduleID] = []; });
  render();
  toast('Module created');
}

async function toggleTopicCompleted() {
  const t = S.currentTopic;
  const next = !t.completed;
  try {
    await PUT('/topic', { id: t.topicID, name: t.name, description: t.description || '', completed: next });
    t.completed = next;
    S.currentCourse = await GET('/course?id=' + S.currentCourse.courseID);
    renderSidebar();
    const btn = document.getElementById('mark-completed-btn');
    if (btn) {
      btn.classList.toggle('mark-completed-done', next);
      btn.textContent = next ? '✓ Completed' : 'Mark Complete';
    }
    toast(next ? 'Marked complete' : 'Marked incomplete');
  } catch (e) {
    toast(e.message || 'Failed to update topic', 'err');
  }
}

async function createTopic(name, desc) {
  await POST('/topic', { name, description: desc, moduleID: S.currentModule.moduleID });
  const updated = await GET('/module?id=' + S.currentModule.moduleID);
  S.currentModule = updated;
  S.topics = await loadAll('/topic?id=', updated.topicIDs || []);
  S.moduleTopics[S.currentModule.moduleID] = S.topics;
  S.currentCourse = await GET('/course?id=' + S.currentCourse.courseID);
  render();
  toast('Topic created');
}

function filterCourseCards() {
  const q = (document.getElementById('cc2-search')?.value || '').toLowerCase();
  document.querySelectorAll('.course-card2').forEach(el => {
    const name = el.querySelector('.cc2-title')?.textContent.toLowerCase() || '';
    const desc = el.querySelector('.cc2-desc')?.textContent.toLowerCase() || '';
    el.style.display = (!q || name.includes(q) || desc.includes(q)) ? '' : 'none';
  });
}

function openModuleMenu(moduleID, btn) {
  const existing = btn.querySelector('.cc2-dropdown');
  if (existing) { existing.remove(); return; }
  document.querySelectorAll('.cc2-dropdown').forEach(d => d.remove());
  const menu = document.createElement('div');
  menu.className = 'cc2-dropdown';
  menu.innerHTML = `
    <div class="cc2-dd-item cc2-dd-danger" onclick="deleteModule('${moduleID}');document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Delete</div>`;
  btn.style.position = 'relative';
  btn.appendChild(menu);
  const wrap = btn.closest('.mod2-card') || btn;
  const removeOnLeave = () => { menu.remove(); wrap.removeEventListener('mouseleave', removeOnLeave); };
  wrap.addEventListener('mouseleave', removeOnLeave);
}

function openCourseMenu(courseID, course, btn) {
  const existing = btn.querySelector('.cc2-dropdown');
  if (existing) { existing.remove(); return; }
  document.querySelectorAll('.cc2-dropdown').forEach(d => d.remove());
  const menu = document.createElement('div');
  menu.className = 'cc2-dropdown';
  menu.innerHTML = `
    <div class="cc2-dd-item" onclick="publishCourse('${courseID}');document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Publish</div>
    <div class="cc2-dd-item" onclick="downloadCourse('${courseID}');document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Download</div>
    <div class="cc2-dd-item cc2-dd-danger" onclick="deleteCourse('${courseID}');document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Delete Course</div>`;
  btn.style.position = 'relative';
  btn.appendChild(menu);
  const wrap = btn.closest('.course-card2') || btn;
  const removeOnLeave = () => { menu.remove(); wrap.removeEventListener('mouseleave', removeOnLeave); };
  wrap.addEventListener('mouseleave', removeOnLeave);
}

async function publishCourse(id) {
  const course = S.courses.find(c => c.courseID === id);
  if (!course) return;

  const modules = await loadAll('/module?id=', course.moduleIDs || []);
  const allTopics = (await Promise.all(modules.map(m => loadAll('/topic?id=', m.topicIDs || [])))).flat();
  const topicMap = {};
  const privateNotes = {};
  await Promise.all(allTopics.map(async t => {
    topicMap[t.topicID] = t;
    if (t.privateNoteID) {
      const pn = await GET('/privatenotes?id=' + t.privateNoteID);
      if (pn) privateNotes[t.privateNoteID] = pn;
    }
  }));
  const courseData = { course, modules, topics: topicMap, privateNotes };

  const publishedContent = buildOnlineStaticIndex(course, courseData);
  const updated = await POST('/course/publish?id=' + id, { publishedContent });
  S.courses = S.courses.map(c => c.courseID === id ? updated : c);
  render();
  toast('Course published!');
}

function buildOnlineStaticIndex(course, courseData) {
  const base = 'http://localhost:8081/static/assets';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(course.name)}</title>
<link rel="stylesheet" href="${base}/styles.css">
<link rel="stylesheet" href="${base}/toolbar.css">
</head>
<body>
<nav id="sidebar">
  <div id="sidebar-header"><h2>Coursnote</h2><p>Your course notes</p></div>
  <div id="sidebar-nav"></div>
  <div id="sidebar-footer"></div>
  <div style="padding:12px 16px;border-top:1px solid var(--border)">
    <button onclick="window.location.href='http://localhost:3334/#market'" style="width:100%;padding:11px 8px;background:transparent;border:1px solid var(--accent);border-radius:6px;color:var(--accent);font-size:13px;cursor:pointer;transition:all .15s;font-weight:500" onmouseover="this.style.background='var(--accent)';this.style.color='var(--bg)'" onmouseout="this.style.background='transparent';this.style.color='var(--accent)'">← Back to Market</button>
  </div>
</nav>
<main id="main"></main>
<div id="toast"></div>
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"><\/script>
<script>
  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
  require(['vs/editor/editor.main'], function() { window.dispatchEvent(new Event('monaco-ready')); });
<\/script>
<script type="module" src="${base}/static-main.js"><\/script>
<script>window.COURSE_DATA = ${JSON.stringify(courseData)};<\/script>
<script src="${base}/state.js"><\/script>
<script src="${base}/api.js"><\/script>
<script src="${base}/utils.js"><\/script>
<script src="${base}/data.js"><\/script>
<script src="${base}/notebook.js"><\/script>
<script src="${base}/views.js"><\/script>
<script src="${base}/render.js"><\/script>
<script src="${base}/navigation.js"><\/script>
<script src="${base}/static-init.js"><\/script>
</body>
</html>`;
}

async function downloadCourse(id) {
  const course = S.courses.find(c => c.courseID === id);
  if (!course) return;

  const modules = await loadAll('/module?id=', course.moduleIDs || []);
  const allTopics = (await Promise.all(modules.map(m => loadAll('/topic?id=', m.topicIDs || [])))).flat();

  // Keyed maps for COURSE_DATA
  const topicMap = {};
  const privateNotes = {};
  await Promise.all(allTopics.map(async t => {
    topicMap[t.topicID] = t;
    if (t.privateNoteID) {
      const pn = await GET('/privatenotes?id=' + t.privateNoteID);
      if (pn) privateNotes[t.privateNoteID] = pn;
    }
  }));

  const courseData = { course, modules, topics: topicMap, privateNotes };

  const assetFiles = [
    'styles.css', 'toolbar.css',
    'state.js', 'api.js', 'utils.js', 'data.js',
    'notebook.js', 'views.js', 'render.js',
    'navigation.js', 'static-init.js', 'static-main.js',
  ];
  // CSS is fetched from the Go backend (/static/assets/) which serves raw files,
  // bypassing Vite's HMR transform that wraps CSS in a JS module.
  const fetchURL = f => (f.endsWith('.css') ? `http://localhost:8081/static/assets/${f}` : `/assets/${f}`);
  const fetched = await Promise.all(assetFiles.map(f => fetch(fetchURL(f)).then(r => r.text())));
  const fileMap = Object.fromEntries(assetFiles.map((f, i) => [f, fetched[i]]));

  const zip = new window.JSZip();
  const folder = zip.folder(course.name.replace(/[^a-z0-9]/gi, '_'));
  const assets = folder.folder('assets');
  folder.file('index.html',     buildStaticIndex(course, courseData, fileMap));
  assets.file('styles.css',     fileMap['styles.css']);
  assets.file('toolbar.css',    fileMap['toolbar.css']);
  assets.file('state.js',       fileMap['state.js']);
  assets.file('api.js',         fileMap['api.js']);
  assets.file('utils.js',       fileMap['utils.js']);
  assets.file('data.js',        fileMap['data.js']);
  assets.file('notebook.js',    fileMap['notebook.js']);
  assets.file('views.js',       fileMap['views.js']);
  assets.file('render.js',      fileMap['render.js']);
  assets.file('navigation.js',  fileMap['navigation.js']);
  assets.file('static-init.js', fileMap['static-init.js']);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${course.name.replace(/[^a-z0-9]/gi, '_')}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}


function buildStaticIndex(course, courseData, fileMap) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(course.name)}</title>
<link rel="stylesheet" href="assets/styles.css">
<link rel="stylesheet" href="assets/toolbar.css">
</head>
<body>
<nav id="sidebar">
  <div id="sidebar-header">
    <h2>Coursnote</h2>
    <p>Your course notes</p>
  </div>
  <div id="sidebar-nav"></div>
  <div id="sidebar-footer"></div>
</nav>
<main id="main"></main>
<div id="toast"></div>
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"><\/script>
<script>
  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
  require(['vs/editor/editor.main'], function() { window.dispatchEvent(new Event('monaco-ready')); });
<\/script>
<script type="module">${fileMap['static-main.js']}<\/script>
<script>window.COURSE_DATA = ${JSON.stringify(courseData)};<\/script>
<script src="assets/state.js"><\/script>
<script src="assets/api.js"><\/script>
<script src="assets/utils.js"><\/script>
<script src="assets/data.js"><\/script>
<script src="assets/notebook.js"><\/script>
<script src="assets/views.js"><\/script>
<script src="assets/render.js"><\/script>
<script src="assets/navigation.js"><\/script>
<script src="assets/static-init.js"><\/script>
</body>
</html>`;
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
  delete S.moduleTopics[id];
  render();
  toast('Module deleted', 'err');
}

async function deleteTopic(id) {
  if (!confirm('Delete this topic?')) return;
  await DEL('/topic?id=' + id);
  const updated = await GET('/module?id=' + S.currentModule.moduleID);
  S.currentModule = updated;
  S.topics = await loadAll('/topic?id=', updated.topicIDs || []);
  S.moduleTopics[S.currentModule.moduleID] = S.topics;
  S.currentCourse = await GET('/course?id=' + S.currentCourse.courseID);
  render();
  toast('Topic deleted', 'err');
}
