'use strict';

// Completion-rule evaluation — pure business logic, no DOM dependencies.
// Extracted from views.js so render.js, render sidebar, and static-init.js
// can all share a single authoritative implementation.

function calcQuestionPercentage(topicID) {
  // Use S.editor.cells when on the current topic — these are the exact cells
  // the viewer rendered, so cellIdx values match what cvQLoad/cvQSave used.
  var cells = (S.ui.currentTopic && S.ui.currentTopic.topicID === topicID && S.editor.cells && S.editor.cells.length)
    ? S.editor.cells
    : (function() {
        var td = Runtime.courseData && Runtime.courseData.topicMap && Runtime.courseData.topicMap[topicID];
        var raw = td && td.rawElements;
        if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
        return Array.isArray(raw) ? raw : null;
      })();
  if (!cells) return null;
  var total = 0, correct = 0;
  // Pass topicID so saved answers resolve against THIS topic, not S.ui.currentTopic —
  // the sidebar evaluates completeness for topics other than the one being viewed.
  cells.forEach(function(cell, cellIdx) {
    if (cell.type === 'question') {
      total++;
      var saved = cvQLoad(cellIdx, null, topicID);
      if (saved != null && saved === cell.answer) correct++;
    } else if (cell.type === 'questionSlide' && Array.isArray(cell.questions)) {
      cell.questions.forEach(function(q, qi) {
        total++;
        var saved = cvQLoad(cellIdx, qi, topicID);
        if (saved != null && saved === q.answer) correct++;
      });
    }
  });
  if (total === 0) return null;
  return (correct / total) * 100;
}

function isModuleComplete(module, progress) {
  if (progress === undefined) progress = S.data.progress;
  const topics = (S.data.moduleTopics || {})[module.moduleID] || [];
  if (topics.length === 0) return true;
  return topics.every(t => isTopicComplete(t, progress));
}

function isTopicComplete(topic, progress) {
  if (progress === undefined) progress = S.data.progress;
  const rules = topic.compTypes || [];
  if (rules.length === 0) return true;
  if (!progress) return false;
  const ruleMap = {};
  rules.forEach(r => { ruleMap[r.type] = r.config; });
  return Object.keys(ruleMap).every(type => isRuleMet(type, ruleMap[type], topic.topicID, progress) === true);
}

function isRuleMet(type, config, topicID, progress) {
  if (progress === undefined) progress = S.data.progress;
  if (!progress) return null;
  if (type === 'self_reported') return !!progress.marked_manually[topicID];
  if (type === 'read_to_bottom') return !!progress.read_to_bottom[topicID];
  if (type === 'timed') {
    var spent = typeof _getTopicLiveTime === 'function' ? _getTopicLiveTime(topicID) : (progress.time_spent[topicID] || 0);
    return spent >= Number(config);
  }
  if (type === 'percentage_questions_correct') {
    var pct = calcQuestionPercentage(topicID);
    return pct != null && pct >= Number(config);
  }
  return null;
}
