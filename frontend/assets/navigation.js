'use strict';

function pushHash(hash) {
  history.pushState(null, '', hash);
}

async function goLogin() {
  if (!Runtime.canLogin) return;
  Storage.clearUser();
  Object.assign(S.data, { user: null, courses: [], modules: [], moduleTopics: {}, topics: [] });
  Object.assign(S.ui, { currentCourse: null, currentModule: null, currentTopic: null, view: 'login' });
  Object.assign(S.editor, { cells: [], privateNote: null });
  pushHash('#');
  render();
}

async function goHome() {
  if (!Runtime.canNavigateApp) { Runtime.navigateFallback?.(); return; }
  destroyPNEditor();
  S.ui.currentCourse = null; S.ui.currentModule = null; S.ui.currentTopic = null;
  S.data.enrolledCourses = await GET('/course/enrolled?userID=' + S.data.user.id) || [];
  S.ui.view = 'home';
  pushHash('#home');
  render();
}

async function goCourses() {
  if (!Runtime.canNavigateApp) { Runtime.navigateFallback?.(); return; }
  destroyPNEditor();
  S.ui.currentCourse = null; S.ui.currentModule = null; S.ui.currentTopic = null;
  S.data.courses = await loadCourses();
  const progMap = {};
  await Promise.all(S.data.courses.map(async c => {
    if (!c.moduleIDs?.length) { progMap[c.courseID] = 0; return; }
    const mods = await loadAll('/module?id=', c.moduleIDs);
    const done = mods.filter(m => m.slashed).length;
    progMap[c.courseID] = Math.round(done / mods.length * 100);
  }));
  S.ui.courseProgress = progMap;
  S.ui.view = 'courses';
  pushHash('#courses');
  render();
}

async function goModules(course, editMode = false) {
  try {
    destroyPNEditor();
    S.ui.currentCourse = course; S.ui.currentModule = null; S.ui.currentTopic = null;
    S.ui.editMode = editMode;
    S.data.modules = await loadAll('/module?id=', course.moduleIDs || []);
    S.data.moduleTopics = await loadAllTopics(S.data.modules);
    S.ui.view = 'modules';
    pushHash('#course/' + course.courseID + (editMode ? '/edit' : ''));
    render();
  } catch (e) { toast(e.message || 'Failed to open course', 'err'); }
}

async function goTopics(module) {
  try {
    destroyPNEditor();
    S.ui.currentModule = module; S.ui.currentTopic = null;
    S.data.topics = await loadAllTopicsWithCompleted(module.topicIDs || []);
    S.data.moduleTopics[module.moduleID] = S.data.topics;
    S.ui.view = 'topics';
    pushHash('#course/' + S.ui.currentCourse.courseID + '/module/' + module.moduleID + (S.ui.editMode ? '/edit' : ''));
    render();
  } catch (e) { toast(e.message || 'Failed to open module', 'err'); }
}

async function goTopic(topic) {
  try {
    destroyPNEditor();
    if (!S.ui.currentModule || S.ui.currentModule.moduleID !== topic.moduleID) {
      S.ui.currentModule = await GET('/module?id=' + topic.moduleID);
      S.data.topics = await loadAll('/topic?id=', S.ui.currentModule.topicIDs || []);
      S.data.moduleTopics[S.ui.currentModule.moduleID] = S.data.topics;
    }
    S.ui.currentTopic = topic;
    S.editor.cells = parseRawElements(topic.rawElements);
    S.editor.privateNote = topic.privateNoteID ? await GET('/privatenotes?id=' + topic.privateNoteID) : null;
    S.ui.view = 'topic';
    pushHash('#course/' + S.ui.currentCourse.courseID + '/module/' + S.ui.currentModule.moduleID + '/topic/' + topic.topicID + '/' + S.ui.notesTab + (S.ui.editMode ? '/edit' : ''));
    render();
  } catch (e) {
    console.error('goTopic failed:', e);
    toast(e.message || 'Failed to open topic', 'err');
  }
}

async function goMarket() {
  if (!Runtime.canNavigateApp) { Runtime.navigateFallback?.(); return; }
  destroyPNEditor();
  S.ui.currentCourse = null; S.ui.currentModule = null; S.ui.currentTopic = null;
  await loadMarketCourses();
  S.ui.view = 'market';
  pushHash('#market');
  render();
}

async function goSettings() {
  if (!Runtime.canNavigateApp) { Runtime.navigateFallback?.(); return; }
  S.ui.currentCourse = null; S.ui.currentModule = null; S.ui.currentTopic = null;
  S.ui.view = 'settings';
  pushHash('#settings');
  render();
}

async function restoreFromHash(hash) {
  if (!S.data.user) return;
  const m = {
    settings: hash.match(/^#settings$/),
    home:     hash.match(/^#home$/),
    market:   hash.match(/^#market$/),
    courses: hash.match(/^#courses$/),
    modules: hash.match(/^#course\/([^/]+)(\/edit)?$/),
    topics:  hash.match(/^#course\/([^/]+)\/module\/([^/]+)(\/edit)?$/),
    topic:   hash.match(/^#course\/([^/]+)\/module\/([^/]+)\/topic\/([^/]+)(?:\/(pn|cp))?(\/edit)?$/),
  };
  try {
    if (m.settings) {
      S.ui.view = 'settings'; render(); return;
    } else if (m.home) {
      await goHome(); return;
    } else if (m.market) {
      await goMarket(); return;
    } else if (m.topic) {
      const [courseID, moduleID, topicID] = [m.topic[1], m.topic[2], m.topic[3]];
      S.ui.notesTab = m.topic[4] || 'cp';
      S.ui.editMode = !!m.topic[5];
      const [course, module, topic] = await Promise.all([GET('/course?id=' + courseID), GET('/module?id=' + moduleID), GET('/topic?id=' + topicID)]);
      S.editor.privateNote = topic.privateNoteID ? await GET('/privatenotes?id=' + topic.privateNoteID) : null;
      S.data.courses = await loadCourses();
      S.ui.currentCourse = course; S.data.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.ui.currentModule = module; S.data.topics = await loadAllTopicsWithCompleted(module.topicIDs || []);
      S.ui.currentTopic = topic; S.editor.cells = parseRawElements(topic.rawElements);
      S.data.moduleTopics = await loadAllTopics(S.data.modules);
      S.data.moduleTopics[module.moduleID] = S.data.topics;
      S.ui.view = 'topic';
    } else if (m.topics) {
      const [courseID, moduleID] = [m.topics[1], m.topics[2]];
      S.ui.editMode = !!m.topics[3];
      const [course, module] = await Promise.all([GET('/course?id=' + courseID), GET('/module?id=' + moduleID)]);
      S.data.courses = await loadCourses();
      S.ui.currentCourse = course; S.data.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.ui.currentModule = module; S.data.topics = await loadAllTopicsWithCompleted(module.topicIDs || []);
      S.data.moduleTopics = await loadAllTopics(S.data.modules);
      S.data.moduleTopics[module.moduleID] = S.data.topics;
      S.ui.view = 'topics';
    } else if (m.modules) {
      const courseID = m.modules[1];
      const course = await GET('/course?id=' + courseID);
      S.data.courses = await loadCourses();
      S.ui.currentCourse = course; S.data.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.data.moduleTopics = await loadAllTopics(S.data.modules);
      S.ui.editMode = !!m.modules[2];
      S.ui.view = 'modules';
    } else {
      await goCourses(); return;
    }
    render();
  } catch {
    await goCourses();
  }
}

window.addEventListener('popstate', () => restoreFromHash(location.hash));
