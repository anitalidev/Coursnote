'use strict';

// ── Course viewer ─────────────────────────────────────────────────────────────

function openCourseViewer(contentId) {
  const uid = S.data.user?.id ? '&userID=' + encodeURIComponent(S.data.user.id) : '';
  const fe = '&frontend=' + encodeURIComponent(window.location.origin);
  window.location.href = Config.apiBase + '/staticcontent?id=' + contentId + '&from=' + S.ui.view + uid + fe;
}

// ── User menu ─────────────────────────────────────────────────────────────────

function toggleUserMenu(e) {
  if (!Runtime.showUserMenu) return;
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

// ── Auth ──────────────────────────────────────────────────────────────────────

async function handleLogin(username) {
  username = username.trim().toLowerCase();
  if (!username) return;
  let user;
  try {
    user = await GET('/user?username=' + encodeURIComponent(username));
  } catch {
    user = await POST('/user', { username });
  }
  const full = await GET('/user?id=' + user.id);
  S.data.user = { id: user.id, username: user.username, avatarURL: full.avatarURL || '', courseIDs: full.courseIDs || [], settings: full.settings || user.settings || null };
  const activeSettings = full.settings || user.settings;
  if (activeSettings) {
    const r = document.documentElement;
    const bg  = _hexToRGB(activeSettings.backgroundColour);
    const bl  = _hexToRGB(activeSettings.primaryColour);
    const pur = _hexToRGB(activeSettings.gradientColour);
    if (bg)  r.style.setProperty('--col-bg',       bg);
    if (bl)  r.style.setProperty('--col-blue',     bl);
    if (pur) r.style.setProperty('--col-purple',   pur);
    if (activeSettings.primaryColour) r.style.setProperty('--accent-hover', _darkenHex(activeSettings.primaryColour));
  }
  Storage.saveUser(S.data.user);
  await goCourses();
}

// ── Course/module/topic CRUD ──────────────────────────────────────────────────

async function createCourse(name, desc) {
  await POST('/course', { name, description: desc, userID: S.data.user.id });
  const full = await GET('/user?id=' + S.data.user.id);
  S.data.user.courseIDs = full.courseIDs || [];
  S.data.courses = await loadCourses();
  render();
  toast('Course created');
}

async function createModule(name, desc) {
  await POST('/module', { name, description: desc, courseID: S.ui.currentCourse.courseID });
  await reloadCurrentCourse();
  render();
  toast('Module created');
}

async function createTopic(name, desc) {
  await POST('/topic', { name, description: desc, moduleID: S.ui.currentModule.moduleID, compRules: [{ type: 'self_reported', config: null }] });
  await reloadCurrentModule();
  await reloadCurrentCourse();
  render();
  toast('Topic created');
}

async function deleteCourse(id) {
  if (!confirm('Delete this course and all its contents?')) return;
  await DEL('/course?id=' + id);
  const full = await GET('/user?id=' + S.data.user.id);
  S.data.user.courseIDs = full.courseIDs || [];
  S.data.courses = await loadCourses();
  render();
  toast('Course deleted', 'err');
}

async function deleteModule(id) {
  if (!confirm('Delete this module and all its topics?')) return;
  await DEL('/module?id=' + id);
  delete S.data.moduleTopics[id];
  await reloadCurrentCourse();
  render();
  toast('Module deleted', 'err');
}

async function deleteTopic(id) {
  if (!confirm('Delete this topic?')) return;
  await DEL('/topic?id=' + id);
  await reloadCurrentModule();
  await reloadCurrentCourse();
  render();
  toast('Topic deleted', 'err');
}

// ── Course search (client-side, courses page) ─────────────────────────────────

function filterCourseCards() {
  const q = (document.getElementById('cc2-search')?.value || '').toLowerCase();
  document.querySelectorAll('.course-card2').forEach(el => {
    const name = el.querySelector('.cc2-title')?.textContent.toLowerCase() || '';
    const desc = el.querySelector('.cc2-desc')?.textContent.toLowerCase() || '';
    el.style.display = (!q || name.includes(q) || desc.includes(q)) ? '' : 'none';
  });
}

// ── Context menus ─────────────────────────────────────────────────────────────

function openModuleMenu(moduleID, btn) {
  const existing = btn.querySelector('.cc2-dropdown');
  if (existing) { existing.remove(); return; }
  document.querySelectorAll('.cc2-dropdown').forEach(d => d.remove());
  const menu = document.createElement('div');
  menu.className = 'cc2-dropdown';
  menu.innerHTML = `
    <div class="cc2-dd-item" onclick="openModuleEdit('${moduleID}');document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Edit</div>
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

// ── Published versions modal ──────────────────────────────────────────────────

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
          <a href="${Config.apiBase}/staticcontent?id=${v.contentId}" target="_blank" style="font-size:13px;color:var(--accent)">View</a>
        </div>
      </div>`).join('');
  }
  openModal('modal-versions', 'Published Versions');
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function _compressImage(file, { maxPx = 512, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')); };
    img.src = url;
  });
}

