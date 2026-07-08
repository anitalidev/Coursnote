'use strict';

const _dirty = { cp: false, pn: false };
let _pnDoc = null;

function markDirty(pane) {
  if (!Runtime.canSave) return;
  _dirty[pane] = true;
  _updateSaveBtn(pane, 'unsaved');
}

function markDirtyPN(doc) {
  _pnDoc = doc;
  markDirty('pn');
}

function hasDirty() { return _dirty.cp || _dirty.pn; }

function _updateSaveBtn(pane, state) {
  const btn = document.getElementById('save-btn-' + pane);
  const status = document.getElementById('status-' + pane);
  if (!btn) return;
  if (state === 'unsaved') {
    btn.disabled = false;
    btn.textContent = 'Save';
    btn.style.opacity = '1';
    if (status) status.textContent = '';
  } else if (state === 'saving') {
    btn.disabled = true;
    btn.textContent = 'Saving…';
    if (status) status.textContent = '';
  } else if (state === 'saved') {
    btn.disabled = true;
    btn.textContent = 'Saved';
    btn.style.opacity = '0.5';
    if (status) { status.textContent = 'Saved'; status.className = 'save-indicator saved'; setTimeout(() => { if (status) { status.textContent = ''; status.className = 'save-indicator'; } }, 2000); }
  }
}

async function saveCP(topic = S.ui.currentTopic) {
  if (!Runtime.canSave || !topic) return;
  _updateSaveBtn('cp', 'saving');
  try {
    await PUT('/coursepages', { id: topic.coursePageID, elements: nbCellsToElements() });
    _dirty.cp = false;
    _updateSaveBtn('cp', 'saved');
  } catch (e) {
    const btn = document.getElementById('save-btn-cp');
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    setStatus('cp', 'Error saving');
    console.error('Save error:', e);
  }
}

async function savePN() {
  if (!Runtime.canSave || !S.editor.privateNote || _pnDoc === null) return;
  _updateSaveBtn('pn', 'saving');
  try {
    await PUT('/privatenotes', { id: S.editor.privateNote.privateNoteID, description: _pnDoc });
    S.editor.privateNote.description = _pnDoc;
    _dirty.pn = false;
    _updateSaveBtn('pn', 'saved');
  } catch {
    const btn = document.getElementById('save-btn-pn');
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    setStatus('pn', 'Error saving');
  }
}

async function saveAll() {
  const saves = [];
  if (_dirty.cp) saves.push(saveCP());
  if (_dirty.pn) saves.push(savePN());
  await Promise.all(saves);
}

function clearDirty() {
  _dirty.cp = false;
  _dirty.pn = false;
  _pnDoc = null;
}

function setStatus(pane, msg) {
  if (!Runtime.canSave) return;
  const el = document.getElementById('status-' + pane);
  if (!el) return;
  el.textContent = msg;
  el.className = 'save-indicator' + (msg === 'Saved' ? ' saved' : '');
}

// ── Unsaved-changes modal ─────────────────────────────────────────────────────

function _showUnsavedModal(resolve) {
  const existing = document.getElementById('unsaved-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'unsaved-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center';

  overlay.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:28px 32px;max-width:380px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,.6)">
      <h3 style="margin:0 0 8px;font-size:16px;color:var(--text)">Unsaved Changes</h3>
      <p style="margin:0 0 24px;font-size:13px;color:var(--text2);line-height:1.5">You have unsaved changes. Would you like to save before leaving?</p>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="unsaved-cancel" class="btn btn-ghost btn-sm">Cancel</button>
        <button id="unsaved-discard" class="btn btn-danger btn-sm">Discard</button>
        <button id="unsaved-save" class="btn btn-primary btn-sm">Save & Continue</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById('unsaved-cancel').onclick = () => { overlay.remove(); resolve(false); };
  document.getElementById('unsaved-discard').onclick = () => { overlay.remove(); clearDirty(); resolve(true); };
  document.getElementById('unsaved-save').onclick = async () => {
    overlay.remove();
    await saveAll();
    resolve(true);
  };
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
}

// Returns a Promise<boolean> — true = proceed, false = cancel
function checkUnsaved() {
  if (!hasDirty() || !Runtime.canSave) return Promise.resolve(true);
  return new Promise(resolve => _showUnsavedModal(resolve));
}

// ── Keyboard shortcut ─────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (!Runtime.canSave || !S.ui.currentTopic) return;
    if (_dirty.cp) saveCP();
    if (_dirty.pn) savePN();
  }
});

// ── Window beforeunload ───────────────────────────────────────────────────────

window.addEventListener('beforeunload', e => {
  if (hasDirty() && Runtime.canSave) {
    e.preventDefault();
    e.returnValue = '';
  }
});
