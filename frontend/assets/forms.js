'use strict';

function bindCoursesForm() {
  document.getElementById('cf-submit')?.addEventListener('click', () => {
    const name = document.getElementById('cf-name').value.trim();
    const desc = document.getElementById('cf-desc').value.trim();
    if (!name) return;
    createCourse(name, desc);
  });
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
  document.getElementById('mf-submit')?.addEventListener('click', () => {
    const name = document.getElementById('mf-name').value.trim();
    const desc = document.getElementById('mf-desc').value.trim();
    if (!name) return;
    createModule(name, desc);
  });
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
  const name = document.getElementById('ce-name').value.trim();
  const desc = document.getElementById('ce-desc').value.trim();
  if (!name) return;
  try {
    const updated = await PUT('/course', { id: S.currentCourse.courseID, name, description: desc });
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
  document.getElementById('tf-submit')?.addEventListener('click', () => {
    const name = document.getElementById('tf-name').value.trim();
    const desc = document.getElementById('tf-desc').value.trim();
    if (!name) return;
    createTopic(name, desc);
  });
  enterSubmit('tf-name', 'tf-submit');
}

function bindTopicListeners() {
  const pnText = document.getElementById('pn-text');
  if (pnText) {
    autoResize(pnText);
    pnText.addEventListener('input', e => { schedulePNSave(e.target.value); autoResize(e.target); });
  }
  renderNotebook();
}

function enterSubmit(inputId, btnId) {
  document.getElementById(inputId)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(btnId)?.click();
  });
}
