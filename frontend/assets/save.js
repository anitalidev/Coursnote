'use strict';

let elemSaveTimer, pnSaveTimer;

function scheduleElementsSave(topic = S.ui.currentTopic) {
  if (!Runtime.canSave) return;
  clearTimeout(elemSaveTimer);
  setStatus('cp', 'saving...');
  elemSaveTimer = setTimeout(async () => {
    try {
      await PUT('/coursepages', {
        id: topic.coursePageID,
        elements: nbCellsToElements(),
      });
      setStatus('cp', 'Saved');
    } catch(e) { setStatus('cp', 'Error: ' + (e.message || 'saving')); console.error('Save error:', e); }
  }, 800);
}

function schedulePNSave(doc) {
  if (!Runtime.canSave) return;
  clearTimeout(pnSaveTimer);
  setStatus('pn', 'saving...');
  pnSaveTimer = setTimeout(async () => {
    try {
      await PUT('/privatenotes', { id: S.editor.privateNote.privateNoteID, description: doc });
      S.editor.privateNote.description = doc;
      setStatus('pn', 'Saved');
    } catch { setStatus('pn', 'Error saving'); }
  }, 800);
}

function setStatus(pane, msg) {
  if (!Runtime.canSave) return;
  const el = document.getElementById('status-' + pane);
  if (!el) return;
  el.textContent = msg;
  el.className = 'save-indicator' + (msg === 'Saved' ? ' saved' : '');
}
