'use strict';

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
        <div class="cc-card-header">
          <button class="btn btn-ghost btn-sm cc-edit-btn" onclick="event.stopPropagation();goModules(${jsonAttr(c)}, true)" title="Edit course">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        </div>
        <div class="cc-title">${esc(c.name)}</div>
        <div class="cc-desc">${esc(c.description) || '<span style="color:var(--border)">No description</span>'}</div>
        <div class="cc-meta">
          <span class="tag">${mods} module${mods !== 1 ? 's' : ''}</span>
        </div>
        <div class="cc-progress">
          <div class="cc-progress-bar"><div class="cc-progress-fill" style="width:${pct}%"></div></div>
          <span class="cc-progress-pct">${pct}%</span>
        </div>
      </div>`;
      }).join('')
    : '';

  const addCourseCard = `<div class="cc-add-card" onclick="toggleForm('course-form')">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    New Course
  </div>`;

  const grid = `<div class="course-grid">${addCourseCard}${cards}</div>`;

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
    ${grid}
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

  const addModCard = S.editMode
    ? `<div class="mod-card mod-add-card" onclick="toggleForm('module-form')">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>`
    : '';

  const items = S.modules.length || S.editMode
    ? `<div class="mod-grid">${addModCard}${S.modules.map((m, i) => {
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
        <p>No modules yet.<br>Enter this course in edit mode to add modules.</p>
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
               <button class="btn btn-primary btn-sm" onclick="saveCourseFromEditMode()">Save</button>`
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
