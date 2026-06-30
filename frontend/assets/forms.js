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
      const idx = S.courses.findIndex(c => c.courseID === updated.courseID);
      if (idx !== -1) S.courses[idx] = updated;
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
  document.getElementById('cef-name').focus();
}

function bindModulesForm() {
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
}

function enterCourseEditMode() {
  document.getElementById('course-view-header').style.display = 'none';
  document.getElementById('course-edit-form').style.display = 'block';
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
  const leftColour  = document.getElementById('ce-left-colour')?.value || S.currentCourse.leftColour;
  const rightColour = document.getElementById('ce-right-colour')?.value || S.currentCourse.rightColour;
  if (!name) return;
  try {
    const updated = await PUT('/course', { id: S.currentCourse.courseID, name, description: desc, leftColour, rightColour });
    S.currentCourse = updated;
    const idx = S.courses.findIndex(c => c.courseID === updated.courseID);
    if (idx !== -1) S.courses[idx] = updated;
    render();
    toast('Course updated');
  } catch (e) {
    toast(e.message, 'err');
  }
}

function bindTopicsForm() {
  document.getElementById('tf-submit').onclick = () => {
    const name = document.getElementById('tf-name').value.trim();
    if (!name) return;
    closeModal();
    createTopic(name, '');
  };
  enterSubmit('tf-name', 'tf-submit');
}

function bindTopicListeners() {
  mountPNEditor();
  renderNotebook();
}

function enterSubmit(inputId, btnId) {
  document.getElementById(inputId)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(btnId)?.click();
  });
}
