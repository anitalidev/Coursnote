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
    header: e.header ?? '',
    cards: e.cards ?? [{ header: '', content: '' }],
    question: e.question ?? '',
    options: e.options ?? ['', ''],
    answer: e.answer ?? 0,
    questions: e.questions ?? [{ question: '', options: ['', ''], answer: 0 }],
  }));
}

function nbCellsToElements() {
  return S.notebookCells.map(c => {
    if (c.type === 'table')     return { type: 'table', cells: c.cells };
    if (c.type === 'card')      return { type: 'card', header: c.header, content: c.content };
    if (c.type === 'cardSlide') return { type: 'cardSlide', cards: c.cards };
    if (c.type === 'question')       return { type: 'question', question: c.question, options: c.options, answer: c.answer };
    if (c.type === 'questionSlide') return { type: 'questionSlide', questions: c.questions };
    return { type: 'text', content: c.content };
  });
}

function nbAddCell(type, insertIdx) {
  const base = { id: nbGenId(), type, content: '', cells: [], header: '', cards: [{ header: '', content: '' }], question: '', options: ['', ''], answer: 0, questions: [{ question: '', options: ['', ''], answer: 0 }] };
  if (type === 'table') base.cells = [['', ''], ['', '']];
  S.notebookCells.splice(insertIdx, 0, base);
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
    <button class="nb-add-btn" onclick="nbAddCell('card',${insertIdx})">＋ Card</button>
    <button class="nb-add-btn" onclick="nbAddCell('cardSlide',${insertIdx})">＋ Card Slide</button>
    <button class="nb-add-btn" onclick="nbAddCell('question',${insertIdx})">＋ Question</button>
    <button class="nb-add-btn" onclick="nbAddCell('questionSlide',${insertIdx})">＋ Question Slide</button>
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

function nbCardCellHTML(c) {
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill card-pill">Card</span></div>
    <div class="nb-cell-body">
      <input class="nb-card-input nb-card-header" placeholder="Header"
        value="${esc(c.header)}"
        oninput="nbUpdateField('${c.id}','header',this.value);scheduleElementsSave()">
      <textarea class="nb-textarea" placeholder="Content"
        oninput="nbUpdateField('${c.id}','content',this.value);autoResize(this);scheduleElementsSave()">${esc(c.content)}</textarea>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbCardSlideTabs(c, id, listKey) {
  const idx = c._slideIdx ?? 0;
  return c[listKey].map((card, i) => {
    const label = card.header?.trim() || (i + 1);
    return `<button class="slide-tab${i === idx ? ' slide-tab-active' : ''}" onclick="nbSlideGoTo('${id}','${listKey}',${i})">${esc(String(label))}</button>`;
  }).join('');
}

function nbCardSlideCellHTML(c) {
  const idx = c._slideIdx ?? 0;
  const card = c.cards[idx];
  const total = c.cards.length;
  const tabs = nbCardSlideTabs(c, c.id, 'cards');
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill slide-pill">Slide</span></div>
    <div class="nb-cell-body">
      <div class="slide-tabs-row">${tabs}</div>
      <div class="nb-slide-edit-nav">
        <button class="cv-slide-btn" onclick="nbSlideNav('${c.id}','cards',-1)">‹</button>
        <span class="cv-slide-counter">${idx + 1} / ${total}</span>
        <button class="cv-slide-btn" onclick="nbSlideNav('${c.id}','cards',1)">›</button>
        <button class="nb-ctrl-btn nb-slide-del" style="margin-left:auto" onclick="nbDelSlideCard('${c.id}',${idx})" ${total <= 1 ? 'disabled' : ''}>− Remove</button>
        <button class="nb-ctrl-btn" onclick="nbAddSlideCard('${c.id}')">＋ Add</button>
      </div>
      <input class="nb-card-input nb-card-header" placeholder="Header"
        value="${esc(card.header)}"
        oninput="nbUpdateSlideCard('${c.id}',${idx},'header',this.value);scheduleElementsSave()">
      <textarea class="nb-textarea" placeholder="Content"
        oninput="nbUpdateSlideCard('${c.id}',${idx},'content',this.value);autoResize(this);scheduleElementsSave()">${esc(card.content)}</textarea>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbQuestionCellHTML(c) {
  const optsHTML = c.options.map((opt, i) => `
    <div class="nb-q-option">
      <input type="radio" name="q-${c.id}-answer" ${c.answer === i ? 'checked' : ''}
        onchange="nbUpdateField('${c.id}','answer',${i});scheduleElementsSave()">
      <input class="nb-card-input" placeholder="Option ${i + 1}"
        value="${esc(opt)}"
        oninput="nbUpdateOption('${c.id}',${i},this.value);scheduleElementsSave()">
      <button class="nb-ctrl-btn" onclick="nbDelOption('${c.id}',${i})" ${c.options.length <= 2 ? 'disabled' : ''}>−</button>
    </div>`).join('');
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill question-pill">Q</span></div>
    <div class="nb-cell-body">
      <input class="nb-card-input nb-q-stem" placeholder="Question"
        value="${esc(c.question)}"
        oninput="nbUpdateField('${c.id}','question',this.value);scheduleElementsSave()">
      <div class="nb-q-options">${optsHTML}</div>
      <button class="nb-ctrl-btn" onclick="nbAddOption('${c.id}')">＋ Add option</button>
      <div class="nb-q-hint">Select the correct answer with the radio button.</div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbQSlideCellHTML(c) {
  const idx = c._slideIdx ?? 0;
  const q = c.questions[idx];
  const total = c.questions.length;
  const optsHTML = q.options.map((opt, i) => `
    <div class="nb-q-option">
      <input type="radio" name="qs-${c.id}-${idx}-answer" ${q.answer === i ? 'checked' : ''}
        onchange="nbUpdateQSlideField('${c.id}',${idx},'answer',${i});scheduleElementsSave()">
      <input class="nb-card-input" placeholder="Option ${i + 1}"
        value="${esc(opt)}"
        oninput="nbUpdateQSlideOption('${c.id}',${idx},${i},this.value);scheduleElementsSave()">
      <button class="nb-ctrl-btn" onclick="nbDelQSlideOption('${c.id}',${idx},${i})" ${q.options.length <= 2 ? 'disabled' : ''}>−</button>
    </div>`).join('');
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill qslide-pill">Q Slide</span></div>
    <div class="nb-cell-body">
      <div class="nb-slide-edit-nav">
        <button class="cv-slide-btn" onclick="nbSlideNav('${c.id}','questions',-1)">‹</button>
        <span class="cv-slide-counter">${idx + 1} / ${total}</span>
        <button class="cv-slide-btn" onclick="nbSlideNav('${c.id}','questions',1)">›</button>
        <button class="nb-ctrl-btn nb-slide-del" style="margin-left:auto" onclick="nbDelQSlideQuestion('${c.id}',${idx})" ${total <= 1 ? 'disabled' : ''}>− Remove</button>
        <button class="nb-ctrl-btn" onclick="nbAddQSlideQuestion('${c.id}')">＋ Add</button>
      </div>
      <input class="nb-card-input nb-q-stem" placeholder="Question"
        value="${esc(q.question)}"
        oninput="nbUpdateQSlideField('${c.id}',${idx},'question',this.value);scheduleElementsSave()">
      <div class="nb-q-options">${optsHTML}</div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="nb-ctrl-btn" onclick="nbAddQSlideOption('${c.id}',${idx})">＋ Option</button>
      </div>
      <div class="nb-q-hint">Select the correct answer with the radio button.</div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbUpdateQSlideField(id, qi, field, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c?.questions[qi]) c.questions[qi][field] = val;
}

function nbUpdateQSlideOption(id, qi, i, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c?.questions[qi]?.options[i] !== undefined) c.questions[qi].options[i] = val;
}

function nbAddQSlideOption(id, qi) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c?.questions[qi]) return;
  c.questions[qi].options.push('');
  renderNotebook();
  scheduleElementsSave();
}

function nbDelQSlideOption(id, qi, i) {
  const c = S.notebookCells.find(c => c.id === id);
  const q = c?.questions[qi];
  if (!q || q.options.length <= 2) return;
  if (q.answer >= i && q.answer > 0) q.answer--;
  q.options.splice(i, 1);
  renderNotebook();
  scheduleElementsSave();
}

function nbAddQSlideQuestion(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  c.questions.push({ question: '', options: ['', ''], answer: 0 });
  c._slideIdx = c.questions.length - 1;
  renderNotebook();
  scheduleElementsSave();
}

function nbDelQSlideQuestion(id, qi) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.questions.length <= 1) return;
  c.questions.splice(qi, 1);
  c._slideIdx = Math.min(c._slideIdx ?? 0, c.questions.length - 1);
  renderNotebook();
  scheduleElementsSave();
}

