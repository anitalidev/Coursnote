'use strict';

function updateBannerPreview() {
  const left  = document.getElementById('ce-left-colour')?.value;
  const right = document.getElementById('ce-right-colour')?.value;
  const el = document.getElementById('ce-banner-preview');
  if (el && left && right) el.style.background = `linear-gradient(135deg,${left},${right})`;
}

function syncColourPicker(pickerId, hexId) {
  const hex = document.getElementById(pickerId)?.value;
  if (hex) document.getElementById(hexId).value = hex;
}

function syncColourHex(pickerId, hexId) {
  const val = document.getElementById(hexId)?.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) document.getElementById(pickerId).value = val;
}

function bindCoursesForm() {
  if (!Runtime.editable) return;
  // inputs live in the persistent modal — bind once via onclick on the button
  document.getElementById('cf-submit').onclick = () => {
    const name = document.getElementById('cf-name').value.trim();
    const desc = document.getElementById('cf-desc').value.trim();
    if (!name) return;
    closeModal();
    createCourse(name, desc);
  };
  enterSubmit('cf-name', 'cf-submit');

  document.getElementById('cef-save')?.addEventListener('click', async () => {
    const id   = document.getElementById('cef-save').dataset.id;
    const name = document.getElementById('cef-name').value.trim();
    const desc = document.getElementById('cef-desc').value.trim();
    if (!name) return;
    try {
      const updated = await PUT('/course', { id, name, description: desc });
      const idx = S.data.courses.findIndex(c => c.courseID === updated.courseID);
      if (idx !== -1) S.data.courses[idx] = updated;
      render();
      toast('Course updated');
    } catch (e) { toast(e.message, 'err'); }
  });
  enterSubmit('cef-name', 'cef-save');
}

function openCourseCardEdit(course) {
  const form = document.getElementById('course-edit-card-form');
  document.getElementById('course-form')?.classList.remove('open');
  document.getElementById('cef-name').value = course.name;
  document.getElementById('cef-desc').value = course.description || '';
  document.getElementById('cef-save').dataset.id = course.courseID;
  form.classList.add('open');
  autoResize(document.getElementById('cef-desc'));
  document.getElementById('cef-name').focus();
}

function bindModulesForm() {
  if (!Runtime.editable) return;
  document.getElementById('mf-submit').onclick = () => {
    const name = document.getElementById('mf-name').value.trim();
    const desc = document.getElementById('mf-desc').value.trim();
    if (!name) return;
    closeModal();
    createModule(name, desc);
  };
  enterSubmit('mf-name', 'mf-submit');

  document.getElementById('ce-save')?.addEventListener('click', saveCourseEdit);
  enterSubmit('ce-name', 'ce-save');

  document.getElementById('me-save')?.addEventListener('click', saveModuleEdit);
  enterSubmit('me-name', 'me-save');
}

function openModuleEdit(moduleID) {
  const m = (S.data.modules || []).find(m => m.moduleID === moduleID)
    || (S.ui.currentModule?.moduleID === moduleID ? S.ui.currentModule : null);
  if (!m) return;
  document.getElementById('me-name').value = m.name;
  document.getElementById('me-desc').value = m.description || '';
  document.getElementById('me-save').dataset.id = m.moduleID;
  // On the module page, the edit box replaces the header; the modules
  // overview has no per-module header, so there is nothing to hide there.
  const header = document.getElementById('module-view-header');
  if (header) header.style.display = 'none';
  document.getElementById('module-edit-form').style.display = 'block';
  autoResize(document.getElementById('me-desc'));
  document.getElementById('me-name').focus();
}

function exitModuleEditMode() {
  document.getElementById('module-edit-form').style.display = 'none';
  const header = document.getElementById('module-view-header');
  if (header) header.style.display = '';
}

async function saveModuleEdit() {
  const id   = document.getElementById('me-save').dataset.id;
  const name = document.getElementById('me-name').value.trim();
  const desc = document.getElementById('me-desc').value.trim();
  if (!id || !name) return;
  try {
    const updated = await PUT('/module', { id, name, description: desc });
    const idx = (S.data.modules || []).findIndex(m => m.moduleID === updated.moduleID);
    if (idx !== -1) S.data.modules[idx] = updated;
    if (S.ui.currentModule?.moduleID === updated.moduleID) S.ui.currentModule = updated;
    render();
    toast('Module updated');
  } catch (e) {
    toast(e.message, 'err');
  }
}

function enterCourseEditMode() {
  document.getElementById('course-view-header').style.display = 'none';
  document.getElementById('course-edit-form').style.display = 'block';
  autoResize(document.getElementById('ce-desc'));
  document.getElementById('ce-name').focus();
  document.getElementById('ce-name').select();
}

function exitCourseEditMode() {
  document.getElementById('course-edit-form').style.display = 'none';
  document.getElementById('course-view-header').style.display = '';
}

