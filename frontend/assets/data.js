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
    const p = window._progress || { marked_manually: {}, time_spent: {}, read_to_bottom: {} };
    topics.forEach(t => {
      t.marked_manually = !!p.marked_manually[t.topicID];
      t.time_spent      = p.time_spent[t.topicID] || 0;
      t.read_to_bottom  = !!p.read_to_bottom[t.topicID];
    });
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