function nbSlideNav(id, listKey, dir) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  const len = c[listKey].length;
  c._slideIdx = ((c._slideIdx ?? 0) + dir + len) % len;
  renderNotebook();
}

function nbSlideGoTo(id, listKey, i) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  c._slideIdx = i;
  renderNotebook();
}

function nbUpdateField(id, field, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c) c[field] = val;
}

function nbUpdateSlideCard(id, i, field, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c?.cards[i]) c.cards[i][field] = val;
}

function nbAddSlideCard(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  c.cards.push({ header: '', content: '' });
  c._slideIdx = c.cards.length - 1;
  renderNotebook();
  scheduleElementsSave();
}

function nbDelSlideCard(id, i) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.cards.length <= 1) return;
  c.cards.splice(i, 1);
  c._slideIdx = Math.min(c._slideIdx ?? 0, c.cards.length - 1);
  renderNotebook();
  scheduleElementsSave();
}

function nbUpdateOption(id, i, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c?.options[i] !== undefined) c.options[i] = val;
}

function nbAddOption(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  c.options.push('');
  renderNotebook();
  scheduleElementsSave();
}

function nbDelOption(id, i) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.options.length <= 2) return;
  if (c.answer >= i && c.answer > 0) c.answer--;
  c.options.splice(i, 1);
  renderNotebook();
  scheduleElementsSave();
}

