'use strict';

// ── Course viewer ─────────────────────────────────────────────────────────────

function openCourseViewer(contentId) {
  const uid = S.data.user?.id ? '&userID=' + encodeURIComponent(S.data.user.id) : '';
  window.location.href = Config.apiBase + '/staticcontent?id=' + contentId + '&from=' + S.ui.view + uid;
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
  username = username.trim();
  if (!username) return;
  let user;
  try {
    user = await GET('/user?username=' + encodeURIComponent(username));
  } catch {
    user = await POST('/user', { username });
  }
  const full = await GET('/user?id=' + user.id);
  S.data.user = { id: user.id, username: user.username, avatarURL: full.avatarURL || '', courseIDs: full.courseIDs || [] };
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

async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const getStatus = () => document.getElementById('avatar-status');
  const setStatus = msg => { const el = getStatus(); if (el) el.textContent = msg; };
  setStatus('Uploading…');
  const form = new FormData();
  form.append('avatar', file);
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