async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const getStatus = () => document.getElementById('avatar-status');
  const setStatus = msg => { const el = getStatus(); if (el) el.textContent = msg; };
  setStatus('Uploading…');
  const compressed = await _compressImage(file, { maxPx: 512, quality: 0.75 });
  const form = new FormData();
  form.append('avatar', compressed, 'avatar.jpg');
  try {
    const res = await fetch(`${Config.apiBase}/user/avatar?userID=${S.data.user.id}`, { method: 'POST', body: form });
    if (!res.ok) {
      let msg = 'Upload failed';
      try { const d = await res.json(); msg = d.error || msg; } catch {}
      throw new Error(msg);
    }
    const { avatarURL } = await res.json();
    S.data.user.avatarURL = avatarURL;
    Storage.saveUser(S.data.user);
    render();
  } catch (e) {
    setStatus(e.message || 'Upload failed.');
    toast(e.message || 'Avatar upload failed', 'err');
    console.error('Avatar upload error:', e);
  }
}

async function removeAvatar() {
  S.data.user.avatarURL = '';
  Storage.saveUser(S.data.user);
  render();
  try {
    const res = await fetch(`${Config.apiBase}/user/avatar?userID=${S.data.user.id}`, { method: 'DELETE' });
    if (!res.ok) toast('Failed to remove avatar from server', 'err');
  } catch {
    toast('Failed to remove avatar from server', 'err');
  }
}

// ── Colour settings ───────────────────────────────────────────────────────────

const _colourPalettes = [
  { name: 'Default',  bg: '#0f1117', primary: '#6c8ef7', gradient: '#a78bfa' },
  { name: 'Midnight', bg: '#0d1117', primary: '#58a6ff', gradient: '#bc8cff' },
  { name: 'Ocean',    bg: '#0a1628', primary: '#06b6d4', gradient: '#3b82f6' },
  { name: 'Forest',   bg: '#0b1a0e', primary: '#4ade80', gradient: '#86efac' },
  { name: 'Sunset',   bg: '#1a0f0a', primary: '#f97316', gradient: '#ec4899' },
  { name: 'Rose',     bg: '#1a0a0f', primary: '#f43f5e', gradient: '#fb923c' },
  { name: 'Slate',    bg: '#0f172a', primary: '#94a3b8', gradient: '#cbd5e1' },
  { name: 'Ember',   bg: '#1a0d00', primary: '#f59e0b', gradient: '#ef4444' },
  { name: 'Aurora',  bg: '#080d1a', primary: '#34d399', gradient: '#818cf8' },
  { name: 'Sakura',  bg: '#1a0f14', primary: '#f472b6', gradient: '#c084fc' },
];