function buildNotebookHTML() {
  if (!S.notebookCells.length) {
    return nbAddZoneHTML(0) +
      '<div class="nb-empty">No content yet — add a cell above.</div>';
  }
  return S.notebookCells.reduce((html, c, i) => {
    let cellHTML;
    if (c.type === 'table')     cellHTML = nbTableCellHTML(c);
    else if (c.type === 'card')      cellHTML = nbCardCellHTML(c);
    else if (c.type === 'cardSlide') cellHTML = nbCardSlideCellHTML(c);
    else if (c.type === 'question')       cellHTML = nbQuestionCellHTML(c);
    else if (c.type === 'questionSlide')  cellHTML = nbQSlideCellHTML(c);
    else                                  cellHTML = nbTextCellHTML(c);
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
    if (c.type === 'card') {
      return `<div class="cv-card">
        ${c.header ? `<div class="cv-card-header">${esc(c.header)}</div>` : ''}
        <div class="cv-card-content">${esc(c.content).replace(/\n/g, '<br>')}</div>
      </div>`;
    }
    if (c.type === 'cardSlide') {
      const id = c.id;
      const cards = c.cards;
      const cardsHTML = cards.map((card, i) =>
        `<div class="cv-slide-card${i === 0 ? ' active' : ''}" data-slide-i="${i}">
          ${card.header ? `<div class="cv-card-header">${esc(card.header)}</div>` : ''}
          <div class="cv-card-content">${esc(card.content).replace(/\n/g, '<br>')}</div>
        </div>`
      ).join('');
      const tabsHTML = cards.map((card, i) => {
        const label = card.header?.trim() || (i + 1);
        return `<button class="slide-tab${i === 0 ? ' slide-tab-active' : ''}" data-slide-tab="${id}-${i}" onclick="cvSlideGoTo('${id}',${i})">${esc(String(label))}</button>`;
      }).join('');
      return `<div class="cv-slide" id="slide-${id}">
        <div class="slide-tabs-row" id="slide-tabs-${id}">${tabsHTML}</div>
        <div class="cv-slide-track">${cardsHTML}</div>
        <div class="cv-slide-nav">
          <button class="cv-slide-btn" onclick="cvSlideNav('${id}',-1)">‹</button>
          <span class="cv-slide-counter" id="slide-counter-${id}">1 / ${cards.length}</span>
          <button class="cv-slide-btn" onclick="cvSlideNav('${id}',1)">›</button>
        </div>
      </div>`;
    }
    if (c.type === 'question') {
      const optsHTML = c.options.map((opt, i) =>
        `<label class="cv-q-option" data-opt="${i}">
          <input type="radio" name="cv-q-${c.id}" value="${i}" onchange="cvAnswerQuestion('${c.id}',${i},${c.answer})">
          <span>${esc(opt)}</span>
        </label>`
      ).join('');
      return `<div class="cv-question" id="cvq-${c.id}">
        <div class="cv-q-stem">${esc(c.question)}</div>
        <div class="cv-q-options">${optsHTML}</div>
        <div class="cv-q-feedback" id="cvqf-${c.id}"></div>
      </div>`;
    }
    if (c.type === 'questionSlide') {
      const id = c.id;
      const questionsHTML = c.questions.map((q, qi) => {
        const optsHTML = q.options.map((opt, i) =>
          `<label class="cv-q-option" data-opt="${i}">
            <input type="radio" name="cv-qs-${id}-${qi}" value="${i}" onchange="cvAnswerQSlide('${id}',${qi},${i},${q.answer})">
            <span>${esc(opt)}</span>
          </label>`
        ).join('');
        return `<div class="cv-slide-card${qi === 0 ? ' active' : ''}" data-slide-i="${qi}" id="cvq-${id}-${qi}">
          <div class="cv-q-stem">${esc(q.question)}</div>
          <div class="cv-q-options">${optsHTML}</div>
          <div class="cv-q-feedback" id="cvqf-${id}-${qi}"></div>
        </div>`;
      }).join('');
      return `<div class="cv-slide" id="slide-${id}">
        <div class="cv-slide-track">${questionsHTML}</div>
        <div class="cv-slide-nav">
          <button class="cv-slide-btn" onclick="cvSlideNav('${id}',-1)">‹</button>
          <span class="cv-slide-counter" id="slide-counter-${id}">1 / ${c.questions.length}</span>
          <button class="cv-slide-btn" onclick="cvSlideNav('${id}',1)">›</button>
        </div>
      </div>`;
    }
    return `<div class="cv-text">${esc(c.content).replace(/\n/g, '<br>')}</div>`;
  }).join('');
}

