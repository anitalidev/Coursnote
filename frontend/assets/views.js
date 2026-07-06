'use strict';

function settingsHTML() {
  const avatarSrc = S.user.avatarURL;
  return `<div class="section">
    <h1 style="margin-bottom:24px">Settings</h1>
    <div class="settings-card">
      <h2 class="settings-section-title">Profile</h2>
      <div class="settings-avatar-row">
        <div class="settings-avatar-preview" id="avatar-preview">
          ${avatarSrc ? `<img src="${esc(avatarSrc)}" class="settings-avatar-img">` : `<span class="settings-avatar-initial">${esc((S.user.username || '?')[0].toUpperCase())}</span>`}
        </div>
        <div class="settings-avatar-actions">
          <p class="settings-label">${esc(S.user.username)}</p>
          <label class="btn btn-secondary settings-upload-btn">
            Upload Photo
            <input type="file" accept="image/*" style="display:none" onchange="uploadAvatar(this)">
          </label>
          ${avatarSrc ? `<button class="btn btn-danger" style="margin-top:6px" onclick="removeAvatar()">Remove Photo</button>` : ''}
          <p class="settings-hint" id="avatar-status"></p>
        </div>
      </div>
    </div>
  </div>`;
}

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

const MOD2_PALETTES = [
  { bg:'rgba(108,142,247,.15)', color:'#6c8ef7' },
  { bg:'rgba(167,139,250,.15)', color:'#a78bfa' },
  { bg:'rgba(52,211,153,.15)',  color:'#34d399' },
  { bg:'rgba(251,146,60,.15)',  color:'#fb923c' },
  { bg:'rgba(244,114,182,.15)', color:'#f472b6' },
];

// Single mod2-card. onclick is a JS expression string; menuHTML goes inside mod2-card-top.
function buildMod2CardHTML(m, topicCount, mi, onclick, menuHTML, doneClass) {
  const p = MOD2_PALETTES[mi % MOD2_PALETTES.length];
  const isDone = !!(doneClass && doneClass.trim());
  return `<div class="mod2-card${doneClass || ''}" onclick="${onclick}">
    <div class="mod2-card-top">
      <div class="mod2-icon" style="background:${p.bg};color:${p.color}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </div>
      ${menuHTML || ''}
    </div>
    <div class="mod2-name">${esc(m.name || 'Untitled')}</div>
    <div class="mod2-desc">${m.description ? esc(m.description) : '<span style="font-style:italic;opacity:.5">No description</span>'}</div>
    <div class="mod2-foot">
      ${isDone
        ? `<span class="mod2-chip" style="background:rgba(34,197,94,.15);color:#22c55e">✓ Completed</span>`
        : `<span class="mod2-chip" style="background:${p.bg};color:${p.color}">${topicCount} topic${topicCount !== 1 ? 's' : ''}</span>`}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--text3)"><path d="M9 18l6-6-6-6"/></svg>
    </div>
  </div>`;
}

function buildCh2StatsRowHTML(nModules, nTopics, {dynamic = false, doneMods = 0, pct = 0} = {}) {
  const doneEl = dynamic
    ? '<span class="ch2-stat-val" id="ov-done">0</span>'
    : `<span class="ch2-stat-val">${doneMods}</span>`;
  const progEl = dynamic
    ? `<div class="ch2-prog-bar"><div class="ch2-prog-fill" id="ov-prog-fill" style="width:0%"></div></div><span class="ch2-stat-pct" id="ov-pct">0%</span>`
    : `<div class="ch2-prog-bar"><div class="ch2-prog-fill" style="width:${pct}%"></div></div><span class="ch2-stat-pct">${pct}%</span>`;
  return `<div class="ch2-stats-row">
    <div class="ch2-stat">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M8 8h8M8 16h4"/></svg>
      <span class="ch2-stat-val">${nModules}</span><span class="ch2-stat-label">Modules</span>
    </div>
    <div class="ch2-stat-div"></div>
    <div class="ch2-stat">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <span class="ch2-stat-val">${nTopics}</span><span class="ch2-stat-label">Topics</span>
    </div>
    <div class="ch2-stat-div"></div>
    <div class="ch2-stat">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      ${doneEl}<span class="ch2-stat-label">Completed</span>
    </div>
    <div class="ch2-stat-div"></div>
    <div class="ch2-stat ch2-stat-prog">
      <span class="ch2-stat-label">Progress</span>
      ${progEl}
    </div>
  </div>`;
}

