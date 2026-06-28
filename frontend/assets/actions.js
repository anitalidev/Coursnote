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
  document.querySelectorAll('.cc2-dropdown').forEach(d => d.remove());
  const menu = document.createElement('div');
  menu.className = 'cc2-dropdown';
  menu.innerHTML = `
    <div class="cc2-dd-item cc2-dd-danger" onclick="deleteModule('${moduleID}');document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Delete</div>`;
  btn.style.position = 'relative';
  btn.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

function openCourseMenu(courseID, course, btn) {
  document.querySelectorAll('.cc2-dropdown').forEach(d => d.remove());
  const menu = document.createElement('div');
  menu.className = 'cc2-dropdown';
  menu.innerHTML = `
    <div class="cc2-dd-item" onclick="goModules(${jsonAttr(course)},false);document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Open</div>
    <div class="cc2-dd-item" onclick="goModules(${jsonAttr(course)},true);document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Edit</div>
    <div class="cc2-dd-item cc2-dd-danger" onclick="deleteCourse('${courseID}');document.querySelectorAll('.cc2-dropdown').forEach(d=>d.remove())">Delete</div>`;
  btn.style.position = 'relative';
  btn.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
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
