'use strict';

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function jsonAttr(obj) {
  return "JSON.parse(decodeURIComponent('" + encodeURIComponent(JSON.stringify(obj)).replace(/'/g, '%27') + "'))";
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

// ── Reusable custom dropdown ──────────────────────────────────────────────────
// opts: [{ val, label }], currentVal: string, onchangeFn: string (JS expression called with val)
function buildCustomDropdown(id, opts, currentVal, onchangeFn) {
  const label = opts.find(o => o.val === currentVal)?.label || opts[0]?.label || '';
  const chevron = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const check   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const items = opts.map(o => {
    const active = o.val === currentVal;
    return `<div class="mkt-custom-opt${active ? ' mkt-custom-opt-active' : ''}"
      onclick="event.stopPropagation();toggleCustomDropdown('${id}');(${onchangeFn})('${o.val}')">
      ${o.label}${active ? check : ''}
    </div>`;
  }).join('');
  return `<div id="${id}" class="mkt-custom-select" onclick="toggleCustomDropdown('${id}')">
    <span>${label}</span>${chevron}
    <div class="mkt-custom-opts" style="display:none">${items}</div>
  </div>`;
}

function toggleCustomDropdown(id) {
  const el   = document.getElementById(id);
  const opts = el?.querySelector('.mkt-custom-opts');
  if (!opts) return;
  opts.style.display = opts.style.display === 'none' ? '' : 'none';
}

let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', 2800);
}
