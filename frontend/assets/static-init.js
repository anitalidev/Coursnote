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

(function() {
  var labels = { home: 'Back to Home', market: 'Back to Market', courses: 'Back to Courses' };
  var from = new URLSearchParams(location.search).get('from');
  var label = labels[from];
  if (!label) return;
  var btn = document.createElement('div');
  btn.style.cssText = 'position:fixed;top:16px;left:16px;z-index:9999';
  btn.innerHTML = '<a href="javascript:history.back()" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);color:#fff;font-size:13px;font-weight:500;border-radius:8px;text-decoration:none;border:1px solid rgba(255,255,255,.15)">'
    + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>'
    + label + '</a>';
  document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(btn); });
  if (document.readyState !== 'loading') document.body.appendChild(btn);
})();

(async function() {
  if (location.hash && location.hash !== '#' && location.hash !== '#courses') {
    await restoreFromHash(location.hash);
  } else {
    await goModules(_CD.course);
  }
})();