const CC_PALETTES = [
  { bg: 'linear-gradient(135deg,#3b82f6,#06b6d4)', icon: '#bfdbfe' },
  { bg: 'linear-gradient(135deg,#8b5cf6,#a855f7)', icon: '#e9d5ff' },
  { bg: 'linear-gradient(135deg,#10b981,#06b6d4)', icon: '#a7f3d0' },
  { bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', icon: '#fde68a' },
  { bg: 'linear-gradient(135deg,#ec4899,#8b5cf6)', icon: '#fbcfe8' },
  { bg: 'linear-gradient(135deg,#14b8a6,#3b82f6)', icon: '#99f6e4' },
];
function ccPalette(id) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CC_PALETTES[h % CC_PALETTES.length];
}
function ccUpdated(iso) {
  if (!iso) return 'Never updated';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Updated just now';
  if (m < 60) return `Updated ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Updated ${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Updated ${d} day${d !== 1 ? 's' : ''} ago`;
  return `Updated ${Math.floor(d / 7)} week${Math.floor(d / 7) !== 1 ? 's' : ''} ago`;
}

// ── Shared card helpers ───────────────────────────────────────────────────────

function ccBannerGrad(item) {
  return `linear-gradient(135deg,${item.leftColour || '#3b82f6'},${item.rightColour || '#06b6d4'})`;
}

function ccCardShell(item, menuHTML, bodyHTML) {
  return `
  <div class="course-card2">
    <div class="cc2-banner" style="background:${ccBannerGrad(item)}">${menuHTML}</div>
    <div class="cc2-body">
      <div class="cc2-course-title-block">
        <div class="cc2-title">${esc(item.name)}</div>
        ${item.description ? `<div class="cc2-desc">${esc(item.description)}</div>` : ''}
      </div>
      ${bodyHTML}
    </div>
  </div>`;
}

