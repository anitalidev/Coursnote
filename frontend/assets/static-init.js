'use strict';

window.STATIC_MODE = true;

// Build fast-lookup maps for the API shim in api.js
const _CD = window.COURSE_DATA;
_CD.courseMap = { [_CD.course.courseID]: _CD.course };
_CD.moduleMap = {};
_CD.topicMap  = {};

(_CD.modules || []).forEach(function(m) {
  _CD.moduleMap[m.moduleID] = m;
});
Object.values(_CD.topics || {}).forEach(function(t) {
  _CD.topicMap[t.topicID] = t;
});

// Synthetic user — bypasses login screen
S.user     = { id: 'static', username: 'Viewer', courseIDs: [_CD.course.courseID] };
S.editMode = false;

// ── Stubs for functions not needed in static mode ─────────────────────────────
function bindCoursesForm()    {}
function bindModulesForm()    {}
function bindTopicsForm()     {}
function bindTopicListeners() {}
function scheduleElementsSave() {}
function schedulePNSave()     {}
function setStatus()          {}
function toggleUserMenu()     {}

// Override navigation functions that have no meaning in a single downloaded course
function goCourses()  { goModules(_CD.course); }
function goHome()     { goModules(_CD.course); }
function goMarket()   { goModules(_CD.course); }
function goSettings() { goModules(_CD.course); }
function goLogin()    {}

// ── Progress tracking via localStorage ───────────────────────────────────────
var _progressKey = 'cn_progress_' + _CD.course.courseID;

function _getProgress() {
  try { return JSON.parse(localStorage.getItem(_progressKey) || '{}'); } catch { return {}; }
}

function toggleTopicCompleted() {
  var t = S.currentTopic;
  if (!t) return;
  var progress = _getProgress();
  t.completed = !progress[t.topicID];
  if (t.completed) progress[t.topicID] = true;
  else delete progress[t.topicID];
  localStorage.setItem(_progressKey, JSON.stringify(progress));
  var all  = Object.values(_CD.topics || {});
  var done = all.filter(function(tp) { return progress[tp.topicID]; }).length;
  S.currentCourse.pcompleted = all.length ? done / all.length : 0;
  render();
}

// Restore saved progress on load
(function() {
  var progress = _getProgress();
  Object.values(_CD.topics || {}).forEach(function(t) { t.completed = !!progress[t.topicID]; });
  var all  = Object.values(_CD.topics || {});
  var done = all.filter(function(t) { return t.completed; }).length;
  _CD.course.pcompleted = all.length ? done / all.length : 0;
})();

(async function() {
  if (location.hash && location.hash !== '#' && location.hash !== '#courses') {
    await restoreFromHash(location.hash);
  } else {
    await goModules(_CD.course);
  }
})();