function saveCourseFromEditMode() {
  if (document.getElementById('ce-name')) {
    saveCourseEdit();
  }
}

async function saveCourseEdit() {
  const name        = document.getElementById('ce-name').value.trim();
  const desc        = document.getElementById('ce-desc').value.trim();
  const leftColour  = document.getElementById('ce-left-colour')?.value || S.ui.currentCourse.leftColour;
  const rightColour = document.getElementById('ce-right-colour')?.value || S.ui.currentCourse.rightColour;
  if (!name) return;
  try {
    const updated = await PUT('/course', { id: S.ui.currentCourse.courseID, name, description: desc, leftColour, rightColour });
    S.ui.currentCourse = updated;
    const idx = S.data.courses.findIndex(c => c.courseID === updated.courseID);
    if (idx !== -1) S.data.courses[idx] = updated;
    render();
    toast('Course updated');
  } catch (e) {
    toast(e.message, 'err');
  }
}

function bindTopicsForm() {
  if (!Runtime.editable) return;
  document.getElementById('tf-submit').onclick = () => {
    const name = document.getElementById('tf-name').value.trim();
    if (!name) return;
    closeModal();
    createTopic(name, '');
  };
  enterSubmit('tf-name', 'tf-submit');

  document.getElementById('me-save')?.addEventListener('click', saveModuleEdit);
  enterSubmit('me-name', 'me-save');

  document.getElementById('te-save')?.addEventListener('click', saveTopicEdit);
  enterSubmit('te-name', 'te-save');
}

function openTopicEdit(topicID) {
  const t = (S.data.topics || []).find(t => t.topicID === topicID)
    || (S.ui.currentTopic?.topicID === topicID ? S.ui.currentTopic : null);
  if (!t) return;
  document.getElementById('te-name').value = t.name;
  document.getElementById('te-desc').value = (t.description || '').slice(0, 100);
  const counter = document.getElementById('te-desc-count');
  if (counter) counter.textContent = (t.description || '').length + '/100';
  document.getElementById('te-save').dataset.id = t.topicID;
  // On the topic page, the edit box replaces the header; the topics
  // list has no per-topic header, so there is nothing to hide there.
  const header = document.getElementById('topic-view-header');
  if (header) header.style.display = 'none';
  document.getElementById('topic-edit-form').style.display = 'block';
  autoResize(document.getElementById('te-desc'));
  renderTopicRulesUI(t);
  document.getElementById('te-name').focus();
}

function exitTopicEditMode() {
  document.getElementById('topic-edit-form').style.display = 'none';
  const header = document.getElementById('topic-view-header');
  if (header) header.style.display = '';
}

async function saveTopicEdit() {
  const id   = document.getElementById('te-save').dataset.id;
  const name = document.getElementById('te-name').value.trim();
  const desc = document.getElementById('te-desc').value.trim();
  if (!id || !name) return;
  try {
    // Collect completion rules from checkboxes
    const compRules = [];
    const ruleChecks = document.querySelectorAll('[data-rule-type]');
    ruleChecks.forEach(cb => {
      if (!cb.checked) return;
      const ruleType = cb.dataset.ruleType;
      const input = document.getElementById(`te-rule-input-${ruleType}`);
      let config = null;
      if (input) {
        const val = input.value.trim();
        if (val) config = ruleType === 'timed' ? parseInt(val) : parseInt(val);
      }
      compRules.push({ type: ruleType, config });
    });

    // elements omitted on purpose: the backend leaves them unchanged
    const updated = await PUT('/topic', { id, name, description: desc, compRules });
    const apply = t => {
      if (t && t.topicID === updated.topicID) {
        t.name = updated.name;
        t.description = updated.description;
        t.compTypes = updated.compTypes;
      }
    };
    (S.data.topics || []).forEach(apply);
    Object.values(S.data.moduleTopics || {}).forEach(list => (list || []).forEach(apply));
    apply(S.ui.currentTopic);
    render();
    if (updated.warning) {
      toast('No completion rules defined. This item will use manual completion.');
    } else {
      toast('Topic updated');
    }
  } catch (e) {
    toast(e.message, 'err');
  }
}

function bindTopicListeners() {
  if (Runtime.editable) mountPNEditor();
  renderNotebook();
  renderTopicRulesDisplay(S.ui.currentTopic);
  if (Runtime.editable) {
    document.getElementById('te-save')?.addEventListener('click', saveTopicEdit);
    enterSubmit('te-name', 'te-save');
  }
  if (Runtime.trackProgress) {
    if (S.ui.currentTopic) _startTopicTracking(S.ui.currentTopic.topicID);
    _injectDebugPanel();
  }
}

function enterSubmit(inputId, btnId) {
  document.getElementById(inputId)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(btnId)?.click();
  });
}
