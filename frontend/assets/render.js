'use strict';

// pctHTML is a pre-built <span> so callers can inject an id for dynamic updates.
function buildSbStatsCardHTML(nModules, nTopics, pctHTML, style) {
  return `<div class="sb-stats-card"${style ? ` style="${style}"` : ''}>
    <div class="sb-stat">
      <span class="sb-stat-val">${nModules}</span>
      <span class="sb-stat-label">Module${nModules !== 1 ? 's' : ''}</span>
    </div>
    <div class="sb-stat-div"></div>
    <div class="sb-stat">
      <span class="sb-stat-val">${nTopics}</span>
      <span class="sb-stat-label">Topic${nTopics !== 1 ? 's' : ''}</span>
    </div>
    <div class="sb-stat-div"></div>
    <div class="sb-stat">
      ${pctHTML}
      <span class="sb-stat-label">Progress</span>
    </div>
  </div>`;
}

function render() {
  const loading = document.getElementById('app-loading');
  if (loading) loading.remove();
  renderSidebar();
  renderMain();
}

function renderSidebar() {
  const header = document.getElementById('sidebar-header');
  const nav    = document.getElementById('sidebar-nav');
  const footer = document.getElementById('sidebar-footer');

  if (S.ui.view === 'login') {
    header.innerHTML = '<h2>Coursnote</h2><p>Your course notes</p>';
    nav.innerHTML = '';
    footer.innerHTML = '';
    return;
  }

  header.innerHTML = `<h2>Coursnote</h2><p>${esc(S.data.user.username)}</p>`;
  footer.innerHTML = '';

  if (S.ui.view === 'courses' || !S.ui.currentCourse) {
    document.getElementById('sidebar').classList.add('icon-mode');
    const initial = (S.data.user.username || '?')[0].toUpperCase();
    const avatarImg = S.data.user.avatarURL ? `<img src="${esc(S.data.user.avatarURL)}" class="icon-nav-avatar-img">` : initial;
    nav.innerHTML = `
      <div class="icon-nav-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </div>
      <div class="icon-nav-item${S.ui.view === 'home' ? ' active' : ''}" onclick="goHome()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Home</span>
      </div>
      <div class="icon-nav-item${S.ui.view === 'courses' ? ' active' : ''}" onclick="goCourses()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span>Courses</span>
      </div>
      <div class="icon-nav-item${S.ui.view === 'market' ? ' active' : ''}" onclick="goMarket()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span>Market</span>
      </div>
      <div class="icon-nav-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>Search</span>
      </div>`;
    footer.innerHTML = `
      <div class="icon-nav-item${S.ui.view === 'settings' ? ' active' : ''}" onclick="goSettings()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Settings</span>
      </div>
      <div class="icon-nav-avatar" onclick="toggleUserMenu(event)">${avatarImg}</div>
      <div class="icon-nav-avatar-label" onclick="toggleUserMenu(event)">${esc(S.data.user.username)} ▾</div>`;
    let menu = document.getElementById('icon-user-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'icon-user-menu';
      menu.className = 'icon-nav-user-menu';
      menu.style.display = 'none';
      menu.innerHTML = `<button onclick="goLogin()">Log Out</button>`;
      document.body.appendChild(menu);
    }
    return;
  }

  document.getElementById('sidebar').classList.remove('icon-mode');

  const total = S.data.modules.length;
  const totalTopics = S.data.modules.reduce((n, m) => n + (m.topicIDs || []).length, 0);
  const pct   = Runtime.trackProgress ? _computePercentageCompleted() : 0;
  const initial = (S.data.user.username || '?')[0].toUpperCase();
  const sbAvatarInner = S.data.user.avatarURL ? `<img src="${esc(S.data.user.avatarURL)}" class="sb-avatar-img">` : initial;

  header.innerHTML = `
    <h2>${Runtime.trackProgress ? esc(S.ui.currentCourse?.name || 'Course') : 'Coursnote'}</h2>
    ${Runtime.editable ? `<div class="sb-user-row">
      <div class="sb-avatar">${sbAvatarInner}</div>
      <span class="sb-username">${esc(S.data.user.username)}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--text3)"><path d="M6 9l6 6 6-6"/></svg>
    </div>` : ''}
    ${buildSbStatsCardHTML(total, totalTopics, `<span class="sb-stat-val">${pct}%</span>`)}
  `;

  const isOverview = S.ui.view === 'modules';
  const moduleItems = S.data.modules.map(m => {
    const isMod  = S.ui.currentModule?.moduleID === m.moduleID;
    const active = isMod ? ' active' : '';
    const slash  = !S.ui.editMode && isModuleComplete(m) ? ' done' : '';
    const mTopics = (S.data.moduleTopics || {})[m.moduleID] || [];
    const topicItems = mTopics.map(t => {
      const tActive = S.ui.currentTopic?.topicID === t.topicID ? ' nav-sub-active' : '';
      const tDone   = !S.ui.editMode && isTopicComplete(t) ? ' nav-sub-done' : '';
      return `<div class="nav-sub-item${tActive}${tDone}" onclick="event.stopPropagation();goTopic(${jsonAttr(t)})">
        <span class="nav-sub-dot"></span><span>${esc(t.name)}</span>
      </div>`;
    }).join('');
    return `<div class="nav-item${active}${slash}" onclick="goTopics(${jsonAttr(m)})">
      <span class="nav-dot"></span><span style="flex:1">${esc(m.name)}</span>
    </div>${topicItems}`;
  }).join('');

  footer.innerHTML = '';

  nav.innerHTML = `
    ${Runtime.editable ? `<div class="nav-item" onclick="goCourses()" style="margin-bottom:4px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      All Courses
    </div>
