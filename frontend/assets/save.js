'use strict';

let elemSaveTimer, pnSaveTimer;

function scheduleElementsSave() {
  clearTimeout(elemSaveTimer);
  setStatus('cp', 'saving...');
  elemSaveTimer = setTimeout(async () => {
    try {
      await PUT('/topic', {
        id: S.currentTopic.topicID,
        name: S.currentTopic.name,
        description: S.currentTopic.description,
        elements: nbCellsToElements(),
      });
      setStatus('cp', 'Saved');
    } catch(e) { setStatus('cp', 'Error: ' + (e.message || 'saving')); console.error('Save error:', e); }
  }, 800);
}

function schedulePNSave(text) {
  clearTimeout(pnSaveTimer);
  setStatus('pn', 'saving...');
  pnSaveTimer = setTimeout(async () => {
    try {
      await PUT('/privatenotes', { id: S.privateNote.privateNoteID, description: text });
      S.privateNote.description = text;
      setStatus('pn', 'Saved');
    } catch { setStatus('pn', 'Error saving'); }
  }, 800);
}

function setStatus(pane, msg) {
  const el = document.getElementById('status-' + pane);
  if (!el) return;
  el.textContent = msg;
  el.className = 'save-indicator' + (msg === 'Saved' ? ' saved' : '');
}
