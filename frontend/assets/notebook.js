'use strict';

let nbIdCounter = 0;
function nbGenId() { return 'nb' + (++nbIdCounter); }

function parseRawElements(raw) {
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw.map(e => ({
    id: nbGenId(),
    type: e.type || 'text',
    content: e.content ?? '',
    cells: e.cells ?? [['', ''], ['', '']],
  }));
}

function nbCellsToElements() {
  return S.notebookCells.map(c =>
    c.type === 'text'
      ? { type: 'text', content: c.content }
      : { type: 'table', cells: c.cells }
  );
}

function nbAddCell(type, insertIdx) {
  const cell = type === 'table'
    ? { id: nbGenId(), type: 'table', cells: [['', ''], ['', '']], content: '' }
    : { id: nbGenId(), type: 'text', content: '', cells: [] };
  S.notebookCells.splice(insertIdx, 0, cell);
  renderNotebook();
  scheduleElementsSave();
  setTimeout(() => {
    const el = document.querySelector(`[data-id="${cell.id}"] textarea, [data-id="${cell.id}"] input`);
    if (el) el.focus();
  }, 0);
}

function nbDeleteCell(id) {
  S.notebookCells = S.notebookCells.filter(c => c.id !== id);
  renderNotebook();
  scheduleElementsSave();
}

function nbUpdateText(id, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c) c.content = val;
}

function nbUpdateTableCell(id, r, col, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c && c.cells[r]) c.cells[r][col] = val;
}

function nbAddRow(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  const cols = c.cells[0]?.length || 1;
  c.cells.push(Array(cols).fill(''));
  renderNotebook();
  scheduleElementsSave();
}

function nbDelRow(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.cells.length <= 1) return;
  c.cells.pop();
  renderNotebook();
  scheduleElementsSave();
}

function nbAddCol(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || (c.cells[0]?.length ?? 0) >= 10) return;
  c.cells.forEach(row => row.push(''));
  renderNotebook();
  scheduleElementsSave();
}

function nbDelCol(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || (c.cells[0]?.length ?? 0) <= 1) return;
  c.cells.forEach(row => row.pop());
  renderNotebook();
  scheduleElementsSave();
}

function nbAddZoneHTML(insertIdx) {
  return `<div class="nb-add-zone">
    <div class="nb-add-line"></div>
    <button class="nb-add-btn" onclick="nbAddCell('text',${insertIdx})">＋ Text</button>
    <button class="nb-add-btn" onclick="nbAddCell('table',${insertIdx})">＋ Table</button>
    <div class="nb-add-line"></div>
  </div>`;
}

function nbTextCellHTML(c) {
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill text-pill">Text</span></div>
    <div class="nb-cell-body">
      <textarea class="nb-textarea"
        oninput="nbUpdateText('${c.id}',this.value);autoResize(this);scheduleElementsSave()"
        placeholder="Type here…">${esc(c.content)}</textarea>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbTableCellHTML(c) {
  const rows = c.cells.length;
  const cols = c.cells[0]?.length ?? 0;
  let tbl = '<table class="nb-table">';
  c.cells.forEach((row, r) => {
    tbl += '<tr>';
    row.forEach((val, col) => {
      tbl += `<td><textarea class="nb-cell-input" rows="1"
        oninput="nbUpdateTableCell('${c.id}',${r},${col},this.value);scheduleElementsSave();autoResize(this)">${esc(val)}</textarea></td>`;
    });
    tbl += '</tr>';
  });
  tbl += '</table>';
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill table-pill">Table</span></div>
    <div class="nb-cell-body">
      <div class="nb-table-controls">
        <button class="nb-ctrl-btn" onclick="nbAddRow('${c.id}')">+ Row</button>
        <button class="nb-ctrl-btn" onclick="nbDelRow('${c.id}')" ${rows <= 1 ? 'disabled' : ''}>− Row</button>
        <button class="nb-ctrl-btn" onclick="nbAddCol('${c.id}')" ${cols >= 10 ? 'disabled' : ''}>+ Col</button>
        <button class="nb-ctrl-btn" onclick="nbDelCol('${c.id}')" ${cols <= 1 ? 'disabled' : ''}>− Col</button>
      </div>
      <div class="nb-table-wrap">${tbl}</div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function buildNotebookHTML() {
  if (!S.notebookCells.length) {
    return nbAddZoneHTML(0) +
      '<div class="nb-empty">No content yet — add a cell above.</div>';
  }
  return S.notebookCells.reduce((html, c, i) => {
    const cellHTML = c.type === 'table' ? nbTableCellHTML(c) : nbTextCellHTML(c);
    return html + cellHTML + nbAddZoneHTML(i + 1);
  }, nbAddZoneHTML(0));
}

function buildCourseViewHTML() {
  if (!S.notebookCells.length) return '<div class="nb-empty">No course content yet.</div>';
  return S.notebookCells.map(c => {
    if (c.type === 'table') {
      const tbl = c.cells.map(row =>
        '<tr>' + row.map(val => `<td>${esc(val)}</td>`).join('') + '</tr>'
      ).join('');
      return `<table class="cv-table">${tbl}</table>`;
    }
    return `<div class="cv-text">${esc(c.content).replace(/\n/g, '<br>')}</div>`;
  }).join('');
}

function renderNotebook() {
  const nb = document.getElementById('notebook');
  if (!nb) return;
  if (S.editMode) {
    nb.innerHTML = buildNotebookHTML();
    nb.querySelectorAll('.nb-textarea, .nb-cell-input').forEach(ta => autoResize(ta));
  } else {
    nb.innerHTML = buildCourseViewHTML();
  }
}
