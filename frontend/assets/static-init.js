'use strict';

// ── Runtime capabilities for static/enrolled mode ─────────────────────────────
Runtime.editable        = false;
Runtime.canSave         = false;
Runtime.canNavigateApp  = false;
Runtime.canLogin        = false;
Runtime.showUserMenu    = false;
Runtime.hasPrivateNotes = false;
Runtime.trackProgress   = true;

// Fold COURSE_DATA / ENROLLMENT_DATA into Runtime and build fast-lookup maps.
Runtime.courseData     = window.COURSE_DATA;
Runtime.enrollmentData = window.ENROLLMENT_DATA || null;

const _CD = Runtime.courseData;
_CD.courseMap = { [_CD.course.courseID]: _CD.course };
_CD.moduleMap = {};
_CD.topicMap  = {};
(_CD.modules || []).forEach(function(m) { _CD.moduleMap[m.moduleID] = m; });
_CD.coursePageMap = {};
Object.values(_CD.topics || {}).forEach(function(t) {
  _CD.topicMap[t.topicID] = t;
  if (t.coursePageID) {
    _CD.coursePageMap[t.coursePageID] = { coursePageID: t.coursePageID, topicID: t.topicID, rawElements: t.rawElements ?? null };
  }
});

Runtime.navigateFallback = function() { goModules(_CD.course); };

// Enrollment data accessible at script scope (used by cvQSave/cvQLoad setup below).
const _ED = Runtime.enrollmentData;

// Synthetic user — bypasses login screen
S.data.user   = { id: 'static', username: 'Viewer', courseIDs: [_CD.course.courseID] };
S.ui.editMode = false;

// save.js / forms.js / actions.js are not loaded in static mode.
function scheduleElementsSave() {}
function schedulePNSave()       {}
function setStatus()            {}
function toggleUserMenu()       {}
function bindCoursesForm()      {}
function bindModulesForm()      {}
function bindTopicsForm()       {}
function bindTopicListeners() {
  renderNotebook();
  renderTopicRulesDisplay(S.ui.currentTopic);
  if (S.ui.currentTopic) _startTopicTracking(S.ui.currentTopic.topicID);
  if (Runtime.showDebugPanel) _injectDebugPanel();
}

// Re-render the notebook once TipTap loads so text/card/table content isn't blank.
window.addEventListener('tiptap-ready', function() {
  if (S.ui.view === 'topic') renderNotebook();
}, { once: true });

// ── Progress — fold into S.data.progress ──────────────────────────────────────
(function() {
  var src;
  if (_ED) {
    var srv = _ED.progress || {};
    src = {
      marked_manually:   srv.marked_manually   || {},
      time_spent:        srv.time_spent        || {},
      read_to_bottom:    srv.read_to_bottom    || {},
      lastAnswered:      srv.lastAnswered      || {},
      correctlyAnswered: srv.correctlyAnswered || {},
    };
  } else {
    var stored = Storage.loadDownloadedProgress(_CD.course.courseID) || {};
    src = {
      marked_manually:   stored.marked_manually   || {},
      time_spent:        stored.time_spent        || {},
      read_to_bottom:    stored.read_to_bottom    || {},
      lastAnswered:      stored.lastAnswered      || {},
      correctlyAnswered: stored.correctlyAnswered || {},
    };
  }
  Object.assign(S.data.progress, src);
})();

var _saveTimer = null;

function _computePercentageCompleted() {
  var topics = Object.values(_CD.topicMap || {});
  if (topics.length === 0) return 0;
  var completed = topics.filter(function(t) { return isTopicComplete(t); }).length;
  return Math.round(completed / topics.length * 100);
}

function _sendProgress() {
  _saveTimer = null;
  fetch('/api/course/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ userID: _ED.userID, staticCourseID: _ED.staticCourseID, progress: S.data.progress }),
  }).catch(function() {});
  fetch('/api/course/enroll', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ userID: _ED.userID, staticCourseID: _ED.staticCourseID, percentageCompleted: _computePercentageCompleted() }),
  }).catch(function() {});
}

function _persistProgress() {
  if (Runtime.enrollmentData) {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_sendProgress, 800);
  } else {
    Storage.saveDownloadedProgress(_CD.course.courseID, S.data.progress);
  }
}

