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
  footer.innerHTML = '';

  if (S.view === 'courses' || !S.currentCourse) {
    document.getElementById('sidebar').classList.add('icon-mode');
    const initial = (S.user.username || '?')[0].toUpperCase();
    const avatarImg = S.user.avatarURL ? `<img src="${esc(S.user.avatarURL)}" class="icon-nav-avatar-img">` : initial;
    nav.innerHTML = `
      <div class="icon-nav-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </div>
      <div class="icon-nav-item${S.view === 'home' ? ' active' : ''}" onclick="goHome()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Home</span>
      </div>
      <div class="icon-nav-item${S.view === 'courses' ? ' active' : ''}" onclick="goCourses()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span>Courses</span>
      </div>
      <div class="icon-nav-item${S.view === 'market' ? ' active' : ''}" onclick="goMarket()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span>Market</span>
      </div>
      <div class="icon-nav-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>Search</span>
      </div>`;
    footer.innerHTML = `
      <div class="icon-nav-item${S.view === 'settings' ? ' active' : ''}" onclick="goSettings()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Settings</span>
      </div>
      <div class="icon-nav-avatar" onclick="toggleUserMenu(event)">${avatarImg}</div>
      <div class="icon-nav-avatar-label" onclick="toggleUserMenu(event)">${esc(S.user.username)} ▾</div>`;
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

  const total = S.modules.length;
  const totalTopics = S.modules.reduce((n, m) => n + (m.topicIDs || []).length, 0);
  const pct   = Math.round((S.currentCourse?.pcompleted || 0) * 100);
  const initial = (S.user.username || '?')[0].toUpperCase();
  const sbAvatarInner = S.user.avatarURL ? `<img src="${esc(S.user.avatarURL)}" class="sb-avatar-img">` : initial;

  header.innerHTML = `
    <h2>${window.STATIC_MODE ? esc(S.currentCourse?.name || 'Course') : 'Coursnote'}</h2>
    ${!window.STATIC_MODE ? `<div class="sb-user-row">
      <div class="sb-avatar">${sbAvatarInner}</div>
      <span class="sb-username">${esc(S.user.username)}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--text3)"><path d="M6 9l6 6 6-6"/></svg>
    </div>` : ''}
    ${buildSbStatsCardHTML(total, totalTopics, `<span class="sb-stat-val">${pct}%</span>`)}
  `;

  const isOverview = S.view === 'modules';
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

  footer.innerHTML = '';

  nav.innerHTML = `
    ${!window.STATIC_MODE ? `<div class="nav-item" onclick="goCourses()" style="margin-bottom:4px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      All Courses
    </div>
` : ''}
    <div class="nav-group-item${isOverview ? ' active' : ''}" onclick="goModules(${jsonAttr(S.currentCourse)},S.editMode)">
      <div style="display:flex;align-items:center;gap:10px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M8 8h8M8 16h4"/></svg>
        Overview
      </div>
      <span class="nav-count">${total}</span>
    </div>
    <div class="nav-section">Content</div>
    ${moduleItems}`;
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

  if (S.view === 'home')     { main.innerHTML = homeHTML(); }
  if (S.view === 'courses')  { main.innerHTML = coursesHTML(); bindCoursesForm(); }
  if (S.view === 'market')   { main.innerHTML = marketHTML(); }
  if (S.view === 'modules')  { main.innerHTML = modulesHTML(); bindModulesForm(); }
  if (S.view === 'topics')   { main.innerHTML = topicsHTML();  bindTopicsForm(); }
  if (S.view === 'topic')    { main.innerHTML = topicHTML();   bindTopicListeners(); }
  if (S.view === 'settings') { main.innerHTML = settingsHTML(); }
}

function switchNotesTab(tab) {
  S.notesTab = tab;
  document.getElementById('pane-pn').style.display = tab === 'pn' ? '' : 'none';
  document.getElementById('pane-cp').style.display = tab === 'cp' ? '' : 'none';
  document.getElementById('tab-pn').classList.toggle('notes-tab-active', tab === 'pn');
  document.getElementById('tab-cp').classList.toggle('notes-tab-active', tab === 'cp');
  if (tab === 'pn') mountPNEditor();
  if (S.currentTopic) pushHash('#course/' + S.currentCourse.courseID + '/module/' + S.currentModule.moduleID + '/topic/' + S.currentTopic.topicID + '/' + tab + (S.editMode ? '/edit' : ''));
}
