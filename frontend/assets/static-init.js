'use strict';

window.STATIC_MODE = true;

// Build fast-lookup maps for the API shim in api.js
const _CD = window.COURSE_DATA;
window._CD = _CD; // exposed so views.js can resolve topic elements for non-current topics
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
function bindTopicListeners() {
  renderNotebook();
  renderTopicRulesDisplay(S.currentTopic);
  if (S.currentTopic) _startTopicTracking(S.currentTopic.topicID);
  _injectDebugPanel();
}

// Re-render the notebook once TipTap loads so text/card/table content isn't blank.
window.addEventListener('tiptap-ready', function() {
  if (S.view === 'topic') renderNotebook();
}, { once: true });
function scheduleElementsSave() {}
function schedulePNSave()       {}
function setStatus()            {}
function toggleUserMenu()       {}

// Override navigation functions that have no meaning in a single downloaded course
function goCourses()  { goModules(_CD.course); }
function goHome()     { goModules(_CD.course); }
function goMarket()   { goModules(_CD.course); }
function goSettings() { goModules(_CD.course); }
function goLogin()    {}

// ── Progress tracking ─────────────────────────────────────────────────────────
// Enrolled viewing: backend injects window.ENROLLMENT_DATA; progress is saved
// exclusively via PUT /api/course/progress. Downloaded ZIPs have no
// ENROLLMENT_DATA and fall back to localStorage.
var _ED = window.ENROLLMENT_DATA || null;

var _progress = (function() {
  var empty = { marked_manually: {}, time_spent: {}, read_to_bottom: {}, lastAnswered: {} };
  if (!_ED) {
    // Downloaded ZIP — use localStorage.
    var _progressKey = 'cn_progress_' + _CD.course.courseID;
    try {
      var stored = JSON.parse(localStorage.getItem(_progressKey) || '{}');
      return {
        marked_manually: stored.marked_manually || {},
        time_spent:      stored.time_spent      || {},
        read_to_bottom:  stored.read_to_bottom  || {},
        lastAnswered:    stored.lastAnswered     || {}
      };
    } catch { return empty; }
  }
  // Enrolled — initialise entirely from server data.
  var srv = _ED.progress || {};
  return {
    marked_manually: srv.marked_manually || {},
    time_spent:      srv.time_spent      || {},
    read_to_bottom:  srv.read_to_bottom  || {},
    lastAnswered:    srv.lastAnswered     || {}
  };
})();
window._progress = _progress;

var _saveTimer = null;
function _computePercentageCompleted() {
  var topics = Object.values(_CD.topicMap || {});
  if (topics.length === 0) return 0;
  var completed = topics.filter(function(t) {
    return typeof _isTopicComplete === 'function' ? _isTopicComplete(t) : false;
  }).length;
  return Math.round(completed / topics.length * 100);
}

function _sendProgress() {
  _saveTimer = null;
  fetch('/api/course/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ userID: _ED.userID, staticCourseID: _ED.staticCourseID, progress: _progress }),
  }).catch(function() {});
  fetch('/api/course/enroll', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ userID: _ED.userID, staticCourseID: _ED.staticCourseID, percentageCompleted: _computePercentageCompleted() }),
  }).catch(function() {});
}

function _persistProgress() {
  if (_ED) {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_sendProgress, 800);
  } else {
    // Downloaded ZIP only.
    var _progressKey = 'cn_progress_' + _CD.course.courseID;
    localStorage.setItem(_progressKey, JSON.stringify(_progress));
  }
}

window.addEventListener('beforeunload', function() {
  _checkpointTopicTime();
  if (_ED && _saveTimer != null) { clearTimeout(_saveTimer); _sendProgress(); }
});
window.addEventListener('pagehide', function() {
  _flushTopicTime();
  if (_ED && _saveTimer != null) { clearTimeout(_saveTimer); _sendProgress(); }
});

// ── Time spent & scroll tracking ──────────────────────────────────────────────
var _enterTime        = null;
var _trackingTopicID  = null;
var _scrollHandler    = null;
var _debugInterval    = null;
var _checkpointTimer  = null;

function _startTopicTracking(topicID) {
  _flushTopicTime();
  _trackingTopicID = topicID;
  _enterTime       = Date.now();
  _setupScrollTracking(topicID);
  _checkpointTimer = setInterval(_checkpointTopicTime, 5000);
}

// Saves elapsed time and resets _enterTime so the next checkpoint/flush won't double-count.
function _checkpointTopicTime() {
  if (_trackingTopicID == null || _enterTime == null) return;
  var elapsed = (Date.now() - _enterTime) / 1000;
  _progress.time_spent[_trackingTopicID] = (_progress.time_spent[_trackingTopicID] || 0) + elapsed;
  _enterTime = Date.now();
  _persistProgress();
}

function _flushTopicTime() {
  if (_checkpointTimer) { clearInterval(_checkpointTimer); _checkpointTimer = null; }
  if (_trackingTopicID == null || _enterTime == null) return;
  var elapsed = (Date.now() - _enterTime) / 1000;
  _progress.time_spent[_trackingTopicID] = (_progress.time_spent[_trackingTopicID] || 0) + elapsed;
  _persistProgress();
  _enterTime       = null;
  _trackingTopicID = null;
  if (_scrollHandler) { window.removeEventListener('scroll', _scrollHandler); _scrollHandler = null; }
}

