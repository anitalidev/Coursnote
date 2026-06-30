'use strict';

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function jsonAttr(obj) {
  return "JSON.parse(decodeURIComponent('" + encodeURIComponent(JSON.stringify(obj)) + "'))";
}

function toggleForm(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

function openModal(bodyId, title) {
  document.getElementById('modal-title').textContent = title;
  document.querySelectorAll('.modal-body').forEach(el => el.classList.remove('active'));
  document.getElementById(bodyId).classList.add('active');
  document.getElementById('modal-overlay').classList.add('open');
  // focus first input in the shown body
  setTimeout(() => document.querySelector(`#${bodyId} input`)?.focus(), 50);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.querySelectorAll('.modal-body input').forEach(el => el.value = '');
}

function modalOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', 2800);
}