const _colourCSSKeys = {
  backgroundColour: '--col-bg',
  primaryColour:    '--col-blue',
  gradientColour:   '--col-purple',
};

function _hexToRGB(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function _darkenHex(hex, factor = 0.82) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor).toString(16).padStart(2, '0');
  const g = Math.round(((n >> 8)  & 255) * factor).toString(16).padStart(2, '0');
  const b = Math.round((n & 255)         * factor).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function applyPalette(index) {
  const p = _colourPalettes[index];
  if (!p) return;
  const keys = { backgroundColour: p.bg, primaryColour: p.primary, gradientColour: p.gradient };
  for (const [key, hex] of Object.entries(keys)) {
    const swatch = document.getElementById('colour-swatch-' + key);
    if (swatch) swatch.style.background = hex;
    const hexInput = document.getElementById('colour-hex-input-' + key);
    if (hexInput) hexInput.value = hex;
    previewColour(key, hex);
  }
}

function previewColour(key, hex) {
  const el = document.getElementById('colour-hex-' + key);
  if (el) el.textContent = hex;
  if (S.data.user.settings) S.data.user.settings[key] = hex;
}

async function saveColours() {
  const s = S.data.user.settings;
  if (!s) return;
  const status = document.getElementById('colour-save-status');
  try {
    const res = await fetch(
      `${Config.apiBase}/usersettings?id=${encodeURIComponent(S.data.user.settings.settingsID)}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundColour: s.backgroundColour, primaryColour: s.primaryColour, gradientColour: s.gradientColour }) }
    );
    if (!res.ok) throw new Error();
    const r = document.documentElement;
    const bg  = _hexToRGB(s.backgroundColour);
    const bl  = _hexToRGB(s.primaryColour);
    const pur = _hexToRGB(s.gradientColour);
    if (bg)  r.style.setProperty('--col-bg',       bg);
    if (bl)  r.style.setProperty('--col-blue',     bl);
    if (pur) r.style.setProperty('--col-purple',   pur);
    if (s.primaryColour) r.style.setProperty('--accent-hover', _darkenHex(s.primaryColour));
    Storage.saveUser(S.data.user);
    if (status) { status.textContent = 'Saved'; status.style.color = 'var(--accent3)'; setTimeout(() => { if (status) status.textContent = ''; }, 2000); }
  } catch {
    if (status) { status.textContent = 'Failed to save'; status.style.color = 'var(--danger)'; }
  }
}

// ── Custom colour picker ───────────────────────────────────────────────────────

function _hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function _hsvToHex(h, s, v) {
  const f = (n) => {
    const k = (n + h * 6) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return '#' + [f(5), f(3), f(1)].map(x => x.toString(16).padStart(2, '0')).join('');
}

let _cpKey = null, _cpH = 0, _cpS = 0, _cpV = 1;

function openColourPicker(key, swatchEl) {
  const existing = document.getElementById('custom-colour-picker');
  if (existing && _cpKey === key) { existing.remove(); _cpKey = null; return; }
  if (existing) existing.remove();

  _cpKey = key;
  const currentHex = swatchEl.style.background || '#6c8ef7';
  const hsv = _hexToHsv(currentHex.startsWith('#') ? currentHex : '#6c8ef7');
  _cpH = hsv.h; _cpS = hsv.s; _cpV = hsv.v;

  const pop = document.createElement('div');
  pop.id = 'custom-colour-picker';
  pop.style.cssText = `position:fixed;z-index:9999;padding:12px;border-radius:12px;
    background:var(--bg2,#1a1d2e);border:1px solid var(--border,rgba(255,255,255,.1));
    box-shadow:0 8px 32px rgba(0,0,0,.6);width:220px;user-select:none`;

  pop.innerHTML = `
    <div style="position:relative;width:196px;height:150px">
      <canvas id="cp-sv" width="196" height="150" style="display:block;border-radius:8px;cursor:crosshair;width:196px;height:150px"></canvas>
      <div id="cp-sv-thumb" style="position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.6);pointer-events:none;transform:translate(-50%,-50%)"></div>
    </div>
    <div style="position:relative;width:196px;margin-top:10px">
      <canvas id="cp-hue" width="196" height="14" style="display:block;border-radius:7px;cursor:crosshair;width:196px;height:14px"></canvas>
      <div id="cp-hue-thumb" style="position:absolute;top:-3px;width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:none;transform:translateX(-50%)"></div>
    </div>`;

  document.body.appendChild(pop);

  const rect = swatchEl.getBoundingClientRect();
  let top = rect.bottom + 6, left = rect.left;
  if (left + 220 > window.innerWidth) left = window.innerWidth - 228;
  if (top + 300 > window.innerHeight) top = rect.top - 300;
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';

  const svCanvas = document.getElementById('cp-sv');
  const hueCanvas = document.getElementById('cp-hue');
  const hueThumb = document.getElementById('cp-hue-thumb');
  const svThumb = document.getElementById('cp-sv-thumb');

  function drawSV() {
    const ctx = svCanvas.getContext('2d');
    const w = svCanvas.width, h = svCanvas.height;
    const hueHex = _hsvToHex(_cpH, 1, 1);
    const grad1 = ctx.createLinearGradient(0, 0, w, 0);
    grad1.addColorStop(0, '#fff');
    grad1.addColorStop(1, hueHex);
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);
    const grad2 = ctx.createLinearGradient(0, 0, 0, h);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(1, '#000');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);
    svThumb.style.left = (_cpS * w) + 'px';
    svThumb.style.top = ((1 - _cpV) * h) + 'px';
  }

  function drawHue() {
    const ctx = hueCanvas.getContext('2d');
    const w = hueCanvas.width;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, hueCanvas.height);
    hueThumb.style.left = (_cpH * w) + 'px';
  }

  function updateFromPicker() {
    const hex = _hsvToHex(_cpH, _cpS, _cpV);
    document.getElementById('colour-swatch-' + _cpKey).style.background = hex;
    const hi = document.getElementById('colour-hex-input-' + _cpKey);
    if (hi) hi.value = hex;
    previewColour(_cpKey, hex);
    drawSV();
    drawHue();
  }

  svCanvas.addEventListener('mousedown', function onSVDown(e) {
    function move(e) {
      const r = svCanvas.getBoundingClientRect();
      _cpS = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      _cpV = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
      updateFromPicker();
    }
    move(e);
    function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  hueCanvas.addEventListener('mousedown', function onHueDown(e) {
    function move(e) {
      const r = hueCanvas.getBoundingClientRect();
      _cpH = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      updateFromPicker();
    }
    move(e);
    function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  requestAnimationFrame(() => {
    drawSV();
    drawHue();
  });

  setTimeout(() => {
    function outsideClick(e) {
      if (!pop.contains(e.target) && e.target !== swatchEl) {
        pop.remove(); _cpKey = null;
        document.removeEventListener('mousedown', outsideClick);
      }
    }
    document.addEventListener('mousedown', outsideClick);
  }, 0);
}

// ── Split-pane divider drag ───────────────────────────────────────────────────

function startPaneDrag(e) {
  e.preventDefault();
  const container = document.getElementById('panes-container');
  const pn = document.getElementById('pane-pn');
  if (!container || !pn) return;
  const startX = e.clientX;
  const startW = pn.offsetWidth;
  const totalW = container.offsetWidth;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  function move(e) {
    const newW = Math.max(200, Math.min(totalW - 200, startW + e.clientX - startX));
    pn.style.flex = 'none';
    pn.style.width = newW + 'px';
  }
  function up() {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', move, true);
    document.removeEventListener('mouseup', up, true);
  }
  document.addEventListener('mousemove', move, true);
  document.addEventListener('mouseup', up, true);
}
