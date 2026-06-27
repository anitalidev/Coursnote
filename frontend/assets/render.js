'use strict';

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

function switchNotesTab(tab) {
  S.notesTab = tab;
  document.getElementById('pane-pn').style.display = tab === 'pn' ? '' : 'none';
  document.getElementById('pane-cp').style.display = tab === 'cp' ? '' : 'none';
  document.getElementById('tab-pn').classList.toggle('notes-tab-active', tab === 'pn');
  document.getElementById('tab-cp').classList.toggle('notes-tab-active', tab === 'cp');
  if (tab === 'pn') { const ta = document.getElementById('pn-text'); if (ta) autoResize(ta); }
  if (S.currentTopic) pushHash('#course/' + S.currentCourse.courseID + '/module/' + S.currentModule.moduleID + '/topic/' + S.currentTopic.topicID + '/' + tab);
}
