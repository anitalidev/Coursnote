'use strict';

async function loadCourses() {
  if (!S.user?.id) return [];
  return await GET('/courses?userID=' + S.user.id) || [];
}

async function loadAll(path, ids) {
  if (!ids || !ids.length) return [];
  return Promise.all(ids.map(id => GET(path + id)));
}

async function loadAllTopicsWithCompleted(topicIDs) {
  const topics = await loadAll('/topic?id=', topicIDs || []);
  if (window.STATIC_MODE) {
    const _progress = window._progress || { completed: {} };
    topics.forEach(t => { t.completed = !!_progress.completed[t.topicID]; });
  }
  return topics;
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
  const u = await GET('/user?id=' + S.user.id);
  S.user = { id: u.id || S.user.id, username: u.username, avatarURL: u.avatarURL || '', courseIDs: u.courseIDs };
}
