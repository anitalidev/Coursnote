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
function bindTopicListeners() { renderNotebook(); }

// Re-render the notebook once TipTap loads so text/card/table content isn't blank.
window.addEventListener('tiptap-ready', function() {
  if (S.view === 'topic') renderNotebook();
}, { once: true });
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

// ── Progress tracking ─────────────────────────────────────────────────────────
// Enrolled viewing: the backend injects window.ENROLLMENT_DATA (userID,
// staticCourseID, progress) and progress is saved to the enrollment via the
// API. Downloaded static courses have no ENROLLMENT_DATA and keep using
// localStorage exactly as before.
var _ED = window.ENROLLMENT_DATA || null;
var _progressKey = 'cn_progress_' + _CD.course.courseID;

function _getLocalCompleted() {
  try { return JSON.parse(localStorage.getItem(_progressKey) || '{}'); } catch { return {}; }
}

var _progress = _ED
  ? { completed: (_ED.progress && _ED.progress.completed) || {}, lastAnswered: (_ED.progress && _ED.progress.lastAnswered) || {} }
  : { completed: _getLocalCompleted(), lastAnswered: {} };

var _saveTimer = null;
function _sendProgress() {
  _saveTimer = null;
  fetch('/api/course/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ userID: _ED.userID, staticCourseID: _ED.staticCourseID, progress: _progress }),
  }).catch(function() {});
}

function _persistProgress() {
  if (!_ED) {
    localStorage.setItem(_progressKey, JSON.stringify(_progress.completed));
    return;
  }
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_sendProgress, 800);
}

// Flush a pending save if the tab closes before the debounce fires.
window.addEventListener('pagehide', function() {
  if (_ED && _saveTimer != null) { clearTimeout(_saveTimer); _sendProgress(); }
});

function toggleTopicCompleted() {
  var t = S.currentTopic;
  if (!t) return;
  t.completed = !_progress.completed[t.topicID];
  if (t.completed) _progress.completed[t.topicID] = true;
  else delete _progress.completed[t.topicID];
  _persistProgress();
  var all  = Object.values(_CD.topics || {});
  var done = all.filter(function(tp) { return _progress.completed[tp.topicID]; }).length;
  S.currentCourse.pcompleted = all.length ? done / all.length : 0;
  render();
}

if (_ED) {
  // Answers persist on the enrollment, keyed by the persistent element id when
  // the snapshot has one. Snapshots published before element ids existed fall
  // back to a positional key so answers at least stay stable until republish.
  var _answerKey = function(cellIdx, qi) {
    var t = S.currentTopic;
    if (!t) return null;
    var topic = _CD.topicMap[t.topicID];
    var raw = topic && topic.rawElements;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
    var re = Array.isArray(raw) ? raw[cellIdx] : null;
    var id = qi != null
      ? (re && re.questions && re.questions[qi] && re.questions[qi].id)
      : (re && re.id);
    return id || 'pos_' + t.topicID + '_' + cellIdx + (qi != null ? '_' + qi : '');
  };
  cvQSave = function(cellIdx, qi, chosen) {
    var k = _answerKey(cellIdx, qi);
    if (k == null) return;
    _progress.lastAnswered[k] = Number(chosen);
    _persistProgress();
  };
  cvQLoad = function(cellIdx, qi) {
    var k = _answerKey(cellIdx, qi);
    var v = k == null ? null : _progress.lastAnswered[k];
    return v == null ? null : Number(v);
  };
}

(function() {
  var from = new URLSearchParams(location.search).get('from');
  var destinations = {
    home:    ['#home',    'Back to Home'],
    market:  ['#market',  'Back to Market'],
  };
  var dest = destinations[from] || ['#courses', 'Back to Courses'];
  function insertBackBtn() {
    var container = document.getElementById('sidebar-back');
    if (!container) return;
    container.style.cssText = 'padding:12px 16px;border-top:1px solid var(--border)';
    var btn = document.createElement('button');
    btn.textContent = '← ' + dest[1];
    btn.style.cssText = 'width:100%;padding:11px 8px;background:transparent;border:1px solid var(--accent);border-radius:6px;color:var(--accent);font-size:13px;cursor:pointer;transition:all .15s;font-weight:500';
    btn.onmouseover = function() { this.style.background = 'var(--accent)'; this.style.color = 'var(--bg)'; };
    btn.onmouseout  = function() { this.style.background = 'transparent'; this.style.color = 'var(--accent)'; };
    btn.onclick = function() { window.location.href = 'http://localhost:3334/' + dest[0]; };
    container.appendChild(btn);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', insertBackBtn);
  else insertBackBtn();
})();

// Restore saved progress on load
(function() {
  Object.values(_CD.topics || {}).forEach(function(t) { t.completed = !!_progress.completed[t.topicID]; });
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
