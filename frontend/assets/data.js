'use strict';

async function loadCourses() {
  if (!S.data.user?.id) return [];
  return await GET('/courses?userID=' + S.data.user.id) || [];
}

async function loadAll(path, ids) {
  if (!ids || !ids.length) return [];
  return Promise.all(ids.map(id => GET(path + id)));
}

async function loadAllTopicsWithCompleted(topicIDs) {
  return loadAll('/topic?id=', topicIDs || []);
}

async function loadAllTopicsFromModulesWithCompleted(modules) {
  const allTopics = (await Promise.all(modules.map(m => loadAllTopicsWithCompleted(m.topicIDs || [])))).flat();
  return allTopics;
}

async function loadAllTopics(modules) {
  const map = {};
  await Promise.all((modules || []).map(async m => {
    map[m.moduleID] = m.topicIDs?.length ? await loadAllTopicsWithCompleted(m.topicIDs) : [];
  }));
  return map;
}

async function refreshUser() {
  const u = await GET('/user?id=' + S.data.user.id);
  S.data.user = { id: u.id || S.data.user.id, username: u.username, avatarURL: u.avatarURL || '', courseIDs: u.courseIDs };
}

// Reload the current course and its modules from the API into S.
async function reloadCurrentCourse() {
  const updated = await GET('/course?id=' + S.ui.currentCourse.courseID);
  S.ui.currentCourse = updated;
  S.data.modules = await loadAll('/module?id=', updated.moduleIDs || []);
  S.data.modules.forEach(m => { if (!S.data.moduleTopics[m.moduleID]) S.data.moduleTopics[m.moduleID] = []; });
}

// Reload the current module and its topics from the API into S.
async function reloadCurrentModule() {
  const updated = await GET('/module?id=' + S.ui.currentModule.moduleID);
  S.ui.currentModule = updated;
  S.data.topics = await loadAllTopicsWithCompleted(updated.topicIDs || []);
  S.data.moduleTopics[updated.moduleID] = S.data.topics;
}
