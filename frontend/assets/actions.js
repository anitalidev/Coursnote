'use strict';

function openCourseViewer(contentId) {
  window.location.href = 'http://localhost:8081/api/staticcontent?id=' + contentId + '&from=' + S.view;
}

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
  S.user = { id: user.id, username: user.username, avatarURL: full.avatarURL || '', courseIDs: full.courseIDs || [] };
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
    <div class="cc2-dd-item" onclick="viewPublishedVersions('${courseID}');document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Published Versions</div>
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
  <div id="sidebar-back"></div>
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


async function enrollInCourse(staticCourseID) {
  await POST('/course/enroll', { userID: S.user.id, staticCourseID });
  S.marketCourses = await GET('/market?userID=' + S.user.id) || [];
  S.enrolledCourses = await GET('/course/enrolled?userID=' + S.user.id) || [];
  render();
}

async function updateEnrollment(staticCourseID) {
  await POST('/course/update-enroll', { userID: S.user.id, staticCourseID });
  S.marketCourses = await GET('/market?userID=' + S.user.id) || [];
  S.enrolledCourses = await GET('/course/enrolled?userID=' + S.user.id) || [];
  render();
}

async function viewPublishedVersions(courseID) {
  const versions = await GET('/course/versions?id=' + courseID);
  const list = document.getElementById('modal-versions-list');
  if (!versions || versions.length === 0) {
    list.innerHTML = '<p style="color:var(--text2);padding:8px 0">No published versions yet.</p>';
  } else {
    list.innerHTML = versions.map(v => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:500">${esc(v.name)}</div>
          <div style="font-size:12px;color:var(--text2)">${ccFormatDate(v.publishDate)} · ${v.numModules} module${v.numModules !== 1 ? 's' : ''} · ${v.numTopics} topic${v.numTopics !== 1 ? 's' : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${v.isActive ? '#d1fae5' : '#fee2e2'};color:${v.isActive ? '#065f46' : '#991b1b'}">${v.isActive ? 'Active' : 'Inactive'}</span>
          <a href="http://localhost:8081/api/staticcontent?id=${v.contentId}" target="_blank" style="font-size:13px;color:var(--accent)">View</a>
        </div>
      </div>`).join('');
  }
  openModal('modal-versions', 'Published Versions');
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

// ── Reusable custom dropdown ──────────────────────────────────────────────────
// opts: [{ val, label }], currentVal: string, onchangeFn: string (JS expression called with val)
function buildCustomDropdown(id, opts, currentVal, onchangeFn) {
  const label = opts.find(o => o.val === currentVal)?.label || opts[0]?.label || '';
  const chevron = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const check   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const items = opts.map(o => {
    const active = o.val === currentVal;
    return `<div class="mkt-custom-opt${active ? ' mkt-custom-opt-active' : ''}"
      onclick="event.stopPropagation();toggleCustomDropdown('${id}');(${onchangeFn})('${o.val}')">
      ${o.label}${active ? check : ''}
    </div>`;
  }).join('');
  return `<div id="${id}" class="mkt-custom-select" onclick="toggleCustomDropdown('${id}')">
    <span>${label}</span>${chevron}
    <div class="mkt-custom-opts" style="display:none">${items}</div>
  </div>`;
}

function toggleCustomDropdown(id) {
  const el   = document.getElementById(id);
  const opts = el?.querySelector('.mkt-custom-opts');
  if (!opts) return;
  opts.style.display = opts.style.display === 'none' ? '' : 'none';
}

// ── Market filter/sort ────────────────────────────────────────────────────────

function marketFilteredCards() {
  const f = S.marketFilter;
  const q = f.search.toLowerCase();

  let list = (S.marketCourses || []).filter(c => {
    if (q && !(
      (c.name || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.courseOwner || '').toLowerCase().includes(q)
    )) return false;

    if (f.author) {
      const a = (c.courseOwner || '').toLowerCase();
      if (!a.includes(f.author.toLowerCase())) return false;
    }

    const m = c.numModules || 0;
    if (f.sizeMin !== '' && m < Number(f.sizeMin)) return false;
    if (f.sizeMax !== '' && m > Number(f.sizeMax)) return false;

    return true;
  });

  if ((f.sorts || []).length > 0) {
    list = [...list].sort((a, b) => {
      for (const { key, dir } of f.sorts) {
        const d = dir === 'desc' ? -1 : 1;
        let res = 0;
        switch (key) {
          case 'AtoZ':        res = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()); break;
          case 'modules':     res = (a.numModules || 0) - (b.numModules || 0); break;
          case 'topics':      res = (a.numTopics  || 0) - (b.numTopics  || 0); break;
          case 'owner':       res = (a.courseOwner || '').toLowerCase().localeCompare((b.courseOwner || '').toLowerCase()); break;
          case 'publishDate': res = new Date(a.publishDate) - new Date(b.publishDate); break;
        }
        if (res !== 0) return d * res;
      }
      return 0;
    });
  }

  return list;
}

function marketSetSearch(val) {
  S.marketFilter.search = val;
  marketRerender();
}

function marketClearFilters() {
  const f = S.marketFilter;
  f.search = ''; f.sizeMin = ''; f.sizeMax = ''; f.author = '';
  const panel = document.getElementById('mkt-filter-panel');
  if (panel) panel.innerHTML = marketBuildFilterPanelHTML();
  marketUpdateFilterBadge();
  marketRerender();
}

function marketRerender() {
  const filtered = marketFilteredCards();
  const total = (S.marketCourses || []).length;
  const grid = document.getElementById('mkt-grid');
  if (grid) grid.innerHTML = filtered.map(marketCardHTML).join('');
  const countEl = document.querySelector('.mkt-count');
  if (countEl) countEl.textContent = filtered.length === total
    ? `${total} course${total !== 1 ? 's' : ''}`
    : `${filtered.length} of ${total} courses`;
}

function marketSetSort(key) {
  const f = S.marketFilter;
  const sorts = f.sorts || [];
  const idx = sorts.findIndex(s => s.key === key);
  if (idx === -1) {
    // add with default direction
    const defaultDir = 'desc';
    f.sorts = [...sorts, { key, dir: defaultDir }];
  } else if (sorts[idx].dir === 'desc') {
    // flip to asc
    f.sorts = sorts.map((s, i) => i === idx ? { key, dir: 'asc' } : s);
  } else if (sorts[idx].dir === 'asc') {
    // remove
    f.sorts = sorts.filter((_, i) => i !== idx);
  }
  const panel = document.getElementById('mkt-sort-panel');
  if (panel) panel.innerHTML = marketBuildSortPanelHTML();
  marketUpdateSortBtn();
  marketRerender();
}

function marketUpdateSortBtn() {
  const btn = document.getElementById('mkt-sort-btn');
  if (!btn) return;
  const sorts = S.marketFilter.sorts || [];
  const sortIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18M7 12h10M11 18h2"/></svg>`;
  if (sorts.length === 0) {
    btn.innerHTML = `${sortIcon}<span>Sort</span>`;
    btn.classList.remove('mkt-icon-btn-active');
  } else {
    const labelMap = { publishDate: 'Newest', AtoZ: 'Title', modules: 'Modules', topics: 'Topics', owner: 'Author' };
    const label = sorts.length === 1 ? labelMap[sorts[0].key] : `${sorts.length} sorts`;
    btn.innerHTML = `${sortIcon}<span>${label}</span>`;
    btn.classList.add('mkt-icon-btn-active');
  }
}

function marketClosePanels() {
  document.getElementById('mkt-sort-panel')?.remove();
  document.getElementById('mkt-filter-panel')?.remove();
}

const MKT_SORT_OPTIONS = [
  { key: 'publishDate', label: 'Newest'        },
  { key: 'AtoZ',        label: 'Title'         },
  { key: 'modules',     label: 'Modules'       },
  { key: 'topics',      label: 'Topics'        },
  { key: 'owner',       label: 'Author'        },
];

function marketBuildSortPanelHTML() {
  const sorts = S.marketFilter.sorts || [];
  const upArrow   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;
  const downArrow = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  return MKT_SORT_OPTIONS.map(o => {
    const idx    = sorts.findIndex(s => s.key === o.key);
    const active = idx !== -1;
    const entry  = active ? sorts[idx] : null;
    const badge  = active ? `<span class="mkt-sort-badge">${idx + 1}</span>` : '';
    const arrow  = active ? (entry.dir === 'asc' ? upArrow : downArrow) : '';
    return `<div class="mkt-drop-item${active ? ' mkt-drop-item-active' : ''}" onclick="marketSetSort('${o.key}')">
      <span>${o.label}</span>
      <span class="mkt-sort-meta">${badge}<span class="mkt-sort-arrow">${arrow}</span></span>
    </div>`;
  }).join('');
}

function marketToggleSort(btn) {
  if (document.getElementById('mkt-sort-panel')) { marketClosePanels(); return; }
  marketClosePanels();

  const panel = document.createElement('div');
  panel.id = 'mkt-sort-panel';
  panel.className = 'mkt-drop-panel';
  panel.innerHTML = marketBuildSortPanelHTML();

  document.body.appendChild(panel);
  const rect = btn.getBoundingClientRect();
  panel.style.top  = (rect.bottom + 6) + 'px';
  panel.style.left = rect.left + 'px';

  setTimeout(() => {
    document.addEventListener('mousedown', function _(e) {
      if (!e.target.closest('#mkt-sort-panel') && !btn.contains(e.target)) {
        panel.remove(); document.removeEventListener('mousedown', _);
      }
    });
  }, 0);
}

function marketBuildFilterPanelHTML() {
  const f = S.marketFilter;
  return `
    <div class="mkt-fp-header">
      <span>Filters</span>
      <button class="mkt-fp-reset" onclick="marketClearFilters()">Reset</button>
    </div>
    <div class="mkt-fp-row">
      <span class="mkt-fp-label">Modules</span>
      <div class="mkt-range-wrap">
        <input class="mkt-fp-input mkt-range-input" type="number" min="0" placeholder="Min"
          value="${esc(String(f.sizeMin))}" oninput="marketSetFilter('sizeMin',this.value)" />
        <span class="mkt-range-sep">–</span>
        <input class="mkt-fp-input mkt-range-input" type="number" min="0" placeholder="Max"
          value="${esc(String(f.sizeMax))}" oninput="marketSetFilter('sizeMax',this.value)" />
      </div>
    </div>
    <div class="mkt-fp-row">
      <span class="mkt-fp-label">Author</span>
      <input class="mkt-fp-input" placeholder="Search author…" value="${esc(f.author)}" oninput="marketSetFilter('author',this.value)" />
    </div>`;
}

function marketToggleFilter(btn) {
  if (document.getElementById('mkt-filter-panel')) { marketClosePanels(); return; }
  marketClosePanels();

  const panel = document.createElement('div');
  panel.id = 'mkt-filter-panel';
  panel.className = 'mkt-drop-panel mkt-filter-panel';
  panel.innerHTML = marketBuildFilterPanelHTML();

  document.body.appendChild(panel);
  const rect = btn.getBoundingClientRect();
  panel.style.top  = (rect.bottom + 6) + 'px';
  panel.style.left = rect.left + 'px';

  setTimeout(() => {
    document.addEventListener('mousedown', function _(e) {
      if (!e.target.closest('#mkt-filter-panel') && !btn.contains(e.target)) {
        panel.remove(); document.removeEventListener('mousedown', _);
      }
    });
  }, 0);
}



function marketSetFilter(key, val) {
  S.marketFilter[key] = val;
  // text inputs: don't rebuild panel (would steal focus), just update results
  marketUpdateFilterBadge();
  marketRerender();
}

function marketUpdateFilterBadge() {
  const f = S.marketFilter;
  const filterCount = [f.sizeMin, f.sizeMax, f.author].filter(v => v !== '').length;
  const filterBtn = document.getElementById('mkt-filter-btn');
  if (!filterBtn) return;
  filterBtn.classList.toggle('mkt-icon-btn-active', filterCount > 0);
  const badge = filterBtn.querySelector('.mkt-filter-badge');
  if (filterCount && !badge) {
    const b = document.createElement('span'); b.className = 'mkt-filter-badge'; b.textContent = filterCount; filterBtn.appendChild(b);
  } else if (filterCount && badge) {
    badge.textContent = filterCount;
  } else if (!filterCount && badge) {
    badge.remove();
  }
}

function marketClearFilters() {
  const f = S.marketFilter;
  f.search = ''; f.sizeMin = ''; f.sizeMax = ''; f.author = '';
  const panel = document.getElementById('mkt-filter-panel');
  if (panel) panel.innerHTML = marketBuildFilterPanelHTML();
  marketUpdateFilterBadge();
  marketRerender();
}

async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const getStatus = () => document.getElementById('avatar-status');
  const setStatus = msg => { const el = getStatus(); if (el) el.textContent = msg; };
  setStatus('Uploading…');
  const form = new FormData();
  form.append('avatar', file);
  try {
    const res = await fetch(`http://localhost:8081/api/user/avatar?userID=${S.user.id}`, { method: 'POST', body: form });
    if (!res.ok) {
      let msg = 'Upload failed';
      try { const d = await res.json(); msg = d.error || msg; } catch {}
      throw new Error(msg);
    }
    const { avatarURL } = await res.json();
    S.user.avatarURL = avatarURL;
    localStorage.setItem('coursnote_user', JSON.stringify(S.user));
    render();
  } catch (e) {
    setStatus(e.message || 'Upload failed.');
    toast(e.message || 'Avatar upload failed', 'err');
    console.error('Avatar upload error:', e);
  }
}

function removeAvatar() {
  S.user.avatarURL = '';
  localStorage.setItem('coursnote_user', JSON.stringify(S.user));
  fetch(`http://localhost:8081/api/user/avatar?userID=${S.user.id}`, { method: 'DELETE' }).catch(() => {});
  render();
}
