'use strict';

// ── Market page — filtering, sorting, enrollment ──────────────────────────────
// Extracted from actions.js. All functions remain globals so existing inline
// onclick strings in views.js continue to work without change.

const MKT_SORT_OPTIONS = [
  { key: 'publishDate', label: 'Newest'  },
  { key: 'AtoZ',        label: 'Title'   },
  { key: 'modules',     label: 'Modules' },
  { key: 'topics',      label: 'Topics'  },
  { key: 'owner',       label: 'Author'  },
  { key: 'status',      label: 'Status'  },
];

function marketQueryString() {
  const f = S.ui.marketFilter;
  const p = new URLSearchParams();
  p.set('userID', S.data.user.id);
  if (f.search)           p.set('search', f.search);
  if (f.author)           p.set('author', f.author);
  if (f.status)           p.set('status', f.status);
  if (f.sizeMin !== '')   p.set('modSizeMin', f.sizeMin);
  if (f.sizeMax !== '')   p.set('modSizeMax', f.sizeMax);
  if (f.topicsMin !== '') p.set('topSizeMin', f.topicsMin);
  if (f.topicsMax !== '') p.set('topSizeMax', f.topicsMax);
  if ((f.sorts || []).length) {
    p.set('sortBy', f.sorts.map(s => (s.dir === 'desc' ? '-' : '') + s.key).join(','));
  }
  return '/market?' + p.toString();
}

function marketActiveFilterCount() {
  const f = S.ui.marketFilter;
  return [f.sizeMin, f.sizeMax, f.topicsMin, f.topicsMax, f.author, f.status].filter(v => v !== '').length;
}

async function loadMarketCourses() {
  const res = await GET(marketQueryString());
  S.data.marketCourses = res?.courses || [];
  S.data.marketTotal   = res?.total ?? S.data.marketCourses.length;
}

function marketSetSearch(val) {
  S.ui.marketFilter.search = val;
  marketRerender();
}

async function goMarketForUpdate(courseName) {
  const f = S.ui.marketFilter;
  f.search = courseName;
  f.status = 'update';
  f.sizeMin = ''; f.sizeMax = ''; f.topicsMin = ''; f.topicsMax = ''; f.author = '';
  await goMarket();
}

let _mktFetchTimer = null;
function marketRerender() {
  clearTimeout(_mktFetchTimer);
  _mktFetchTimer = setTimeout(async () => {
    await loadMarketCourses();
    const grid = document.getElementById('mkt-grid');
    if (grid) grid.innerHTML = S.data.marketCourses.map(marketCardHTML).join('');
    const countEl = document.querySelector('.mkt-count');
    if (countEl) countEl.textContent = S.data.marketCourses.length === S.data.marketTotal
      ? `${S.data.marketTotal} course${S.data.marketTotal !== 1 ? 's' : ''}`
      : `${S.data.marketCourses.length} of ${S.data.marketTotal} courses`;
  }, 250);
}

function marketSetSort(key) {
  const f = S.ui.marketFilter;
  const sorts = f.sorts || [];
  const idx = sorts.findIndex(s => s.key === key);
  if (idx === -1) {
    f.sorts = [...sorts, { key, dir: 'desc' }];
  } else if (sorts[idx].dir === 'desc') {
    f.sorts = sorts.map((s, i) => i === idx ? { key, dir: 'asc' } : s);
  } else {
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
  const sorts = S.ui.marketFilter.sorts || [];
  const sortIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18M7 12h10M11 18h2"/></svg>`;
  if (sorts.length === 0) {
    btn.innerHTML = `${sortIcon}<span>Sort</span>`;
    btn.classList.remove('mkt-icon-btn-active');
  } else {
    const labelMap = { publishDate: 'Newest', AtoZ: 'Title', modules: 'Modules', topics: 'Topics', owner: 'Author', status: 'Status' };
    const label = sorts.length === 1 ? labelMap[sorts[0].key] : `${sorts.length} sorts`;
    btn.innerHTML = `${sortIcon}<span>${label}</span>`;
    btn.classList.add('mkt-icon-btn-active');
  }
}

function marketClosePanels() {
  document.getElementById('mkt-sort-panel')?.remove();
  document.getElementById('mkt-filter-panel')?.remove();
}

function marketBuildSortPanelHTML() {
  const sorts = S.ui.marketFilter.sorts || [];
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
  const f = S.ui.marketFilter;
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
      <span class="mkt-fp-label">Topics</span>
      <div class="mkt-range-wrap">
        <input class="mkt-fp-input mkt-range-input" type="number" min="0" placeholder="Min"
          value="${esc(String(f.topicsMin))}" oninput="marketSetFilter('topicsMin',this.value)" />
        <span class="mkt-range-sep">–</span>
        <input class="mkt-fp-input mkt-range-input" type="number" min="0" placeholder="Max"
          value="${esc(String(f.topicsMax))}" oninput="marketSetFilter('topicsMax',this.value)" />
      </div>
    </div>
    <div class="mkt-fp-row">
      <span class="mkt-fp-label">Author</span>
      <input class="mkt-fp-input" placeholder="Search author…" value="${esc(f.author)}" oninput="marketSetFilter('author',this.value)" />
    </div>
    <div class="mkt-fp-row">
      <span class="mkt-fp-label">Status</span>
      <select class="mkt-fp-input" onchange="marketSetFilter('status',this.value)">
        <option value=""${f.status === '' ? ' selected' : ''}>Any</option>
        <option value="enrolled"${f.status === 'enrolled' ? ' selected' : ''}>Enrolled</option>
        <option value="update"${f.status === 'update' ? ' selected' : ''}>Update available</option>
        <option value="not enrolled"${f.status === 'not enrolled' ? ' selected' : ''}>Not enrolled</option>
      </select>
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
  S.ui.marketFilter[key] = val;
  marketUpdateFilterBadge();
  marketRerender();
}

function marketUpdateFilterBadge() {
  const filterCount = marketActiveFilterCount();
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
  const f = S.ui.marketFilter;
  f.search = ''; f.sizeMin = ''; f.sizeMax = ''; f.topicsMin = ''; f.topicsMax = ''; f.author = ''; f.status = '';
  const panel = document.getElementById('mkt-filter-panel');
  if (panel) panel.innerHTML = marketBuildFilterPanelHTML();
  marketUpdateFilterBadge();
  marketRerender();
}

async function enrollInCourse(staticCourseID) {
  await POST('/course/enroll', { userID: S.data.user.id, staticCourseID });
  await loadMarketCourses();
  S.data.enrolledCourses = await GET('/course/enrolled?userID=' + S.data.user.id) || [];
  render();
}

async function updateEnrollment(staticCourseID) {
  await POST('/course/update-enroll', { userID: S.data.user.id, staticCourseID });
  await loadMarketCourses();
  S.data.enrolledCourses = await GET('/course/enrolled?userID=' + S.data.user.id) || [];
  render();
}
