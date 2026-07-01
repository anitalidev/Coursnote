'use strict';

async function loadCourses(ids) {
  if (!ids || !ids.length) return [];
  return Promise.all(ids.map(id => GET('/course?id=' + id)));
}

async function loadAll(path, ids) {
  if (!ids || !ids.length) return [];
  return Promise.all(ids.map(id => GET(path + id)));
}

async function loadAllTopics(modules) {
  const map = {};
  await Promise.all((modules || []).map(async m => {
    map[m.moduleID] = m.topicIDs?.length ? await loadAll('/topic?id=', m.topicIDs) : [];
  }));
  return map;
}

async function refreshUser() {
  const u = await GET('/user?id=' + S.user.id);
  S.user = { id: u.id || S.user.id, username: u.username, avatarURL: u.avatarURL || '', courseIDs: u.courseIDs };
}