function ccFormatDate(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  // Go serializes an unset time.Time as "0001-01-01T00:00:00Z"
  if (isNaN(d) || d.getFullYear() < 1970) return 'Unknown';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Home page ─────────────────────────────────────────────────────────────────

function homeHTML() {
  const enrolled = S.enrolledCourses || [];
  const enrolledCards = enrolled.length === 0
    ? `<p style="color:var(--text2);padding:8px 0">No enrolled courses yet. Visit the <a class="sb-link" onclick="goMarket()">Marketplace</a> to find one.</p>`
    : enrolled.map(c => {
        const mods   = c.numModules || 0;
        const topics = c.numTopics  || 0;
        const done = Object.keys(c.progress?.completed || {}).length;
        const pct  = topics > 0 ? Math.round(done / topics * 100) : 0;
        const body = `
          <div class="cc2-stats-row">
            <div class="cc2-stat">
              <svg class="cc2-stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <div class="cc2-stat-lines">
                <span class="cc2-stat-main">${mods} Module${mods !== 1 ? 's' : ''}</span>
                <span class="cc2-stat-sub">${topics} Topic${topics !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div class="cc2-stat-div"></div>
            <div class="cc2-stat">
              <svg class="cc2-stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div class="cc2-stat-lines">
                <span class="cc2-stat-main">By ${esc(c.courseOwner || 'Unknown')}</span>
                <span class="cc2-stat-sub">${ccFormatDate(c.publishDate)}</span>
              </div>
            </div>
          </div>
          <div class="cc2-progress-section" style="margin:10px 0 4px">
            <div class="cc2-progress-label">
              <span>PROGRESS</span>
              <span class="cc2-progress-pct">${pct}%</span>
            </div>
            <div class="cc2-progress-bar">
              <div class="cc2-progress-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="cc2-actions">
            <button class="cc2-continue-btn" onclick="openCourseViewer('${c.contentId}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Course
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div class="cc2-update-row">
            ${c.isActive === false ? `<button class="cc2-update-avail" onclick="goMarketForUpdate(${jsonAttr(c.name)})" title="A newer version of this course was published">
              Update available
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>` : `<span class="cc2-up-to-date" title="You are on the latest published version">Updated</span>`}
          </div>`;
        return ccCardShell(c, '', body);
      }).join('');

  return `<div class="section">
    <div class="section-header" style="margin-bottom:20px">
      <div>
        <h1 style="margin-bottom:4px"><span>Home</span></h1>
        <p class="subtitle" style="margin-bottom:0">Pick up where you left off — head to <a class="sb-link" onclick="goCourses()">Courses</a> to work on your own, or visit the <a class="sb-link" onclick="goMarket()">Marketplace</a> to see what's available.</p>
      </div>
    </div>
    <h2 style="margin-bottom:16px">Enrolled Courses</h2>
    <div class="course-grid2">${enrolledCards}</div>
  </div>`;
}

// ── Courses page ──────────────────────────────────────────────────────────────

function coursesHTML() {
  const cards = S.courses.map(c => {
    const mods   = (c.moduleIDs || []).length;
    const pct    = Math.round((c.pcompleted || 0) * 100);
    const topics = c.ntopics || 0;

    const menu = `<button class="cc2-menu" onclick="event.stopPropagation();openCourseMenu('${c.courseID}',${jsonAttr(c)},this)" title="Options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>`;

    const body = `
        <div class="cc2-stats-row">
          <div class="cc2-stat">
            <svg class="cc2-stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            <div class="cc2-stat-lines">
              <span class="cc2-stat-main">${mods} Module${mods !== 1 ? 's' : ''}</span>
              <span class="cc2-stat-sub">${topics} Topic${topics !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div class="cc2-stat-div"></div>
          <div class="cc2-stat">
            <svg class="cc2-stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <div class="cc2-stat-lines">
              <span class="cc2-stat-main">${ccUpdated(c.updatedAt)}</span>
              <span class="cc2-stat-sub">Last updated</span>
            </div>
          </div>
        </div>

        <div class="cc2-actions">
          <button class="cc2-edit-btn" onclick="goModules(${jsonAttr(c)},true)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Edit
          </button>
          <button class="cc2-continue-btn" onclick="goModules(${jsonAttr(c)},false)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview Course
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="cc2-publish-status ${c.staticCourseID ? 'cc2-published' : 'cc2-unpublished'}">
          <span class="cc2-publish-dot"></span>
          ${c.staticCourseID ? `Last Published (${ccFormatDate(c.publishDate)})` : 'Not Published'}
        </div>`;

    return ccCardShell(c, menu, body);
  }).join('');

  const addCourseCard = `
    <div class="cc2-add-card" onclick="openModal('modal-course','New Course')">
      <div class="cc2-add-circle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <div class="cc2-add-label">New Course</div>
      <div class="cc2-add-sub">Start something new</div>
    </div>`;

  const emptyState = '';

  return `<div class="section">
    <div class="section-header" style="margin-bottom:20px">
      <div>
        <h1 style="margin-bottom:4px"><span>My Courses</span></h1>
        <p class="subtitle" style="margin-bottom:0">Work on the courses owned by you!</p>
      </div>
      <button class="btn btn-primary" onclick="openModal('modal-course','New Course')">+ New Course</button>
    </div>
    <div class="inline-form" id="course-edit-card-form">
      <h3>Edit Course</h3>
      <div class="form-row">
        <div class="field"><label>Name</label><input id="cef-name" /></div>
        <div class="field"><label>Description</label><textarea id="cef-desc" class="desc-ta" rows="1" oninput="autoResize(this)"></textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="cef-save">Save</button>
        <button class="btn btn-ghost" onclick="toggleForm('course-edit-card-form')">Cancel</button>
      </div>
    </div>
    <div class="cc2-toolbar">
      <div class="cc2-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="cc2-search" class="cc2-search" placeholder="Search courses..." oninput="filterCourseCards()" />
      </div>
    </div>
    <div class="course-grid2">${addCourseCard}${cards}</div>
    ${emptyState}
  </div>`;
}

// ── Market page ───────────────────────────────────────────────────────────────

function marketCardHTML(c) {
  const mods   = c.numModules || 0;
  const topics = c.numTopics  || 0;
  const owner  = c.courseOwner || 'Unknown';
  const body = `
      <div class="cc2-stats-row">
        <div class="cc2-stat">
          <svg class="cc2-stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <div class="cc2-stat-lines">
            <span class="cc2-stat-main">${mods} Module${mods !== 1 ? 's' : ''}</span>
            <span class="cc2-stat-sub">${topics} Topic${topics !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="cc2-stat-div"></div>
        <div class="cc2-stat">
          <svg class="cc2-stat-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div class="cc2-stat-lines">
            <span class="cc2-stat-main">${ccFormatDate(c.publishDate)}</span>
            <span class="cc2-stat-sub">By ${esc(owner)}</span>
          </div>
        </div>
      </div>
      <div class="cc2-actions">
        <button class="cc2-continue-btn" onclick="openCourseViewer('${c.contentId}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View Course
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        ${c.status === 'enrolled'
          ? `<button class="cc2-edit-btn" disabled style="opacity:.4;cursor:not-allowed;pointer-events:none;filter:grayscale(1)">✓ Enrolled</button>`
          : c.status === 'update'
          ? `<button class="cc2-edit-btn" onclick="updateEnrollment('${c.id}')">↑ Update</button>`
          : `<button class="cc2-edit-btn" onclick="enrollInCourse('${c.id}')">+ Enroll</button>`}
      </div>`;
  return ccCardShell(c, '', body);
}

function marketHTML() {
  const f = S.marketFilter;
  const filtered = S.marketCourses || [];
  const total = S.marketTotal ?? filtered.length;
  const shown = filtered.length;
  const countLabel = shown === total
    ? `${total} course${total !== 1 ? 's' : ''}`
    : `${shown} of ${total} courses`;

  const sorts = f.sorts || [];
  const labelMap = { publishDate: 'Newest', AtoZ: 'Title', modules: 'Modules', topics: 'Topics', owner: 'Author', status: 'Status' };
  const sortLabel = sorts.length === 0 ? 'Sort' : sorts.length === 1 ? labelMap[sorts[0].key] : `${sorts.length} sorts`;
  const sortActive = sorts.length > 0;
  const filterCount = marketActiveFilterCount();

  const empty = shown === 0
    ? `<div style="color:var(--text3);padding:40px 0;text-align:center">${total === 0 ? 'No published courses yet.' : 'No courses match your filters.'}</div>`
    : '';

  return `<div class="section">
    <div class="section-header" style="margin-bottom:16px">
      <div>
        <h1 style="margin-bottom:4px"><span>Market</span></h1>
        <p class="subtitle" style="margin-bottom:0">Browse published courses.</p>
      </div>
    </div>
    <div class="mkt-bar">
      <div class="cc2-search-wrap" style="flex:1;max-width:420px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input id="mkt-search" class="cc2-search" placeholder="Search courses…" value="${esc(f.search)}" oninput="marketSetSearch(this.value)" />
      </div>
      <button id="mkt-sort-btn" class="mkt-icon-btn${sortActive ? ' mkt-icon-btn-active' : ''}" onclick="marketToggleSort(this)" title="Sort">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
        <span>${sortLabel}</span>
      </button>
      <button id="mkt-filter-btn" class="mkt-icon-btn${filterCount ? ' mkt-icon-btn-active' : ''}" onclick="marketToggleFilter(this)" title="Filter">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        ${filterCount ? `<span class="mkt-filter-badge">${filterCount}</span>` : ''}
      </button>
      <span class="mkt-count">${countLabel}</span>
    </div>
    <div class="course-grid2" id="mkt-grid">${filtered.map(marketCardHTML).join('')}</div>
    ${empty}
  </div>`;
}

function modulesHTML() {
  const c = S.currentCourse;
  const totalTopics = S.modules.reduce((n, m) => n + (m.topicIDs || []).length, 0);
  const pct = Math.round((S.currentCourse.pcompleted || 0) * 100);
  const doneMods = Math.round(pct / 100 * S.modules.length);
  const bannerGrad = `linear-gradient(135deg,${c.leftColour || '#3b82f6'},${c.rightColour || '#06b6d4'})`;

  const addModCard = S.editMode ? `
    <div class="mod2-add-card" onclick="openModal('modal-module','New Module')">
      <div class="mod2-add-circle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <div class="mod2-add-label">Add module</div>
      <div class="mod2-add-sub">Create a new module or topic</div>
    </div>` : '';

  const modCards = S.modules.map((m, i) => {
    const topics = (m.topicIDs || []).length;
    const menuHTML = S.editMode ? `<button class="mod2-menu" onclick="event.stopPropagation();openModuleMenu('${m.moduleID}',this)" title="Options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>` : '';
    return buildMod2CardHTML(m, topics, i, `goTopics(${jsonAttr(m)})`, menuHTML, _isModuleComplete(m) ? ' mod2-done' : '');
  }).join('');

  return `<div class="course-page">
    ${!window.STATIC_MODE ? `<div class="back-link" onclick="goCourses()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      All Courses
    </div>` : ''}

    <div class="course-hero2" id="course-view-header">
      <div class="ch2-banner" style="background:${bannerGrad}">
        <div class="ch2-actions">
          ${S.editMode ? `<button class="btn btn-ghost btn-sm" id="course-edit-btn" onclick="enterCourseEditMode()" style="color:#fff;border-color:rgba(255,255,255,.3)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="ch2-more" onclick="openCourseMenu('${c.courseID}',${jsonAttr(c)},this)" style="background:rgba(0,0,0,.2);border-color:transparent;color:#fff">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>` : ''}
        </div>
      </div>
      <div class="ch2-top">
        <div>
          <h1 id="course-title-display">${esc(c.name)}</h1>
          <p class="ch2-desc" id="course-desc-display">${esc(c.description) || '<span style="opacity:.4">No description</span>'}</p>
        </div>
      </div><!-- ch2-top -->
    ${buildCh2StatsRowHTML(S.modules.length, totalTopics, {doneMods, pct})}<!-- ch2-stats-row -->
    </div><!-- course-hero2 -->

    ${S.editMode ? `
    <div id="course-edit-form" style="display:none;margin-bottom:24px">
      <div class="inline-form open" style="margin-bottom:0">
        <h3>Edit Course</h3>
        <div class="form-row">
          <div class="field"><label>Name</label><input id="ce-name" value="${esc(c.name)}" /></div>
          <div class="field"><label>Description</label><textarea id="ce-desc" class="desc-ta" rows="1" placeholder="What's this course about?" oninput="autoResize(this)">${esc(c.description || '')}</textarea></div>
        </div>
        <div class="ce-colour-row-outer">
          <div class="ce-colour-pair">
            <div class="ce-colour-block">
              <label class="ce-colour-label">Banner Left Colour</label>
              <input type="color" id="ce-left-colour" value="${c.leftColour || '#3b82f6'}" class="ce-colour-rect" oninput="syncColourPicker('ce-left-colour','ce-left-colour-hex');updateBannerPreview()" />
              <input type="text" id="ce-left-colour-hex" value="${c.leftColour || '#3b82f6'}" class="ce-colour-hex" maxlength="7" oninput="syncColourHex('ce-left-colour','ce-left-colour-hex');updateBannerPreview()" />
            </div>
            <div class="ce-colour-block">
              <label class="ce-colour-label">Banner Right Colour</label>
              <input type="color" id="ce-right-colour" value="${c.rightColour || '#06b6d4'}" class="ce-colour-rect" oninput="syncColourPicker('ce-right-colour','ce-right-colour-hex');updateBannerPreview()" />
              <input type="text" id="ce-right-colour-hex" value="${c.rightColour || '#06b6d4'}" class="ce-colour-hex" maxlength="7" oninput="syncColourHex('ce-right-colour','ce-right-colour-hex');updateBannerPreview()" />
            </div>
          </div>
          <div class="ce-banner-preview" id="ce-banner-preview" style="background:linear-gradient(135deg,${c.leftColour || '#3b82f6'},${c.rightColour || '#06b6d4'})"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="ce-save">Save</button>
          <button class="btn btn-ghost" onclick="exitCourseEditMode()">Cancel</button>
        </div>
      </div>
    </div>
    <div id="module-edit-form" style="display:none;margin-bottom:24px">
      <div class="inline-form open" style="margin-bottom:0">
        <h3>Edit Module</h3>
        <div class="form-row">
          <div class="field"><label>Name</label><input id="me-name" /></div>
          <div class="field"><label>Description</label><textarea id="me-desc" class="desc-ta" rows="1" placeholder="What's this module about?" oninput="autoResize(this)"></textarea></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="me-save">Save</button>
          <button class="btn btn-ghost" onclick="exitModuleEditMode()">Cancel</button>
        </div>
      </div>
    </div>
` : ''}

    <div class="mod2-grid">${addModCard}${modCards}</div>
  </div>`;
}

function topicsHTML() {
  const m = S.currentModule;
  const items = S.topics.length
    ? S.topics.map((t, idx) => {
        const rules = t.compTypes || [];
        const labelMap = {
          'self_reported': 'Manual',
          'percentage_questions_correct': 'Percentage of Questions Completed',
          'read_to_bottom': 'Finish Reading',
          'timed': 'Time Spent'
        };
        const ruleMap = {};
        rules.forEach(r => { ruleMap[r.type] = r.config; });
        const ruleLabels = Object.keys(ruleMap).map(type => {
          const config = ruleMap[type];
          let label = labelMap[type] || type;
          if (config !== null && config !== '') {
            if (type === 'timed') label += ` (${config}s)`;
            if (type === 'percentage_questions_correct') label += ` (${config}%)`;
          }
          return label;
        });
        let tooltipContent;
        if (rules.length === 0) {
          tooltipContent = '<div style="font-style:italic;color:var(--text3)">There are no requirements. Topic will always be marked completed.</div>';
        } else {
          tooltipContent = `<div style="font-weight:500;margin-bottom:8px">Requirements for topic to be marked complete:</div>${ruleLabels.map(l => `<div>• ${l}</div>`).join('')}`;
        }
        const rulesHTML = `<div class="tooltip-trigger" style="display:inline-block;margin-left:8px" onmouseenter="showTooltipAfterDelay(this)" onmouseleave="hideTooltip(this)">
              <span class="info-icon">(i)</span>
              <div class="tooltip-content tooltip-content-below" style="white-space:normal;width:200px">${tooltipContent}</div>
            </div>`;
        const done = _isTopicComplete(t);
        return `
      <div class="item-card${done ? ' completed' : ''}" onclick="goTopic(${jsonAttr(t)})">
        <div class="item-icon topic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div class="item-body">
          <div class="item-title">${esc(t.name)}</div>
          <div class="item-desc" style="display:flex;gap:8px;margin-bottom:4px">Open to add notes</div>
          <div class="item-status">${done ? '✓ Completed' : 'Not Completed'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:4px">${rulesHTML}</div>
        ${S.editMode ? `<div class="item-actions">
          <button class="btn btn-ghost" onclick="event.stopPropagation();openTopicEdit('${t.topicID}')">Edit</button>
          <button class="btn btn-danger" onclick="event.stopPropagation();deleteTopic('${t.topicID}')">Delete</button>
        </div>` : ''}
      </div>`;
      }).join('')
    : `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>No topics yet.<br>Add your first topic above.</p>
      </div>`;

  return `<div class="section">
    <div class="breadcrumb">
      ${!window.STATIC_MODE ? `<span onclick="goCourses()">All Courses</span><span class="sep">›</span>` : ''}
      <span onclick="goModules(${jsonAttr(S.currentCourse)},${S.editMode})">${esc(S.currentCourse.name)}</span>
    </div>
    <div class="page-hero" id="module-view-header">
      <div class="section-header" style="align-items:flex-start;margin-bottom:0">
        <h1><span>${esc(m.name)}</span></h1>
        ${S.editMode ? `<div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="openModuleEdit('${m.moduleID}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="btn btn-primary" onclick="openModal('modal-topic','New Topic')">+ New Topic</button>
        </div>` : ''}
      </div>
      ${m.description ? `<p class="subtitle">${esc(m.description)}</p>` : '<div style="margin-bottom:24px"></div>'}
    </div>
    ${S.editMode ? `
    <div id="module-edit-form" style="display:none;margin-bottom:24px">
      <div class="inline-form open" style="margin-bottom:0">
        <h3>Edit Module</h3>
        <div class="form-row">
          <div class="field"><label>Name</label><input id="me-name" /></div>
          <div class="field"><label>Description</label><textarea id="me-desc" class="desc-ta" rows="1" placeholder="What's this module about?" oninput="autoResize(this)"></textarea></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="me-save">Save</button>
          <button class="btn btn-ghost" onclick="exitModuleEditMode()">Cancel</button>
        </div>
      </div>
    </div>
    ${topicEditFormHTML()}
` : ''}
    <div class="item-list">${items}</div>
  </div>`;
}

function topicEditFormHTML() {
  return `<div id="topic-edit-form" style="display:none;margin-bottom:24px">
      <div class="inline-form open" style="margin-bottom:0">
        <h3>Edit Topic</h3>
        <div class="form-row">
          <div class="field"><label>Name</label><input id="te-name" /></div>
          <div class="field"><label>Description</label><textarea id="te-desc" class="desc-ta" rows="1" placeholder="What's this topic about?" oninput="autoResize(this)"></textarea></div>
        </div>
        <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
          <label style="display:block;margin-bottom:12px;font-weight:500">Completion Rules</label>
          <div id="te-rules" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="te-save">Save</button>
          <button class="btn btn-ghost" onclick="exitTopicEditMode()">Cancel</button>
        </div>
      </div>
    </div>`;
}

function _calcQuestionPercentage(topicID) {
  // Use S.notebookCells when on the current topic — these are the exact cells
  // the viewer rendered, so cellIdx values match what cvQLoad/cvQSave used.
  var cells = (S.currentTopic && S.currentTopic.topicID === topicID && S.notebookCells && S.notebookCells.length)
    ? S.notebookCells
    : (function() {
        var td = window._CD && window._CD.topicMap && window._CD.topicMap[topicID];
        var raw = td && td.rawElements;
        if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
        return Array.isArray(raw) ? raw : null;
      })();
  if (!cells) return null;
  var total = 0, correct = 0;
  // Pass topicID so saved answers resolve against THIS topic, not S.currentTopic —
  // the sidebar evaluates completeness for topics other than the one being viewed.
  cells.forEach(function(cell, cellIdx) {
    if (cell.type === 'question') {
      total++;
      var saved = cvQLoad(cellIdx, null, topicID);
      if (saved != null && saved === cell.answer) correct++;
    } else if (cell.type === 'questionSlide' && Array.isArray(cell.questions)) {
      cell.questions.forEach(function(q, qi) {
        total++;
        var saved = cvQLoad(cellIdx, qi, topicID);
        if (saved != null && saved === q.answer) correct++;
      });
    }
  });
  if (total === 0) return null;
  return (correct / total) * 100;
}

function _isModuleComplete(module) {
  const topics = (S.moduleTopics || {})[module.moduleID] || [];
  if (topics.length === 0) return true;
  return topics.every(t => _isTopicComplete(t));
}

function _isTopicComplete(topic) {
  const rules = topic.compTypes || [];
  if (rules.length === 0) return true;
  if (!window._progress) return false;
  const ruleMap = {};
  rules.forEach(r => { ruleMap[r.type] = r.config; });
  return Object.keys(ruleMap).every(type => _isRuleMet(type, ruleMap[type], topic.topicID) === true);
}

function _isRuleMet(type, config, topicID) {
  var progress = window._progress;
  if (!progress) return null;
  if (type === 'self_reported') return !!progress.marked_manually[topicID];
  if (type === 'read_to_bottom') return !!progress.read_to_bottom[topicID];
  if (type === 'timed') {
    var spent = window._getTopicLiveTime ? window._getTopicLiveTime(topicID) : (progress.time_spent[topicID] || 0);
    return spent >= Number(config);
  }
  if (type === 'percentage_questions_correct') {
    var pct = _calcQuestionPercentage(topicID);
    return pct != null && pct >= Number(config);
  }
  return null;
}

function renderTopicRulesDisplay(topic) {
  const container = document.getElementById('topic-completion-rules-display');
  if (!container) return;

  const rules = topic.compTypes || [];
  const ruleMap = {};
  rules.forEach(r => { ruleMap[r.type] = r.config; });

  const labelMap = {
    'self_reported': 'Manual',
    'percentage_questions_correct': 'Percentage of Questions Correct',
    'read_to_bottom': 'Finish Reading',
    'timed': 'Time Spent'
  };

  let tooltipContent;
  if (rules.length === 0) {
    tooltipContent = '<div style="font-style:italic;color:var(--text3)">There are no requirements. Topic will always be marked completed.</div>';
    container.innerHTML = `<div class="tooltip-trigger" style="display:inline-block" onmouseenter="showTooltipAfterDelay(this)" onmouseleave="hideTooltip(this)">
    <span style="font-size:12px;color:var(--text3)"><span style="color:#22c55e;font-size:11px;font-weight:600;margin-right:4px">●</span>Completion Rules <span class="info-icon">(i)</span></span>
    <div class="tooltip-content tooltip-content-below" style="white-space:normal;width:220px">${tooltipContent}</div>
  </div>`;
    return;
  } else {
    const ruleItems = Object.keys(ruleMap).map(type => {
      const config = ruleMap[type];
      let label = labelMap[type] || type;
      if (config !== null && config !== '') {
        if (type === 'timed') label += ` (${config}s)`;
        if (type === 'percentage_questions_correct') label += ` (${config}%)`;
      }
      const met = _isRuleMet(type, config, topic.topicID);
      const color = met === true ? '#22c55e' : met === false ? '#ef4444' : 'var(--text3)';
      return `<div style="color:${color}">• ${label}</div>`;
    });
    tooltipContent = `<div style="font-weight:500;margin-bottom:8px">Requirements for topic to be marked complete:</div>${ruleItems.join('')}`;
  }

  let overallIndicator = '';
  if (rules.length > 0) {
    const statuses = Object.keys(ruleMap).map(type => _isRuleMet(type, ruleMap[type], topic.topicID));
    const allMet = statuses.every(s => s === true);
    const anyUnmet = statuses.some(s => s === false);
    const color = allMet ? '#22c55e' : (anyUnmet ? '#ef4444' : 'var(--text3)');
    overallIndicator = `<span style="color:${color};font-size:11px;font-weight:600;margin-right:4px">●</span>`;
  }

  container.innerHTML = `<div class="tooltip-trigger" style="display:inline-block" onmouseenter="showTooltipAfterDelay(this)" onmouseleave="hideTooltip(this)">
    <span style="font-size:12px;color:var(--text3)">${overallIndicator}Completion Rules <span class="info-icon">(i)</span></span>
    <div class="tooltip-content tooltip-content-below" style="white-space:normal;width:220px">${tooltipContent}</div>
  </div>`;
}

function renderTopicRulesUI(topic) {
  const container = document.getElementById('te-rules');
  if (!container) return;

  const rules = topic.compTypes || [];
  const ruleMap = {};
  rules.forEach(r => { ruleMap[r.type] = r.config; });

  const ruleTypes = [
    { type: 'self_reported', label: 'Manual', tooltip: 'User manually marks topic as completed', config: null },
    { type: 'percentage_questions_correct', label: 'Percentage Questions Completed', tooltip: 'Percentage of questions answered correctly', config: 100 },
    { type: 'read_to_bottom', label: 'Finished Reading', tooltip: 'User scrolled to bottom of page', config: null },
    { type: 'timed', label: 'Time Spent', tooltip: 'Time spent on page', config: 60 },
  ];

  container.innerHTML = ruleTypes.map(r => {
    const checked = r.type in ruleMap;
    const configVal = checked ? ruleMap[r.type] : (r.config !== null ? r.config : '');
    const needsInput = r.type === 'timed' || r.type === 'percentage_questions_correct';
    return `<div class="te-rule" style="display:flex;align-items:center;gap:8px">
      <input type="checkbox" id="te-rule-${r.type}" data-rule-type="${r.type}" ${checked ? 'checked' : ''} onchange="toggleTopicRule(this)">
      <label for="te-rule-${r.type}" style="cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px">${r.label}
        <span class="tooltip-trigger" style="display:inline-block" onmouseenter="showTooltipAfterDelay(this)" onmouseleave="hideTooltip(this)">
          <span class="info-icon">(i)</span>
          <div class="tooltip-content" style="white-space:normal;width:140px">${r.tooltip}</div>
        </span>
      </label>
      ${needsInput ? `<span style="display:flex;align-items:center;gap:4px;${!checked ? 'visibility:hidden' : ''}" id="te-rule-input-wrap-${r.type}"><input type="number" id="te-rule-input-${r.type}" class="te-rule-input" value="${configVal}"><span style="font-size:12px;color:var(--text3)">${r.type === 'timed' ? 's' : '%'}</span></span>` : ''}
    </div>`;
  }).join('');
}

function toggleTopicRule(checkbox) {
  const ruleType = checkbox.dataset.ruleType;
  const wrap = document.getElementById(`te-rule-input-wrap-${ruleType}`);
  if (wrap) {
    wrap.style.visibility = checkbox.checked ? 'visible' : 'hidden';
  }
}

let _tooltipTimer = null;
function showTooltipAfterDelay(element) {
  _tooltipTimer = setTimeout(() => {
    element.classList.add('tooltip-visible');
  }, 200);
}

function hideTooltip(element) {
  clearTimeout(_tooltipTimer);
  element.classList.remove('tooltip-visible');
}

function topicHTML() {
  const t = S.currentTopic;
  return `<div class="section topic-section">
    <div class="breadcrumb">
      ${!window.STATIC_MODE ? `<span onclick="goCourses()">All Courses</span><span class="sep">›</span>` : ''}
      <span onclick="goModules(${jsonAttr(S.currentCourse)},${S.editMode})">${esc(S.currentCourse.name)}</span>
      <span class="sep">›</span>
      <span onclick="goTopics(${jsonAttr(S.currentModule)})">${esc(S.currentModule.name)}</span>
    </div>
    <div class="topic-header" id="topic-view-header">
      <div>
        <h1><span>${esc(t.name)}</span></h1>
        ${t.description ? `<p class="subtitle">${esc(t.description)}</p>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div id="topic-completion-rules-display" style="display:flex;align-items:flex-start;gap:8px;flex-direction:column"></div>
        ${S.editMode ? `<button class="btn btn-ghost" onclick="openTopicEdit('${t.topicID}')" style="margin-top:5px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>` : ''}
        ${window.STATIC_MODE && (t.compTypes || []).some(r => r.type === 'self_reported') ? `<button id="mark-completed-btn" class="mark-completed-btn${window._progress?.marked_manually?.[t.topicID] ? ' mark-completed-done' : ''}" onclick="toggleTopicCompleted()">${window._progress?.marked_manually?.[t.topicID] ? '✓ Completed' : 'Mark Complete'}</button>` : ''}
      <div class="notes-tab-group">
        ${!window.STATIC_MODE ? `<button class="notes-tab ${S.notesTab === 'pn' ? 'notes-tab-active' : ''}" id="tab-pn" onclick="switchNotesTab('pn')">Private Notes</button>` : ''}
        <button class="notes-tab ${window.STATIC_MODE || S.notesTab === 'cp' ? 'notes-tab-active' : ''}" id="tab-cp" onclick="switchNotesTab('cp')">Course View</button>
      </div>
      </div>
    </div>
    ${S.editMode ? topicEditFormHTML() : ''}
    ${!window.STATIC_MODE ? `<div id="pane-pn" class="note-pane" style="${S.notesTab === 'pn' ? '' : 'display:none'}">
      <div class="note-pane-header">
        <span class="note-pane-title private">Private Notes</span>
        <span class="save-indicator" id="status-pn"></span>
      </div>
      <div class="note-pane-body nb-pane-body">
        ${nbTtToolbarHTML('pn')}
        <div id="tiptap-pn" class="nb-tiptap" onclick="_nbEditors['pn']?.commands.focus()"></div>
      </div>
    </div>` : ''}
    <div id="pane-cp" class="note-pane" style="${!window.STATIC_MODE && S.notesTab !== 'cp' ? 'display:none' : ''}">
      <div class="note-pane-header">
        <span class="note-pane-title course">Course View</span>
        ${!window.STATIC_MODE ? `<span class="save-indicator" id="status-cp"></span>` : ''}
      </div>
      <div class="note-pane-body nb-pane-body">
        <div class="notebook" id="notebook"></div>
      </div>
    </div>
  </div>`;
}