function _setupScrollTracking(topicID) {
  if (_scrollHandler) { window.removeEventListener('scroll', _scrollHandler); _scrollHandler = null; }
  if (_progress.read_to_bottom[topicID]) return; // already reached bottom before
  _scrollHandler = function() {
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100) {
      _progress.read_to_bottom[topicID] = true;
      _persistProgress();
      window.removeEventListener('scroll', _scrollHandler);
      _scrollHandler = null;
      _updateDebugPanel();
    }
  };
  window.addEventListener('scroll', _scrollHandler);
}

// ── Debug panel ───────────────────────────────────────────────────────────────
function _injectDebugPanel() {
  if (_debugInterval) clearInterval(_debugInterval);
  if (!document.getElementById('static-debug-panel')) {
    var panel = document.createElement('div');
    panel.id = 'static-debug-panel';
    panel.style.cssText = 'position:fixed;bottom:12px;right:12px;background:rgba(10,10,20,.92);border:1px solid #334;border-radius:6px;padding:6px 10px;font-size:11px;font-family:monospace;color:#94a3b8;z-index:9999;pointer-events:none;line-height:1.6;';
    document.body.appendChild(panel);
  }
  _updateDebugPanel();
  _debugInterval = setInterval(_updateDebugPanel, 100);
}

window._getTopicLiveTime = function(topicID) {
  var stored = _progress.time_spent[topicID] || 0;
  var live   = (_enterTime && _trackingTopicID === topicID) ? (Date.now() - _enterTime) / 1000 : 0;
  return stored + live;
};

var _rulesDisplayTick = 0;
function _updateDebugPanel() {
  var panel = document.getElementById('static-debug-panel');
  if (!panel || !S.currentTopic) return;
  var id     = S.currentTopic.topicID;
  var stored = _progress.time_spent[id] || 0;
  var live   = (_enterTime && _trackingTopicID === id) ? (Date.now() - _enterTime) / 1000 : 0;
  panel.innerHTML =
    'time_spent: <b style="color:#e2e8f0">'      + (stored + live).toFixed(1) + 's</b><br>' +
    'read_to_bottom: <b style="color:#e2e8f0">'  + (!!_progress.read_to_bottom[id])  + '</b><br>' +
    'marked_manually: <b style="color:#e2e8f0">' + (!!_progress.marked_manually[id]) + '</b>';
  // Re-render completion rules display every ~1s, but not while the tooltip is open
  _rulesDisplayTick++;
  if (_rulesDisplayTick % 10 === 0 && S.currentTopic) {
    var rulesEl = document.getElementById('topic-completion-rules-display');
    if (rulesEl && !rulesEl.querySelector('.tooltip-visible')) {
      renderTopicRulesDisplay(S.currentTopic);
    }
  }
}

// Wrap navigation functions to flush time_spent before leaving a topic.
// Uses variable assignment (not function declarations) to avoid hoisting conflicts.
(function() {
  var _navGoTopic   = goTopic;
  var _navGoTopics  = goTopics;
  var _navGoModules = goModules;
  goTopic = async function(topic) {
    _flushTopicTime();
    return _navGoTopic(topic);
  };
  goTopics = async function(module) {
    _flushTopicTime();
    return _navGoTopics(module);
  };
  // goModules is also called by goCourses/goHome/goMarket/goSettings overrides above,
  // so wrapping it here covers all navigation away from a topic.
  goModules = async function(course, editMode) {
    _flushTopicTime();
    return _navGoModules(course, editMode);
  };
})();

// ── Manual completion ─────────────────────────────────────────────────────────
function toggleTopicCompleted() {
  var t = S.currentTopic;
  if (!t) return;
  if (_progress.marked_manually[t.topicID]) delete _progress.marked_manually[t.topicID];
  else _progress.marked_manually[t.topicID] = true;
  _persistProgress();
  _updateDebugPanel();
  render();
}

if (_ED) {
  // Answers persist on the enrollment, keyed by the persistent element id when
  // the snapshot has one. Snapshots published before element ids existed fall
  // back to a positional key so answers at least stay stable until republish.
  var _answerKey = function(cellIdx, qi, topicID) {
    var tid = topicID != null ? topicID : (S.currentTopic && S.currentTopic.topicID);
    if (tid == null) return null;
    var topic = _CD.topicMap[tid];
    var raw = topic && topic.rawElements;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
    var re = Array.isArray(raw) ? raw[cellIdx] : null;
    var id = qi != null
      ? (re && re.questions && re.questions[qi] && re.questions[qi].id)
      : (re && re.id);
    return id || 'pos_' + tid + '_' + cellIdx + (qi != null ? '_' + qi : '');
  };
  cvQSave = function(cellIdx, qi, chosen) {
    var k = _answerKey(cellIdx, qi);
    if (k == null) return;
    _progress.lastAnswered[k] = Number(chosen);
    _persistProgress();
  };
  cvQLoad = function(cellIdx, qi, topicID) {
    var k = _answerKey(cellIdx, qi, topicID);
    var v = k == null ? null : _progress.lastAnswered[k];
    return v == null ? null : Number(v);
  };
  cvQsBestSave = function(cellIdx, score) {
    var k = _answerKey(cellIdx, null);
    if (k == null) return;
    _progress.correctlyAnswered[k] = Number(score);
    _persistProgress();
  };
  cvQsBestLoad = function(cellIdx) {
    var k = _answerKey(cellIdx, null);
    var v = k == null ? null : _progress.correctlyAnswered[k];
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



(async function() {
  if (location.hash && location.hash !== '#' && location.hash !== '#courses') {
    await restoreFromHash(location.hash);
  } else {
    await goModules(_CD.course);
  }
})();