function cvAnswerQSlide(slideId, qi, chosen, correct) {
  const container = document.getElementById(`cvq-${slideId}-${qi}`);
  const fb = document.getElementById(`cvqf-${slideId}-${qi}`);
  if (!container || !fb) return;
  container.querySelectorAll('.cv-q-option').forEach((el, i) => {
    el.classList.remove('cv-q-correct', 'cv-q-wrong');
    if (i === correct) el.classList.add('cv-q-correct');
    else if (i === chosen) el.classList.add('cv-q-wrong');
  });
  fb.textContent = chosen === correct ? '✓ Correct!' : '✗ Incorrect — try again.';
  fb.className = 'cv-q-feedback ' + (chosen === correct ? 'cv-q-fb-correct' : 'cv-q-fb-wrong');
}

function cvSlideNav(id, dir) {
  const el = document.getElementById('slide-' + id);
  if (!el) return;
  const cards = el.querySelectorAll('.cv-slide-card');
  const active = el.querySelector('.cv-slide-card.active');
  let idx = Array.from(cards).indexOf(active);
  idx = (idx + dir + cards.length) % cards.length;
  cvSlideActivate(id, el, cards, idx);
}

function cvSlideGoTo(id, idx) {
  const el = document.getElementById('slide-' + id);
  if (!el) return;
  const cards = el.querySelectorAll('.cv-slide-card');
  cvSlideActivate(id, el, cards, idx);
}

function cvSlideActivate(id, el, cards, idx) {
  cards.forEach(c => c.classList.remove('active'));
  cards[idx].classList.add('active');
  const counter = document.getElementById('slide-counter-' + id);
  if (counter) counter.textContent = `${idx + 1} / ${cards.length}`;
  const tabsEl = document.getElementById('slide-tabs-' + id);
  if (tabsEl) {
    tabsEl.querySelectorAll('.slide-tab').forEach((t, i) => t.classList.toggle('slide-tab-active', i === idx));
  }
}

function cvAnswerQuestion(id, chosen, correct) {
  const fb = document.getElementById('cvqf-' + id);
  const container = document.getElementById('cvq-' + id);
  if (!fb || !container) return;
  container.querySelectorAll('.cv-q-option').forEach((el, i) => {
    el.classList.remove('cv-q-correct', 'cv-q-wrong');
    if (i === correct) el.classList.add('cv-q-correct');
    else if (i === chosen) el.classList.add('cv-q-wrong');
  });
  fb.textContent = chosen === correct ? '✓ Correct!' : '✗ Incorrect — try again.';
  fb.className = 'cv-q-feedback ' + (chosen === correct ? 'cv-q-fb-correct' : 'cv-q-fb-wrong');
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