` : ''}
    <div class="nav-group-item${isOverview ? ' active' : ''}" onclick="goModules(${jsonAttr(S.ui.currentCourse)},S.ui.editMode)">
      <div style="display:flex;align-items:center;gap:10px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M8 8h8M8 16h4"/></svg>
        Overview
      </div>
    </div>
    <div class="nav-section">Content</div>
    ${moduleItems}`;
}

function renderMain() {
  const main = document.getElementById('main');

  if (S.ui.view === 'login') {
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

  if (S.ui.view === 'home')     { main.innerHTML = homeHTML(); }
  if (S.ui.view === 'courses')  { main.innerHTML = coursesHTML(); bindCoursesForm(); }
  if (S.ui.view === 'market')   { main.innerHTML = marketHTML(); }
  if (S.ui.view === 'modules')  { main.innerHTML = modulesHTML(); bindModulesForm(); }
  if (S.ui.view === 'topics')   { main.innerHTML = topicsHTML();  bindTopicsForm(); }
  if (S.ui.view === 'topic')    { main.innerHTML = topicHTML();   bindTopicListeners(); }
  if (S.ui.view === 'settings') { main.innerHTML = settingsHTML(); }
}

function switchNotesTab(tab) {
  S.ui.notesTab = tab;
  S.ui.splitPane = false;
  const pn = document.getElementById('pane-pn');
  const cp = document.getElementById('pane-cp');
  const container = document.getElementById('panes-container');
  if (pn) pn.style.display = tab === 'pn' ? '' : 'none';
  if (cp) cp.style.display = tab === 'cp' ? '' : 'none';
  if (container) container.classList.remove('panes-split');
  document.getElementById('tab-pn')?.classList.toggle('notes-tab-active', tab === 'pn');
  document.getElementById('tab-cp')?.classList.toggle('notes-tab-active', tab === 'cp');
  document.getElementById('tab-split')?.classList.remove('notes-tab-active');
  if (tab === 'pn') mountPNEditor();
  if (S.ui.currentTopic) pushHash('#course/' + S.ui.currentCourse.courseID + '/module/' + S.ui.currentModule.moduleID + '/topic/' + S.ui.currentTopic.topicID + '/' + tab + (S.ui.editMode ? '/edit' : ''));
}

function toggleSplitPane() {
  S.ui.splitPane = !S.ui.splitPane;
  const pn = document.getElementById('pane-pn');
  const cp = document.getElementById('pane-cp');
  const container = document.getElementById('panes-container');
  if (S.ui.splitPane) {
    if (pn) pn.style.display = '';
    if (cp) cp.style.display = '';
    if (container) {
      container.classList.add('panes-split');
      // inject divider if not present
      if (!document.getElementById('pane-divider')) {
        const div = document.createElement('div');
        div.id = 'pane-divider';
        div.className = 'pane-divider';
        div.onmousedown = startPaneDrag;
        container.insertBefore(div, cp);
      }
    }
    mountPNEditor();
    document.getElementById('tab-split')?.classList.add('notes-tab-active');
    document.getElementById('tab-pn')?.classList.remove('notes-tab-active');
    document.getElementById('tab-cp')?.classList.remove('notes-tab-active');
  } else {
    document.getElementById('pane-divider')?.remove();
    container?.classList.remove('panes-split');
    switchNotesTab(S.ui.notesTab || 'cp');
  }
}
