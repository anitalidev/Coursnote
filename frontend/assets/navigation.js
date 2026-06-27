'use strict';

function pushHash(hash) {
  history.pushState(null, '', hash);
}

async function goLogin() {
  localStorage.removeItem('coursnote_user');
  Object.assign(S, { user: null, courses: [], currentCourse: null, modules: [], currentModule: null, topics: [], currentTopic: null, coursePage: null, privateNote: null, view: 'login' });
  pushHash('#');
  render();
}

async function goCourses() {
  S.currentCourse = null; S.currentModule = null; S.currentTopic = null;
  S.courses = await loadCourses(S.user.courseIDs || []);
  const progMap = {};
  await Promise.all(S.courses.map(async c => {
    if (!c.moduleIDs?.length) { progMap[c.courseID] = 0; return; }
    const mods = await loadAll('/module?id=', c.moduleIDs);
    const done = mods.filter(m => m.slashed).length;
    progMap[c.courseID] = Math.round(done / mods.length * 100);
  }));
  S.courseProgress = progMap;
  S.view = 'courses';
  pushHash('#courses');
  render();
}

async function goModules(course, editMode = false) {
  try {
    S.currentCourse = course; S.currentModule = null; S.currentTopic = null;
    S.editMode = editMode;
    S.modules = await loadAll('/module?id=', course.moduleIDs || []);
    S.moduleTopics = await loadAllTopics(S.modules);
    S.view = 'modules';
    pushHash('#course/' + course.courseID + (editMode ? '/edit' : ''));
    render();
  } catch (e) { toast(e.message || 'Failed to open course', 'err'); }
}

async function goTopics(module) {
  try {
    S.currentModule = module; S.currentTopic = null;
    S.topics = await loadAll('/topic?id=', module.topicIDs || []);
    S.moduleTopics[module.moduleID] = S.topics;
    S.view = 'topics';
    pushHash('#course/' + S.currentCourse.courseID + '/module/' + module.moduleID);
    render();
  } catch (e) { toast(e.message || 'Failed to open module', 'err'); }
}

async function goTopic(topic) {
  try {
    S.currentTopic = topic;
    S.notebookCells = parseRawElements(topic.rawElements);
    S.privateNote = await GET('/privatenotes?id=' + topic.privateNoteID);
    S.view = 'topic';
    pushHash('#course/' + S.currentCourse.courseID + '/module/' + S.currentModule.moduleID + '/topic/' + topic.topicID + '/' + S.notesTab);
    render();
  } catch (e) {
    toast(e.message || 'Failed to open topic', 'err');
  }
}

async function restoreFromHash(hash) {
  if (!S.user) return;
  const m = {
    courses: hash.match(/^#courses$/),
    modules: hash.match(/^#course\/([^/]+)(\/edit)?$/),
    topics:  hash.match(/^#course\/([^/]+)\/module\/([^/]+)$/),
    topic:   hash.match(/^#course\/([^/]+)\/module\/([^/]+)\/topic\/([^/]+)(?:\/(pn|cp))?$/),
  };
  try {
    if (m.topic) {
      const [courseID, moduleID, topicID] = [m.topic[1], m.topic[2], m.topic[3]];
      S.notesTab = m.topic[4] || 'cp';
      const [course, module, topic] = await Promise.all([GET('/course?id=' + courseID), GET('/module?id=' + moduleID), GET('/topic?id=' + topicID)]);
      S.privateNote = await GET('/privatenotes?id=' + topic.privateNoteID);
      S.courses = await loadCourses(S.user.courseIDs || []);
      S.currentCourse = course; S.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.currentModule = module; S.topics = await loadAll('/topic?id=', module.topicIDs || []);
      S.currentTopic = topic; S.notebookCells = parseRawElements(topic.rawElements);
      S.view = 'topic';
    } else if (m.topics) {
      const [courseID, moduleID] = [m.topics[1], m.topics[2]];
      const [course, module] = await Promise.all([GET('/course?id=' + courseID), GET('/module?id=' + moduleID)]);
      S.courses = await loadCourses(S.user.courseIDs || []);
      S.currentCourse = course; S.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.currentModule = module; S.topics = await loadAll('/topic?id=', module.topicIDs || []);
      S.moduleTopics = await loadAllTopics(S.modules);
      S.moduleTopics[module.moduleID] = S.topics;
      S.view = 'topics';
    } else if (m.modules) {
      const courseID = m.modules[1];
      const course = await GET('/course?id=' + courseID);
      S.courses = await loadCourses(S.user.courseIDs || []);
      S.currentCourse = course; S.modules = await loadAll('/module?id=', course.moduleIDs || []);
      S.moduleTopics = await loadAllTopics(S.modules);
      S.editMode = !!m.modules[2];
      S.view = 'modules';
    } else {
      await goCourses(); return;
    }
    render();
  } catch {
    await goCourses();
  }
}

window.addEventListener('popstate', () => restoreFromHash(location.hash));