window.addEventListener('beforeunload', function() {
  _checkpointTopicTime();
  if (Runtime.enrollmentData && _saveTimer != null) { clearTimeout(_saveTimer); _sendProgress(); }
});
window.addEventListener('pagehide', function() {
  _flushTopicTime();
  if (Runtime.enrollmentData && _saveTimer != null) { clearTimeout(_saveTimer); _sendProgress(); }
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

function _checkpointTopicTime() {
  if (_trackingTopicID == null || _enterTime == null) return;
  var elapsed = (Date.now() - _enterTime) / 1000;
  S.data.progress.time_spent[_trackingTopicID] = (S.data.progress.time_spent[_trackingTopicID] || 0) + elapsed;
  _enterTime = Date.now();
  _persistProgress();
}

function _flushTopicTime() {
  if (_checkpointTimer) { clearInterval(_checkpointTimer); _checkpointTimer = null; }
  if (_trackingTopicID == null || _enterTime == null) return;
  var elapsed = (Date.now() - _enterTime) / 1000;
  S.data.progress.time_spent[_trackingTopicID] = (S.data.progress.time_spent[_trackingTopicID] || 0) + elapsed;
  _persistProgress();
  _enterTime       = null;
  _trackingTopicID = null;
  if (_scrollHandler) { window.removeEventListener('scroll', _scrollHandler); _scrollHandler = null; }
}

function _setupScrollTracking(topicID) {
  if (_scrollHandler) { window.removeEventListener('scroll', _scrollHandler); _scrollHandler = null; }
  if (S.data.progress.read_to_bottom[topicID]) return;
  _scrollHandler = function() {
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100) {
      S.data.progress.read_to_bottom[topicID] = true;
      _persistProgress();
      window.removeEventListener('scroll', _scrollHandler);
      _scrollHandler = null;
      _updateDebugPanel();
    }
  };
  window.addEventListener('scroll', _scrollHandler);
}

// ── Debug panel (opt-in via Runtime.showDebugPanel) ───────────────────────────
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

function _getTopicLiveTime(topicID) {
  var stored = S.data.progress.time_spent[topicID] || 0;
  var live   = (_enterTime && _trackingTopicID === topicID) ? (Date.now() - _enterTime) / 1000 : 0;
  return stored + live;
}

var _rulesDisplayTick = 0;
function _updateDebugPanel() {
  var panel = document.getElementById('static-debug-panel');
  if (!panel || !S.ui.currentTopic) return;
  var id     = S.ui.currentTopic.topicID;
  var stored = S.data.progress.time_spent[id] || 0;
  var live   = (_enterTime && _trackingTopicID === id) ? (Date.now() - _enterTime) / 1000 : 0;
  panel.innerHTML =
    'time_spent: <b style="color:#e2e8f0">'      + (stored + live).toFixed(1) + 's</b><br>' +
    'read_to_bottom: <b style="color:#e2e8f0">'  + (!!S.data.progress.read_to_bottom[id])  + '</b><br>' +
    'marked_manually: <b style="color:#e2e8f0">' + (!!S.data.progress.marked_manually[id]) + '</b>';
  _rulesDisplayTick++;
  if (_rulesDisplayTick % 10 === 0 && S.ui.currentTopic) {
    var rulesEl = document.getElementById('topic-completion-rules-display');
    if (rulesEl && !rulesEl.querySelector('.tooltip-visible')) {
      renderTopicRulesDisplay(S.ui.currentTopic);
    }
  }
}

// ── Register navigation hook — flush time before any route change ─────────────
// Replaces monkey-patching: navigation.js calls _navHooks.onBeforeNavigate()
// on every go* call, so all navigation paths are covered without wrapping.
_navHooks.onBeforeNavigate = _flushTopicTime;

// ── Manual completion ─────────────────────────────────────────────────────────
function toggleTopicCompleted() {
  var t = S.ui.currentTopic;
  if (!t) return;
  if (S.data.progress.marked_manually[t.topicID]) delete S.data.progress.marked_manually[t.topicID];
  else S.data.progress.marked_manually[t.topicID] = true;
  _persistProgress();
  _updateDebugPanel();
  render();
}

if (_ED) {
  // Answers persist on the enrollment, keyed by the persistent element id when
  // the snapshot has one. Snapshots published before element ids existed fall
  // back to a positional key so answers at least stay stable until republish.
  var _answerKey = function(cellIdx, qi, topicID) {
    var tid = topicID != null ? topicID : (S.ui.currentTopic && S.ui.currentTopic.topicID);
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
    S.data.progress.lastAnswered[k] = Number(chosen);
    _persistProgress();
  };
  cvQLoad = function(cellIdx, qi, topicID) {
    var k = _answerKey(cellIdx, qi, topicID);
    var v = k == null ? null : S.data.progress.lastAnswered[k];
    return v == null ? null : Number(v);
  };
  cvQsBestSave = function(cellIdx, score) {
    var k = _answerKey(cellIdx, null);
    if (k == null) return;
    S.data.progress.correctlyAnswered[k] = Number(score);
    _persistProgress();
  };
  cvQsBestLoad = function(cellIdx) {
    var k = _answerKey(cellIdx, null);
    var v = k == null ? null : S.data.progress.correctlyAnswered[k];
    return v == null ? null : Number(v);
  };
}

// ── Back button ───────────────────────────────────────────────────────────────
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
    btn.onclick = function() { window.location.href = window.location.origin + '/' + dest[0]; };
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
